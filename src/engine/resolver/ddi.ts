// DDInter interaction lookup over canonical ingredient ids (data: public/data/ddi.json).
// Track C owns how a level becomes an alert tier; this only answers "do these interact, how badly".

export type DdiLevel = 'unknown' | 'minor' | 'moderate' | 'major'

export interface DdiJson {
  schema: number
  source: { name: string; url: string; licence: string; gaps: string }
  levels: DdiLevel[]
  ingredients: string[]
  ddinter_ids: Record<string, string>
  pairs: [number, number, number][]
}

/** Hand-curated rules for pairs DDInter lacks (public/data/ddi_supplement.json). Each expands to every a x b pair. */
export interface DdiSupplementJson {
  schema: number
  rules: { id: string; a: string[]; b: string[]; level: DdiLevel; note: string; source: string; pharmacist_approved: boolean }[]
}

export interface DdiHit {
  a: string
  b: string
  level: DdiLevel
  /** source chip, e.g. "DDInter20 / DDInter900" */
  source: string
  /** Why, in a few words. Only curated rules carry one. */
  note?: string
  /** false = a curated rule not yet checked by the pharmacist. Absent for DDInter pairs. */
  curated?: boolean
}

export interface DdiIndex {
  lookup(a: string, b: string): DdiHit | null
  /** All interacting pairs among these ingredient ids (each pair once), most severe first. */
  among(ids: string[]): DdiHit[]
  /** True when DDInter has the drug at all; absence of a hit then means "no known interaction". */
  covers(id: string): boolean
  gaps: string
}

export function createDdiIndex(json: DdiJson, supplement?: DdiSupplementJson): DdiIndex {
  if (json.schema !== 1) throw new Error('Unsupported ddi.json schema; rebuild with data/build.py')
  const level = new Map<string, number>()
  for (const [i, j, lv] of json.pairs) level.set(`${json.ingredients[i]}|${json.ingredients[j]}`, lv)
  const covered = new Set(Object.keys(json.ddinter_ids))
  const curated = new Map<string, DdiHit>()
  for (const rule of supplement?.schema === 1 ? supplement.rules : []) {
    for (const p of rule.a) {
      for (const q of rule.b) {
        if (p === q) continue
        const [x, y] = p < q ? [p, q] : [q, p]
        const have = curated.get(`${x}|${y}`)
        if (!have || json.levels.indexOf(rule.level) > json.levels.indexOf(have.level)) {
          curated.set(`${x}|${y}`, { a: x, b: y, level: rule.level, source: `Curated: ${rule.source}`, note: rule.note, curated: true })
        }
      }
    }
  }

  function lookup(a: string, b: string): DdiHit | null {
    if (a === b) return null
    const [x, y] = a < b ? [a, b] : [b, a]
    const lv = level.get(`${x}|${y}`)
    const base: DdiHit | null = lv === undefined ? null : { a: x, b: y, level: json.levels[lv], source: `${json.ddinter_ids[x] ?? x} / ${json.ddinter_ids[y] ?? y}` }
    const extra = curated.get(`${x}|${y}`)
    // Where both list the pair, the more severe one wins (a curated rule never softens DDInter).
    return extra && (!base || json.levels.indexOf(extra.level) > json.levels.indexOf(base.level)) ? extra : base
  }

  return {
    lookup,
    among(ids) {
      const uniq = [...new Set(ids)].sort()
      const hits: DdiHit[] = []
      for (let i = 0; i < uniq.length; i++) {
        for (let j = i + 1; j < uniq.length; j++) {
          const h = lookup(uniq[i], uniq[j])
          if (h) hits.push(h)
        }
      }
      return hits.sort((p, q) => json.levels.indexOf(q.level) - json.levels.indexOf(p.level))
    },
    covers: (id) => covered.has(id),
    gaps: json.source.gaps,
  }
}

/** Browser loader (service-worker cached). */
export async function loadDdi(baseUrl = `${import.meta.env.BASE_URL}data/`): Promise<DdiIndex> {
  const res = await fetch(`${baseUrl}ddi.json`)
  if (!res.ok) throw new Error(`Failed to load ddi.json: ${res.status}`)
  // The curated supplement is optional: without it the index is DDInter only.
  const extra = await fetch(`${baseUrl}ddi_supplement.json`).then((r) => (r.ok ? (r.json() as Promise<DdiSupplementJson>) : undefined)).catch(() => undefined)
  return createDdiIndex((await res.json()) as DdiJson, extra)
}
