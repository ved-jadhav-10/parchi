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
  /** Track A, optional: per_volume_ml was not stated but inferred (per-5-mL syrup convention or a sibling ingredient). */
  per_volume_assumed?: boolean
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

/** Track A, optional detail: a Jan Aushadhi (PMBJP) generic with the same ingredients and strengths. */
export interface JanAushadhiRef {
  /** PMBJP drug code */
  code: number
  /** generic item name as listed */
  name: string
  /** pack size as listed, e.g. "10's" */
  unit: string
  /** e.g. "gastro-resistant"; the pharmacist confirms the release type matches */
  release?: string
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
  /** Jan Aushadhi generics with the same ingredients and strengths (not a safety flag). Pharmacist confirms equivalence. */
  jan_aushadhi?: JanAushadhiRef[]
  /** Track A, optional: usual labelled schedule is not daily (methotrexate tablets, alendronate 70 mg: weekly; ibandronate 150 mg: monthly). Track C can warn on a daily sig. Sourced per drug in data/curated/schedule_hints.csv. */
  schedule_hint?: 'weekly' | 'monthly'
  /** Source URL for `schedule_hint`. */
  schedule_source?: string
  /** Short reasons for the pharmacist, e.g. "Assumed 650 mg; Dolo is also sold as 500 mg". */
  notes?: string[]
}

/**
 * Track B output. `doses_per_day` counts unit doses (tablets, capsules, or one measure of liquid) taken per day,
 * so "1-0-1" is 2 and "2 tab TDS" is 6. SOS lines have `doses_per_day: 0`; `max_doses_per_day` is the worst case.
 */
export interface Sig {
  doses_per_day: number
  max_doses_per_day: number
  sos: boolean
  duration_days?: number
  // Optional Track B detail (see docs/track-b-dose.md). Absent fields mean "not written".
  /** Times the medicine is taken per day (1-0-1 = 2), as opposed to units taken per time. */
  administrations_per_day?: number
  /** mL per administration for liquids ("5 ml", "1 tsp"); the ledger converts with per_volume_ml. */
  volume_ml_per_dose?: number
  /** What one dose is: tablets/capsules, mL, drops or puffs. Drops and puffs cannot be turned into mg. */
  dose_unit?: 'unit' | 'ml' | 'drop' | 'puff'
  stat?: boolean
  /** SOS without a written daily maximum: the limits data supplies a worst-case cap. */
  sos_cap_unspecified?: boolean
  /** 1 = every part of the text understood; lower = something was assumed or not understood. */
  confidence?: number
  /** Plain-language assumptions, e.g. "No dosing written; assumed once daily". */
  assumptions?: string[]
  /** Words in the sig that the parser did not understand. */
  unparsed?: string[]
}

/** Track B output. `total_mg_day` includes SOS lines at their worst-case maximum. */
export interface LedgerEntry {
  total_mg_day: number
  sources: string[]
  limit_mg_day?: number
  // Optional Track B detail (see docs/track-b-dose.md).
  /** Regular (non-SOS) part of `total_mg_day`. */
  scheduled_mg_day?: number
  /** SOS part of `total_mg_day`, at the worst-case number of doses. */
  sos_mg_day?: number
  /** Which rule `limit_mg_day` came from, e.g. "Adult maximum" or "Age 65+ cap". */
  limit_basis?: string
  /** Source of the limit (label, guideline). */
  limit_source?: string
  /** false until the pharmacist has signed the limit off. Show it as unverified. */
  limit_pharmacist_approved?: boolean
  /** Why the total may be understated or overstated (assumed measure, SOS cap assumed, ...). */
  caveats?: string[]
}

export type Ledger = Record<string, LedgerEntry>

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
