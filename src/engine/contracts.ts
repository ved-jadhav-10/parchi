// Shared contracts. Additive changes only (new optional fields). See PLAN.md.
// Ingredient id = canonical lowercase INN slug owned by Track A, e.g. "paracetamol".

export type Flag = 'banned_fdc' | 'lasa' | 'discontinued'
export type Tier = 'interrupt' | 'inform' | 'silent'

export interface Ingredient {
  id: string
  mg: number
  per_volume_ml?: number
}

/** Track A output */
export interface ResolvedBrand {
  raw: string
  brand: string | null
  confidence: number
  ingredients: Ingredient[]
  form: string
  flags: Flag[]
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
