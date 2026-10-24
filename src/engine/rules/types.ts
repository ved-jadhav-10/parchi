import type { Alert, Ledger, Patient, ResolvedBrand, Sig } from '../contracts'
import type { LedgerNote } from '../ledger'
import type { LimitFinding, PatientNeed } from '../limits'
import type { DdiIndex } from '../resolver/ddi'
import type { AlertRules } from './config'

/** Where a line came from, set only by the history check (several doctors, dated Rx). */
export interface LineOrigin {
  rx_id: string
  doctor: string
  /** ISO date the line starts (Rx date) */
  start: string
  /** ISO date the supply runs out (exclusive) */
  end: string
}

export interface RuleLine {
  index: number
  resolved: ResolvedBrand
  sig: Sig
  origin?: LineOrigin
}

/** Track B's dose facts for these lines, when the pipeline has them. */
export interface DoseFacts {
  findings: LimitFinding[]
  notes: LedgerNote[]
  needs: PatientNeed[]
}

export interface RuleContext {
  lines: RuleLine[]
  ledger: Ledger
  dose?: DoseFacts
  patient: Patient
  ddi: DdiIndex
  config: AlertRules
  /** display name and Track A classes for a canonical id */
  info: (id: string) => { name: string; classes: string[] }
  /** a typed name (generic, brand or alias) to its canonical ingredient id, or null; reads free-text allergies */
  canonicalId?: (name: string) => string | null
}

export type Rule = (ctx: RuleContext) => Alert[]

/** Only systemic lines count toward doses, duplicates and interactions (gels, eye/ear drops do not). */
export function systemicLines(ctx: RuleContext): RuleLine[] {
  return ctx.lines.filter((l) => l.resolved.systemic !== false)
}

/** ingredient id -> lines that contain it (systemic only) */
export function linesByIngredient(ctx: RuleContext): Map<string, RuleLine[]> {
  const map = new Map<string, RuleLine[]>()
  for (const line of systemicLines(ctx)) {
    for (const ing of line.resolved.ingredients) {
      const list = map.get(ing.id) ?? []
      if (!list.includes(line)) list.push(line)
      map.set(ing.id, list)
    }
  }
  return map
}

export function lineLabel(line: RuleLine): string {
  return line.resolved.brand ?? line.resolved.raw
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "3 Jan 2026" from an ISO date (fixed format, no locale, so output is the same everywhere). */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** Brand name for reason text; with history, "Dolo 650 (Dr Rao, 3 Jan 2026)" so two prescriptions of one brand stay distinct. */
export function lineDesc(line: RuleLine): string {
  return line.origin ? `${lineLabel(line)} (${line.origin.doctor}, ${fmtDate(line.origin.start)})` : lineLabel(line)
}

/** An alert is only as sure as the weakest brand match behind it. */
export function confidenceOf(lines: RuleLine[]): number {
  return lines.length ? Math.min(...lines.map((l) => l.resolved.confidence)) : 1
}

export function uniqueLines(lines: RuleLine[]): RuleLine[] {
  return [...new Set(lines)].sort((a, b) => a.index - b.index)
}

export function joinNames(names: string[]): string {
  return names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Doctor and prescription fields for an alert, only when the lines carry history origins. */
export function originFields(lines: RuleLine[]): Pick<Alert, 'doctors' | 'rx_ids' | 'cross_doctor'> {
  const origins = lines.map((l) => l.origin).filter((o): o is LineOrigin => o !== undefined)
  if (!origins.length) return {}
  const doctors = [...new Set(origins.map((o) => o.doctor))]
  return { doctors, rx_ids: [...new Set(origins.map((o) => o.rx_id))], cross_doctor: doctors.length > 1 }
}
