// Track A brand resolver: typed brand text -> ResolvedBrand (see docs/track-a-data.md).
// Deterministic and offline: all data comes from public/data/*.json.
import { distance } from 'fastest-levenshtein'
import { doubleMetaphone } from 'double-metaphone'
import type { Ingredient, ResolvedBrand, Route } from '../contracts'
import { createBannedIndex } from './banned'
import { createNsqIndex } from './nsq'
import { fetchResolverData, type BrandRecord, type IngredientInfo, type ResolverData } from './data'
import { HINT_FORMS, MODIFIERS, canonicalize, normaliseText, parseName, type ParsedName } from './normalize'
import { splitBrandAndSig, splitRx } from './segment'

export { splitBrandAndSig, splitRx } from './segment'
export { decodeData, type ResolverData } from './data'

/** Below this the line goes to the pharmacist. */
export const NEEDS_PHARMACIST_BELOW = 0.75
/** Below this we do not name a brand at all; only candidates are returned. */
export const UNRESOLVED_BELOW = 0.6
/** A look-alike with different ingredients scoring within this margin makes the match ambiguous (LASA). */
export const LASA_MARGIN = 0.05

export interface ResolverContext {
  /** Lets the resolver prefer liquid forms for children when the form is not written. */
  age_years?: number
}

export interface Resolver {
  resolve(raw: string, ctx?: ResolverContext): ResolvedBrand
  resolveLine(line: string, ctx?: ResolverContext): { resolved: ResolvedBrand; sig_text: string }
  resolveText(rxText: string, ctx?: ResolverContext): { resolved: ResolvedBrand; sig_text: string }[]
  /** Canonical ingredient id for any spelling ("Acetaminophen" -> "paracetamol"); null if unknown. */
  canonicalId(name: string): string | null
  ingredient(id: string): IngredientInfo | undefined
  /** Other in-index brands with exactly the same composition (not discontinued), most popular first. */
  sameComposition(resolved: ResolvedBrand, limit?: number): string[]
}

interface Line {
  tokens: string[]
  compact: string
  variants: Variant[]
}

interface Variant {
  rec: BrandRecord
  line: Line
  /** numbers that identify this variant: name strengths, ingredient mg and their sum */
  numbers: number[]
  /** display has no strength number, i.e. the brand's base product ("Zerodol-P", not "Zerodol-P 100mg/500mg") */
  base: boolean
}

interface Scored {
  v: Variant
  name: number
  score: number
  strength: 'none' | 'match' | 'partial' | 'mismatch'
}

const SOLID = new Set(['tablet', 'capsule'])
const LIQUID = new Set(['syrup', 'suspension', 'dry_syrup', 'oral_solution', 'oral_drops'])

function phoneticCodes(s: string): string[] {
  if (s.length < 3) return []
  const [a, b] = doubleMetaphone(s)
  return a === b ? [a] : [a, b]
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  const max = Math.max(a.length, b.length)
  if (max === 0) return 0
  let s = 1 - distance(a, b) / max
  if (Math.min(a.length, b.length) >= 3) {
    const pa = phoneticCodes(a)
    if (phoneticCodes(b).some((c) => pa.includes(c))) s += 0.07
  }
  return Math.min(s, 0.96)
}

function trigrams(s: string): string[] {
  const p = `^${s}$`
  const out: string[] = []
  for (let i = 0; i + 3 <= p.length; i++) out.push(p.slice(i, i + 3))
  return out
}

function signature(ings: Ingredient[]): string {
  return ings.map((i) => `${i.id}:${i.mg}:${i.per_volume_ml ?? ''}`).sort().join('|')
}

