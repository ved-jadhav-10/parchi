// Track B: Ayurvedic / herbal name mapping and conflict detection.
//   partitionRx():  claims herbal lines BEFORE the ordinary brand resolver sees them (it would otherwise guess a drug,
//                   e.g. "Triphala churna" -> an inhaler), and returns the rest of the text for the normal pipeline.
//   analyzeHerbal(): matches the herbal items against the ordinary medicines on the same prescription.
// Every rule carries sources and an evidence grade (see herbal.json). Nothing here says a combination is safe.
import { distance } from 'fastest-levenshtein'
import { splitBrandAndSig, splitRx } from '../resolver'
import data from './herbal.json'
import type { HerbalFinding, HerbalItem, HerbalReport, HerbalRule, ItemKind, OrdinaryLine, UnrecognisedItem } from './types'

export type { HerbalFinding, HerbalItem, HerbalReport, HerbalRule, OrdinaryLine, UnrecognisedItem } from './types'

interface HerbDef { name: string; latin: string; aliases: string[] }
interface FormulationDef { name: string; aliases: string[]; herbs: string[]; composition_note: string }
interface AmbiguousDef { name: string; aliases: string[]; candidates: string[]; note: string }

const HERBS = data.herbs as Record<string, HerbDef>
const FORMULATIONS = data.formulations as Record<string, FormulationDef>
const AMBIGUOUS = data.ambiguous as Record<string, AmbiguousDef>
export const HERBAL_RULES = data.rules as unknown as HerbalRule[]
const FORM_WORDS = new Set(data.ayurvedic_form_words.map((w) => w.replace(/ /g, '')))
/** "churna", "vati" ... as a word, or as the ending of a classical preparation name ("Dashmularishta", "Kumaryasava"). */
const isFormWord = (t: string): boolean => FORM_WORDS.has(t) || (t.length > 8 && /(?:arishta|arishtam|asava|asavam)$/.test(t))

const METAL_KEYWORDS = data.herbo_mineral.keywords.map((k) => norm(k))

/** Lowercase, accents removed, punctuation to single spaces. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

interface AliasEntry {
  alias: string
  words: string[]
  kind: Exclude<ItemKind, 'herbo_mineral'>
  id: string
}

const ALIASES: AliasEntry[] = [
  ...Object.entries(HERBS).flatMap(([id, h]) => h.aliases.map((a) => ({ alias: norm(a), kind: 'herb' as const, id }))),
  ...Object.entries(FORMULATIONS).flatMap(([id, f]) => f.aliases.map((a) => ({ alias: norm(a), kind: 'formulation' as const, id }))),
  ...Object.entries(AMBIGUOUS).flatMap(([id, f]) => f.aliases.map((a) => ({ alias: norm(a), kind: 'ambiguous' as const, id }))),
].map((e) => ({ ...e, words: e.alias.split(' ') }))

const FUZZY_MIN_LENGTH = 6
const FUZZY_MIN_SIMILARITY = 0.85

interface Match {
  kind: Exclude<ItemKind, 'herbo_mineral'>
  id: string
  confidence: number
}

/** Herb, formulation or ambiguous names found in a brand text. Short names must match exactly; only longer single words may be misspelled. */
export function matchNames(text: string): Match[] {
  const tokens = norm(text).split(' ').filter(Boolean)
  const best = new Map<string, Match>()
  const keep = (m: Match) => {
    const key = `${m.kind}:${m.id}`
    if ((best.get(key)?.confidence ?? 0) < m.confidence) best.set(key, m)
  }
  for (const e of ALIASES) {
    if (e.words.length > 1) {
      for (let i = 0; i + e.words.length <= tokens.length; i++) {
        if (e.words.every((w, k) => tokens[i + k] === w)) keep({ kind: e.kind, id: e.id, confidence: 1 })
      }
      continue
    }
    for (const t of tokens) {
      if (t === e.alias) keep({ kind: e.kind, id: e.id, confidence: 1 })
      else if (e.alias.length >= FUZZY_MIN_LENGTH && t.length >= FUZZY_MIN_LENGTH && t[0] === e.alias[0]) {
        const sim = 1 - distance(t, e.alias) / Math.max(t.length, e.alias.length)
        if (sim >= FUZZY_MIN_SIMILARITY) keep({ kind: e.kind, id: e.id, confidence: Math.round(sim * 100) / 100 })
      }
    }
  }
  return [...best.values()]
}

export interface HerbalLine {
  line: number
  raw: string
  brand: string
  sig: string
  item?: HerbalItem
  unrecognised?: UnrecognisedItem
}

const nameOf = (m: Match): string =>
  m.kind === 'herb' ? `${HERBS[m.id].name} (${HERBS[m.id].latin})` : m.kind === 'formulation' ? FORMULATIONS[m.id].name : AMBIGUOUS[m.id].name

function expandHerbs(matches: Match[]): string[] {
  const out = new Set<string>()
  for (const m of matches) {
    if (m.kind === 'herb') out.add(m.id)
    if (m.kind === 'formulation') for (const h of FORMULATIONS[m.id].herbs) out.add(h)
  }
  return [...out]
}

export interface PartitionOptions {
  /** True when the text is a medicine brand we know exactly. A fuzzy herb match or a bare "churna/vati" word never overrides it. */
  isKnownBrand?: (brand: string) => boolean
}

