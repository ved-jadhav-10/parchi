// The 68-year-old demo case from PS_ANALYSIS.md section 5. Used by "Load demo" and the #/demo walkthrough.
import type { Patient } from '../engine/contracts'

export const demoRxText =
  'Dolo 650 1-1-1 x5d; Crocin cold n flu max TDS; Zerodol P BD; Brufan 400 SOS; Ecosprin 75 OD; Pan D OD; Omez 20 OD'

export const demoPatient: Patient = { age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'M' }
