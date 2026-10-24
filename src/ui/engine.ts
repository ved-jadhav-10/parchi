import type { CheckPrescription, Patient } from '../engine/contracts'
import { demoAlerts, demoLedger, demoLines, demoPrompts } from './mock/demoResult'

/** Ask-only-when-needed: fields the engine wants before it can apply a limit. Proposed additive field for Track C. */
export interface PatientPrompt {
  field: 'weight_kg' | 'serum_creatinine'
  reason: string
}

export type CheckResult = Awaited<ReturnType<CheckPrescription>> & { prompts?: PatientPrompt[] }

/**
 * The single seam between UI and engine. Today it returns the mock.
 * When Track C lands src/engine/pipeline.ts, replace the body with:
 *   import { checkPrescription } from '../engine/pipeline'
 *   return checkPrescription(rxText, patient)
 * and delete src/ui/mock/.
 */
export async function runCheck(_rxText: string, _patient: Patient): Promise<CheckResult> {
  return { lines: demoLines, ledger: demoLedger, alerts: demoAlerts, prompts: demoPrompts }
}

export const isMock = true
