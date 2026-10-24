// Phase 2 shapes, mirroring the contracts PLAN.md proposes (5 Prescription, 6 LabResult, 7 history result).
// They live here until the team agrees them; then they move to src/engine/contracts.ts (additive) and Track C's
// `checkHistory` replaces src/ui/history/check.ts.
import type { Alert, Ledger, ResolvedBrand, Sig, Tier } from '../../engine/contracts'
import type { PatientPrompt } from '../engine'

/** Contract 5. `text` is the digitised prescription, one medicine per line or separated by semicolons. */
export interface Prescription {
  id: string
  doctor: string
  /** ISO date, YYYY-MM-DD */
  date: string
  text: string
}

/** Contract 6. The latest value feeds the kidney estimate. */
export interface LabResult {
  type: 'serum_creatinine'
  /** mg/dL */
  value: number
  /** ISO date */
  date: string
}

export interface Customer {
  name: string
  age_years: number
  sex?: 'M' | 'F'
  weight_kg?: number
}

/** One order on the review desk: a customer, their dated prescriptions and the labs known for them. */
export interface Order {
  id: string
  /** ISO date the order was placed */
  placed: string
  customer: Customer
  prescriptions: Prescription[]
  labs: LabResult[]
  /** Results that reached the platform but are not in the check yet; adding one triggers a re-check. */
  incoming_labs?: LabResult[]
}

/** Contract 7: what Parchi suggests; the pharmacist decides. */
export type OrderStatus = 'clear' | 'clear_with_note' | 'hold_contact_doctor'

export interface HistoryLine {
  /** Position in `HistoryResult.lines` */
  index: number
  rx_id: string
  doctor: string
  /** ISO date the line starts (the prescription date) */
  start: string
  /** ISO date the line stops, exclusive */
  end: string
  /** true when the prescription wrote no duration and the default window was used (unverified) */
  end_assumed: boolean
  /** The line as the engine reads it: brand text plus dosing text */
  text: string
  resolved: ResolvedBrand
  sig: Sig
  /** Not recognised: shown as unverified and left out of the totals */
  unverified: boolean
}

export interface Prescribed {
  rx_id: string
  doctor: string
  date: string
}

export interface HistoryAlert extends Alert {
  /** The prescriptions behind this alert, so a cross-doctor problem names the doctors and dates */
  prescribed: Prescribed[]
  cross_doctor: boolean
  /** ISO dates: the first and last day (exclusive) of the windows where this alert applies */
  from: string
  to: string
}

/** A stretch of days during which the same lines are active; the engine runs once on it. */
export interface HistoryWindow {
  start: string
  end: string
  /** `HistoryLine.index` of the active lines */
  lines: number[]
  ledger: Ledger
  alerts: Alert[]
}

export interface HistoryResult {
  lines: HistoryLine[]
  windows: HistoryWindow[]
  alerts: HistoryAlert[]
  /** Index into `windows` of the one with the most serious alerts */
  peak: number
  status: OrderStatus
  /** Higher = review sooner (the queue is sorted by this) */
  priority: number
  unverified: HistoryLine[]
  prompts: PatientPrompt[]
  crcl: number | null
}

export interface AlertChange {
  kind: 'added' | 'cleared' | 'tier_changed'
  alert: HistoryAlert
  /** For `tier_changed`: the tier it had before */
  was?: Tier
}

/** The pharmacist's decision on an order. Saved on this device and listed in the audit log. */
export interface Decision {
  id?: number
  at: string
  order_id: string
  customer: string
  suggested: OrderStatus
  decision: OrderStatus
  reason: string
  note?: string
  /** What the pharmacist was looking at: counts per tier at the time */
  interrupts: number
  informs: number
}
