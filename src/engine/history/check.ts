// checkHistory: a customer's dated prescriptions (several doctors) + lab values -> one timeline -> overlap windows ->
// the usual pipeline per window -> merged, ranked alerts. Doses are added up only where the windows overlap.
import type { Alert, HistoryLine, HistoryResult, HistoryWindow, LabResult, Ledger, Patient, Prescription, Tier } from '../contracts'
import type { Engine } from '../pipeline'
import type { LineOrigin } from '../rules'
import { joinNames } from '../rules/types'
import { dayNumber, isoDay } from './dates'
import { alertKeyFor, diffAlerts } from './diff'
import { orderPriority, orderStatus } from './queue'
import { buildWindows } from './timeline'

export interface HistoryOptions {
  /** The order under review: prescriptions dated after it are ignored, and its date starts the timeline. Default: the latest prescription. */
  asOf?: string
  /** Start of the timeline to check. Default `asOf`; an earlier date also shows overlaps that already ended (history view). */
  from?: string
  /** An earlier result for the same customer: the new result lists what changed against it. */
  previous?: HistoryResult
  /** Pharmacist-confirmed brand for an unrecognised line, keyed `${rx_id}#${line number from 0}`. */
  confirmations?: Record<string, string>
}

export type CheckHistory = (
  prescriptions: Prescription[],
  patient: Patient,
  labs?: LabResult[],
  options?: HistoryOptions,
) => Promise<HistoryResult>

type NeedField = 'weight_kg' | 'serum_creatinine' | 'sex'

const TIER_RANK: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }
const INPUT_LABEL: Record<NeedField, string> = { weight_kg: 'weight', serum_creatinine: 'serum creatinine', sex: 'sex' }

/** Latest serum creatinine by date (a tie goes to the later entry in the list). */
export function latestCreatinine(labs: LabResult[]): LabResult | undefined {
  return labs
    .filter((l) => l.type === 'serum_creatinine' && l.value > 0)
    .reduce<LabResult | undefined>((best, l) => (!best || dayNumber(l.date) >= dayNumber(best.date) ? l : best), undefined)
}

interface DatedLine extends HistoryLine {
  startDay: number
  endDay: number
}

