// Therapeutic class duplication: two different ingredients of one class from different brands.
import type { Alert } from '../contracts'
import { confidenceOf, joinNames, lineLabel, linesByIngredient, uniqueLines, type Rule } from './types'

export const classDupRule: Rule = (ctx) => {
  const byIng = linesByIngredient(ctx)
  const alerts: Alert[] = []
  for (const rule of ctx.config.class_duplication) {
    const ids = [...byIng.keys()].filter((id) => ctx.info(id).classes.includes(rule.class)).sort()
    if (ids.length < 2) continue
    const lines = uniqueLines(ids.flatMap((id) => byIng.get(id) ?? []))
    // Two classmates inside one brand (an FDC) are the manufacturer's choice, not a duplicate prescription.
    if (lines.length < 2) continue
    alerts.push({
      tier: rule.tier,
      type: 'class_duplication',
      ingredients: ids,
      reason: `Two or more ${rule.label}: ${joinNames(ids.map((id) => ctx.info(id).name))} (${joinNames(lines.map(lineLabel))}). Pharmacist to confirm this is intended.`,
      source: rule.source,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: rule.pharmacist_approved,
    })
  }
  return alerts
}
