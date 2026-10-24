// Builds eval/gold.json. The expected alerts are written from drug labels and guidelines (the `why` of each case),
// NOT from the engine's output. Run: node eval/build_gold.mjs
import { writeFileSync } from 'node:fs'

const adult = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }
const young = { age_years: 30, weight_kg: 65, serum_creatinine: 0.7, sex: 'F' }
const elder = (extra = {}) => ({ age_years: 72, weight_kg: 60, serum_creatinine: 1.0, sex: 'M', ...extra })
const e = (type, ...ingredients) => ({ type, ingredients })

const single = []
const add = (id, why, rx, patient, expected = []) => single.push({ id, kind: 'single', why, rx, patient, expected })

// --- overdose and hidden duplicates (paracetamol adult max 4 g/day) ---
add('S01', 'Two paracetamol brands add up to 4,100 mg/day (2,600 + 1,500). One dose alert naming both brands is enough; a second "in 2 brands" alert would be noise', 'Dolo 650 QID; Calpol 500 TDS', adult, [e('dose_excess', 'paracetamol')])
add('S02', 'One paracetamol brand, 1,950 mg/day', 'Dolo 650 TDS', adult)
add('S03', 'Paracetamol hidden in a cold tablet and a pain tablet; total 3,450 mg is under the limit but it is still a double', 'Sinarest New TDS; Dolo 650 TDS', adult, [e('duplicate_ingredient', 'paracetamol')])
add('S04', 'Tramadol-paracetamol combination plus plain paracetamol', 'Ultracet BD; Dolo 650 TDS', adult, [e('duplicate_ingredient', 'paracetamol')])
add('S05', 'Two aceclofenac-paracetamol brands: aceclofenac 400 mg/day (max 200) is one dose alert; paracetamol (1,300 mg) is a plain duplicate', 'Zerodol-P BD; Hifenac-P BD', adult, [e('dose_excess', 'aceclofenac'), e('duplicate_ingredient', 'paracetamol')])
add('S06', 'Ibuprofen in Combiflam and in Brufen', 'Combiflam BD; Brufen 400 SOS', adult, [e('duplicate_ingredient', 'ibuprofen')])
add('S07', 'Ambroxol and guaifenesin in both a tablet and a syrup', 'Sinarest-CCF TDS; Ascoril LS 10 ml TDS', adult, [e('duplicate_ingredient', 'ambroxol'), e('duplicate_ingredient', 'guaifenesin')])
add('S08', 'Same cefixime in two brands', 'Taxim-O 200 BD; Zifi 200 BD', adult, [e('duplicate_ingredient', 'cefixime')])

// --- therapeutic class duplication ---
add('S09', 'Two NSAIDs (diclofenac and aceclofenac)', 'Voveran SR 100 OD; Zerodol-P BD', adult, [e('class_duplication', 'diclofenac', 'aceclofenac')])
add('S10', 'Two PPIs', 'Pan 40 OD; Omez 20 BD', adult, [e('class_duplication', 'pantoprazole', 'omeprazole')])
add('S11', 'Two antihistamines (cetirizine and fexofenadine)', 'Cetzine 10 OD; Allegra 120 OD', adult, [e('class_duplication', 'cetirizine', 'fexofenadine')])
add('S12', 'Antihistamine in the cold tablet and in Montair-LC', 'Montair-LC OD; Sinarest New TDS', adult, [e('class_duplication', 'levocetirizine', 'chlorphenamine')])
add('S13', 'Two fluoroquinolones', 'Cifran 500 BD; Levoflox 500 OD', adult, [e('class_duplication', 'ciprofloxacin', 'levofloxacin')])

