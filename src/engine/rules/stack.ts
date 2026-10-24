// Stacking rules from alert_rules.json: harm from a combination of drug types (ACE inhibitor/ARB + diuretic + NSAID,
// antithrombotics + NSAID, several QT drugs) that a pairwise interaction lookup does not see.
import type { Alert } from '../contracts'
import type { StackGroup, StackRule } from './config'
import { cockcroftGault } from './crcl'
import { confidenceOf, joinNames, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule, type RuleContext } from './types'

function groupIds(ctx: RuleContext, ids: string[], g: StackGroup): string[] {
  return ids.filter(
    (id) => !g.exclude?.includes(id) && (g.ingredients?.includes(id) || ctx.info(id).classes.some((c) => g.classes?.includes(c))),
  )
}

function escalates(ctx: RuleContext, rule: StackRule, ids: string[], crcl: number | null): boolean {
  const e = rule.escalate
  if (!e) return false
  if (e.age_at_least !== undefined && ctx.patient.age_years >= e.age_at_least) return true
  if (e.crcl_below !== undefined && crcl !== null && crcl < e.crcl_below) return true
  if (e.min_ingredients !== undefined && ids.length >= e.min_ingredients) return true
  const all = [...linesByIngredient(ctx).keys()]
  return e.classes !== undefined && all.some((id) => ctx.info(id).classes.some((c) => e.classes!.includes(c)))
}

export const stackRule: Rule = (ctx) => {
  const byIng = linesByIngredient(ctx)
  const all = [...byIng.keys()]
  const crcl = cockcroftGault(ctx.patient)
  const alerts: Alert[] = []
  for (const rule of ctx.config.stack_rules) {
    const hits = rule.groups.map((g) => groupIds(ctx, all, g)).filter((ids, i) => ids.length >= (rule.groups[i].min ?? 1))
    if (hits.length < (rule.min_groups ?? rule.groups.length)) continue
    const ids = [...new Set(hits.flat())].sort()
    const lines = uniqueLines(ids.flatMap((id) => byIng.get(id) ?? []))
    // Two ingredients that only ever come together inside one brand are an intended combination, not a stack.
    if (lines.length < 2) continue
    const names = joinNames(ids.map((id) => ctx.info(id).name))
    alerts.push({
      tier: escalates(ctx, rule, ids, crcl) ? rule.escalate!.tier : rule.tier,
      type: rule.id,
      ingredients: ids,
      reason: rule.reason
        .replace('{names}', names)
        .replace('{age}', String(ctx.patient.age_years))
        .replace('{crcl}', crcl === null ? 'n/a' : String(Math.round(crcl))),
      source: rule.source,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: rule.pharmacist_approved,
      ...originFields(lines),
    })
  }
  return alerts
}
