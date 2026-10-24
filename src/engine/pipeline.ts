// The single entry point the UI calls: text + patient -> resolver -> sig -> ledger -> rules -> alerts.
// Track B's sig parser and dose engine are injected (see wiring.ts for the real ones), so this file never depends on
// their internals; rules/testing.ts has stand-ins for tests.
import type { Alert, CheckPrescription, Ledger, Patient, ResolvedBrand, Sig } from './contracts'
import { finalizeAlerts } from './alerts/engine'
import type { LedgerNote } from './ledger'
import type { DoseResult } from './ledger'
import type { PatientNeed } from './limits'
import type { Resolver } from './resolver'
import type { DdiIndex } from './resolver/ddi'
import { neededInputs, runRules, type AlertRules, type LineOrigin, type RuleContext } from './rules'

export interface PipelineDeps {
  resolver: Resolver
  ddi: DdiIndex
  rules: AlertRules
  /** Track B: sig text ("1-0-1 x5d", "SOS") -> doses per day. */
  parseSig: (sigText: string, resolved: ResolvedBrand) => Sig
  /** Track B: ledger with the patient's limits, plus findings and notes for alerts. Preferred. */
  computeDose?: (lines: { resolved: ResolvedBrand; sig: Sig }[], patient: Patient, opts: { classesOf: (id: string) => string[] }) => DoseResult
  /** Ledger only (test stand-ins). `limit_mg_day` must be set where a limit exists; no limit = the dose rule stays silent. */
  buildLedger?: (lines: { resolved: ResolvedBrand; sig: Sig }[], patient: Patient) => Ledger
  /**
   * Optional, online only (Track B's parseSigSmart): re-read a sig the rules were unsure of. It returns the rules' Sig
   * unchanged offline or on any failure; a model-read Sig has confidence 0.5, so the line is always flagged to confirm.
   */
  refineSig?: (sigText: string, rules: Sig) => Promise<Sig>
}

/** Below this sig confidence the optional reader is asked (same cut-off as the `sig_unclear` alert). */
const REFINE_BELOW = 0.7

/** A resolved line ready for the rules; `origin` is set by the history check. */
export interface AnalysisLine {
  resolved: ResolvedBrand
  sig: Sig
  origin?: LineOrigin
}

export interface Analysis {
  ledger: Ledger
  /** Alerts before suppression, budget and ordering. */
  raw: Alert[]
  /** Kidney inputs still needed, only because a drug on these lines needs them. */
  needs: PatientNeed[]
  crcl: number | null
  /** What was left out of or assumed in the totals. */
  notes: LedgerNote[]
}

export type CheckResult = Awaited<ReturnType<CheckPrescription>> & Pick<Analysis, 'needs' | 'crcl' | 'notes'>

export interface Engine {
  resolver: Resolver
  rules: AlertRules
  /** Sig text -> Sig for a resolved line (Track B's parser). */
  sigFor: (sigText: string, resolved: ResolvedBrand) => Sig
  /** Ledger, dose facts and rules over lines that are all taken together; no suppression or budget yet. */
  analyze: (lines: AnalysisLine[], patient: Patient) => Analysis
  /** Suppression list, alert budget and ordering. */
  finalize: (raw: Alert[]) => Alert[]
}

export function createEngine(deps: PipelineDeps): Engine {
  const { resolver, ddi, rules, parseSig, computeDose, buildLedger } = deps
  const info: RuleContext['info'] = (id) => {
    const i = resolver.ingredient(id)
    return { name: i?.name ?? id, classes: i?.classes ?? [] }
  }
  const classesOf = (id: string) => info(id).classes

  return {
    resolver,
    rules,
    sigFor: parseSig,
    analyze(lines, patient) {
      const plain = lines.map(({ resolved, sig }) => ({ resolved, sig }))
      const dose = computeDose?.(plain, patient, { classesOf })
      const ledger = dose?.ledger ?? buildLedger?.(plain, patient) ?? {}
      const ctx: RuleContext = {
        lines: lines.map((l, index) => ({ index, ...l })),
        ledger,
        dose: dose && { findings: dose.findings, notes: dose.notes, needs: dose.needs },
        patient,
        ddi,
        config: rules,
        info,
        canonicalId: (name) => resolver.canonicalId(name),
      }
      const needs = new Map((dose?.needs ?? []).map((n) => [n.field, n]))
      for (const field of neededInputs(ctx)) {
        if (!needs.has(field)) needs.set(field, { field, reason: 'needed to estimate kidney function (CrCl) for a drug on this prescription', ingredients: [] })
      }
      return { ledger, raw: runRules(ctx), needs: [...needs.values()], crcl: dose?.crcl ?? null, notes: dose?.notes ?? [] }
    },
    finalize: (raw) => finalizeAlerts(raw, { config: rules, classesOf }),
  }
}

export function createPipeline(deps: PipelineDeps): (rxText: string, patient: Patient) => Promise<CheckResult> {
  const engine = createEngine(deps)
  return async (rxText, patient) => {
    const parsed = engine.resolver
      .resolveText(rxText, { age_years: patient.age_years })
      .map(({ resolved, sig_text }) => ({ resolved, sig_text, sig: engine.sigFor(sig_text, resolved) }))
    const refine = deps.refineSig
    const lines = await Promise.all(
      parsed.map(async ({ resolved, sig_text, sig }) => ({
        resolved,
        sig: refine && sig_text.trim() && (sig.confidence ?? 1) < REFINE_BELOW ? await refine(sig_text, sig).catch(() => sig) : sig,
      })),
    )
    const { raw, ...rest } = engine.analyze(lines, patient)
    return { lines, alerts: engine.finalize(raw), ...rest }
  }
}
