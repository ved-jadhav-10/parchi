// MOCK for UI work only. Replace with the real checkPrescription() from src/engine/pipeline.ts (Track C).
// Totals follow PS_ANALYSIS.md section 5; only paracetamol has a limit so "No limit on file" is exercised.
import type { Alert, Ledger, ResolvedBrand } from '../../engine/contracts'

export const demoRxText =
  'Dolo 650 1-1-1 x5d; Crocin cold n flu max TDS; Zerodol P BD; Brufan 400 SOS; Ecosprin 75 OD; Pan D OD; Omez 20 OD'

export const demoPatient = { age: '68', sex: 'M', weight: '55', creatinine: '1.6' }

export const demoLedger: Ledger = {
  paracetamol: { total_mg_day: 4100, sources: ['Dolo 650', 'Crocin Cold & Flu Max', 'Zerodol-P'], limit_mg_day: 4000 },
  ibuprofen: { total_mg_day: 1200, sources: ['Brufen 400'] },
  aceclofenac: { total_mg_day: 200, sources: ['Zerodol-P'] },
  aspirin: { total_mg_day: 75, sources: ['Ecosprin 75'] },
  pantoprazole: { total_mg_day: 40, sources: ['Pan-D'] },
  omeprazole: { total_mg_day: 20, sources: ['Omez'] },
  domperidone: { total_mg_day: 30, sources: ['Pan-D'] },
}

const a = (tier: Alert['tier'], type: string, ingredients: string[], reason: string, source: string, confidence: number): Alert => ({
  tier,
  type,
  ingredients,
  reason,
  source,
  confidence,
})

export const demoAlerts: Alert[] = [
  a('interrupt', 'overdose', ['paracetamol'], 'Paracetamol totals 4,100 mg/day across 3 brands, above the 4,000 mg/day limit. Review.', 'Limit table', 0.97),
  a('interrupt', 'renal', ['ibuprofen', 'aceclofenac'], 'Two NSAIDs with estimated CrCl of about 34 mL/min at age 68. Review.', 'Cockcroft-Gault', 0.9),
  a('inform', 'interaction', ['ibuprofen', 'aspirin'], 'Ibuprofen can reduce the antiplatelet effect of aspirin. Consider.', 'DDInter', 0.85),
  a('inform', 'class_duplication', ['pantoprazole', 'omeprazole'], 'Two proton pump inhibitors on one prescription. Consider.', 'Class table', 0.9),
  a('inform', 'geriatric', ['domperidone'], 'Domperidone in an elderly patient. Review dose and duration.', 'Pharmacist rule', 0.7),
  a('silent', 'duplication', ['paracetamol', 'aceclofenac'], 'Routine combination, logged only.', 'Suppression list', 0.9),
  a('silent', 'duplication', ['pantoprazole', 'domperidone'], 'Fixed combination in Pan-D, logged only.', 'Suppression list', 0.95),
]

export const demoLines: Pick<ResolvedBrand, 'raw' | 'brand' | 'confidence'>[] = [
  { raw: 'Dolo 650', brand: 'Dolo 650', confidence: 1 },
  { raw: 'Crocin cold n flu max', brand: 'Crocin Cold & Flu Max', confidence: 0.96 },
  { raw: 'Zerodol P', brand: 'Zerodol-P', confidence: 0.94 },
  { raw: 'Brufan 400', brand: 'Brufen 400', confidence: 0.82 },
  { raw: 'Ecosprin 75', brand: 'Ecosprin 75', confidence: 1 },
  { raw: 'Pan D', brand: 'Pan-D', confidence: 0.97 },
  { raw: 'Omez 20', brand: 'Omez', confidence: 0.98 },
]
