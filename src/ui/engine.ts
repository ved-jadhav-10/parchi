import type { Alert, Ledger, Patient, ResolvedBrand, Sig } from '../engine/contracts'
import type { HerbalReport } from '../engine/herbal'
import { herbalSingle, splitSingle } from '../engine/herbal/orchestrate'
import { computeDose, type DoseResult } from '../engine/ledger'
import { createPipeline } from '../engine/pipeline'
import { loadResolver, type Resolver } from '../engine/resolver'
import { loadDdi, type DdiIndex } from '../engine/resolver/ddi'
import { loadAlertRules, type AlertRules } from '../engine/rules'
import { parseSig, parseSigSmart } from '../engine/sig'
import { ddiGapNames, limitGapNames } from './lib/coverage'
import { herbalDepsFor } from './lib/herbal'
import { parseSigWithReadings, readUnclearSigs } from './lib/smartSig'

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
  /** Ingredients the interaction data has no entry for: "no alert" means nothing on file for these. */
  ddi_gaps: string[]
  /** Totalled ingredients with no daily limit applied: "no dose alert" means not checked for these. */
  limit_gaps: string[]
  /** Ayurvedic and herbal items on the prescription, checked on their own and against the ordinary medicines. Not part of the alert tiers. */
  herbal?: HerbalReport
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
  // computeDose (not just a ledger) lets the pipeline raise Track B's findings as alerts: weekly drugs written daily,
  // kidney warnings, unclear sigs, liquids with no known volume. Without it those are silently dropped.
  // Online only: lines the rules could not read go to /api/parse-sig (sig text only); offline the rules result stands.
  const check = createPipeline({
    resolver,
    ddi,
    rules,
    parseSig: (text) => parseSigWithReadings(text),
    computeDose,
    refineSig: (text) => parseSigSmart(text),
  })
  const herbalDeps = herbalDepsFor(resolver)
  return async (rxText: string, patient: Patient): Promise<CheckResult> => {
    // Herbal lines come out first so the ordinary resolver never guesses a drug for them.
    const split = splitSingle(rxText, herbalDeps)
    const rest = split.restText.trim()
    // Online only: dosing text the rules cannot read is read by the server first (no change offline or when the rules are sure).
    if (rest) await readUnclearSigs(resolver, [split.restText], patient.age_years)
    const { lines, ledger, alerts, needs, crcl, notes } = rest ? await check(split.restText, patient) : { lines: [], ledger: {}, alerts: [], needs: [], crcl: null, notes: [] }
    const herbal = herbalSingle(split.herbal, lines, herbalDeps)
    if (lines.length === 0 && !herbal) throw new Error('No medicines found in the text')
    return {
      lines,
      ledger,
      alerts,
      // The patient form always asks for sex; only the two fields it hides until needed become prompts.
      prompts: needs.filter((n): n is typeof n & { field: PatientPrompt['field'] } => n.field !== 'sex').map((n) => ({ field: n.field, reason: n.reason })),
      crcl,
      notes,
      ddi_gaps: ddiGapNames(lines, ddi, resolver),
      limit_gaps: limitGapNames([ledger], resolver),
      ...(herbal && { herbal }),
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
