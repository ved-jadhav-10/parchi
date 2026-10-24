// History check for the review desk. The engine's `checkHistory` (Track C) does the work: timeline, overlap windows,
// doses per window, cross-doctor alerts, status, priority and the re-check diff. This file only maps its result onto the
// shapes the screens use (indices into lines, the prescribers named, days per alert), so the UI never decides an alert.
import type { Alert, HistoryResult as EngineResult, Patient, Tier } from '../../engine/contracts'
import { cockcroftGault } from '../../engine/limits/crcl'
import { createRealEngine } from '../../engine/wiring'
import { ddiGapNames, limitGapNames } from '../lib/coverage'
import type { EngineDeps, PatientPrompt } from '../engine'
import type { AlertChange, HistoryAlert, HistoryLine, HistoryResult, HistoryWindow, LabResult, Order, Prescribed } from './types'

const RANK: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }

export const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.ceil(days))
  return d.toISOString().slice(0, 10)
}

export const latestLab = (labs: LabResult[]): LabResult | undefined =>
  labs.filter((l) => l.type === 'serum_creatinine').sort((a, b) => b.date.localeCompare(a.date))[0]

/** The customer as the engine takes them. The engine picks the latest creatinine from the labs itself. */
export const patientFor = (order: Order): Patient => {
  const { age_years, sex, weight_kg } = order.customer
  return { age_years, ...(sex && { sex }), ...(weight_kg && { weight_kg }) }
}

export const touches = (a: Alert, l: HistoryLine) =>
  a.ingredients.some((id) => l.resolved.ingredients.some((i) => i.id === id)) || (a.brands ?? []).some((b) => b === l.resolved.brand || b === l.resolved.raw)

const count = (alerts: Alert[], tier: Tier) => alerts.filter((a) => a.tier === tier).length

/** Is `a` about something that is actually being taken in this stretch of days? (An alert's own window spans several stretches.) */
function appliesIn(a: Alert, w: { start: string; end: string; ledger: HistoryWindow['ledger'] }, active: HistoryLine[]): boolean {
  if (a.window && !(a.window.start < w.end && a.window.end > w.start)) return false
  if (a.ingredients.length === 0) return active.some((l) => touches(a, l))
  if (!a.ingredients.every((id) => active.some((l) => l.resolved.ingredients.some((i) => i.id === id)))) return false
  if (a.type.startsWith('dose_excess')) return a.ingredients.some((id) => (w.ledger[id]?.limit_mg_day ?? Infinity) < (w.ledger[id]?.total_mg_day ?? 0))
  return true
}

export function createHistoryCheck(deps: EngineDeps) {
  const { checkHistory } = createRealEngine(deps)
  return async (order: Order, previous?: HistoryResult): Promise<HistoryResult> => {
    const { resolver } = deps
    const earliest = order.prescriptions.map((p) => p.date).sort()[0]
    // `from` = the first prescription date, so overlaps that have already ended still show on the timeline.
    const r: EngineResult = await checkHistory(order.prescriptions, patientFor(order), order.labs, {
      ...(earliest && { from: earliest }),
      ...(previous && { previous: previous.engine }),
      ...(order.confirmations && Object.keys(order.confirmations).length > 0 && { confirmations: order.confirmations }),
    })
    if (r.lines.length === 0) throw new Error('No medicines found in the prescriptions')

    const rxById = new Map(order.prescriptions.map((p) => [p.id, p]))
    const prescribedBy = (a: Alert): Prescribed[] =>
      (a.rx_ids ?? [])
        .flatMap((id) => rxById.get(id) ?? [])
        .map((p) => ({ rx_id: p.id, doctor: p.doctor, date: p.date }))
        .sort((x, y) => x.date.localeCompare(y.date))
    const spanStart = r.windows[0]?.start ?? r.as_of ?? ''
    const spanEnd = r.windows[r.windows.length - 1]?.end ?? spanStart
    const asHistoryAlert = (a: Alert): HistoryAlert => {
      const prescribed = prescribedBy(a)
      return {
        ...a,
        prescribed,
        cross_doctor: a.cross_doctor ?? new Set(prescribed.map((p) => p.doctor)).size > 1,
        from: a.window?.start ?? spanStart,
        to: a.window?.end ?? spanEnd,
      }
    }

    // The sig wording of each line, in the order the resolver reads them, for the timeline tooltip.
    const readings = new Map(order.prescriptions.map((p) => [p.id, resolver.resolveText(p.text, { age_years: order.customer.age_years }).map((l) => ({ sig: l.sig_text, written: l.resolved.raw }))]))
    const seenPerRx = new Map<string, number>()
    const lines: HistoryLine[] = r.lines.map((l, index) => {
      const n = seenPerRx.get(l.rx_id) ?? 0
      seenPerRx.set(l.rx_id, n + 1)
      const start = l.start
      const confirmed = order.confirmations?.[`${l.rx_id}#${n}`]
      return {
        index,
        rx_id: l.rx_id,
        rx_line: n,
        doctor: l.doctor,
        start,
        end: l.end ?? start,
        end_assumed: l.default_window === true,
        ...(l.refill_overlap_days && { refill_overlap_days: l.refill_overlap_days }),
        text: `${l.resolved.raw} ${readings.get(l.rx_id)?.[n]?.sig ?? ''}`.trim(),
        resolved: l.resolved,
        sig: l.sig,
        unverified: l.unverified === true,
        ...(confirmed && { confirmed, written: readings.get(l.rx_id)?.[n]?.written }),
      }
    })

    const alerts = r.alerts.map(asHistoryAlert)
    const windows: HistoryWindow[] = r.windows.map((w) => {
      const active = lines.filter((l) => l.start <= w.start && l.end > w.start && w.rx_ids.includes(l.rx_id))
      return { start: w.start, end: w.end, lines: active.map((l) => l.index), ledger: w.ledger, alerts: alerts.filter((a) => appliesIn(a, w, active)) }
    })
    const score = (w: HistoryWindow) => count(w.alerts, 'interrupt') * 1000 + count(w.alerts, 'inform') * 10 + w.lines.length
    const peak = windows.reduce((best, w, i) => (score(w) > score(windows[best]) ? i : best), 0)

    const changes: AlertChange[] | undefined = r.changes && [
      ...r.changes.added.map((a): AlertChange => ({ kind: 'added', alert: asHistoryAlert(a) })),
      ...r.changes.cleared.map((a): AlertChange => ({ kind: 'cleared', alert: asHistoryAlert(a) })),
      ...r.changes.changed.map((c): AlertChange => ({ kind: 'tier_changed', alert: asHistoryAlert(c.after), was: c.before.tier })),
    ].sort((a, b) => RANK[a.alert.tier] - RANK[b.alert.tier])

    const lab = latestLab(order.labs)
    const crcl = cockcroftGault({ ...patientFor(order), ...(lab && { serum_creatinine: lab.value }) }).value
    const prompts: PatientPrompt[] = (r.needs ?? []).filter((n): n is typeof n & { field: PatientPrompt['field'] } => n.field !== 'sex').map((n) => ({ field: n.field, reason: n.reason }))

    return {
      lines,
      windows,
      alerts,
      peak,
      status: r.status,
      priority: r.priority,
      unverified: lines.filter((l) => l.unverified),
      prompts,
      crcl,
      ddi_gaps: ddiGapNames(lines, deps.ddi, resolver),
      limit_gaps: limitGapNames(windows.map((w) => w.ledger), resolver),
      ...(changes && { changes }),
      engine: r,
    }
  }
}