// --- interactions (clinically significant pairs) ---
add('S14', 'Aspirin with ibuprofen: bleeding risk and blocked antiplatelet effect', 'Ecosprin 75 OD; Brufen 400 TDS', adult, [e('ddi', 'aspirin', 'ibuprofen')])
add('S15', 'Warfarin with aspirin: bleeding', 'Warf 5 OD; Ecosprin 75 OD', adult, [e('ddi', 'warfarin', 'aspirin')])
add('S16', 'Warfarin with diclofenac: bleeding', 'Warf 5 OD; Voveran SR 100 OD', adult, [e('ddi', 'warfarin', 'diclofenac')])
add('S17', 'Clopidogrel with omeprazole: weaker antiplatelet effect', 'Clopitab 75 OD; Omez 20 OD', adult, [e('ddi', 'clopidogrel', 'omeprazole')])
add('S18', 'Escitalopram with tramadol: serotonin syndrome and seizure risk', 'Nexito 10 OD; Ultracet BD', adult, [e('ddi', 'escitalopram', 'tramadol')])
add('S19', 'ACE inhibitor with spironolactone: high potassium', 'Cardace 5 OD; Aldactone 25 OD', adult, [e('ddi', 'ramipril', 'spironolactone')])
add('S20', 'ARB with ACE inhibitor: dual blockade', 'Telma 40 OD; Cardace 5 OD', adult, [e('ddi', 'telmisartan', 'ramipril')])

// --- kidney (Cockcroft-Gault; NSAIDs avoided below CrCl 60 in the elderly, metformin stopped below 30, nitrofurantoin avoided below 30-45) ---
const k34 = { age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'M' } // CrCl about 34
add('S21', 'NSAID at CrCl about 34', 'Brufen 400 TDS', k34, [e('renal', 'ibuprofen')])
add('S22', 'Paracetamol is fine at CrCl about 34', 'Dolo 650 TDS', k34)
add('S23', 'NSAID in a combination tablet at CrCl about 34', 'Zerodol-P BD', k34, [e('renal', 'aceclofenac')])
add('S24', 'Nitrofurantoin at CrCl about 22', 'Niftran 100 BD', { age_years: 72, weight_kg: 50, serum_creatinine: 1.8, sex: 'F' }, [e('renal', 'nitrofurantoin')])
add('S25', 'Metformin at CrCl about 25', 'Glycomet 500 BD', { age_years: 75, weight_kg: 55, serum_creatinine: 2.0, sex: 'M' }, [e('renal', 'metformin')])
add('S26', 'NSAID for a 70-year-old with no weight or creatinine: the check cannot run until they are entered', 'Brufen 400 TDS', { age_years: 70, sex: 'M' }, [e('input_needed', 'ibuprofen')])

// --- older adults ---
add('S27', 'Domperidone in a 70-year-old (QT risk)', 'Pan-D OD', elder({ age_years: 70 }), [e('geriatric', 'domperidone')])
add('S28', 'Same tablet in a 30-year-old is fine', 'Pan-D OD', young)
add('S29', 'Hydroxyzine (strongly anticholinergic, Beers) at 72', 'Atarax 25 HS', elder(), [e('geriatric', 'hydroxyzine')])
add('S30', 'Alprazolam at 72 (Beers: avoid benzodiazepines)', 'Alprax 0.25 HS', elder(), [e('geriatric', 'alprazolam')])
add('S31', 'Zolpidem at 70 (Beers: avoid Z-drugs)', 'Zolfresh 10 HS', elder({ age_years: 70 }), [e('geriatric', 'zolpidem')])
add('S32', 'Alprazolam at 30 is not a geriatric flag', 'Alprax 0.25 HS', young)
add('S33', 'Diphenhydramine cold tablet at 68 (Beers)', 'Cheston Cold TDS', elder({ age_years: 68 }), [e('geriatric', 'diphenhydramine')])

add('S41', 'Amitriptyline at 72 (Beers: avoid tricyclics)', 'Amitriptyline 10 HS', elder(), [e('geriatric', 'amitriptyline')])
add('S42', 'Glimepiride at 75 (Beers: long-acting sulfonylurea, hypoglycaemia)', 'Glimepiride 2 OD', elder({ age_years: 75 }), [e('geriatric', 'glimepiride')])
add('S43', 'Metoclopramide at 70 (Beers: avoid unless gastroparesis); CrCl is about 58, below the 60 where the label halves the dose', 'Metoclopramide 10 TDS', elder({ age_years: 70 }), [e('geriatric', 'metoclopramide'), e('renal', 'metoclopramide')])
add('S44', 'Amitriptyline at 40 is not a geriatric flag', 'Amitriptyline 10 HS', adult)

