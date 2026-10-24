// Stacking: scored scales (anticholinergic burden, CNS-active drugs) summed over the ingredients taken together.
// Scores, thresholds and the age cut-off live in alert_rules.json (`burden_scales`), each with a source.
import type { Alert } from '../contracts'
import type { BurdenScale } from './config'
import { confidenceOf, joinNames, lineDesc, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule, type RuleContext } from './types'

/** Points for one ingredient: its own score, else the highest score of its classes, else 0. */
function scoreOf(ctx: RuleContext, scale: BurdenScale, id: string): number {
  const own = scale.scores[id]
  if (own !== undefined) return own
  return Math.max(0, ...ctx.info(id).classes.map((c) => scale.class_scores?.[c] ?? 0))
}

export const burdenRule: Rule = (ctx) => {
  const alerts: Alert[] = []
  const byIng = linesByIngredient(ctx)
  for (const scale of ctx.config.burden_scales) {
    if (scale.age_at_least !== undefined && ctx.patient.age_years < scale.age_at_least) continue
    const hits = [...byIng.keys()]
      .map((id) => ({ id, score: scoreOf(ctx, scale, id) }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    const total = hits.reduce((sum, h) => sum + h.score, 0)
    if (hits.length < scale.min_ingredients || total < scale.threshold) continue
    const lines = uniqueLines(hits.flatMap((h) => byIng.get(h.id) ?? []))
    alerts.push({
      tier: scale.tier,
      type: scale.id,
      ingredients: hits.map((h) => h.id).sort(),
      reason: `${scale.label}: ${joinNames(hits.map((h) => `${ctx.info(h.id).name} (${h.score})`))} add up to ${total} (alert from ${scale.threshold}) in a patient aged ${ctx.patient.age_years} (${joinNames(lines.map(lineDesc))}). Pharmacist to review.`,
      source: scale.source,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: scale.pharmacist_approved,
      ...originFields(lines),
    })
  }
  return alerts
}
