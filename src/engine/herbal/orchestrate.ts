// Track B: how the herbal check plugs around the ordinary pipeline (used by api/check; the UI can use the same calls).
//   1. splitSingle / splitHistory: take the herbal lines OUT of the text, so the ordinary resolver never guesses a drug for them.
//   2. run the ordinary pipeline on what is left.
//   3. herbalSingle / herbalHistory: match the herbal items against the ordinary medicines that came back.
import type { Prescription, ResolvedBrand } from '../contracts'
import { fromDay, lineWindow, toDay } from '../ledger/windows'
import { parseSig } from '../sig'
import { analyzeHerbal, partitionRx, type HerbalLine, type HerbalReport, type OrdinaryLine } from './index'

export interface HerbalDeps {
  /** true when the text is a medicine brand the resolver knows exactly */
  isKnownBrand: (brand: string) => boolean
  classesOf: (id: string) => string[] | undefined
}

interface PlainLine {
  resolved: ResolvedBrand
  unverified?: boolean
  start?: string
  /** history lines: exclusive end date */
  end?: string
}

const ordinaryFrom = (lines: PlainLine[]): OrdinaryLine[] =>
  lines
    .filter((l) => !l.unverified && l.resolved.ingredients.length > 0)
    .map((l) => ({
      brand: l.resolved.brand ?? l.resolved.raw,
      ingredients: l.resolved.ingredients.map((i) => i.id),
      ...(l.start && { start: l.start }),
      // history lines end on an exclusive date; the matcher compares inclusive days
      ...(l.end && toDay(l.end) !== null && { end: fromDay(toDay(l.end)! - 1) }),
    }))

/** One prescription: the text for the ordinary pipeline (may be empty) and the herbal lines. */
export function splitSingle(rxText: string, deps: HerbalDeps): { restText: string; herbal: HerbalLine[] } {
  const p = partitionRx(rxText, { isKnownBrand: deps.isKnownBrand })
  return { restText: p.restText, herbal: p.herbal }
}

export function herbalSingle(herbal: HerbalLine[], lines: PlainLine[], deps: HerbalDeps): HerbalReport | undefined {
  if (herbal.length === 0) return undefined
  return analyzeHerbal(herbal, ordinaryFrom(lines), deps.classesOf)
}

type DatedHerbal = HerbalLine & { rx: Prescription }

/** A history: prescriptions with their herbal lines removed (a prescription with nothing left is dropped), and the herbal lines. */
export function splitHistory(prescriptions: Prescription[], deps: HerbalDeps): { engine: Prescription[]; herbal: DatedHerbal[] } {
  const engine: Prescription[] = []
  const herbal: DatedHerbal[] = []
  for (const rx of prescriptions) {
    const p = partitionRx(rx.text, { isKnownBrand: deps.isKnownBrand })
    for (const h of p.herbal) herbal.push({ ...h, rx })
    if (p.restText.trim()) engine.push(p.herbal.length ? { ...rx, text: p.restText } : rx)
  }
  return { engine, herbal }
}

/** Match each herbal item only against ordinary medicines taken on the same days. */
export function herbalHistory(herbal: DatedHerbal[], lines: PlainLine[], deps: HerbalDeps): HerbalReport | undefined {
  if (herbal.length === 0) return undefined
  const windows: Record<number, { start?: string; end?: string }> = {}
  const lined: HerbalLine[] = herbal.map((h, n) => {
    const w = lineWindow(h.rx.date, parseSig(h.sig))
    windows[n] = w ? { start: w.start, end: w.end } : {}
    const extra = { rx_id: h.rx.id, doctor: h.rx.doctor, line: n, ...(w && { start: w.start, end: w.end, window_assumed: w.duration_assumed }) }
    return {
      ...h,
      line: n,
      ...(h.item && { item: { ...h.item, ...extra } }),
      ...(h.unrecognised && { unrecognised: { ...h.unrecognised, line: n, rx_id: h.rx.id, doctor: h.rx.doctor } }),
    }
  })
  return analyzeHerbal(lined, ordinaryFrom(lines), deps.classesOf, windows)
}
