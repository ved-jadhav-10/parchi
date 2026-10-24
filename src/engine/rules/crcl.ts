// One CrCl for the whole engine: Track B's Cockcroft-Gault (adults only, needs weight, creatinine and sex).
import type { Patient } from '../contracts'
import { cockcroftGault as cg, type CrclResult } from '../limits/crcl'

/** Creatinine clearance in mL/min, or null when it cannot be calculated. */
export function cockcroftGault(p: Patient): number | null {
  return cg(p).value
}

/** Why CrCl could not be calculated: inputs to ask for. Empty for a child (formula not built) or when it is known. */
export function crclMissing(p: Patient): CrclResult['missing'] {
  return cg(p).missing
}
