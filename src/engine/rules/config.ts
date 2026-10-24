// Track C alert policy (data: public/data/alert_rules.json). Numbers and lists live in the data file, not in code.
import type { OrderStatus, Tier } from '../contracts'

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
  /** lower edge of the CrCl band (inclusive), so a "caution" band does not repeat the "avoid" band below it */
  crcl_at_least?: number
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

/** How Track B's dose facts (limits, kidney bands, notes) become alerts. Tiers are policy, so they live in data. */
export interface DosePolicy {
  /** kidney finding for a drug the patient rules do not already cover */
  renal_avoid: Tier
  renal_caution: Tier
  /** over the limit only if the SOS dose is used at its worst-case maximum */
  over_limit_sos_only: Tier
  /** ledger notes that change what the total means: tier per note kind (kinds not listed raise nothing) */
  notes: Record<string, Tier>
  /** sig confidence below this raises `sig_unclear` */
  sig_unclear_below: number
  sig_unclear_tier: Tier
  source: string
  pharmacist_approved: boolean
}

/** Scored scales (anticholinergic burden, CNS depressants): an alert when the patient's total reaches the threshold. */
export interface BurdenScale {
  id: string
  /** display name, e.g. "anticholinergic burden" */
  label: string
  /** points per canonical ingredient id */
  scores: Record<string, number>
  /** points per Track A class, used when the ingredient has no own score */
  class_scores?: Record<string, number>
  /** alert when the total across different ingredients reaches this */
  threshold: number
  /** need at least this many contributing ingredients (a single strong drug is not stacking) */
  min_ingredients: number
  age_at_least?: number
  tier: Tier
  source: string
  pharmacist_approved: boolean
}

/** One group of a stacking rule: the Rx ingredients in these classes or ids, minus `exclude`. */
export interface StackGroup {
  label: string
  classes?: string[]
  ingredients?: string[]
  exclude?: string[]
  /** distinct ingredients needed for the group to count (default 1) */
  min?: number
}

/** Harm from a combination of three or more drug types that no pairwise interaction lookup sees (e.g. the "triple whammy"). */
export interface StackRule {
  id: string
  label: string
  groups: StackGroup[]
  /** how many groups must be present (default: all of them) */
  min_groups?: number
  tier: Tier
  /** raise the tier when any of these holds */
  escalate?: { tier: Tier; age_at_least?: number; crcl_below?: number; classes?: string[]; min_ingredients?: number }
  /** alert types this one replaces when it covers the same ingredients (e.g. a plain class duplication) */
  supersedes?: string[]
  /** placeholders: {names} {age} {crcl} */
  reason: string
  source: string
  pharmacist_approved: boolean
}

/** WHO AWaRe antibiotic groups: which ingredient is Access, Watch or Reserve, and what each group raises. */
export interface AwareConfig {
  label: string
  /** tier per group; a group left out or null raises nothing */
  tiers: { reserve?: Tier | null; watch?: Tier | null }
  version: string
  source: string
  ingredients: Record<string, 'access' | 'watch' | 'reserve'>
  pharmacist_approved: boolean
}

/** Policy for the whole-history check (Phase 2). */
export interface HistoryPolicy {
  /** A repeat of the same composition by the same doctor, collected up to this many days early, continues the earlier course instead of overlapping it. Absent or 0 = off. */
  refill?: { grace_days: number; source: string; pharmacist_approved: boolean }
  /** order status from the worst tier on the order */
  status_by_tier: Record<Tier, OrderStatus>
  /** review-queue ranking: higher = look first */
  queue: {
    tier_weight: Record<Tier, number>
    /** extra points for a kind of alert, e.g. a banned FDC outranks a duplicate */
    type_bonus: Record<string, number>
    cross_doctor_bonus: number
    pharmacist_approved: boolean
  }
}

export interface AlertRules {
  schema: number
  /** `never_demote`: alert types the budget may never move to Inform (a contraindication is never "one too many") */
  alert_budget: { max_interrupts_per_rx: number; never_demote?: string[]; pharmacist_approved: boolean }
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
  dose_policy: DosePolicy
  burden_scales: BurdenScale[]
  stack_rules: StackRule[]
  aware?: AwareConfig
  history: HistoryPolicy
}

const DEFAULT_DOSE_POLICY: DosePolicy = {
  renal_avoid: 'interrupt',
  renal_caution: 'inform',
  over_limit_sos_only: 'inform',
  notes: {},
  sig_unclear_below: 0.7,
  sig_unclear_tier: 'inform',
  source: 'Default dose policy',
  pharmacist_approved: false,
}

const DEFAULT_HISTORY: HistoryPolicy = {
  status_by_tier: { interrupt: 'hold_contact_doctor', inform: 'clear_with_note', silent: 'clear' },
  queue: { tier_weight: { interrupt: 100, inform: 10, silent: 0 }, type_bonus: {}, cross_doctor_bonus: 0, pharmacist_approved: false },
}

export function parseAlertRules(json: unknown): AlertRules {
  const r = json as AlertRules
  if (!r || r.schema !== 1) throw new Error('Unsupported alert_rules.json schema')
  // Sections added after the first version are optional, so an older cached file still loads.
  return {
    ...r,
    dose_policy: { ...DEFAULT_DOSE_POLICY, ...r.dose_policy },
    burden_scales: r.burden_scales ?? [],
    stack_rules: r.stack_rules ?? [],
    history: { ...DEFAULT_HISTORY, ...r.history, queue: { ...DEFAULT_HISTORY.queue, ...r.history?.queue } },
  }
}

/** Browser loader (service-worker cached). */
export async function loadAlertRules(baseUrl = `${import.meta.env.BASE_URL}data/`): Promise<AlertRules> {
  const res = await fetch(`${baseUrl}alert_rules.json`)
  if (!res.ok) throw new Error(`Failed to load alert_rules.json: ${res.status}`)
  return parseAlertRules(await res.json())
}
