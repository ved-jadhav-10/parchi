// Drug-drug interactions from DDInter. The tier comes from alert_rules.json, never from the data source.
import type { Alert } from '../contracts'
import { confidenceOf, joinNames, lineDesc, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule } from './types'

export const ddiRule: Rule = (ctx) => {
  const byIng = linesByIngredient(ctx)
  const tiers = ctx.config.ddi_tiers
  const alerts: Alert[] = []
  for (const hit of ctx.ddi.among([...byIng.keys()])) {
    const tier = hit.interrupt || tiers.interrupt_pairs.includes(`${hit.a}|${hit.b}`) ? 'interrupt' : tiers[hit.level]
    if (!tier) continue
    const linesA = byIng.get(hit.a) ?? []
    const linesB = byIng.get(hit.b) ?? []
    const lines = uniqueLines([...linesA, ...linesB])
    // Both drugs only ever together inside one brand: the FDC is intentional.
    if (lines.length === 1) continue
    alerts.push({
      tier,
      type: 'ddi',
      ingredients: [hit.a, hit.b],
      reason: `${joinNames([ctx.info(hit.a).name, ctx.info(hit.b).name])}: ${hit.level} interaction${hit.note ? `, ${hit.note}` : ''} (${joinNames(lines.map(lineDesc))}). Pharmacist to review.`,
      source: hit.source,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: tiers.pharmacist_approved && hit.curated !== true,
      ...originFields(lines),
    })
  }
  return alerts
}
