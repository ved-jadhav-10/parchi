import type { Alert, Ledger, Patient, ResolvedBrand, Sig } from '../engine/contracts'
import { loadResolver, type Resolver } from '../engine/resolver'
import { demoRxText } from './demoCase'
import { demoAlerts, demoLedger, demoLines, demoPrompts } from './mock/demoResult'

/** Ask-only-when-needed: fields the engine wants before it can apply a limit. Proposed additive field for Track C. */
export interface PatientPrompt {
  field: 'weight_kg' | 'serum_creatinine'
  reason: string
}

/** One prescription line. `sig` is null until Track B's parser is wired: only the dosing text as written is known. */
export interface CheckLine {
  resolved: ResolvedBrand
  sig: Sig | null
  sig_text: string
}

export interface CheckResult {
  lines: CheckLine[]
  ledger: Ledger
  alerts: Alert[]
  prompts?: PatientPrompt[]
  /** Brands are matched (Track A) but daily totals and alerts are not available: the dose engine is not connected. */
  partial?: boolean
}

let resolver: Promise<Resolver> | null = null
/** Track A's resolver, fetched once from public/data (service-worker cached, so it works offline after the first load). */
const getResolver = () => (resolver ??= loadResolver().catch((e) => ((resolver = null), Promise.reject(e))))

const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * The single seam between UI and engine.
 *  - Brand matching is real (Track A): whatever is typed is resolved against the 32k-brand index.
 *  - Dosing, totals and alerts are mock until Tracks B and C land. They exist only for the demo case, so any other
 *    prescription returns `partial: true` instead of someone else's alerts.
 * When Track C lands src/engine/pipeline.ts, replace the body with `checkPrescription(rxText, patient)`,
 * delete src/ui/mock/ and set `isMock = false`.
 */
export async function runCheck(rxText: string, patient: Patient): Promise<CheckResult> {
  const isDemo = same(rxText, demoRxText)
  let parsed: { resolved: ResolvedBrand; sig_text: string }[]
  try {
    parsed = (await getResolver()).resolveText(rxText, { age_years: patient.age_years })
  } catch (e) {
    // Offline before the data was ever cached: the demo still works from its hand-written lines.
    if (!isDemo) throw e
    return { lines: demoLines.map((l) => ({ ...l, sig_text: '' })), ledger: demoLedger, alerts: demoAlerts, prompts: demoPrompts }
  }
  if (parsed.length === 0) throw new Error('No medicines found in the text')

  if (isDemo) {
    return {
      lines: parsed.map((l, i) => ({ resolved: l.resolved, sig: demoLines[i]?.sig ?? null, sig_text: l.sig_text })),
      ledger: demoLedger,
      alerts: demoAlerts,
      prompts: demoPrompts,
    }
  }
  return { lines: parsed.map((l) => ({ resolved: l.resolved, sig: null, sig_text: l.sig_text })), ledger: {}, alerts: [], partial: true }
}

export const isMock = true
