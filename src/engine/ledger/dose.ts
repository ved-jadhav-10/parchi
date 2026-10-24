// Track B entry point for Track C's pipeline: resolved lines + sigs + patient -> ledger with limits, findings and questions.
import type { Ledger, Patient } from '../contracts'
import { applyLimits, type LimitFinding, type PatientNeed } from '../limits'
import { computeLedger, type LedgerLine, type LedgerNote, type LedgerOptions } from './ledger'

export interface DoseResult {
  /** mg/day per ingredient (SOS at worst case) with `limit_mg_day` for this patient where the data has one. */
  ledger: Ledger
  /** Over-limit and kidney facts for Track C to turn into alerts. */
  findings: LimitFinding[]
  /** Patient details still missing, asked only because an ingredient on this prescription needs them. */
  needs: PatientNeed[]
  /** Cockcroft-Gault creatinine clearance in mL/min, or null when it cannot be calculated. */
  crcl: number | null
  /** Things left out of or assumed in the totals, for the pharmacist to see. */
  notes: LedgerNote[]
}

export function computeDose(lines: LedgerLine[], patient: Patient, opts: LedgerOptions = {}): DoseResult {
  const { ledger, notes } = computeLedger(lines, opts)
  const limited = applyLimits(ledger, patient, opts.limits)
  return { ledger: limited.ledger, findings: limited.findings, needs: limited.needs, crcl: limited.crcl, notes }
}
