// Same-ingredient rules: daily total above the limit (Interrupt) and the same ingredient in two brands (Inform).
import type { Alert } from '../contracts'
import { confidenceOf, joinNames, lineDesc, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule } from './types'

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')

export const doseRule: Rule = (ctx) => {
  const alerts: Alert[] = []
  for (const [id, lines] of linesByIngredient(ctx)) {
    const entry = ctx.ledger[id]
    const name = ctx.info(id).name
    const involved = uniqueLines(lines)
    const brands = involved.map(lineLabel)
    const descs = involved.map(lineDesc)
    const origin = originFields(involved)

    if (entry?.limit_mg_day !== undefined && entry.total_mg_day > entry.limit_mg_day) {
      const where = involved.length > 1 ? ` across ${involved.length} brands (${joinNames(descs)})` : ` from ${descs[0]}`
      const basis = entry.limit_basis ? ` (${entry.limit_basis.toLowerCase()})` : ''
      // Within the limit on the scheduled doses alone: only the SOS worst case crosses it.
      const sosOnly = (entry.sos_mg_day ?? 0) > 0 && (entry.scheduled_mg_day ?? entry.total_mg_day) <= entry.limit_mg_day
      const tier = sosOnly ? ctx.config.dose_policy.over_limit_sos_only : 'interrupt'
      alerts.push({
        tier,
        type: sosOnly ? 'dose_excess_sos' : 'dose_excess',
        ingredients: [id],
        reason: `${name} totals ${fmt(entry.total_mg_day)} mg/day${where}${sosOnly ? ', only if the SOS dose is used at its maximum' : ''}, above the ${fmt(entry.limit_mg_day)} mg/day limit${basis}. Pharmacist to review before dispensing.`,
        source: `Daily limit table: ${name} ${fmt(entry.limit_mg_day)} mg/day`,
        confidence: confidenceOf(involved),
        brands,
        approved: entry.limit_pharmacist_approved ?? false,
        ...(entry.caveats?.length ? { caveats: entry.caveats } : {}),
        ...origin,
      })
    } else if (involved.length > 1) {
      alerts.push({
        tier: 'inform',
        type: 'duplicate_ingredient',
        ingredients: [id],
        reason: `${name} is in ${involved.length} brands (${joinNames(descs)})${entry ? `, ${fmt(entry.total_mg_day)} mg/day in total` : ''}. Pharmacist to confirm this is intended.`,
        source: 'Ingredient ledger',
        confidence: confidenceOf(involved),
        brands,
        approved: true,
        ...(entry?.caveats?.length ? { caveats: entry.caveats } : {}),
        ...origin,
      })
    }
  }
  return alerts
}