// --- banned FDC (CDSCO list) and weekly drugs ---
add('S34', 'Sinarest LP New is on the CDSCO banned list (S.O. 3388(E))', 'Sinarest LP New BD', adult, [e('banned_fdc', 'levocetirizine', 'paracetamol', 'phenylephrine')])
add('S35', 'Methotrexate is weekly; written OD it is an overdose risk', 'Methotrexate 2.5 OD', adult, [e('schedule_mismatch', 'methotrexate')])

// --- clean prescriptions (nothing to flag) ---
add('S36', 'Common acute infection set, no overlap', 'Augmentin 625 BD x5d; Dolo 650 SOS; Pan 40 OD', adult)
add('S37', 'Short azithromycin course with an antihistamine at night', 'Azithral 500 OD x3d; Cetzine 10 HS', adult)
add('S38', 'Diabetes and blood pressure set with normal kidneys', 'Glycomet 500 BD; Januvia 100 OD; Amlong 5 OD; Atorva 10 HS', { age_years: 55, weight_kg: 78, serum_creatinine: 0.9, sex: 'M' })
add('S39', 'Fever tablet and a PPI, no overlap', 'Dolo 650 TDS x3d; Rablet 20 OD', adult)
add('S40', 'Allergy tablet with a steroid-free cough syrup', 'Allegra 120 OD; Ascoril LS 10 ml TDS', adult)

// --- history: several doctors, dated, with labs ---
const history = []
const h = (id, why, prescriptions, patient, labs, expected = []) => history.push({ id, kind: 'history', why, prescriptions, patient, labs, expected })
h('H01', 'Three doctors, paracetamol overlaps on 4-5 Oct: 1,950 + 2,000 + 650 = 4,600 mg/day',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-10-01', text: 'Dolo 650 TDS x5d' }, { id: 'b', doctor: 'Dr Mehta', date: '2026-10-03', text: 'Calpol 500 QID x5d' }, { id: 'c', doctor: 'Dr Iyer', date: '2026-10-04', text: 'Zerodol-P BD x5d' }],
  adult, [], [e('dose_excess', 'paracetamol')])
h('H02', 'Dolo ends before Calpol starts, so only Calpol and Zerodol-P overlap: still a paracetamol duplicate, total 2,650 mg is under the limit',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-10-01', text: 'Dolo 650 TDS x2d' }, { id: 'b', doctor: 'Dr Mehta', date: '2026-10-03', text: 'Calpol 500 QID x5d' }, { id: 'c', doctor: 'Dr Iyer', date: '2026-10-04', text: 'Zerodol-P BD x5d' }],
  adult, [], [e('duplicate_ingredient', 'paracetamol')])
h('H03', 'Two NSAID courses three weeks apart: never taken together',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-09-01', text: 'Brufen 400 TDS x5d' }, { id: 'b', doctor: 'Dr Mehta', date: '2026-09-22', text: 'Voveran SR 100 OD x5d' }],
  adult, [])
h('H04', 'Aspirin from one doctor, ibuprofen from another; the 68-year-old has no creatinine on file',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-10-10', text: 'Brufen 400 TDS x5d' }, { id: 'b', doctor: 'Dr Iyer', date: '2026-10-11', text: 'Ecosprin 75 OD x30d' }],
  { age_years: 68, weight_kg: 55, sex: 'M' }, [], [e('ddi', 'aspirin', 'ibuprofen'), e('input_needed', 'ibuprofen')])
