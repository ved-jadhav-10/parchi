// MOCK for UI work only. Replaced by the real checkPrescription() in src/ui/engine.ts once Track C lands pipeline.ts.
// Totals follow PS_ANALYSIS.md section 5; only paracetamol has a limit so "No limit on file" is exercised.
import type { Alert, Ledger, ResolvedBrand, Sig } from '../../engine/contracts'

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

const line = (raw: string, brand: string, confidence: number, ingredients: ResolvedBrand['ingredients'], sig: Sig, form = 'tablet') => ({
  resolved: { raw, brand, confidence, ingredients, form, flags: [] } as ResolvedBrand,
  sig,
})

export const demoLines = [
  line('Dolo 650', 'Dolo 650', 1, [{ id: 'paracetamol', mg: 650 }], { doses_per_day: 3, max_doses_per_day: 3, sos: false, duration_days: 5 }),
  line('Crocin cold n flu max', 'Crocin Cold & Flu Max', 0.96, [{ id: 'paracetamol', mg: 500 }, { id: 'caffeine', mg: 32 }, { id: 'phenylephrine', mg: 10 }], { doses_per_day: 3, max_doses_per_day: 3, sos: false }),
  line('Zerodol P', 'Zerodol-P', 0.94, [{ id: 'aceclofenac', mg: 100 }, { id: 'paracetamol', mg: 325 }], { doses_per_day: 2, max_doses_per_day: 2, sos: false }),
  line('Brufan 400', 'Brufen 400', 0.82, [{ id: 'ibuprofen', mg: 400 }], { doses_per_day: 0, max_doses_per_day: 3, sos: true }),
  line('Ecosprin 75', 'Ecosprin 75', 1, [{ id: 'aspirin', mg: 75 }], { doses_per_day: 1, max_doses_per_day: 1, sos: false }),
  line('Pan D', 'Pan-D', 0.97, [{ id: 'pantoprazole', mg: 40 }, { id: 'domperidone', mg: 30 }], { doses_per_day: 1, max_doses_per_day: 1, sos: false }, 'capsule'),
  line('Omez 20', 'Omez', 0.98, [{ id: 'omeprazole', mg: 20 }], { doses_per_day: 1, max_doses_per_day: 1, sos: false }, 'capsule'),
]

export const demoPrompts = [
  { field: 'weight_kg' as const, reason: 'NSAIDs are present and dosing may depend on weight' },
  { field: 'serum_creatinine' as const, reason: 'NSAIDs are present and renal function affects the limit' },
]
