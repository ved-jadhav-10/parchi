// Words and dates for the review screens. The wording never says "safe" or "approved": Parchi suggests, the pharmacist decides.
import type { Tier } from '../../engine/contracts'
import type { OrderStatus } from './types'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  hold_contact_doctor: 'Needs pharmacist attention',
  clear_with_note: 'Clear, with a note',
  clear: 'No alerts from the checks run',
}

/**
 * Short forms for rows too narrow for STATUS_LABEL (the queue on a phone); wider rows show the full label. Screen readers
 * always get STATUS_LABEL. "Clear" is avoided on its own: read alone it sounds like a go-ahead.
 */
export const STATUS_SHORT: Record<OrderStatus, string> = {
  hold_contact_doctor: 'Attention',
  clear_with_note: 'With note',
  clear: 'No alerts',
}

/** The tier whose colours and icon a status borrows. "Clear" is neutral, never green: it is not a statement that the order is safe. */
export const STATUS_TIER: Record<OrderStatus, Tier> = {
  hold_contact_doctor: 'interrupt',
  clear_with_note: 'inform',
  clear: 'silent',
}

/** What the pharmacist can decide, in the order they are offered. */
export const DECISIONS: { value: OrderStatus; label: string; hint: string }[] = [
  { value: 'hold_contact_doctor', label: 'Hold the order', hint: 'The order waits while the pharmacist asks the customer or clarifies with the prescriber (a note can be copied below).' },
  { value: 'clear_with_note', label: 'Release, with a note', hint: 'Dispatch, and record what the pharmacist checked.' },
  { value: 'clear', label: 'Release', hint: 'Dispatch with nothing further to note.' },
]

/**
 * Why a pharmacist's decision differs from Parchi's suggestion. Starting list only: replace with the pharmacist's real
 * reasons after the session. Deliberately separate from the per-alert override reasons, which describe a finding, not an order.
 */
export const DECISION_REASONS = [
  'Prescriber confirmed by phone',
  'Customer confirmed the medicine was stopped or changed',
  'Dose already adjusted on this order',
  'Finding reviewed and not relevant to this customer',
  'Other',
]

export const decisionLabel = (s: OrderStatus) => DECISIONS.find((d) => d.value === s)?.label ?? s

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-10-19" -> "19 Oct". Anything else is shown as given. */
export const shortDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : iso
}

export const longDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso
}

/** The last day shown for an exclusive end date: a window "19 Oct to 24 Oct" ends on the 23rd. */
export const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export const rangeLabel = (from: string, to: string) => {
  const last = dayBefore(to)
  return last <= from ? shortDate(from) : `${shortDate(from)} to ${shortDate(last)}`
}

/** "Dr Mehta (general physician)" -> "Dr Mehta". */
export const doctorName = (full: string) => full.replace(/\s*\(.*\)\s*$/, '')

export const todayIso = () => new Date().toISOString().slice(0, 10)