/** Different medicines? A truncated composition that is a subset of the other is not evidence of that. */
function differentIngredients(a: BrandRecord, b: BrandRecord): boolean {
  const sa = new Set(a.ingredients.map((i) => i.id))
  const sb = new Set(b.ingredients.map((i) => i.id))
  if (sa.size === sb.size && [...sa].every((x) => sb.has(x))) return false
  const subset = (x: Set<string>, y: Set<string>) => [...x].every((i) => y.has(i))
  if (!a.complete && subset(sa, sb)) return false
  if (!b.complete && subset(sb, sa)) return false
  return true
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-6, 0.005 * Math.max(a, b))
}

function maxMg(ings: Ingredient[]): number {
  return ings.reduce((m, i) => Math.max(m, i.mg), 0)
}

export function createResolver(data: ResolverData): Resolver {
  const ingJson = data.ingredients
  const banned = createBannedIndex(data.banned)
  const nsq = createNsqIndex(data.nsq)

  /** "Zerodol-P 100mg/500mg (Aceclofenac 100 mg + Paracetamol 500 mg)" for pharmacist-facing notes. */
  function describe(rec: BrandRecord): string {
    const parts = rec.ingredients.map((i) => {
      const name = ingJson.ingredients[i.id]?.name ?? i.id
      return i.mg ? `${name} ${i.mg} mg${i.per_volume_ml ? `/${i.per_volume_ml} mL` : ''}` : name
    })
    return `${rec.display} (${parts.join(' + ')})`
  }

  // ---- indexes -------------------------------------------------------------------------
  const lines: Line[] = []
  const byKey = new Map<string, Line>()
  const byCompact = new Map<string, Line[]>()
  const byFirstToken = new Map<string, Line[]>()
  const byPhonetic = new Map<string, Line[]>()
  const byComposition = new Map<number, BrandRecord[]>()

  const push = <K,>(m: Map<K, Line[]>, k: K, l: Line) => {
    const list = m.get(k)
    if (!list) m.set(k, [l])
    else if (!list.includes(l)) list.push(l)
  }

  function addVariant(name: string, rec: BrandRecord) {
    const p = parseName(name)
    if (!p.compact) return
    const key = p.tokens.join(' ')
    let line = byKey.get(key)
    if (!line) {
      line = { tokens: p.tokens, compact: p.compact, variants: [] }
      byKey.set(key, line)
      lines.push(line)
      push(byCompact, line.compact, line)
      push(byFirstToken, line.tokens[0], line)
      for (const c of phoneticCodes(line.compact)) push(byPhonetic, c, line)
    }
    if (line.variants.some((v) => v.rec === rec)) return
    const mgs = rec.ingredients.map((i) => i.mg).filter((x) => x > 0)
    const numbers = [...p.numbers, ...mgs]
    if (mgs.length > 1) numbers.push(mgs.reduce((a, b) => a + b, 0))
    line.variants.push({ rec, line, numbers, base: p.numbers.length === 0 })
  }

  for (const rec of data.brands) {
    addVariant(rec.display, rec)
    for (const alias of rec.curated?.aliases ?? []) addVariant(alias, rec)
    const list = byComposition.get(rec.composition)
    if (list) list.push(rec)
    else byComposition.set(rec.composition, [rec])
  }

  const trigramIndex = new Map<string, number[]>()
  const trigramCount: number[] = []
  lines.forEach((line, li) => {
    const grams = [...new Set(trigrams(line.compact))]
    trigramCount[li] = grams.length
    for (const g of grams) {
      const list = trigramIndex.get(g)
      if (list) list.push(li)
      else trigramIndex.set(g, [li])
    }
  })
  const lineIndex = new Map(lines.map((l, i) => [l, i]))

  // Ingredient aliases keyed by compact form, for fuzzy generic names ("paracetmol").
  const aliasCompact = new Map<string, string>()
  for (const [alias, id] of Object.entries(ingJson.aliases)) aliasCompact.set(alias.replace(/[^a-z0-9]/g, ''), id)

  // ---- ingredient ids -------------------------------------------------------------------
  const tables = { aliases: ingJson.aliases, saltWords: new Set(ingJson.normalise.salt_words), inorganicBases: new Set(ingJson.normalise.inorganic_bases) }
  const canonicalId = (raw: string) => canonicalize(raw, tables)

  /** Known ingredient for typed generic text, exact alias first, then a close spelling. */
  function genericId(text: string): { id: string; score: number } | null {
    const id = canonicalId(text)
    if (id && ingJson.ingredients[id]) return { id, score: 1 }
    const compact = normaliseText(text).replace(/[^a-z0-9]/g, '')
    if (compact.length < 5) return null
    let best: { id: string; score: number } | null = null
    for (const [alias, aid] of aliasCompact) {
      if (Math.abs(alias.length - compact.length) > 2) continue
      const s = 1 - distance(alias, compact) / Math.max(alias.length, compact.length)
      if (s >= 0.85 && (!best || s > best.score)) best = { id: aid, score: s }
    }
    return best
  }

  // ---- brand matching -------------------------------------------------------------------
  function candidates(q: ParsedName): Line[] {
    const out = new Set<Line>()
    for (const l of byCompact.get(q.compact) ?? []) out.add(l)
    for (const l of byFirstToken.get(q.tokens[0]) ?? []) out.add(l)
    for (const c of phoneticCodes(q.compact)) for (const l of byPhonetic.get(c) ?? []) out.add(l)
    const counts = new Map<number, number>()
    const grams = [...new Set(trigrams(q.compact))]
    for (const g of grams) for (const li of trigramIndex.get(g) ?? []) counts.set(li, (counts.get(li) ?? 0) + 1)
    const ranked = [...counts.entries()]
      .map(([li, shared]) => [li, shared / (grams.length + trigramCount[li] - shared)] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
    for (const [li] of ranked) out.add(lines[li])
    return [...out]
  }

  function nameScore(q: ParsedName, l: Line): number {
    if (q.compact === l.compact) return 1
    const sameCount = q.tokens.length === l.tokens.length
    // Compact similarity across different token splits conflates "rablett" with "rablet d".
    let best = similarity(q.compact, l.compact) * (sameCount ? 1 : 0.9)
    const n = Math.min(q.tokens.length, l.tokens.length)
    if (sameCount && n > 1) {
      let s = 0
      for (let i = 0; i < n; i++) s += similarity(q.tokens[i], l.tokens[i])
      best = Math.max(best, s / n)
    }
    if (n > 0 && !sameCount) {
      let s = 0
      for (let i = 0; i < n; i++) s += similarity(q.tokens[i], l.tokens[i])
      s /= n
      const extra = q.tokens.length > l.tokens.length ? q.tokens.slice(n) : l.tokens.slice(n)
      const allModifiers = extra.every((t) => MODIFIERS.has(t))
      const factor = q.tokens.length > l.tokens.length
        ? (allModifiers ? 0.92 : 0.8 - 0.05 * (extra.length - 1))
        : (allModifiers ? 0.94 - 0.02 * (extra.length - 1) : 0.86 - 0.04 * (extra.length - 1))
      best = Math.max(best, s * factor)
    }
    return best
  }

  function strengthFit(q: ParsedName, v: Variant): Scored['strength'] {
    if (q.numbers.length === 0) return 'none'
    // A bare number may be in mcg ("Thyronorm 50" = 50 mcg = 0.05 mg).
    const hits = q.numbers.filter((n, i) => v.numbers.some((m) => near(n, m) || (q.unitless[i] && near(n, m * 1000)))).length
    return hits === q.numbers.length ? 'match' : hits > 0 ? 'partial' : 'mismatch'
  }

  function formPreference(v: Variant, ctx: ResolverContext | undefined): number {
    const child = ctx?.age_years !== undefined && ctx.age_years < 12
    if (child) return LIQUID.has(v.rec.form) ? 0 : SOLID.has(v.rec.form) ? 1 : 2
    return SOLID.has(v.rec.form) ? 0 : LIQUID.has(v.rec.form) ? 1 : 2
  }

  function compare(a: Scored, b: Scored, ctx: ResolverContext | undefined): number {
    return (
      b.score - a.score ||
      Number(a.v.rec.discontinued) - Number(b.v.rec.discontinued) ||
      formPreference(a.v, ctx) - formPreference(b.v, ctx) ||
      Number(b.v.base) - Number(a.v.base) ||
      Number(!!b.v.rec.curated) - Number(!!a.v.rec.curated) ||
      a.v.rec.tier - b.v.rec.tier ||
      a.v.rec.index - b.v.rec.index
    )
  }

  function scoreAll(q: ParsedName): Scored[] {
    const out: Scored[] = []
    for (const line of candidates(q)) {
      const name = nameScore(q, line)
      if (name < 0.45) continue
      for (const v of line.variants) {
        const strength = strengthFit(q, v)
        const sf = strength === 'mismatch' ? 0.72 : strength === 'partial' ? 0.9 : 1
        const ff = q.formHint && !HINT_FORMS[q.formHint]?.has(v.rec.form) ? 0.85 : 1
        out.push({ v, name, score: name * sf * ff, strength })
      }
    }
    return out
  }

  function toResolved(raw: string, rec: BrandRecord): ResolvedBrand {
    return {
      raw,
      brand: rec.display,
      confidence: 0,
      ingredients: rec.ingredients.map((i) => ({ ...i })),
      form: rec.form,
      flags: [],
      route: rec.route,
      systemic: data.systemicRoutes.has(rec.route),
      composition_complete: rec.complete,
    }
  }

  function candidateList(list: Scored[], limit = 3): NonNullable<ResolvedBrand['candidates']> {
    const seen = new Set<string>()
    const out: NonNullable<ResolvedBrand['candidates']> = []
    for (const s of list) {
      const key = `${s.v.rec.display}|${s.v.rec.form}|${signature(s.v.rec.ingredients)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ brand: s.v.rec.display, form: s.v.rec.form, score: round(s.score), ingredients: s.v.rec.ingredients.map((i) => ({ ...i })) })
      if (out.length >= limit) break
    }
    return out
  }

  function finish(res: ResolvedBrand, chosen: BrandRecord | null, notes: string[]): ResolvedBrand {
    if (chosen) {
      if (!chosen.complete) {
        notes.push('Source lists at most two ingredients for this product; check the strip for more.')
      }
      if (chosen.discontinued) {
        res.flags.push('discontinued')
        const alts = sameCompositionOf(chosen, 3)
        notes.push(`Marked discontinued in the source data${alts.length ? `; same composition: ${alts.join(', ')}` : ''}.`)
      }
    }
    if (chosen && res.brand) {
      const alerts = nsq.check(res.brand, res.ingredients)
      if (alerts.length) {
        res.flags.push('nsq')
        res.nsq = alerts
        notes.push(`CDSCO lists ${alerts.length} failed batch${alerts.length > 1 ? 'es' : ''} of ${res.brand} (${alerts.map((a) => a.batch).join(', ')}); check the batch number on the strip.`)
      }
    }
    if (res.ingredients.length) {
      const hits = banned.check(res.ingredients, res.form, res.route ?? 'other', res.composition_complete !== false)
      if (hits.length) {
        res.flags.push('banned_fdc')
        res.banned_fdc = hits
      }
    }
    if (res.confidence < NEEDS_PHARMACIST_BELOW) res.needs_pharmacist = true
    if (notes.length) res.notes = notes
    return res
  }

  function sameCompositionOf(rec: BrandRecord, limit: number): string[] {
    return (byComposition.get(rec.composition) ?? [])
      .filter((r) => r !== rec && !r.discontinued && r.route === rec.route)
      .sort((a, b) => a.tier - b.tier || a.index - b.index)
      .slice(0, limit)
      .map((r) => r.display)
  }

  function unresolved(raw: string, scored: Scored[]): ResolvedBrand {
    const res: ResolvedBrand = {
      raw, brand: null, confidence: round(scored[0]?.score ?? 0), ingredients: [], form: 'unknown', flags: [],
      match: 'none', needs_pharmacist: true,
    }
    if (scored.length) res.candidates = candidateList(scored)
    res.notes = ['Could not identify this medicine confidently; please confirm the brand.']
    return res
  }

  function resolveGeneric(raw: string, q: ParsedName): ResolvedBrand | null {
    const parts = raw.split(/\s*\+\s*/).filter(Boolean)
    const ings: Ingredient[] = []
    let score = 1
    const names: string[] = []
    for (const part of parts) {
      const p = parseName(part)
      if (!p.tokens.length) return null
      const hit = genericId(p.tokens.join(' '))
      if (!hit) return null
      score = Math.min(score, hit.score)
      const mg = p.numbers[0]
      ings.push(mg !== undefined ? { id: hit.id, mg } : { id: hit.id, mg: 0, strength_unknown: true })
      names.push(ingJson.ingredients[hit.id]?.name ?? hit.id)
    }
    if (!ings.length) return null
    const formByHint: Record<string, [string, Route]> = {
      tablet: ['tablet', 'oral'], capsule: ['capsule', 'oral'], liquid: ['syrup', 'oral'], drops: ['oral_drops', 'oral'],
      injection: ['injection', 'parenteral'], topical: ['cream', 'topical'], inhaled: ['inhaler', 'inhaled'],
    }
    const [form, route] = formByHint[q.formHint ?? 'tablet'] ?? ['tablet', 'oral']
    const notes: string[] = []
    if (!q.formHint) notes.push('Dosage form not written; assumed tablet.')
    if (ings.some((i) => i.strength_unknown)) notes.push('Strength not written; please confirm it.')
    const res: ResolvedBrand = {
      raw, brand: null, confidence: round(score >= 1 ? 0.95 : score * 0.95), ingredients: ings, form, flags: [],
      route, systemic: data.systemicRoutes.has(route), match: 'generic', composition_complete: true,
    }
    if (ings.some((i) => i.strength_unknown)) res.needs_pharmacist = true
    return finish(res, null, notes)
  }

  function resolve(rawInput: string, ctx?: ResolverContext): ResolvedBrand {
    const raw = rawInput.trim()
    const q = parseName(raw)
    if (!q.compact) return unresolved(raw, [])

    // Generic names ("Paracetamol 500", "Cetirizine + Paracetamol + Phenylephrine") resolve to ingredients.
    if (raw.includes('+') || genericId(q.tokens.join(' '))?.score === 1) {
      const g = resolveGeneric(raw, q)
      if (g) return g
    }

    const scored = scoreAll(q).sort((a, b) => compare(a, b, ctx))
    if (!scored.length || scored[0].score < UNRESOLVED_BELOW) {
      const g = resolveGeneric(raw, q)
      return g ?? unresolved(raw, scored)
    }

    let best = scored[0]
    const notes: string[] = []
    let confidence = best.score
    let needsPharmacist = false

    // Strength not written: prefer the base product, else assume the highest strength (and ask).
    if (q.numbers.length === 0) {
      const group = (f: string) => (SOLID.has(f) ? 'solid' : LIQUID.has(f) ? 'liquid' : f)
      const siblings = scored.filter(
        (s) => s.v.line === best.v.line && s.score >= best.score - 1e-9 &&
          group(s.v.rec.form) === group(best.v.rec.form) && !s.v.rec.discontinued,
      )
      const others = siblings.filter((s) => signature(s.v.rec.ingredients) !== signature(best.v.rec.ingredients))
      if (others.length) {
        if (!best.v.base) {
          best = siblings.reduce((m, s) => (maxMg(s.v.rec.ingredients) > maxMg(m.v.rec.ingredients) ? s : m), best)
          notes.push(`Strength not written; assumed the highest, ${describe(best.v.rec)}.`)
          needsPharmacist = true
          confidence = Math.min(confidence, 0.8)
        } else {
          confidence = Math.min(confidence, 0.95)
        }
        const alts = siblings.filter((s) => signature(s.v.rec.ingredients) !== signature(best.v.rec.ingredients))
        notes.push(`Also sold as ${alts.slice(0, 3).map((s) => describe(s.v.rec)).join('; ')}; confirm the strength.`)
      }
    } else if (best.strength === 'mismatch') {
      notes.push(`No ${best.v.rec.display.split(' ')[0]} product with strength ${q.numbers.join('/')} found; confirm the strength.`)
      needsPharmacist = true
    }
    if (q.formHint && !HINT_FORMS[q.formHint]?.has(best.v.rec.form)) {
      // e.g. "Volini gel" when only Volini tablets are known: never count a tablet silently.
      notes.push(`No ${q.formHint} form found for ${best.v.rec.display}; matched the ${best.v.rec.form.replace('_', ' ')}. Confirm the product.`)
      needsPharmacist = true
    }

    // Look-alike brands with different ingredients scoring about the same: LASA.
    const rivals = scored.filter(
      (s) => s.v.line !== best.v.line && s.score >= best.score - LASA_MARGIN && differentIngredients(s.v.rec, best.v.rec),
    )
    const res = toResolved(raw, best.v.rec)
    const exact = best.name === 1
    if (rivals.length) {
      res.flags.push('lasa')
      needsPharmacist = true
      confidence = Math.min(confidence, 0.7)
      notes.push(`Looks like more than one medicine: ${[best, ...rivals].slice(0, 3).map((s) => describe(s.v.rec)).join(' or ')}.`)
    }

    if (exact && best.strength !== 'mismatch' && !needsPharmacist) {
      confidence = best.v.rec.curated ? Math.min(1, confidence) : Math.min(0.97, confidence)
    } else {
      confidence = Math.min(confidence, 0.95)
      if (!exact) notes.unshift(`Read "${raw}" as ${best.v.rec.display}.`)
    }
    res.confidence = round(confidence)
    res.match = exact ? (best.v.rec.curated ? 'curated' : 'exact') : 'fuzzy'
    if (needsPharmacist) res.needs_pharmacist = true
    if (needsPharmacist || rivals.length || notes.length) {
      const pool = [best, ...rivals, ...scored.filter((s) => s !== best && !rivals.includes(s))]
      res.candidates = candidateList(pool.filter((s) => s !== best), 3)
      if (!res.candidates.length) delete res.candidates
    }
    return finish(res, best.v.rec, notes)
  }

  return {
    resolve,
    resolveLine(line, ctx) {
      const { brand, sig } = splitBrandAndSig(line)
      return { resolved: resolve(brand, ctx), sig_text: sig }
    },
    resolveText(rxText, ctx) {
      return splitRx(rxText).map((line) => {
        const { brand, sig } = splitBrandAndSig(line)
        return { resolved: resolve(brand, ctx), sig_text: sig }
      })
    },
    canonicalId(name) {
      const id = canonicalId(name)
      return id && ingJson.ingredients[id] ? id : null
    },
    ingredient: (id) => ingJson.ingredients[id],
    sameComposition(resolved, limit = 5) {
      if (!resolved.brand) return []
      const sig = signature(resolved.ingredients)
      const rec = data.brands.find((b) => b.display === resolved.brand && b.form === resolved.form && signature(b.ingredients) === sig)
      return rec ? sameCompositionOf(rec, limit) : []
    },
  }
}

function round(x: number): number {
  return Math.round(x * 100) / 100
}

let cached: Promise<Resolver> | null = null

/** Browser entry: loads public/data once (service-worker cached, works offline). */
export function loadResolver(baseUrl = `${import.meta.env.BASE_URL}data/`): Promise<Resolver> {
  cached ??= fetchResolverData(baseUrl).then(createResolver)
  return cached
}
