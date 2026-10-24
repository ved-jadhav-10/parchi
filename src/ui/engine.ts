import type { Alert, Ledger, Patient, ResolvedBrand, Sig } from '../engine/contracts'
import { computeDose, type DoseResult } from '../engine/ledger'
import { createPipeline } from '../engine/pipeline'
import { loadResolver, type Resolver } from '../engine/resolver'
import { loadDdi, type DdiIndex } from '../engine/resolver/ddi'
import { loadAlertRules, type AlertRules } from '../engine/rules'
import { parseSig } from '../engine/sig'

/** Ask-only-when-needed: a patient field the engine wants before it can apply a limit, with the reason to show. */
export interface PatientPrompt {
  field: 'weight_kg' | 'serum_creatinine'
  reason: string
}

export interface CheckLine {
  resolved: ResolvedBrand
  sig: Sig
}

export interface CheckResult {
  lines: CheckLine[]
  ledger: Ledger
  /** Sorted: interrupt, inform, silent (Track C). */
  alerts: Alert[]
  prompts: PatientPrompt[]
  /** Cockcroft-Gault creatinine clearance in mL/min, or null when it cannot be worked out. */
  crcl: number | null
  /** What was left out of or assumed in the daily totals (Track B). */
  notes: DoseResult['notes']
}

export interface EngineDeps {
  resolver: Resolver
  ddi: DdiIndex
  rules: AlertRules
}

/**
 * The single seam between UI and engine: Track A resolves brands, Track B parses the sig and builds the ledger with
 * limits, Track C applies the rules and the alert budget. Track B's own result (what it still needs from the patient,
 * the kidney estimate, what it left out) is read from the same ledger call, so nothing is computed twice.
 */
export function createCheck(deps: EngineDeps) {
  const { resolver, ddi, rules } = deps
  return async (rxText: string, patient: Patient): Promise<CheckResult> => {
    let dose: DoseResult | undefined
    const check = createPipeline({
      resolver,
      ddi,
      rules,
      parseSig: (text) => parseSig(text),
      buildLedger: (lines, p) => (dose = computeDose(lines, p, { classesOf: (id) => resolver.ingredient(id)?.classes })).ledger,
    })
    const { lines, ledger, alerts } = await check(rxText, patient)
    if (lines.length === 0) throw new Error('No medicines found in the text')
    return {
      lines,
      ledger,
      alerts,
      // The patient form always asks for sex; only the two fields it hides until needed become prompts.
      prompts: (dose?.needs ?? []).filter((n): n is typeof n & { field: PatientPrompt['field'] } => n.field !== 'sex').map((n) => ({ field: n.field, reason: n.reason })),
      crcl: dose?.crcl ?? null,
      notes: dose?.notes ?? [],
    }
  }
}

let loaded: Promise<EngineDeps> | null = null
/** Fetched once from public/data (service-worker cached, so it works offline after the first load). */
export const getDeps = (): Promise<EngineDeps> =>
  (loaded ??= Promise.all([loadResolver(), loadDdi(), loadAlertRules()])
    .then(([resolver, ddi, rules]) => ({ resolver, ddi, rules }))
    .catch((e) => ((loaded = null), Promise.reject(e))))

export async function runCheck(rxText: string, patient: Patient): Promise<CheckResult> {
  return createCheck(await getDeps())(rxText, patient)
}
