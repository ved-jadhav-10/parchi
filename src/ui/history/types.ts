// Review-desk shapes (Track D). Prescription, LabResult and OrderStatus are the shared contracts (src/engine/contracts.ts).
// The rest are what the screens need around them: an order, a line with its dates, an alert with the prescribers named.
// src/ui/history/check.ts maps Track C's `checkHistory` result onto these.
import type { Alert, HistoryResult as EngineHistoryResult, Ledger, ResolvedBrand, Sig, Tier } from '../../engine/contracts'
import type { PatientPrompt } from '../engine'

// Contracts 5 and 6 and the status of contract 7 now live in src/engine/contracts.ts (Track C landed them).
export type { LabResult, OrderStatus, Prescription } from '../../engine/contracts'
import type { LabResult, OrderStatus, Prescription } from '../../engine/contracts'

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
  /** Brands the pharmacist confirmed for lines the resolver did not recognise, keyed `${rx_id}#${line position within that prescription}`. */
  confirmations?: Record<string, string>
}

export interface HistoryLine {
  /** Position in `HistoryResult.lines` */
  index: number
  rx_id: string
  /** Position of this line within its prescription, from 0: the key part of `Order.confirmations` */
  rx_line: number
  doctor: string
  /** ISO date the line starts (the prescription date) */
  start: string
  /** ISO date the line stops, exclusive */
  end: string
  /** true when the prescription wrote no duration and the default window was used (unverified) */
  end_assumed: boolean
  /** Days cut off because the same doctor repeated this medicine early (read as a refill, not a double) */
  refill_overlap_days?: number
  /** The line as the engine reads it: brand text plus dosing text */
  text: string
  resolved: ResolvedBrand
  sig: Sig
  /** Not recognised: shown as unverified and left out of the totals */
  unverified: boolean
  /** The brand the pharmacist confirmed for this line, when one was, and the name as it was written */
  confirmed?: string
  written?: string
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
  /** Ingredients the interaction data has no entry for. */
  ddi_gaps: string[]
  /** Totalled ingredients with no daily limit applied in any window. */
  limit_gaps: string[]
  /** Set when the check was given the previous result: what the new data added, cleared or moved. */
  changes?: AlertChange[]
  /** The engine's own result (contract 7), kept so a re-check can pass it back as `previous`. */
  engine: EngineHistoryResult
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
