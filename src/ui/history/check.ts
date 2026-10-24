// History check: a customer's dated prescriptions -> one timeline -> overlap windows -> alerts that name the doctors.
// Composed here from the single-prescription engine (one run per window) until Track C's `checkHistory` lands; the
// result has the shape of proposed contract 7 so the swap is this file only.
import type { Alert, Patient, Tier } from '../../engine/contracts'
import type { Resolver } from '../../engine/resolver'
import { parseSig } from '../../engine/sig'
import { createCheck, type EngineDeps, type PatientPrompt } from '../engine'
import defaults from './defaults.json'
import type { AlertChange, HistoryAlert, HistoryLine, HistoryResult, HistoryWindow, LabResult, Order, OrderStatus, Prescribed } from './types'

const RANK: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }

/** The window used for a line that writes no duration. A placeholder in data, marked unverified. */
export const DEFAULT_WINDOW_DAYS: number = defaults.default_window_days

export const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.ceil(days))
  return d.toISOString().slice(0, 10)
}

export const latestLab = (labs: LabResult[]): LabResult | undefined =>
  labs.filter((l) => l.type === 'serum_creatinine').sort((a, b) => b.date.localeCompare(a.date))[0]

export const patientFor = (order: Order): Patient => {
  const lab = latestLab(order.labs)
  const { age_years, sex, weight_kg } = order.customer
  return { age_years, ...(sex && { sex }), ...(weight_kg && { weight_kg }), ...(lab && { serum_creatinine: lab.value }) }
}

/** Every medicine on every prescription, with the days it counts as taken. */
export function buildLines(order: Order, resolver: Resolver): HistoryLine[] {
  const lines: HistoryLine[] = []
  for (const rx of order.prescriptions) {
    for (const l of resolver.resolveText(rx.text, { age_years: order.customer.age_years })) {
      const sig = parseSig(l.sig_text)
      lines.push({
        index: lines.length,
        rx_id: rx.id,
        doctor: rx.doctor,
        start: rx.date,
        end: addDays(rx.date, sig.duration_days ?? DEFAULT_WINDOW_DAYS),
        end_assumed: sig.duration_days === undefined,
        text: `${l.resolved.raw} ${l.sig_text}`.trim(),
        resolved: l.resolved,
        sig,
        unverified: l.resolved.brand === null && l.resolved.ingredients.length === 0,
      })
    }
  }
  return lines
}

/** Cut the timeline at every start and stop; each stretch with at least one active line is a window. */
export function windowSpans(lines: HistoryLine[]): { start: string; end: string; lines: number[] }[] {
  const cuts = [...new Set(lines.flatMap((l) => [l.start, l.end]))].sort()
  const spans: { start: string; end: string; lines: number[] }[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const active = lines.filter((l) => l.start <= cuts[i] && l.end > cuts[i]).map((l) => l.index)
    if (active.length > 0) spans.push({ start: cuts[i], end: cuts[i + 1], lines: active })
  }
  return spans
}

export const touches = (a: Alert, l: HistoryLine) =>
  a.ingredients.some((id) => l.resolved.ingredients.some((i) => i.id === id)) || (a.brands ?? []).some((b) => b === l.resolved.brand || b === l.resolved.raw)

export const alertKey = (a: Alert) => `${a.type}|${[...a.ingredients].sort().join(',')}|${a.ingredients.length === 0 ? (a.brands ?? []).join(',') : ''}`

const prescribedBy = (lines: HistoryLine[], rxDate: (id: string) => string): Prescribed[] => {
  const seen = new Map<string, Prescribed>()
  for (const l of lines) if (!seen.has(l.rx_id)) seen.set(l.rx_id, { rx_id: l.rx_id, doctor: l.doctor, date: rxDate(l.rx_id) })
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date))
}

const count = (alerts: Alert[], tier: Tier) => alerts.filter((a) => a.tier === tier).length

export function statusOf(alerts: Alert[], unverified: number, prompts: number): OrderStatus {
  if (count(alerts, 'interrupt') > 0) return 'hold_contact_doctor'
  return count(alerts, 'inform') > 0 || unverified > 0 || prompts > 0 ? 'clear_with_note' : 'clear'
}

