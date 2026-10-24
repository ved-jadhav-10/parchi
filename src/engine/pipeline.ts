// The single entry point the UI calls: text + patient -> resolver -> sig -> ledger -> rules -> alerts.
// Sig parsing and the ledger are Track B's; they are injected so this file never depends on their internals.
import type { CheckPrescription, Ledger, Patient, ResolvedBrand, Sig } from './contracts'
import { finalizeAlerts } from './alerts/engine'
import type { Resolver } from './resolver'
import type { DdiIndex } from './resolver/ddi'
import { runRules, type AlertRules, type RuleContext } from './rules'

export interface PipelineDeps {
  resolver: Resolver
  ddi: DdiIndex
  rules: AlertRules
  /** Track B: sig text ("1-0-1 x5d", "SOS") -> doses per day. */
  parseSig: (sigText: string, resolved: ResolvedBrand) => Sig
  /** Track B: cumulative mg/day per ingredient, with limit_mg_day for this patient where one exists. */
  buildLedger: (lines: { resolved: ResolvedBrand; sig: Sig }[], patient: Patient) => Ledger
}

export function createPipeline(deps: PipelineDeps): CheckPrescription {
  const { resolver, ddi, rules, parseSig, buildLedger } = deps
  const info: RuleContext['info'] = (id) => {
    const i = resolver.ingredient(id)
    return { name: i?.name ?? id, classes: i?.classes ?? [] }
  }

  return async (rxText, patient) => {
    const lines = resolver
      .resolveText(rxText, { age_years: patient.age_years })
      .map(({ resolved, sig_text }) => ({ resolved, sig: parseSig(sig_text, resolved) }))
    const ledger = buildLedger(lines, patient)
    const raw = runRules({
      lines: lines.map((l, index) => ({ index, ...l })),
      ledger,
      patient,
      ddi,
      config: rules,
      info,
    })
    const alerts = finalizeAlerts(raw, { config: rules, classesOf: (id) => info(id).classes })
    return { lines, ledger, alerts }
  }
}
