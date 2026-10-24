// Patient-history rules (FIX_PLAN Phase 2): drug allergies read through combination brands, and medicines to avoid in
// pregnancy. Both come from data (alert_rules.json) with a named source; neither assumes "no allergy" or "not pregnant".
import type { Alert } from '../contracts'
import { confidenceOf, joinNames, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule, type RuleContext } from './types'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

interface Matcher {
  classes?: string[]
  ingredients?: string[]
}
const inGroup = (ctx: RuleContext, id: string, g: Matcher) =>
  g.ingredients?.includes(id) === true || ctx.info(id).classes.some((c) => g.classes?.includes(c))

/** An allergy token as a recorded group ("penicillin", "nsaids") or undefined. Plural s and case do not matter. */
function groupFor(ctx: RuleContext, token: string) {
  const t = norm(token).replace(/s$/, '')
  return Object.entries(ctx.config.allergy_groups).find(([key, g]) => key === t || norm(g.label).replace(/s$/, '') === t)
}

export const allergyRule: Rule = (ctx) => {
  const tokens = ctx.patient.allergies ?? []
  if (!tokens.length) return []
  const byIng = linesByIngredient(ctx)
  const ids = [...byIng.keys()].sort()
  const alerts: Alert[] = []

  const base = (hit: string[]) => {
    const lines = uniqueLines(hit.flatMap((id) => byIng.get(id) ?? []))
    return { ingredients: hit, brands: lines.map(lineLabel), confidence: confidenceOf(lines), ...originFields(lines) }
  }

  for (const token of tokens) {
    const found = groupFor(ctx, token)
    if (found) {
      const [, g] = found
      const direct = ids.filter((id) => inGroup(ctx, id, g))
      if (direct.length) {
        const b = base(direct)
        alerts.push({
          ...b,
          tier: 'interrupt',
          type: 'allergy',
          approved: g.pharmacist_approved,
          source: g.source,
          reason: `${joinNames(direct.map((id) => ctx.info(id).name))} (${joinNames(b.brands ?? [])}): the patient has a recorded ${g.label} allergy. Pharmacist to review before dispensing.`,
        })
      }
      const cross = g.cross ? ids.filter((id) => !direct.includes(id) && inGroup(ctx, id, g.cross!)) : []
      if (g.cross && cross.length) {
        const b = base(cross)
        alerts.push({
          ...b,
          tier: g.cross.tier,
          type: 'allergy_cross',
          approved: g.pharmacist_approved,
          source: g.source,
          reason: `${joinNames(cross.map((id) => ctx.info(id).name))} (${joinNames(b.brands ?? [])}): ${g.cross.note} (recorded ${g.label} allergy). Pharmacist to review.`,
        })
      }
      continue
    }
    // Free text: one medicine's name (generic or brand). The matching ingredient on the Rx stops the pharmacist.
    const id = ctx.canonicalId?.(token) ?? null
    if (id) {
      if (byIng.has(id)) {
        const b = base([id])
        alerts.push({
          ...b,
          tier: 'interrupt',
          type: 'allergy',
          approved: false,
          source: 'Patient record (allergy entered by the pharmacist)',
          reason: `${ctx.info(id).name} (${joinNames(b.brands ?? [])}): the patient has a recorded allergy to ${token}. Pharmacist to review before dispensing.`,
        })
      }
      continue
    }
    // Neither a group nor a medicine we know: say so. A typo must never read as "checked, no allergy".
    alerts.push({
      tier: 'inform',
      type: 'input_needed',
      ingredients: [],
      reason: `The allergy "${token}" was not recognised, so it was not checked against this prescription. Check it by hand.`,
      source: 'Allergy check',
      confidence: 1,
      approved: true,
    })
  }
  return alerts
}

export const pregnancyRule: Rule = (ctx) => {
  const rules = ctx.config.pregnancy_rules
  if (!rules.length) return []
  const byIng = linesByIngredient(ctx)
  const ids = [...byIng.keys()].sort()
  const p = ctx.patient
  const hits = rules.map((r) => ({ r, hit: ids.filter((id) => inGroup(ctx, id, r)) })).filter((x) => x.hit.length)
  if (!hits.length) return []

  const alerts: Alert[] = []
  if (p.pregnancy === 'yes') {
    for (const { r, hit } of hits) {
      const lines = uniqueLines(hit.flatMap((id) => byIng.get(id) ?? []))
      alerts.push({
        tier: r.tier,
        type: 'pregnancy',
        ingredients: hit,
        brands: lines.map(lineLabel),
        confidence: confidenceOf(lines),
        reason: r.reason.replace('{names}', joinNames(hit.map((id) => ctx.info(id).name))),
        source: r.source,
        approved: r.pharmacist_approved,
        ...originFields(lines),
      })
    }
    return alerts
  }
  // Pregnancy status not entered: ask only where it matters (a woman of child-bearing age and a medicine that would stop the pharmacist).
  const canBePregnant = p.sex === 'F' && p.age_years >= 12 && p.age_years <= 50
  const serious = hits.filter((x) => x.r.tier === 'interrupt')
  if (p.pregnancy !== 'no' && canBePregnant && serious.length) {
    const ing = [...new Set(serious.flatMap((x) => x.hit))].sort()
    const lines = uniqueLines(ing.flatMap((id) => byIng.get(id) ?? []))
    alerts.push({
      tier: 'inform',
      type: 'input_needed',
      ingredients: ing,
      brands: lines.map(lineLabel),
      confidence: confidenceOf(lines),
      approved: true,
      reason: `${joinNames(ing.map((id) => ctx.info(id).name))} must not be used in pregnancy, and pregnancy status is not entered. Enter it to run the check.`,
      source: 'Pregnancy rules',
      ...originFields(lines),
    })
  }
  return alerts
}
