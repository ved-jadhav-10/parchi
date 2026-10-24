import type { Alert, Ledger, Patient, ResolvedBrand, Sig } from '../contracts'
import type { DdiIndex } from '../resolver/ddi'
import type { AlertRules } from './config'

export interface RuleLine {
  index: number
  resolved: ResolvedBrand
  sig: Sig
}

export interface RuleContext {
  lines: RuleLine[]
  ledger: Ledger
  patient: Patient
  ddi: DdiIndex
  config: AlertRules
  /** display name and Track A classes for a canonical id */
  info: (id: string) => { name: string; classes: string[] }
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
