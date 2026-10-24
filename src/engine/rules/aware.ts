// Antibiotic stewardship: WHO AWaRe groups. A Reserve antibiotic is an Inform for the pharmacist to confirm the indication;
// a Watch antibiotic is logged (silent). Access antibiotics raise nothing. Groups and tiers live in alert_rules.json (`aware`).
import type { Alert } from '../contracts'
import { confidenceOf, joinNames, lineDesc, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule } from './types'

const WHY = {
  reserve: 'WHO AWaRe Reserve antibiotic (last resort). Pharmacist to confirm it is prescribed for an infection with few other options, usually on specialist advice.',
  watch: 'WHO AWaRe Watch antibiotic (higher resistance potential). Logged for stewardship.',
} as const

export const awareRule: Rule = (ctx) => {
  const aware = ctx.config.aware
  if (!aware) return []
  const alerts: Alert[] = []
  const byIng = linesByIngredient(ctx)
  for (const group of ['reserve', 'watch'] as const) {
    const tier = aware.tiers[group]
    if (!tier) continue
    const ids = [...byIng.keys()].filter((id) => aware.ingredients[id] === group).sort()
    if (ids.length === 0) continue
    const lines = uniqueLines(ids.flatMap((id) => byIng.get(id) ?? []))
    alerts.push({
      tier,
      type: `aware_${group}`,
      ingredients: ids,
      reason: `${joinNames(ids.map((id) => ctx.info(id).name))} (${joinNames(lines.map(lineDesc))}): ${WHY[group]}`,
      source: aware.label,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: aware.pharmacist_approved,
      ...originFields(lines),
    })
  }
  return alerts
}