h('H05', 'Same order after creatinine 1.6 arrives (CrCl about 34): the NSAID kidney flag appears',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-10-10', text: 'Brufen 400 TDS x5d' }, { id: 'b', doctor: 'Dr Iyer', date: '2026-10-11', text: 'Ecosprin 75 OD x30d' }],
  { age_years: 68, weight_kg: 55, sex: 'M' }, [{ type: 'serum_creatinine', value: 1.6, date: '2026-10-12' }], [e('ddi', 'aspirin', 'ibuprofen'), e('renal', 'ibuprofen')])
h('H06', 'Cardiologist started warfarin; orthopaedic surgeon adds diclofenac ten days later',
  [{ id: 'a', doctor: 'Dr Iyer (cardiology)', date: '2026-10-01', text: 'Warf 5 OD x30d' }, { id: 'b', doctor: 'Dr Rao (orthopaedics)', date: '2026-10-10', text: 'Voveran SR 100 OD x5d' }],
  adult, [], [e('ddi', 'warfarin', 'diclofenac')])
h('H07', 'Two doctors each add a PPI',
  [{ id: 'a', doctor: 'Dr Iyer', date: '2026-10-01', text: 'Pan 40 OD x14d' }, { id: 'b', doctor: 'Dr Mehta', date: '2026-10-05', text: 'Omez 20 OD x7d' }],
  adult, [], [e('class_duplication', 'pantoprazole', 'omeprazole')])
h('H08', 'A benzodiazepine and a Z-drug from different doctors for a 72-year-old (Beers: avoid both)',
  [{ id: 'a', doctor: 'Dr Iyer', date: '2026-10-01', text: 'Alprax 0.25 HS x10d' }, { id: 'b', doctor: 'Dr Mehta', date: '2026-10-02', text: 'Zolfresh 10 HS x10d' }],
  elder(), [], [e('geriatric', 'alprazolam'), e('geriatric', 'zolpidem')])
h('H09', 'Sequential antibiotic courses with no overlap and a paracetamol course',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-09-01', text: 'Augmentin 625 BD x5d; Dolo 650 TDS x3d' }, { id: 'b', doctor: 'Dr Mehta', date: '2026-09-20', text: 'Azithral 500 OD x3d' }],
  adult, [])
h('H10', 'Creatinine in the labs but the patient is 28 and healthy: an NSAID course is fine',
  [{ id: 'a', doctor: 'Dr Rao', date: '2026-10-01', text: 'Brufen 400 TDS x3d' }],
  { age_years: 28, weight_kg: 62, sex: 'F' }, [{ type: 'serum_creatinine', value: 0.8, date: '2026-10-02' }])

const gold = {
  meta: {
    version: 1,
    label_status: 'draft: expected alerts were written by the developer from drug labels and guidelines (the `why` of each case), independent of the engine, and have NOT yet been reviewed by a pharmacist',
    alert_groups: {
      dose_excess: ['dose_excess', 'dose_excess_sos'],
      duplicate_ingredient: ['duplicate_ingredient'],
      class_duplication: ['class_duplication'],
      ddi: ['ddi'],
      renal: ['nsaid_renal', 'renal_avoid', 'renal_caution'],
      geriatric: ['domperidone_elderly', 'beers_sedating_antihistamine', 'beers_benzodiazepine', 'beers_z_drug', 'anticholinergic_burden', 'cns_stacking', 'beers_ketorolac', 'beers_tricyclic', 'beers_sulfonylurea', 'beers_muscle_relaxant', 'beers_metoclopramide'],
      banned_fdc: ['banned_fdc'],
      input_needed: ['input_needed'],
      schedule_mismatch: ['schedule_mismatch'],
    },
    note: 'A case with no expected alerts is a clean prescription. An alert matches when its group is the same and it shares at least one ingredient with the expected alert.',
  },
  cases: [...single, ...history],
}
writeFileSync(new URL('./gold.json', import.meta.url), JSON.stringify(gold, null, 1) + '\n')
console.log(`${gold.cases.length} cases (${single.length} single, ${history.length} history), ${gold.cases.filter((c) => c.expected.length === 0).length} clean`)