/** Split a typed prescription into herbal lines and the rest. The rest goes to the ordinary pipeline unchanged. */
export function partitionRx(rxText: string, opts: PartitionOptions = {}): { herbal: HerbalLine[]; restLines: string[]; restText: string } {
  const herbal: HerbalLine[] = []
  const restLines: string[] = []
  splitRx(rxText).forEach((raw, line) => {
    const { brand, sig } = splitBrandAndSig(raw)
    const text = brand || raw
    const known = opts.isKnownBrand?.(text) ?? false
    const matches = matchNames(text).filter((m) => m.confidence === 1 || !known)
    const tokens = norm(text).split(' ')
    const metal = METAL_KEYWORDS.some((k) => ` ${norm(text)} `.includes(` ${k} `))
    if (matches.length > 0) {
      const kind: ItemKind = metal ? 'herbo_mineral' : matches.some((m) => m.kind === 'ambiguous') && matches.length === 1 ? 'ambiguous' : matches.some((m) => m.kind === 'formulation') ? 'formulation' : 'herb'
      const amb = matches.find((m) => m.kind === 'ambiguous')
      const form = matches.find((m) => m.kind === 'formulation')
      herbal.push({
        line, raw, brand: text, sig,
        item: {
          line, raw, brand: text, sig, kind,
          ids: matches.map((m) => m.id),
          names: matches.map(nameOf),
          herbs: expandHerbs(matches),
          confidence: Math.min(...matches.map((m) => m.confidence)),
          note: amb ? AMBIGUOUS[amb.id].note : form ? FORMULATIONS[form.id].composition_note : undefined,
        },
      })
    } else if (metal) {
      herbal.push({ line, raw, brand: text, sig, item: { line, raw, brand: text, sig, kind: 'herbo_mineral', ids: [], names: ['Ayurvedic herbo-mineral preparation'], herbs: [], confidence: 1 } })
    } else if (!known && tokens.some(isFormWord)) {
      herbal.push({ line, raw, brand: text, sig, unrecognised: { line, raw, reason: 'An Ayurvedic or herbal product we do not recognise. Ask the patient what it contains; it was not checked for conflicts.' } })
    } else restLines.push(raw)
  })
  return { herbal, restLines, restText: restLines.join('\n') }
}

const NOTE =
  'This is a starter, evidence-graded list, not a safety clearance. No finding here does not mean no interaction: only ' +
  `${Object.keys(HERBS).length} herbs and ${Object.keys(FORMULATIONS).length} formulations are recognised, and every rule is unverified by a pharmacist.`

const dayOf = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / 86_400_000

/** Do two course windows share a day? A missing end means "still running". Dates must be ISO; anything else is treated as overlapping. */
function overlaps(a: { start?: string; end?: string }, b: { start?: string; end?: string }): boolean {
  if (!a.start || !b.start) return true
  const [as, bs] = [dayOf(a.start), dayOf(b.start)]
  const ae = a.end ? dayOf(a.end) : Infinity
  const be = b.end ? dayOf(b.end) : Infinity
  if ([as, bs, ae, be].some(Number.isNaN)) return true
  return as <= be && bs <= ae
}

/**
 * Match the herbal items against the ordinary medicines. `classesOf` gives a Track A ingredient's classes.
 * In history mode pass `start`/`end` on both sides so only medicines taken at the same time are matched.
 */
export function analyzeHerbal(
  lines: HerbalLine[],
  ordinary: OrdinaryLine[],
  classesOf: (id: string) => string[] | undefined,
  itemWindows: Record<number, { start?: string; end?: string }> = {},
): HerbalReport {
  const items = lines.flatMap((l) => (l.item ? [l.item] : []))
  const unrecognised = lines.flatMap((l) => (l.unrecognised ? [l.unrecognised] : []))
  const findings: HerbalFinding[] = []

  for (const rule of HERBAL_RULES) {
    const metalRule = rule.id === data.herbo_mineral.rule
    const triggered = items.filter((it) => (metalRule ? it.kind === 'herbo_mineral' : it.herbs.some((h) => rule.herbs.includes(h))))
    if (triggered.length === 0) continue
    const wantIng = new Set(rule.with.ingredients ?? [])
    const wantClass = new Set(rule.with.classes ?? [])
    const alone = wantIng.size === 0 && wantClass.size === 0
    const partners: HerbalFinding['partners'] = []
    if (!alone) {
      for (const o of ordinary) {
        for (const id of o.ingredients) {
          const hit = wantIng.has(id) || (classesOf(id) ?? []).some((c) => wantClass.has(c))
          if (!hit) continue
          if (!triggered.some((it) => overlaps(itemWindows[it.line] ?? {}, o))) continue
          if (!partners.some((p) => p.brand === o.brand && p.ingredient === id)) partners.push({ brand: o.brand, ingredient: id })
        }
      }
      if (partners.length === 0) continue
    }
    findings.push({
      rule: rule.id,
      tier: rule.tier,
      evidence: rule.evidence,
      effect: rule.effect,
      herbs: [...new Set(triggered.flatMap((it) => it.herbs.filter((h) => rule.herbs.includes(h))))],
      items: [...new Set(triggered.map((it) => it.raw))],
      partners,
      sources: rule.sources,
      ...(rule.caveat && { caveat: rule.caveat }),
      ...(rule.inferred && { inferred: true }),
      pharmacist_approved: rule.pharmacist_approved,
    })
  }
  const order = { inform: 0, silent: 1 } as const
  findings.sort((a, b) => order[a.tier] - order[b.tier])
  return { items, unrecognised, findings, note: NOTE }
}
