// Patient-specific rules (renal, geriatric) from alert_rules.json. Asks for missing inputs instead of silently skipping.
import type { Alert } from '../contracts'
import { cockcroftGault, crclMissing } from './crcl'
import type { PatientRule } from './config'
import { confidenceOf, joinNames, lineLabel, linesByIngredient, originFields, uniqueLines, type Rule, type RuleContext } from './types'

export type PatientInput = 'weight_kg' | 'serum_creatinine' | 'sex'

const INPUT_LABEL: Record<PatientInput, string> = { weight_kg: 'weight', serum_creatinine: 'serum creatinine', sex: 'sex' }

function matchedIds(ctx: RuleContext, rule: PatientRule): string[] {
  return [...linesByIngredient(ctx).keys()]
    .filter((id) => rule.ingredients?.includes(id) || ctx.info(id).classes.some((c) => rule.classes?.includes(c)))
    .sort()
}

function applies(ctx: RuleContext, rule: PatientRule): boolean {
  return rule.age_at_least === undefined || ctx.patient.age_years >= rule.age_at_least
}

/** Inputs the UI should ask for, only because a drug on this Rx needs them. */
export function neededInputs(ctx: RuleContext): PatientInput[] {
  const need = new Set<PatientInput>()
  for (const rule of ctx.config.patient_rules) {
    if (rule.crcl_below === undefined || !applies(ctx, rule) || !matchedIds(ctx, rule).length) continue
    for (const field of crclMissing(ctx.patient)) need.add(field)
  }
  return [...need]
}

export const patientRule: Rule = (ctx) => {
  const alerts: Alert[] = []
  const crcl = cockcroftGault(ctx.patient)
  const byIng = linesByIngredient(ctx)
  for (const rule of ctx.config.patient_rules) {
    const ids = matchedIds(ctx, rule)
    if (!ids.length || !applies(ctx, rule)) continue
    const lines = uniqueLines(ids.flatMap((id) => byIng.get(id) ?? []))
    const base = { ingredients: ids, brands: lines.map(lineLabel), confidence: confidenceOf(lines), approved: rule.pharmacist_approved, ...originFields(lines) }
    const names = joinNames(ids.map((id) => ctx.info(id).name))
    if (rule.crcl_below !== undefined) {
      if (crcl === null) {
        const missing = crclMissing(ctx.patient)
        if (!missing.length) continue // a child: the adult formula does not apply, so there is nothing to ask for
        alerts.push({
          ...base,
          tier: 'inform',
          type: 'input_needed',
          reason: `${names} needs a kidney check, but ${joinNames(missing.map((f) => INPUT_LABEL[f]))} ${missing.length > 1 ? 'are' : 'is'} not entered. Enter ${missing.length > 1 ? 'them' : 'it'} to run the check.`,
          source: rule.source,
          approved: true,
        })
        continue
      }
      if (crcl >= rule.crcl_below) continue
      if (rule.crcl_at_least !== undefined && crcl < rule.crcl_at_least) continue
    }
    alerts.push({
      ...base,
      tier: rule.tier,
      type: rule.id,
      reason: rule.reason
        .replace('{names}', names)
        .replace('{crcl}', crcl === null ? 'n/a' : String(Math.round(crcl)))
        .replace('{age}', String(ctx.patient.age_years)),
      source: rule.source,
    })
  }
  return alerts
}
