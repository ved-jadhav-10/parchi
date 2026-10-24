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

export interface DdiHit {
  a: string
  b: string
  level: DdiLevel
  /** source chip, e.g. "DDInter20 / DDInter900" */
  source: string
}

export interface DdiIndex {
  lookup(a: string, b: string): DdiHit | null
  /** All interacting pairs among these ingredient ids (each pair once), most severe first. */
  among(ids: string[]): DdiHit[]
  /** True when DDInter has the drug at all; absence of a hit then means "no known interaction". */
  covers(id: string): boolean
  gaps: string
}

export function createDdiIndex(json: DdiJson): DdiIndex {
  if (json.schema !== 1) throw new Error('Unsupported ddi.json schema; rebuild with data/build.py')
  const level = new Map<string, number>()
  for (const [i, j, lv] of json.pairs) level.set(`${json.ingredients[i]}|${json.ingredients[j]}`, lv)
  const covered = new Set(Object.keys(json.ddinter_ids))

  function lookup(a: string, b: string): DdiHit | null {
    if (a === b) return null
    const [x, y] = a < b ? [a, b] : [b, a]
    const lv = level.get(`${x}|${y}`)
    if (lv === undefined) return null
    return { a: x, b: y, level: json.levels[lv], source: `${json.ddinter_ids[x] ?? x} / ${json.ddinter_ids[y] ?? y}` }
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
  return createDdiIndex((await res.json()) as DdiJson)
}
