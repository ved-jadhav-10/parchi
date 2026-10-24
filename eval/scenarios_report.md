# Realistic scenarios: what the engine raises

Tier T3 (written by the team, reviewed with a doctor who is not a pharmacist; no pharmacist has reviewed them). 31 scenarios, 15 Interrupts in total, 2 busy-but-clean cases.
Rows marked "judgement call" are listed in `reviewer_list.md` section H.

| # | Scenario | Raised above Silent |
|---|---|---|
| R01 | Post-MI patient, knee pain from a different doctor | **STOP** bleeding_dual_antiplatelet_nsaid |
| R02 | Same patient, a GP adds acidity cover | note ddi |
| R03 | Triple whammy: blood pressure pill with a hidden diuretic, plus a painkiller | **STOP** triple_whammy; note nsaid_renal_caution |
| R04 | Warfarin, then co-trimoxazole for a urine infection (judgement call) | note ddi |
| R05 | Warfarin, then metronidazole from a dentist (judgement call) | note ddi |
| R06 | Weekly methotrexate with co-trimoxazole | **STOP** ddi; **STOP** ddi |
| R06b | Methotrexate written as a daily medicine | **STOP** schedule_mismatch |
| R07 | Gout colchicine with a hidden clarithromycin in an H. pylori kit | **STOP** ddi |
| R08 | An older woman with three sedating medicines from three doctors | note beers_benzodiazepine; note cns_stacking; note possible_switch |
| R09 | Antidepressant with tramadol and a cough syrup | note serotonergic_stack; note ddi; note ddi |
| R10 | Four QT-prolonging medicines in a woman of 66 | **STOP** qt_stack; note domperidone_elderly; note ddi; note ddi |
| R11 | Theophylline combination with ciprofloxacin (judgement call) | note ddi |
| R12 | Phenytoin with a single fluconazole dose | note ddi |
| R13 | Lithium with ibuprofen hidden in Combiflam (judgement call) | note ddi |
| R14 | Heart failure with weak kidneys: potassium-raising drugs stack | **STOP** renal_avoid; **STOP** hyperkalaemia_stack; note renal_caution; note ddi; note ddi; note ddi |
| R15 | Diabetic kidney disease: sitagliptin above the kidney dose | **STOP** dose_excess; note beers_sulfonylurea |
| R16 | Tuberculosis treatment with warfarin and a sulfonylurea (judgement call) | note ddi |
| R17 | Angina nitrate with an erectile dysfunction tablet | **STOP** ddi |
| R18 | Digoxin with newly started amiodarone, weak kidneys (judgement call) | note renal_caution; note ddi |
| R19 | A child's fever: Meftal-P is not paracetamol | **STOP** dose_excess |
| R20 | An older woman with a cold, dizziness and a sleeping aid: many notes, no stop | note beers_sedating_antihistamine; note beers_benzodiazepine; note anticholinergic_burden |
| R21 | Busy but clean: diabetes, blood pressure, cholesterol, aspirin | nothing |
| R22 | Busy but clean: a chest infection course | nothing |
| R23 | Two as-needed paracetamol products | note dose_excess_sos |
| R24 | Penicillin allergy and the amoxicillin hidden in Mox-CV | **STOP** allergy |
| R25 | Pregnancy with an old blood-pressure and cholesterol prescription | **STOP** pregnancy; note pregnancy |
| R26 | One family account, three people | nothing |
| R27 | A second doctor replaces the PPI | note possible_switch |
| R28 | Two antibiotic courses a few weeks apart, one with no course length | nothing |
| R29 | A cart with products and no dosing | note duplicate_ingredient; note dosing_not_entered |
| R30 | A lab eGFR with no weight or creatinine | **STOP** dose_excess |
