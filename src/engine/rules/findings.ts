// Alerts from Track B's dose facts: kidney findings the patient rules do not already cover, notes that change what a
// total means (weekly drug read as daily, liquid with no volume), and sigs that had to be guessed.
import type { Alert } from '../contracts'
import { crclMissing } from './crcl'
import { confidenceOf, joinNames, lineDesc, lineLabel, linesByIngredient, originFields, systemicLines, uniqueLines, type Rule, type RuleContext } from './types'

/** The patient rules already speak for this ingredient's kidney risk (e.g. nsaid_renal), so B's finding would repeat it. */
function coveredByPatientRule(ctx: RuleContext, id: string): boolean {
  const classes = ctx.info(id).classes
  return ctx.config.patient_rules.some(
    (r) => r.crcl_below !== undefined && (r.ingredients?.includes(id) || classes.some((c) => r.classes?.includes(c))),
  )
}

export const findingsRule: Rule = (ctx) => {
  if (!ctx.dose) return []
  const alerts: Alert[] = []
  const policy = ctx.config.dose_policy
  const byIng = linesByIngredient(ctx)

  for (const f of ctx.dose.findings) {
    if (f.kind === 'over_limit') continue // raised from the ledger limit by the dose rule
    if (coveredByPatientRule(ctx, f.ingredient)) continue
    const lines = uniqueLines(byIng.get(f.ingredient) ?? [])
    if (!lines.length) continue
    alerts.push({
      tier: f.kind === 'renal_avoid' ? policy.renal_avoid : policy.renal_caution,
      type: f.kind,
      ingredients: [f.ingredient],
      reason: `${f.message} (${joinNames(lines.map(lineDesc))}). Pharmacist to review before dispensing.`,
      source: f.source,
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: f.pharmacist_approved,
      ...originFields(lines),
    })
  }

  // Kidney inputs B needs for drugs the patient rules do not cover.
  const uncovered = [...new Set(ctx.dose.needs.flatMap((n) => n.ingredients))].filter((id) => byIng.has(id) && !coveredByPatientRule(ctx, id))
  const missing = crclMissing(ctx.patient)
  if (uncovered.length && missing.length) {
    const lines = uniqueLines(uncovered.flatMap((id) => byIng.get(id) ?? []))
    const label = { weight_kg: 'weight', serum_creatinine: 'serum creatinine', sex: 'sex' } as const
    alerts.push({
      tier: 'inform',
      type: 'input_needed',
      ingredients: uncovered.sort(),
      reason: `${joinNames(uncovered.sort().map((id) => ctx.info(id).name))} needs a kidney check, but ${joinNames(missing.map((m) => label[m]))} ${missing.length > 1 ? 'are' : 'is'} not entered. Enter ${missing.length > 1 ? 'them' : 'it'} to run the check.`,
      source: 'Dose limits (kidney bands)',
      confidence: confidenceOf(lines),
      brands: lines.map(lineLabel),
      approved: true,
      ...originFields(lines),
    })
  }

  const sysLines = systemicLines(ctx)
  for (const note of ctx.dose.notes) {
    const tier = policy.notes[note.kind]
    if (!tier) continue
    const line = sysLines.find((l) => l.index === note.line)
    if (!line) continue
    alerts.push({
      tier,
      type: note.kind,
      ingredients: note.ingredient ? [note.ingredient] : line.resolved.ingredients.map((i) => i.id),
      reason: `${note.message}. Pharmacist to check.`,
      source: note.kind === 'schedule_mismatch' ? (line.resolved.schedule_source ?? 'Labelled schedule') : policy.source,
      confidence: line.resolved.confidence,
      brands: [lineLabel(line)],
      approved: policy.pharmacist_approved,
      ...originFields([line]),
    })
  }

  for (const line of sysLines) {
    const c = line.sig.confidence ?? 1
    if (c >= policy.sig_unclear_below && !line.sig.unparsed?.length) continue
    const why = [...(line.sig.assumptions ?? []), ...(line.sig.unparsed?.length ? [`not understood: ${line.sig.unparsed.join(', ')}`] : [])]
    alerts.push({
      tier: policy.sig_unclear_tier,
      type: 'sig_unclear',
      ingredients: line.resolved.ingredients.map((i) => i.id),
      reason: `${lineLabel(line)}: dosing could not be read with confidence${why.length ? ` (${why.join('; ')})` : ''}. Pharmacist to confirm how it is taken.`,
      source: 'Sig parser',
      confidence: c,
      brands: [lineLabel(line)],
      approved: true,
      ...originFields([line]),
    })
  }
  return alerts
}
