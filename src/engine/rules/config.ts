// Track C alert policy (data: public/data/alert_rules.json). Numbers and lists live in the data file, not in code.
import type { Tier } from '../contracts'

export interface ClassDupRule {
  class: string
  label: string
  tier: Tier
  source: string
  pharmacist_approved: boolean
}

export interface PatientRule {
  id: string
  /** match by canonical ingredient id and/or by Track A class */
  ingredients?: string[]
  classes?: string[]
  age_at_least?: number
  /** needs Cockcroft-Gault CrCl; the rule asks for missing inputs instead of silently skipping */
  crcl_below?: number
  tier: Tier
  /** placeholders: {names} {crcl} {age} */
  reason: string
  source: string
  pharmacist_approved: boolean
}

export interface SuppressionRule {
  id: string
  type?: string
  /** matches when every ingredient of the alert belongs to one of these classes */
  all_in_classes?: string[]
  reason: string
  source: string
  pharmacist_approved: boolean
}

export interface AlertRules {
  schema: number
  alert_budget: { max_interrupts_per_rx: number; pharmacist_approved: boolean }
  ddi_tiers: {
    major: Tier | null
    moderate: Tier | null
    minor: Tier | null
    unknown: Tier | null
    /** "a|b" pairs (ids sorted) that the pharmacist wants as Interrupt */
    interrupt_pairs: string[]
    source: string
    pharmacist_approved: boolean
  }
  class_duplication: ClassDupRule[]
  patient_rules: PatientRule[]
  suppression: SuppressionRule[]
}

export function parseAlertRules(json: unknown): AlertRules {
  const r = json as AlertRules
  if (!r || r.schema !== 1) throw new Error('Unsupported alert_rules.json schema')
  return r
}

/** Browser loader (service-worker cached). */
export async function loadAlertRules(baseUrl = `${import.meta.env.BASE_URL}data/`): Promise<AlertRules> {
  const res = await fetch(`${baseUrl}alert_rules.json`)
  if (!res.ok) throw new Error(`Failed to load alert_rules.json: ${res.status}`)
  return parseAlertRules(await res.json())
}
