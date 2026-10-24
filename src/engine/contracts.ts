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

/**
 * Track A, Phase 2: best guess at what an unrecognised product contains. Always unverified; it must never enter the
 * dose totals until a pharmacist confirms it.
 */
export interface ProposedComposition {
  /** Product the guess is based on (closest brand name), or null when it comes from composition text the buyer supplied. */
  brand: string | null
  form: string
  route?: Route
  systemic?: boolean
  ingredients: Ingredient[]
  /** 0..1 belief that `ingredients` is right. Lower when the next-best matches have a different composition. */
  confidence: number
  basis: 'similar_brand_name' | 'buyer_composition_text'
  unverified: true
  /** Why the pharmacist should look, e.g. "Two similar brands have different compositions". */
  caution?: string
}

/** Track A output */
export interface ResolvedBrand {
  raw: string
  /** Batch number written on the line ("batch AR5112"); lets a failed-batch (NSQ) alert say whether it is this exact batch. */
  batch?: string
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
  /** Track A, Phase 2: set only when the brand is not recognised (`match: 'none'`) and a guess exists. */
  proposed_composition?: ProposedComposition
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
  /** true = no dosing was written at all. The line is left out of the daily totals instead of guessing a frequency. */
  dosing_missing?: boolean
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
  // Optional Track C detail. Absent fields mean "not applicable".
  /** Brand names (as resolved) the alert is about, for highlighting rows in the X-ray. */
  brands?: string[]
  /** false = the rule behind this alert is a draft not yet signed off by the pharmacist. */
  approved?: boolean
  /** Id of the suppression-list entry that moved this alert to 'silent'. */
  suppressed?: string
  /** true = was 'interrupt' but the alert budget moved it to 'inform'. */
  budget_demoted?: boolean
  /** true = was 'interrupt' but rests on a brand match the resolver could not confirm, so it is an 'inform'. */
  uncertain_match?: boolean
  /** Why the numbers behind this alert may be off (assumed measure, SOS cap assumed, ...), from the ledger. */
  caveats?: string[]
  /** Interactions from a curated rule: one drug weakens another, or both add to the same effect. */
  interaction_effect?: 'reduces_effect' | 'adds_effect'
  /** Ingredient ids that may lose effect (with interaction_effect 'reduces_effect'). */
  reduces?: string[]
  /** How: 'activation_blocked' | 'opposing_action' | 'absorption_blocked' | 'faster_breakdown' | 'same_action'. */
  mechanism?: string
  /** Label behind the direction and mechanism, when `source` is DDInter's id. */
  label_source?: string
  // Optional Track C detail, history check only (Phase 2).
  /** Doctors whose prescriptions the alert is about. */
  doctors?: string[]
  /** Prescriptions (contract 5 ids) the alert is about. */
  rx_ids?: string[]
  /** true = the lines behind the alert come from two or more doctors. */
  cross_doctor?: boolean
  /** Dates the alert applies to; the worst overlap window. `end` is exclusive. */
  window?: { start: string; end: string }
  /** true = rests on a brand composition the resolver only proposed (not confirmed by a pharmacist). */
  unverified?: boolean
}

export interface Patient {
  age_years: number
  weight_kg?: number
  serum_creatinine?: number
  sex?: 'M' | 'F'
  // Optional, additive (FIX_PLAN Phase 2). Absent = not entered; the engine never assumes "none".
  /** Known drug allergies: a group ("penicillin", "sulfonamide", "nsaid", ...) or one medicine's name. */
  allergies?: string[]
  /** 'yes' applies the pregnancy rules; 'unknown' (or absent) asks for it only when a drug on the Rx needs it. */
  pregnancy?: 'yes' | 'no' | 'unknown'
  /** Known liver disease: lowers the paracetamol limit. */
  liver_disease?: boolean
  /** Regular heavy alcohol use: lowers the paracetamol limit. */
  heavy_alcohol_use?: boolean
  /** The lab's own eGFR (mL/min/1.73 m2). Used for kidney rules only when Cockcroft-Gault cannot be calculated (no weight or creatinine). */
  egfr?: number
}

/** Track C pipeline entry point, called by the UI */
export type CheckPrescription = (rxText: string, patient: Patient) => Promise<{
  lines: { resolved: ResolvedBrand; sig: Sig }[]
  ledger: Ledger
  alerts: Alert[]
}>

// ---- Phase 2: a customer's history (contracts 5-7, additive; see PLAN.md) ----

/** Contract 5: one prescription. `date` is the ISO date it was written; `text` is the usual structured lines. */
export interface Prescription {
  id: string
  doctor: string
  date: string
  text: string
  /** Whom it is for, as written (a name or a reference). Accounts are often shared by a family, so history is never added up across different names. */
  patient?: string
}

/** Contract 6: a lab value. The latest `serum_creatinine` feeds CrCl. */
export interface LabResult {
  type: 'serum_creatinine'
  value: number
  date: string
}

export type OrderStatus = 'clear' | 'clear_with_note' | 'hold_contact_doctor'

/** Contract 7: a check line plus where and when it came from. `end` is exclusive (start + duration). */
export interface HistoryLine {
  resolved: ResolvedBrand
  sig: Sig
  rx_id: string
  doctor: string
  start: string
  end?: string
  /** true = the brand is not recognised; only a proposed composition exists and it is left out of the totals. */
  unverified?: boolean
  /** true = no duration was written, so the window uses an assumed length (from the quantity, a class default, or the general default). */
  default_window?: boolean
  /** Where the length of this line's window came from. */
  duration_source?: 'written' | 'quantity' | 'class_default' | 'default'
  /** Days this line was cut short because the same doctor repeated the same medicine a few days before it ran out (a refill, not a double). */
  refill_overlap_days?: number
}

/** Alerts added, cleared or moved to another tier between two checks of the same customer. */
export interface AlertChanges {
  added: Alert[]
  cleared: Alert[]
  changed: { before: Alert; after: Alert }[]
}

/** A stretch of days with the same set of medicines active; doses are added up inside it. */
export interface HistoryWindow {
  start: string
  end: string
  rx_ids: string[]
  ledger: Ledger
}

export interface HistoryResult {
  lines: HistoryLine[]
  /** Per ingredient, the highest total over any window (the worst overlap). */
  ledger: Ledger
  alerts: Alert[]
  windows: HistoryWindow[]
  /** Suggested order status derived from the tiers; the pharmacist decides. */
  status: OrderStatus
  /** Review-queue rank: higher means look first. */
  priority: number
  /** Set when the check was given a previous result (e.g. after a new creatinine arrived). */
  changes?: AlertChanges
  /** Serum creatinine actually used for CrCl, with its date. */
  creatinine_used?: { value: number; date: string }
  /** Patient details still missing, asked only because a drug in the history needs them. */
  needs?: { field: 'weight_kg' | 'serum_creatinine' | 'sex'; reason: string; ingredients: string[] }[]
  /** The date the check was made as of (the order under review). */
  as_of?: string
}
