// Track B: Ayurvedic / herbal names and their conflicts with ordinary medicines. Evidence-graded, never "safe".

export type Evidence = 'established' | 'limited'
export type HerbalTier = 'inform' | 'silent'

export interface Source {
  label: string
  url: string
}

export interface HerbalRule {
  id: string
  herbs: string[]
  /** Ordinary medicines the herb conflicts with: Track A ingredient ids and/or classes. Empty = a note about the herb or product alone. */
  with: { ingredients?: string[]; classes?: string[] }
  effect: string
  evidence: Evidence
  /** Suggested tier: established evidence = inform, limited = silent (shown as a note, not an alert). The pharmacist sets the real one. */
  tier: HerbalTier
  sources: Source[]
  caveat?: string
  /** true when the link to the patient's condition is our inference, not the source's finding. */
  inferred?: boolean
  pharmacist_approved: boolean
}

export type ItemKind = 'herb' | 'formulation' | 'ambiguous' | 'herbo_mineral'

/** One prescription line that is an Ayurvedic or herbal item. */
export interface HerbalItem {
  /** index of the line in the prescription text */
  line: number
  raw: string
  brand: string
  sig: string
  kind: ItemKind
  /** ids of the herbs, formulations or ambiguous names matched */
  ids: string[]
  /** readable names, with the Latin name where known */
  names: string[]
  /** herb ids after expanding formulations (Trikatu = ginger + black pepper + long pepper) */
  herbs: string[]
  confidence: number
  note?: string
  /** history mode: which prescription it came from and the days it is taken */
  rx_id?: string
  doctor?: string
  start?: string
  /** last day taken (inclusive) */
  end?: string
  /** true when the prescription wrote no duration and the unverified default window was used */
  window_assumed?: boolean
}

export interface UnrecognisedItem {
  line: number
  raw: string
  reason: string
  rx_id?: string
  doctor?: string
}

export interface Partner {
  /** the ordinary medicine line, as the pharmacist sees it */
  brand: string
  ingredient: string
}

export interface HerbalFinding {
  rule: string
  tier: HerbalTier
  evidence: Evidence
  effect: string
  /** herb ids that triggered this */
  herbs: string[]
  /** prescription lines of the herbal items */
  items: string[]
  /** ordinary medicines it conflicts with (empty for a note about the item alone) */
  partners: Partner[]
  sources: Source[]
  caveat?: string
  inferred?: boolean
  pharmacist_approved: boolean
}

export interface HerbalReport {
  items: HerbalItem[]
  unrecognised: UnrecognisedItem[]
  findings: HerbalFinding[]
  /** Always shown with the result: what this check can and cannot say. */
  note: string
}

/** An ordinary medicine line, reduced to what the rules need. */
export interface OrdinaryLine {
  brand: string
  ingredients: string[]
  /** history mode: the course window, to match only medicines taken at the same time */
  start?: string
  end?: string
}
