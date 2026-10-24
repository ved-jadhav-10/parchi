// Drug-drug interactions from DDInter. The tier comes from alert_rules.json, never from the data source.
import type { Alert } from '../contracts'
import type { DdiHit } from '../resolver/ddi'
import { confidenceOf, joinNames, lineDesc, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule, type RuleContext, type RuleLine } from './types'

const HOW: Record<string, string> = {
  activation_blocked: 'blocks its activation',
  opposing_action: 'works against it',
  absorption_blocked: 'stops it being absorbed',
  faster_breakdown: 'speeds up its breakdown',
  same_action: 'adds to the same effect',
}

/** Eye/ear/skin lines for the ingredients a curated rule checks there too (timolol eye drops are absorbed). */
function nonSystemicByIngredient(ctx: RuleContext): Map<string, RuleLine[]> {
  const ids = ctx.ddi.nonSystemic
  const map = new Map<string, RuleLine[]>()
  if (!ids?.size) return map
  for (const line of ctx.lines) {
    if (line.resolved.systemic !== false) continue
    for (const ing of line.resolved.ingredients) {
      if (!ids.has(ing.id)) continue
      const list = map.get(ing.id) ?? []
      if (!list.includes(line)) list.push(line)
      map.set(ing.id, list)
    }
  }
  return map
}

function reasonFor(hit: DdiHit, ctx: RuleContext, lines: RuleLine[]): string {
  const names = joinNames([ctx.info(hit.a).name, ctx.info(hit.b).name])
  const where = joinNames(lines.map(lineDesc))
  if (hit.effect === 'reduces_effect' && hit.reduces?.length) {
    const weakened = hit.reduces.map((id) => ctx.info(id).name)
    const other = [hit.a, hit.b].filter((id) => !hit.reduces!.includes(id)).map((id) => ctx.info(id).name)
    const how = hit.mechanism && HOW[hit.mechanism] ? ` (${HOW[hit.mechanism]})` : ''
    const subject = other.length ? joinNames(other) : names
    return `${subject} may reduce the effect of ${joinNames(weakened)}${how}: ${hit.level} interaction${hit.note ? `, ${hit.note}` : ''} (${where}). Pharmacist to review.`
  }
  return `${names}: ${hit.level} interaction${hit.note ? `, ${hit.note}` : ''} (${where}). Pharmacist to review.`
}

export const ddiRule: Rule = (ctx) => {
  const byIng = linesByIngredient(ctx)
  const topical = nonSystemicByIngredient(ctx)
  const tiers = ctx.config.ddi_tiers
  const alerts: Alert[] = []
  for (const hit of ctx.ddi.among([...new Set([...byIng.keys(), ...topical.keys()])])) {
    const tier = hit.interrupt || tiers.interrupt_pairs.includes(`${hit.a}|${hit.b}`) ? 'interrupt' : tiers[hit.level]
    if (!tier) continue
    // A non-systemic line only counts for the ingredient this rule names (timolol), never for DDInter pairs.
    const linesOf = (id: string) => [...(byIng.get(id) ?? []), ...(hit.non_systemic?.includes(id) ? (topical.get(id) ?? []) : [])]
    const linesA = linesOf(hit.a)
    const linesB = linesOf(hit.b)
    if (!linesA.length || !linesB.length) continue
    const lines = uniqueLines([...linesA, ...linesB])
    // Both drugs only ever together inside one brand: the FDC is intentional.
    if (lines.length === 1) continue
    alerts.push({
      tier,
      type: 'ddi',
      ingredients: [hit.a, hit.b],
      reason: reasonFor(hit, ctx, lines),
      source: hit.source,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: tiers.pharmacist_approved && hit.curated !== true,
      ...(hit.effect ? { interaction_effect: hit.effect } : {}),
      ...(hit.reduces?.length ? { reduces: hit.reduces } : {}),
      ...(hit.mechanism ? { mechanism: hit.mechanism } : {}),
      ...(hit.label_source ? { label_source: hit.label_source } : {}),
      ...originFields(lines),
    })
  }
  return alerts
}