export function createHistoryChecker(engine: Engine): CheckHistory {
  const { resolver, rules } = engine
  const policy = rules.history
  const name = (id: string) => resolver.ingredient(id)?.name ?? id
  const keyOf = alertKeyFor(rules)

  return async (prescriptions, patient, labs = [], options = {}) => {
    const seen = new Set<string>()
    for (const rx of prescriptions) {
      if (seen.has(rx.id)) throw new Error(`Duplicate prescription id "${rx.id}"`)
      seen.add(rx.id)
    }
    const lab = latestCreatinine(labs)
    const person: Patient = lab ? { ...patient, serum_creatinine: lab.value } : patient

    const dated = prescriptions
      .map((rx) => ({ rx, day: dayNumber(rx.date) }))
      .sort((a, b) => a.day - b.day || a.rx.id.localeCompare(b.rx.id))
    const asOf = options.asOf ? dayNumber(options.asOf) : dated.length ? dated[dated.length - 1].day : 0
    const from = options.from ? dayNumber(options.from) : asOf

    // Every line of every prescription written by the order date, with the days it is taken.
    const lines: DatedLine[] = []
    for (const { rx, day } of dated) {
      if (day > asOf) continue
      resolver.resolveText(rx.text, { age_years: person.age_years }).forEach(({ resolved: first, sig_text }, i) => {
        const confirmed = options.confirmations?.[`${rx.id}#${i}`]
        const resolved = confirmed ? resolver.resolve(confirmed, { age_years: person.age_years }) : first
        const sig = engine.sigFor(sig_text, resolved)
        const hasDuration = sig.duration_days !== undefined && sig.duration_days > 0
        const days = hasDuration ? Math.ceil(sig.duration_days!) : policy.default_window_days
        lines.push({
          resolved,
          sig,
          rx_id: rx.id,
          doctor: rx.doctor,
          start: isoDay(day),
          end: isoDay(day + days),
          startDay: day,
          endDay: day + days,
          ...(resolved.match === 'none' && resolved.ingredients.length === 0 ? { unverified: true } : {}),
          ...(hasDuration ? {} : { default_window: true }),
        })
      })
    }

    const windows = buildWindows(
      lines.map((l) => ({ start: l.startDay, end: l.endDay })),
      from,
    )

    const merged = new Map<string, { alert: Alert; score: number; start: number; end: number }>()
    const worst: Ledger = {}
    const needs = new Map<NeedField, { field: NeedField; reason: string; ingredients: Set<string> }>()
    const outWindows: HistoryWindow[] = []

    for (const w of windows) {
      const members = w.members.map((i) => lines[i])
      const origin = (l: DatedLine): LineOrigin => ({ rx_id: l.rx_id, doctor: l.doctor, start: l.start, end: isoDay(l.endDay) })
      const a = engine.analyze(
        members.map((l) => ({ resolved: l.resolved, sig: l.sig, origin: origin(l) })),
        person,
      )
      outWindows.push({ start: isoDay(w.start), end: isoDay(w.end), rx_ids: [...new Set(members.map((l) => l.rx_id))], ledger: a.ledger })

      for (const [id, entry] of Object.entries(a.ledger)) if (!worst[id] || entry.total_mg_day > worst[id].total_mg_day) worst[id] = entry
      for (const n of a.needs) {
        const cur = needs.get(n.field) ?? { field: n.field, reason: n.reason, ingredients: new Set<string>() }
        n.ingredients.forEach((i) => cur.ingredients.add(i))
        needs.set(n.field, cur)
      }

      for (const alert of a.raw) {
        const score = Math.max(0, ...alert.ingredients.map((id) => a.ledger[id]?.total_mg_day ?? 0))
        const key = keyOf(alert)
        const cur = merged.get(key)
        if (!cur) {
          merged.set(key, { alert, score, start: w.start, end: w.end })
          continue
        }
        // The same alert in several windows: report the worst one, over the whole span where it holds.
        cur.start = Math.min(cur.start, w.start)
        cur.end = Math.max(cur.end, w.end)
        if (TIER_RANK[alert.tier] < TIER_RANK[cur.alert.tier] || (alert.tier === cur.alert.tier && (score > cur.score || (score === cur.score && alert.ingredients.length > cur.alert.ingredients.length)))) {
          cur.alert = alert
          cur.score = score
        }
      }
    }

    let raw: Alert[] = [...merged.values()].map(({ alert, start, end }) => ({ ...alert, window: { start: isoDay(start), end: isoDay(end) } }))

    // A dose alert already names every brand carrying that ingredient; a plain "in 2 brands" for another stretch of days repeats it.
    const overDose = new Set(raw.filter((a) => a.type.startsWith('dose_excess')).flatMap((a) => a.ingredients))
    raw = raw.filter((a) => a.type !== 'duplicate_ingredient' || !a.ingredients.some((id) => overDose.has(id)))

    // One "please enter ..." for the whole history, not one per window or drug.
    const asks = raw.filter((a) => a.type === 'input_needed')
    if (asks.length) {
      const ingredients = [...new Set(asks.flatMap((a) => a.ingredients))].sort()
      const missing = [...needs.values()].map((n) => INPUT_LABEL[n.field])
      const many = missing.length > 1
      raw = [
        ...raw.filter((a) => a.type !== 'input_needed'),
        {
          ...asks[0],
          ingredients,
          brands: [...new Set(asks.flatMap((a) => a.brands ?? []))],
          confidence: Math.min(...asks.map((a) => a.confidence)),
          reason: `${joinNames(ingredients.map(name))} needs a kidney check, but ${joinNames(missing)} ${many ? 'are' : 'is'} not entered. Enter ${many ? 'them' : 'it'} to run the check.`,
        },
      ]
    }

    const alerts = engine.finalize(raw)
    const result: HistoryResult = {
      lines: lines.map(({ startDay: _s, endDay: _e, ...line }) => line),
      ledger: worst,
      alerts,
      windows: outWindows,
      status: orderStatus(alerts, policy),
      priority: orderPriority(alerts, policy),
      as_of: isoDay(asOf),
      ...(lab ? { creatinine_used: { value: lab.value, date: lab.date.slice(0, 10) } } : {}),
      ...(needs.size
        ? { needs: [...needs.values()].map((n) => ({ field: n.field, reason: n.reason, ingredients: [...n.ingredients].sort() })) }
        : {}),
    }
    if (options.previous) result.changes = diffAlerts(options.previous.alerts, alerts, keyOf)
    return result
  }
}
