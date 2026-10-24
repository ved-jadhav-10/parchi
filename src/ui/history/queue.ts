// What the review queue shows beside each order: the finding that put it where it is, and the counts that add up to "Waiting".
// Display only. The order of the queue is the engine's priority (src/engine/history/queue.ts); this explains it in words.
import type { Tier } from '../../engine/contracts'
import { doctorName, shortDate, todayIso } from './labels'
import type { HistoryAlert, HistoryResult, Order, OrderStatus } from './types'

export interface LeadFinding {
  /** One line for the row, conclusion included */
  text: string
  /** The engine's whole reason, for the hover text and the order page */
  full: string
  tier: Tier
  /** Other findings in the same order that also count towards its priority */
  more: number
}

const rank: Record<Tier, number> = { interrupt: 2, inform: 1, silent: 0 }

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')
const ingredientName = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' ')

/** The engine's reason without what a one-line row cannot use: parentheses (brand lists, bases) and the "Pharmacist to ..." sentence. */
export const trimReason = (reason: string) => {
  let t = reason
  for (let before = ''; before !== t; ) {
    before = t
    t = t.replace(/\s*\([^()]*\)/g, '')
  }
  t = t.replace(/\s*Pharmacist to [^.]*\.?/g, '')
  return t.replace(/\s+/g, ' ').replace(/\s+([,.:;])/g, '$1').trim().replace(/[.,;:]$/, '')
}

/**
 * A dose finding as numbers first ("Paracetamol 4,100 mg/day, limit 3,000, 3 brands, 2 doctors"): the engine's sentence puts
 * the brands and doctors first and the limit last, which a clamped row cuts off. Other findings are the trimmed sentence.
 */
export const shortFinding = (a: HistoryAlert, r: HistoryResult): string => {
  const id = a.ingredients[0]
  if ((a.type === 'dose_excess' || a.type === 'dose_excess_sos') && id) {
    const worst = r.windows
      .map((w) => w.ledger[id])
      .filter((e) => e?.limit_mg_day !== undefined)
      .reduce<(typeof r.windows)[number]['ledger'][string] | undefined>((m, e) => (!m || e.total_mg_day > m.total_mg_day ? e : m), undefined)
    if (worst?.limit_mg_day !== undefined) {
      const brands = a.brands?.length ?? 0
      const doctors = new Set(a.prescribed.map((p) => doctorName(p.doctor))).size
      return [
        `${ingredientName(id)} ${fmt(worst.total_mg_day)} mg/day, limit ${fmt(worst.limit_mg_day)}${a.type === 'dose_excess_sos' ? ' if every SOS dose is taken' : ''}`,
        brands > 1 && `${brands} brands`,
        doctors > 1 && `${doctors} doctors`,
      ]
        .filter(Boolean)
        .join(', ')
    }
  }
  return trimReason(a.reason)
}

/** The alert that weighs most in an order's priority: the highest tier, a cross-doctor overlap before a single-prescription one. */
export const leadAlert = (r: HistoryResult): HistoryAlert | undefined => {
  const shown = r.alerts.filter((a) => a.tier !== 'silent')
  if (shown.length === 0) return undefined
  const weight = (a: HistoryAlert) => rank[a.tier] * 2 + Number(a.cross_doctor)
  return shown.reduce((best, a) => (weight(a) > weight(best) ? a : best))
}

/** The finding that weighs most in an order's priority, as the line the review queue shows. */
export const leadFinding = (r: HistoryResult): LeadFinding => {
  const shown = r.alerts.filter((a) => a.tier !== 'silent')
  if (shown.length === 0) {
    const n = r.unverified.length
    const text = n > 0 ? `${n} unverified ${n === 1 ? 'brand' : 'brands'}, left out of the totals` : 'No alerts from the checks run'
    return { text, full: text, tier: 'silent', more: 0 }
  }
  const lead = leadAlert(r)!
  return { text: shortFinding(lead, r), full: lead.reason, tier: lead.tier, more: shown.length - 1 }
}

const SUGGESTIONS: OrderStatus[] = ['hold_contact_doctor', 'clear_with_note', 'clear']

/**
 * Orders per suggested status. The three counts add up to the number of orders checked. `running` are still being checked,
 * `failed` could not be checked (review by hand); `unchecked` is both.
 */
export const suggestionCounts = (results: (HistoryResult | 'failed' | undefined)[]) => {
  const counts: Record<OrderStatus, number> = { hold_contact_doctor: 0, clear_with_note: 0, clear: 0 }
  let running = 0
  let failed = 0
  for (const r of results) {
    if (typeof r === 'object') counts[r.status]++
    else if (r === 'failed') failed++
    else running++
  }
  return { counts, running, failed, unchecked: running + failed, total: SUGGESTIONS.reduce((n, s) => n + counts[s], 0) }
}

type Ranked = { order: Order; result: HistoryResult | 'failed' | undefined }

/**
 * Queue order: orders that could not be checked first (they need a full hand review and nothing else will surface them),
 * then the engine's priority, oldest first on a tie. Orders still being checked wait at the end until their result arrives.
 */
export const byQueueOrder = (a: Ranked, b: Ranked) => {
  const group = (r: Ranked['result']) => (r === 'failed' ? 0 : typeof r === 'object' ? 1 : 2)
  const priority = (r: Ranked['result']) => (typeof r === 'object' ? r.priority : 0)
  return group(a.result) - group(b.result) || priority(b.result) - priority(a.result) || a.order.placed.localeCompare(b.order.placed)
}

/** How long an order has waited, from its ISO date: "placed today", "waiting 1 day", "waiting 3 days". */
export const waitedLabel = (placed: string, today = todayIso()) => {
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${placed}T00:00:00Z`)) / 86_400_000)
  if (!Number.isFinite(days) || days < 0) return `placed ${shortDate(placed)}`
  return days === 0 ? 'placed today' : `waiting ${days} ${days === 1 ? 'day' : 'days'}`
}
