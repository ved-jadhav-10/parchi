// Shared contracts. Additive changes only (new optional fields). See PLAN.md.
// Ingredient id = canonical lowercase INN slug owned by Track A, e.g. "paracetamol".

export type Flag = 'banned_fdc' | 'lasa' | 'discontinued' | 'nsq'
export type Tier = 'interrupt' | 'inform' | 'silent'

export interface Ingredient {
  id: string
  mg: number
  per_volume_ml?: number
  /** Track A, optional: strength not expressible in mg (IU, % w/w, spores). `mg` is 0 then. */
  other_unit?: { unit: string; amount: number }
  /** Track A, optional: the source gives no usable strength. `mg` is 0 then. */
  strength_unknown?: boolean
}

/** Track A, optional detail. Only systemic routes count toward the daily mg ledger. */
export type Route =
  | 'oral' | 'parenteral' | 'inhaled' | 'rectal' | 'transdermal'
  | 'topical' | 'ophthalmic' | 'otic' | 'nasal' | 'vaginal' | 'other'

/** Track A, optional detail: a CDSCO NSQ / spurious alert for a batch of this brand name (monthly lists). */
export interface NsqRef {
  batch: string
  month: string
  /** what failed, as published */
  result: string
  product: string
  manufacturer: string
  spurious: boolean
}

/** Track A, optional detail: a banned-FDC notification the product matches. */
export interface BannedFdcRef {
  so: string
  date: string
  list: string
  text: string
  /** false when the product's listed composition may be incomplete */
  certain: boolean
}

/** Track A output */
export interface ResolvedBrand {
  raw: string
  brand: string | null
  confidence: number
  ingredients: Ingredient[]
  form: string
  flags: Flag[]
  // Optional Track A detail (see docs/track-a-data.md). Absent fields mean "not known".
  route?: Route
  systemic?: boolean
  match?: 'curated' | 'exact' | 'fuzzy' | 'generic' | 'none'
  /** Ask the pharmacist: low confidence, look-alike brands or an assumed strength. */
  needs_pharmacist?: boolean
  /** false when the source may list only some ingredients (dataset shows at most two). */
  composition_complete?: boolean
  /** What else the text could mean (look-alikes, other strengths), best first. */
  candidates?: { brand: string; form: string; score: number; ingredients: Ingredient[] }[]
  banned_fdc?: BannedFdcRef[]
  /** Failed batches of this brand name in the CDSCO lists. Batch-specific: the pharmacist checks the strip. */
  nsq?: NsqRef[]
  /** Short reasons for the pharmacist, e.g. "Assumed 650 mg; Dolo is also sold as 500 mg". */
  notes?: string[]
}

/** Track B output */
export interface Sig {
  doses_per_day: number
  max_doses_per_day: number
  sos: boolean
  duration_days?: number
}

/** Track B output */
export type Ledger = Record<
  string,
  { total_mg_day: number; sources: string[]; limit_mg_day?: number }
>

/** Track C output */
export interface Alert {
  tier: Tier
  type: string
  ingredients: string[]
  reason: string
  source: string
  confidence: number
}

export interface Patient {
  age_years: number
  weight_kg?: number
  serum_creatinine?: number
  sex?: 'M' | 'F'
}

/** Track C pipeline entry point, called by the UI */
export type CheckPrescription = (rxText: string, patient: Patient) => Promise<{
  lines: { resolved: ResolvedBrand; sig: Sig }[]
  ledger: Ledger
  alerts: Alert[]
}>
