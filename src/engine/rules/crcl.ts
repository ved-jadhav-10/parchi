import type { Patient } from '../contracts'

/** Cockcroft-Gault creatinine clearance in mL/min, or null when age, weight or creatinine is missing. */
export function cockcroftGault(p: Patient): number | null {
  if (!p.weight_kg || !p.serum_creatinine || p.serum_creatinine <= 0) return null
  const crcl = ((140 - p.age_years) * p.weight_kg) / (72 * p.serum_creatinine)
  return Math.max(0, p.sex === 'F' ? crcl * 0.85 : crcl)
}
