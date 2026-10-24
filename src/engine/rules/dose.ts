// Same-ingredient rules: daily total above the limit (Interrupt) and the same ingredient in two brands (Inform).
import type { Alert } from '../contracts'
import { confidenceOf, joinNames, lineLabel, linesByIngredient, uniqueLines, type Rule } from './types'

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')

export const doseRule: Rule = (ctx) => {
  const alerts: Alert[] = []
  for (const [id, lines] of linesByIngredient(ctx)) {
    const entry = ctx.ledger[id]
    const name = ctx.info(id).name
    const involved = uniqueLines(lines)
    const brands = involved.map(lineLabel)

    if (entry?.limit_mg_day !== undefined && entry.total_mg_day > entry.limit_mg_day) {
      const where = involved.length > 1 ? ` across ${involved.length} brands (${joinNames(brands)})` : ` from ${brands[0]}`
      alerts.push({
        tier: 'interrupt',
        type: 'dose_excess',
        ingredients: [id],
        reason: `${name} totals ${fmt(entry.total_mg_day)} mg/day${where}, above the ${fmt(entry.limit_mg_day)} mg/day limit. Pharmacist to review before dispensing.`,
        source: `Daily limit table: ${name} ${fmt(entry.limit_mg_day)} mg/day`,
        confidence: confidenceOf(involved),
        brands,
        approved: false,
      })
    } else if (involved.length > 1) {
      alerts.push({
        tier: 'inform',
        type: 'duplicate_ingredient',
        ingredients: [id],
        reason: `${name} is in ${involved.length} brands (${joinNames(brands)})${entry ? `, ${fmt(entry.total_mg_day)} mg/day in total` : ''}. Pharmacist to confirm this is intended.`,
        source: 'Ingredient ledger',
        confidence: confidenceOf(involved),
        brands,
        approved: true,
      })
    }
  }
  return alerts
}
