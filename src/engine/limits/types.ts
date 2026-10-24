// Track B limits: types for limits.json and for what the dose engine hands to Track C (rules/alerts).

export interface Provenance {
  /** Where the number comes from. Never invented: unverified values say so. */
  source: string
  /** false until the pharmacist has signed the value off. */
  pharmacist_approved: boolean
  approved_by?: string
  /**
   * Date a script last found the quoted label sentence word for word in the source (data/limit_evidence.py).
   * It says the number matches a label; it is not a pharmacist's approval and never sets pharmacist_approved.
   */
  label_checked?: string
}

export interface MaxPerDay extends Provenance {
  max_mg_day: number
}

export interface MaxPerKgDay extends Provenance {
  max_mg_per_kg_day: number
}

export interface RenalRule extends Provenance {
  /** Applies when CrCl (mL/min) is below this. The lowest matching band wins. */
  crcl_below: number
  /** avoid = alert, no safe dose; caution = alert, monitor; max_mg_day = lower numeric cap. */
  action: 'avoid' | 'caution' | 'max_mg_day'
  max_mg_day?: number
}

/** A lower adult cap that applies when a risk factor is present (instead of an age-only cap). */
export interface RiskCap extends Provenance {
  factor: 'low_weight' | 'liver_disease' | 'heavy_alcohol_use'
  /** low_weight only: applies when weight is below this many kg. */
  weight_below?: number
  max_mg_day?: number
  max_mg_per_kg_day?: number
}

export interface IngredientLimits {
  adult?: MaxPerDay
  elderly?: MaxPerDay
  paediatric?: MaxPerKgDay
  renal?: RenalRule[]
  risk_caps?: RiskCap[]
}

export interface SosCap extends Provenance {
  max_doses_per_day: number
}

export interface LimitsData {
  _meta: { elderly_age_from: number; paediatric_age_below: number; [k: string]: unknown }
  sos: {
    by_ingredient: Record<string, SosCap>
    by_class: Record<string, SosCap>
    fallback: SosCap
  }
  ingredients: Record<string, IngredientLimits>
  /** Phase 2: how long a line with no duration is assumed to run. */
  windows: { default_duration_days: number } & Provenance
}

/** Patient detail the engine needs and does not have yet. Ask for it only when an ingredient on the prescription needs it. */
export interface PatientNeed {
  field: 'weight_kg' | 'serum_creatinine' | 'sex'
  /** Plain-language reason to show next to the question. */
  reason: string
  ingredients: string[]
}

export type FindingKind = 'over_limit' | 'renal_avoid' | 'renal_caution'

/** Facts for Track C to turn into alerts. Tiering is C's job; B only reports what the numbers say. */
export interface LimitFinding {
  kind: FindingKind
  ingredient: string
  total_mg_day: number
  limit_mg_day?: number
  /** Which rule applied, e.g. "Adult maximum", "Paediatric 60 mg/kg/day x 15 kg", "Kidney: CrCl 34 mL/min (below 60)". */
  basis: string
  source: string
  pharmacist_approved: boolean
  /** true when the scheduled doses alone stay within the limit and only SOS use at its worst case goes over. */
  sos_dependent?: boolean
  /** CrCl used for renal findings. */
  crcl_ml_min?: number
  message: string
}
