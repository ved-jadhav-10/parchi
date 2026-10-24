// Cockcroft-Gault creatinine clearance (CrCl: how well the kidneys clear drugs), in mL/min.
// CrCl = (140 - age) x weight / (72 x serum creatinine), x 0.85 for women. Cockcroft & Gault, Nephron 1976;16:31-41.
// Uses actual body weight: no height is collected, so ideal-weight correction for obese patients is not applied.
import type { Patient } from '../contracts'

export type CrclInput = 'weight_kg' | 'serum_creatinine' | 'sex'

export interface CrclResult {
  /** null when it cannot be calculated; see `missing` and `note`. */
  value: number | null
  missing: CrclInput[]
  note?: string
}

export function cockcroftGault(p: Patient): CrclResult {
  if (p.age_years < 18) {
    return { value: null, missing: [], note: 'Cockcroft-Gault is for adults; children need a different formula (not built).' }
  }
  const missing: CrclInput[] = []
  if (!(p.weight_kg !== undefined && p.weight_kg > 0)) missing.push('weight_kg')
  if (!(p.serum_creatinine !== undefined && p.serum_creatinine > 0)) missing.push('serum_creatinine')
  if (p.sex !== 'M' && p.sex !== 'F') missing.push('sex')
  if (missing.length) return { value: null, missing }
  const raw = ((140 - p.age_years) * p.weight_kg!) / (72 * p.serum_creatinine!)
  const value = Math.max(0, p.sex === 'F' ? raw * 0.85 : raw)
  return { value: Math.round(value * 10) / 10, missing: [] }
}
