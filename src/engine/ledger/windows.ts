// Track B, Phase 2: when does each line run, and what do the doses add up to where lines overlap?
// Pure date and dose logic. Track C builds the history (Rx id, doctor, date) and decides the alerts; the shapes here
// match the proposed PLAN.md contracts 5-7 without depending on them.
import type { Patient } from '../contracts'
import { LIMITS, type LimitsData } from '../limits'
import { computeDose, type DoseResult } from './dose'
import type { LedgerLine, LedgerOptions } from './ledger'

/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string

const DAY_MS = 86_400_000

/** Days since 1970-01-01 for a valid ISO date, or null (so "2026-02-30" and "tomorrow" are rejected, not guessed). */
export function toDay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = Date.UTC(y, mo - 1, d)
  const back = new Date(t)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return t / DAY_MS
}

const MIN_DAY = Date.UTC(1000, 0, 1) / DAY_MS
const MAX_DAY = Date.UTC(9999, 11, 31) / DAY_MS

/** ISO date for a day number; clamped to years 1000-9999 so the result is always a valid four-digit-year date. */
export function fromDay(day: number): IsoDate {
  const clamped = Math.min(MAX_DAY, Math.max(MIN_DAY, Number.isFinite(day) ? day : MIN_DAY))
  return new Date(clamped * DAY_MS).toISOString().slice(0, 10)
}

export interface LineWindow {
  start: IsoDate
  /** Last day the line is taken (inclusive). Day 1 is the Rx date. */
  end: IsoDate
  days: number
  /** true when the Rx gave no usable duration and the default from limits.json was used (unverified). */
  duration_assumed: boolean
}

/**
 * Start = the Rx date; end = start + duration_days - 1. No (or non-positive) duration uses the data file's default
 * window. Returns null for an invalid start date.
 */
export function lineWindow(startIso: IsoDate, sig: { duration_days?: number }, data: LimitsData = LIMITS): LineWindow | null {
  const start = toDay(startIso)
  if (start === null) return null
  const given = sig.duration_days
  const assumed = !(typeof given === 'number' && Number.isFinite(given) && given >= 1 && given <= 3650)
  const days = assumed ? data.windows.default_duration_days : Math.ceil(given as number)
  return { start: startIso, end: fromDay(start + days - 1), days, duration_assumed: assumed }
}

export interface Span {
  id: string
  start: IsoDate
  end: IsoDate
}

export interface Segment {
  start: IsoDate
  end: IsoDate
  /** ids of the spans active for the whole segment, in input order */
  ids: string[]
}

/**
 * Cut the timeline at every start and end so each segment has one fixed set of active lines. Adjacent segments with
 * the same set are merged. Spans with invalid or reversed dates are skipped. Segments with no active line are not returned.
 */
export function cutSegments(spans: Span[]): Segment[] {
  const valid = spans
    .map((s) => ({ id: s.id, a: toDay(s.start), b: toDay(s.end) }))
    .filter((s): s is { id: string; a: number; b: number } => s.a !== null && s.b !== null && s.b >= s.a)
  const bounds = [...new Set(valid.flatMap((s) => [s.a, s.b + 1]))].sort((x, y) => x - y)
  const out: { a: number; b: number; ids: string[] }[] = []
  for (let i = 0; i + 1 < bounds.length; i++) {
    const a = bounds[i]
    const b = bounds[i + 1] - 1
    const ids = valid.filter((s) => s.a <= a && s.b >= b).map((s) => s.id)
    if (ids.length === 0) continue
    const last = out[out.length - 1]
    if (last && last.b + 1 === a && last.ids.length === ids.length && last.ids.every((x, k) => x === ids[k])) last.b = b
    else out.push({ a, b, ids })
  }
  return out.map((s) => ({ start: fromDay(s.a), end: fromDay(s.b), ids: s.ids }))
}

export interface LabResult {
  type: 'serum_creatinine'
  value: number
  date: IsoDate
}

/** The patient as they were on `date`: the latest creatinine on or before it, else the baseline on the patient. */
export function patientAsOf(patient: Patient, labs: LabResult[], date: IsoDate): Patient {
  const day = toDay(date)
  if (day === null) return patient
  const latest = labs
    .filter((l) => l.type === 'serum_creatinine' && Number.isFinite(l.value) && l.value > 0)
    .map((l) => ({ l, d: toDay(l.date) }))
    .filter((x): x is { l: LabResult; d: number } => x.d !== null && x.d <= day)
    .sort((a, b) => b.d - a.d)[0]
  return latest ? { ...patient, serum_creatinine: latest.l.value } : patient
}

/** A new lab value starts a new window on its date, so a kidney re-check applies from that day, not from the next Rx. */
function splitAtLabs(segments: Segment[], labs: LabResult[]): Segment[] {
  const labDays = [...new Set(labs.map((l) => toDay(l.date)).filter((d): d is number => d !== null))].sort((a, b) => a - b)
  return segments.flatMap((seg) => {
    const a = toDay(seg.start)!
    const b = toDay(seg.end)!
    const cuts = labDays.filter((d) => d > a && d <= b)
    const edges = [a, ...cuts, b + 1]
    return edges.slice(0, -1).map((from, i) => ({ start: fromDay(from), end: fromDay(edges[i + 1] - 1), ids: seg.ids }))
  })
}

export interface DatedLine {
  id: string
  /** the Rx date this line starts on */
  start: IsoDate
  line: LedgerLine
}

export interface WindowDose extends Segment {
  dose: DoseResult
  /** lines whose window length came from the default, not the Rx (their totals depend on an unverified assumption) */
  assumed_duration_ids: string[]
}

/**
 * Run the dose engine once per overlapping window, so doses add up only where lines really overlap, with the
 * patient's kidney value as of the start of each window. `worst` is the index of the window with the most
 * over-limit findings, then the highest total/limit ratio; -1 when there are no windows.
 */
export function computeDoseByWindow(
  items: DatedLine[],
  patient: Patient,
  labs: LabResult[] = [],
  opts: LedgerOptions = {},
): { windows: WindowDose[]; worst: number; skipped: string[] } {
  const data = opts.limits ?? LIMITS
  const spans: Span[] = []
  const assumed = new Set<string>()
  const skipped: string[] = []
  for (const it of items) {
    const w = lineWindow(it.start, it.line.sig, data)
    if (!w) {
      skipped.push(it.id)
      continue
    }
    if (w.duration_assumed) assumed.add(it.id)
    spans.push({ id: it.id, start: w.start, end: w.end })
  }
  const byId = new Map(items.map((i) => [i.id, i]))
  const windows: WindowDose[] = splitAtLabs(cutSegments(spans), labs).map((seg) => ({
    ...seg,
    dose: computeDose(
      seg.ids.map((id) => byId.get(id)!.line),
      patientAsOf(patient, labs, seg.start),
      opts,
    ),
    assumed_duration_ids: seg.ids.filter((id) => assumed.has(id)),
  }))
  const score = (w: WindowDose) => {
    const over = w.dose.findings.filter((f) => f.kind === 'over_limit')
    const ratio = Math.max(0, ...over.map((f) => (f.limit_mg_day ? f.total_mg_day / f.limit_mg_day : 0)))
    return over.length * 1000 + ratio
  }
  let worst = -1
  windows.forEach((w, i) => {
    if (worst === -1 || score(w) > score(windows[worst])) worst = i
  })
  return { windows, worst, skipped }
}