/** Alerts that exist in `after` and not in `before`, the other way round, and the ones that changed tier. */
export function diffAlerts(before: HistoryAlert[], after: HistoryAlert[]): AlertChange[] {
  const was = new Map(before.map((a) => [alertKey(a), a]))
  const now = new Map(after.map((a) => [alertKey(a), a]))
  const changes: AlertChange[] = []
  for (const [k, a] of now) {
    const old = was.get(k)
    if (!old) changes.push({ kind: 'added', alert: a })
    else if (old.tier !== a.tier) changes.push({ kind: 'tier_changed', alert: a, was: old.tier })
  }
  for (const [k, a] of was) if (!now.has(k)) changes.push({ kind: 'cleared', alert: a })
  return changes.sort((a, b) => RANK[a.alert.tier] - RANK[b.alert.tier])
}

export function createHistoryCheck(deps: EngineDeps) {
  const check = createCheck(deps)
  return async (order: Order): Promise<HistoryResult> => {
    const lines = buildLines(order, deps.resolver)
    if (lines.length === 0) throw new Error('No medicines found in the prescriptions')
    const patient = patientFor(order)
    const rxDate = (id: string) => order.prescriptions.find((p) => p.id === id)?.date ?? ''

    const windows: HistoryWindow[] = []
    const prompts = new Map<PatientPrompt['field'], PatientPrompt>()
    let crcl: number | null = null
    for (const span of windowSpans(lines)) {
      const r = await check(span.lines.map((i) => lines[i].text).join('; '), patient)
      windows.push({ ...span, ledger: r.ledger, alerts: r.alerts })
      for (const p of r.prompts) prompts.set(p.field, p)
      crcl ??= r.crcl
    }

    // One alert per problem, however many windows it appears in: keep its worst form and the days it spans.
    const merged = new Map<string, HistoryAlert>()
    const fullest = new Map<string, number>() // lines active in the window the kept wording came from
    for (const w of windows) {
      for (const a of w.alerts) {
        const involved = prescribedBy(
          w.lines.map((i) => lines[i]).filter((l) => touches(a, l)),
          rxDate,
        )
        const key = alertKey(a)
        const cur = merged.get(key)
        if (!cur) {
          merged.set(key, { ...a, prescribed: involved, cross_doctor: new Set(involved.map((p) => p.doctor)).size > 1, from: w.start, to: w.end })
          fullest.set(key, w.lines.length)
          continue
        }
        const all = [...cur.prescribed, ...involved].filter((p, i, arr) => arr.findIndex((q) => q.rx_id === p.rx_id) === i).sort((x, y) => x.date.localeCompare(y.date))
        // Keep the wording of the worst tier; at the same tier, the window with the most lines active (its totals are the fullest).
        const worse = RANK[a.tier] < RANK[cur.tier] || (RANK[a.tier] === RANK[cur.tier] && w.lines.length > (fullest.get(key) ?? 0))
        if (worse) fullest.set(key, w.lines.length)
        merged.set(key, {
          ...(worse ? a : cur),
          prescribed: all,
          cross_doctor: new Set(all.map((p) => p.doctor)).size > 1,
          from: cur.from < w.start ? cur.from : w.start,
          to: cur.to > w.end ? cur.to : w.end,
        })
      }
    }
    const alerts = [...merged.values()].sort((a, b) => RANK[a.tier] - RANK[b.tier] || Number(b.cross_doctor) - Number(a.cross_doctor) || a.from.localeCompare(b.from))

    const score = (w: HistoryWindow) => count(w.alerts, 'interrupt') * 1000 + count(w.alerts, 'inform') * 10 + w.lines.length
    const peak = windows.reduce((best, w, i) => (score(w) > score(windows[best]) ? i : best), 0)
    const unverified = lines.filter((l) => l.unverified)
    const promptList = [...prompts.values()]
    return {
      lines,
      windows,
      alerts,
      peak,
      status: statusOf(alerts, unverified.length, promptList.length),
      priority: count(alerts, 'interrupt') * 1000 + count(alerts, 'inform') * 100 + unverified.length * 50 + alerts.filter((a) => a.cross_doctor).length * 10,
      unverified,
      prompts: promptList,
      crcl,
    }
  }
}
