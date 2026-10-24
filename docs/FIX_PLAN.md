# Clinical fix plan: make Parchi hold up in front of a doctor

Written 24 Oct 2026 after a clinical-realism review of the engine, data and pitch. Owners use the track letters from `PLAN.md` (A data, B dose/limits, C rules/engine/eval, D UI/pitch). Every new number or rule follows the usual rules: it lives in a data file with `source` and `pharmacist_approved: false`, and `contracts.ts` changes are additive only.

Phases are in priority order. Phases 0 and 1 matter most for judging; do them first even if later phases slip.

| Phase | Status (24 Oct 2026) |
|---|---|
| 0 Claims | Done in `PPT.md` and the filled deck; UI rename of "Hold, contact doctor" (0.6) still open |
| 1 Severity | **Done**: 9 curated contraindications Interrupt; budget never demotes protected types; NSAID kidney bands <30 stop / 30-59 caution; 7 stacking rules (`stack_rules` in `alert_rules.json`, `src/engine/rules/stack.ts`); scenario tests in `src/engine/rules/stack.test.ts`. Demo still 2 Interrupts (paracetamol over cap; two NSAIDs at 68). Benchmark: 0 misses, 1 extra (QT note on two fluoroquinolones) |
| 2 Patient facts | **Done** (25 Oct 2026): allergies (8 groups, free text, combination brands), pregnancy (17 rules: FDA boxed warnings and contraindications, NFI categories X/D), lab eGFR when weight or creatinine is missing, paracetamol limit by weight / liver disease / heavy alcohol use instead of age (removes the 3,000 mg age cap). Check page has an optional "More about the patient" section. History/order pages not yet (Phase 3, per patient). Breastfeeding not built: no source found. Demo paracetamol limit is now 4,000 mg |
| 3 Workflow | **Done** (25 Oct): per-patient history for shared accounts (`history/patients.ts`, API by-patient mode), no guessed dosing for cart lines, course length from the ordered quantity (antibiotics 7 days when nothing else), possible-switch wording for a later doctor's same-class medicine, failed batch only noted when the batch on the order matches, copyable notes for the prescriber and the customer, the status now reads "Needs pharmacist attention" (0.6) |
| 4 Outside data | **Done** (25 Oct): `data/audit_sources.py` (FDA-label evidence for every curated Interrupt pair, limits vs labels, DDInter gaps), `data/crosscheck_composition.py`. The second Kaggle dataset was not reachable without a login; the Hugging Face copy used instead is the same upstream (1mg), so it finds extraction gaps, not source errors |
| 5 Scenarios | **Done** (25 Oct): `eval/scenarios.json`, 31 cases with exact-tier expectations (`eval/scenarios.test.ts`, `eval/scenarios_report.md`) |
| 6 Close-out | **Done** (25 Oct): demo rewritten as 3 screens (`DEMO.md`), VERIFIED/HOLES/TEST_PLAN updated, benchmark and scale re-measured |

---

## Phase 0: Stop claiming things the engine does not do (D, C; ~2 h)

| # | Fix | Where | Owner |
|---|---|---|---|
| 0.1 | Demo text says "4,100 mg vs 4,000 mg adult max (FDA)", but for a 68-year-old the engine applies the 3,000 mg age cap. Pick one (see 2.4) and make the deck, `DEMO.md` and the fixture agree | `docs/PPT.md` slide 4, `docs/DEMO.md`, `tests/fixtures/demo_rx.json` | D |
| 0.2 | Call the benchmark a **regression test**, not evidence. Remove "precision 1.0 / recall 1.0" from anything a judge sees. The labels were written by the people who wrote the rules | `BenchmarkPage.tsx`, `PPT.md` slide 6 | C, D |
| 0.3 | Drop "pharmacist-curated" wording. Use the provenance rule from `HOLES.md`: "reference-labelled from published sources; reviewed by an MBBS GP on [date]" | `PPT.md` slides 3, 9 | D |
| 0.4 | Keep the Ayurveda engine out of the pitch and demo until a real product brand (Liv.52, Septilin) resolves. Herb-name matching does not match how products are sold | `PPT.md`, `DEMO.md` | D |
| 0.5 | NSQ banner wording: "a batch of this brand failed testing: check the batch number at packing", never a reason to hold the order | `nsq.ts` reason text, UI | A, D |
| 0.6 | Rename the suggested status "Hold, contact doctor" to "Needs pharmacist attention" / "Clarify with prescriber or customer". The tool ranks attention; it does not decide dispatch (CDSCO "inform" story) | `alert_rules.json` `history.status_by_tier` labels, UI | C, D |
| 0.7 | Lead the clinical story with **schedule mismatch** (weekly methotrexate read as daily) and the NSAID + antiplatelet + kidney stack, not the extra 100 mg of paracetamol | `PPT.md`, `DEMO.md` | D |
| 0.8 | Fix slide 6 tags that say "planned" for built features (X-ray, reasons) | `PPT.md` | D |

**Done when:** every number in the deck matches what the app shows on the same input.

---

## Phase 1: Fix severity: the right things interrupt (C, with B for limits; ~1 day)

### 1.1 A curated Interrupt list for interactions
- DDInter "major" is too broad to interrupt on. In our own data, ondansetron + escitalopram and glimepiride + ciprofloxacin are both "major". Keep DDInter major as **Inform**.
- Add an additive field to `ddi_supplement.json` rules: `"interrupt": true` plus `"basis": "label_contraindication" | "onc_high_priority" | "pharmacist"`. The engine reads it in `rules/ddi.ts` the same way it reads `interrupt_pairs`.
- Seed the list only from: (a) a pair the product label calls contraindicated (openFDA label text, see Phase 4), or (b) the ONC high-priority DDI list (Phansalkar 2012). Starting candidates already in our data: sildenafil/tadalafil + nitrates, sacubitril + ACE inhibitor, simvastatin + clarithromycin, methotrexate + trimethoprim/co-trimoxazole, colchicine + clarithromycin, spironolactone + potassium salts. Each one needs a label or ONC citation before `interrupt: true`.
- Add pairs DDInter lacks (found in this review): digoxin + amiodarone, sildenafil + isosorbide dinitrate (already in supplement), telmisartan + spironolactone (supplement), aceclofenac/nimesulide/etoricoxib with anticoagulants via the NSAID class, and domperidone with QT drugs (see 1.5).

### 1.2 The alert budget can never hide danger
- Today `alerts/engine.ts:42` demotes the third Interrupt to Inform. Change it so that types marked `never_demote` in `alert_rules.json` (new additive field) are never demoted: contraindicated DDI, `renal_avoid`, `schedule_mismatch`, `banned_fdc`, allergy, pregnancy.
- The budget may still **group** alerts: one card per patient problem (e.g. "bleeding risk: aspirin + clopidogrel + aceclofenac") instead of three cards. Fewer alerts comes from grouping, not hiding.
- Test: a slip with 3 contraindicated issues shows 3 Interrupts.

### 1.3 Kidney rules match the limits file
- Make `alert_rules.json` `nsaid_renal` match `limits.json`: CrCl < 30 Interrupt (avoid); 30-59 Inform (caution).
- Escalate 30-59 to Interrupt only when another kidney stressor is present (see 1.4 triple whammy). This removes the "every older patient on any painkiller interrupts" problem (70 y, 55 kg, creatinine 1.0 gives CrCl about 53).

### 1.4 Multi-drug stacking rules (the real outpatient harms)
New rule type in `alert_rules.json` (`stack_rules`, additive), evaluated over the ingredient set, each with a source:

| Rule | Fires when | Proposed tier | Source to cite |
|---|---|---|---|
| Triple whammy | ACE inhibitor or ARB + diuretic + systemic NSAID | Interrupt | Lapi et al., BMJ 2013;346:e8525 |
| Bleeding stack | (anticoagulant or ≥2 antiplatelets) + systemic NSAID; or anticoagulant + SSRI + NSAID | Interrupt | Product labels; Beers 2023 DDI table |
| Two NSAIDs in a high-risk patient | ≥2 systemic NSAIDs (low-dose aspirin excluded) AND (age ≥65 or CrCl <60 or on an anticoagulant/antiplatelet) | Interrupt (otherwise Inform as now) | Beers 2023; NSAID labels |
| Hyperkalaemia stack | ≥2 of: ACE inhibitor/ARB, spironolactone/eplerenone/amiloride, trimethoprim, potassium salt; worse if CrCl <60 | Inform, Interrupt if CrCl <30 | Labels; Beers 2023 |
| Serotonergic stack | SSRI/SNRI + tramadol or dextromethorphan (hidden in cough syrups) | Inform (to confirm) | Labels |
| QT stack | ≥2 "known risk" QT drugs (CredibleMeds), e.g. azithromycin, domperidone, ondansetron, hydroxychloroquine, levofloxacin | Inform; Interrupt at ≥3 or age ≥65 (to confirm) | CredibleMeds QTdrugs list |
| CNS stack | already built (Beers ≥3 CNS-active): keep, add clonazepam hidden in FDCs | Inform | Beers 2023 |

### 1.5 Data needed for 1.4
- `ingredients.json` classes: `diuretic` (thiazide/loop), `anticoagulant`, `antiplatelet`, `k_sparing`, `potassium_salt`, `serotonergic`, `qt_known_risk`. Track A adds them from ATC codes; QT from CredibleMeds (licence: free for non-commercial use, needs registration, see Phase 4).

**Done when:** these tests pass: contraindicated pair → Interrupt; 3 Interrupts survive the budget; CrCl 53 + one NSAID → Inform; Telma-H + Hifenac-P in an older patient → Interrupt.

---

## Phase 2: Patient facts a doctor asks for first (B, C, D; ~1 day)

Additive optional fields on the patient in `contracts.ts`:

| Field | Why | Rule it unlocks | Owner |
|---|---|---|---|
| `allergies: string[]` (class ids: `penicillin`, `cephalosporin`, `sulfonamide`, `nsaid`, free text) | First question at any dispensing check | Allergy match across hidden FDC ingredients (amoxicillin inside Augmentin/Mox-CV) → Interrupt, `never_demote` | B data `allergy_classes.json`, C rule |
| `pregnancy: 'yes'\|'no'\|'unknown'`, `breastfeeding` | Teratogens are a hard stop | Starter list (ACE inhibitors/ARBs, statins, warfarin, methotrexate, valproate, isotretinoin, misoprostol), each with a label source → Interrupt | B, C |
| `hepatic_impairment`, `alcohol_use` | Paracetamol risk depends on these, not age | 2.4 | B |
| `egfr` (accept the lab's eGFR as well as creatinine) | Indian labs report eGFR; weight is usually unknown | Renal rules take `basis: 'crcl'\|'egfr'`; metformin uses eGFR (its cut-offs are eGFR), CrCl stays for drugs labelled by CrCl | B (`crcl.ts`, `limits.json`) |
| `patient_name` / `patient_ref` per prescription | Family accounts, Phase 3 | 3.1 | C, D |

### 2.4 Paracetamol limit by risk, not by birthday
- Replace the age-65 cap of 3,000 mg with a risk-factor cap: weight < 50 kg, chronic alcohol use, liver disease or malnutrition → lower cap; otherwise the 4,000 mg label maximum. Each cut-off cites the label or NFI 2021. Age alone becomes an Inform note at most.
- Then the demo has to stand on the NSAID/antiplatelet/kidney story (Phase 0.7), which is clinically stronger anyway.

**Done when:** the Check page asks for allergies and pregnancy (only for women 12-50), and the scenarios R24-R25 in Phase 5 pass.

---

## Phase 3: Match how Indian pharmacies really work (B, C, D; ~1-2 days)

| # | Real-world fact | Change | Owner |
|---|---|---|---|
| 3.1 | One phone or loyalty account orders for the whole family | History is grouped per patient (name + age on each Rx), never per account. Lines with no patient name → "Whose prescription is this?" before any cross-order total | C (`history/`), D |
| 3.2 | Carts hold products and pack counts, not dosing | If a line has no sig, show "Dosing not entered: totals not computed" and give a one-tap sig field for the pharmacist reading the Rx image. Never assume a dose | B (`sig/`), D |
| 3.3 | Duration is often not written | Infer days from quantity ÷ doses per day (10 tablets BD → 5 days). Otherwise use class defaults in `limits.json` (antibiotic 5 d, analgesic 5 d, chronic 30 d) instead of a flat 30 days. Mark as "assumed" | B |
| 3.4 | A later doctor often replaces a drug without writing "stop" | Same class, different doctor, new start date → Inform "Possible switch: confirm the earlier one was stopped", not a duplication alert. It becomes a duplicate only if both are refilled | C |
| 3.5 | NSQ applies to one batch; the batch is unknown at review | Banner is Silent at review; when a batch number is supplied (CSV column) and matches, Inform | A, C |
| 3.6 | Pharmacists rarely reach the doctor | Action wording: "Ask the customer" / "Clarify with prescriber"; a copyable message for either | D |
| 3.7 | Brand misspellings only happen in typed Rx, not cart SKUs | Pitch the fuzzy matcher for digitised Rx and the free offline app; for e-pharmacy carts pitch the **catalogue import** (SKU → canonical ingredients) | D |

---

## Phase 4: Data sources to cross-check compositions and interactions (A, with C; ongoing)

### 4.1 Sources

| Source | What it gives | Use in Parchi | Licence / access | Link |
|---|---|---|---|---|
| A-Z Medicine Dataset of India (Kaggle, in use) | 250k+ brands, composition, form, price (Nov 2022) | Current main brand table | Kaggle dataset licence; check before commercial use | [baselight mirror](https://baselight.app/u/kaggle/dataset/shudhanshusingh_az_medicine_dataset_of_india) |
| Indian Medicine Data (Kaggle, mohneesh7) | ~195k rows with `salt_composition`, interactions text | **Second opinion** on every brand's composition; disagreements go to a review list | Kaggle; check licence | [baselight mirror](https://baselight.app/u/kaggle/dataset/mohneesh7_indian_medicine_data) |
| IndianDrugMCQA (Eka Care) | 1,512 brand-to-generic questions, 20+ classes | Held-out test of the brand resolver | MIT | [AIKosh](https://aikosh.indiaai.gov.in/home/datasets/details/indian_drug_mcqa.html) |
| Eka medical-records parsing set | 288 real Indian Rx and lab-report images | Copy real prescription **patterns** (how many drugs, which combinations) for test cases; no OCR | MIT | [AIKosh](https://aikosh.indiaai.gov.in/home/datasets/details/eka_medical_records_parsing_validation_set.html) |
| DDInter 2.0 (in use) | 302k pairs with severity | Inform/Silent tiers, coverage check | CC BY-NC-SA 4.0 (non-commercial) | ddinter2.scbdd.com |
| ONC high-priority DDI list (Phansalkar et al., JAMIA 2012) | 15 contraindicated pairs/classes agreed by an expert panel for interruptive alerts | Seed of the Interrupt list (1.1) | Published paper | [PMC3422823](https://pmc.ncbi.nlm.nih.gov/articles/PMC3422823), [McEvoy 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5391726) |
| openFDA drug labels | Label sections incl. `contraindications`, `drug_interactions`, `boxed_warning`; weekly updates | Cite "label contraindicated" for each Interrupt pair; check our max doses against labels | Public domain (US labels; Indian label may differ) | [open.fda.gov/apis/drug/label](https://open.fda.gov/apis/drug/label/) |
| National Formulary of India 2021 (IPC) | 591 Indian monographs, doses, 33 rational FDCs | The Indian source for max doses in `limits.json` | Printed book, ₹660; no verified free PDF | [ipc.gov.in NFI](https://ipc.gov.in/mandates/nfi/release-of-national-formulary-of-india-2021.html) |
| NLEM 2022 | 384 essential medicines | Prioritise which molecules get verified limits first | Government | [SNCM report PDF](https://www.cspc.in/pdf2023/Essential_Drugs_National.pdf) |
| ICMR Standard Treatment Workflows | 157 workflows, 28 specialties (gout, H. pylori, TB, HTN, DM...) | Build **realistic co-prescriptions** per disease for Phase 5 | Government, free | [stw.icmr.org.in](https://stw.icmr.org.in) / [Vikaspedia](https://en.vikaspedia.in/viewcontent/health/health-directory/standard-treatment-workflows) |
| AGS Beers 2023 (in use) and STOPP/START v3 (O'Mahony 2023) | Elderly avoid-lists, drug-disease and DDI tables; v3 has 190 criteria | More geriatric and stacking rules | Journal articles | [STOPP/START v3](https://psnet.ahrq.gov/issue/stoppstart-criteria-potentially-inappropriate-prescribing-older-people-version-3) |
| CredibleMeds QTdrugs | ~190 drugs graded by QT/TdP risk | `qt_known_risk` class for the QT stack | Free registration, non-commercial only; commercial needs a licence | [crediblemeds.org](https://crediblemeds.org/druglist) |
| TWOSIDES (nSIDES, FAERS) | Interaction **signals** from US adverse-event reports | Discovery only: find pairs to look up; never an alert source (noisy, unadjusted) | Free | [tatonettilab.org/offsides](https://tatonettilab.org/offsides/) |
| DrugBank | Curated interactions with mechanism | Spot-check disputed pairs | Academic licence by application; commercial paid | go.drugbank.com |
| CDSCO banned FDC and NSQ lists (in use) | Bans, monthly NSQ | As now | Government | cdsco.gov.in |

Commercial sources a buyer would license later (Micromedex, Lexicomp, CIMS/MIMS India) go in the business slide, not the prototype.

### 4.2 Cross-check jobs (Python under `data/`, output to `data/reports/`)
1. **Composition triangulation:** for the top ~2,000 brands, compare A-Z vs mohneesh7 (and the 1mg pack page where verified). Same ingredients and strengths → `verified_by: 2 sources`. Any difference → `data/reports/composition_conflicts.csv`. Example to check first: our table has Nexito Plus as escitalopram **5 mg** + clonazepam 0.5 mg; confirm on the pack, since a 10 mg version is the one we expect.
2. **Interrupt-list audit:** every `interrupt: true` pair must have an openFDA contraindication hit or an ONC list entry; the script fails otherwise.
3. **DDInter gap report:** list our top-500 ingredients that DDInter does not cover (aceclofenac, domperidone, nimesulide, etoricoxib, ambroxol, ...) and the stacking rules that cover them by class instead.
4. **Limits audit:** every `max_mg_day` vs the openFDA label and, where entered by hand, NFI 2021; mismatches listed for the reviewer.

---

## Phase 5: A realistic test set (C owns, everyone writes cases; ~1 day)

### 5.1 What is wrong now
The 54 cases in `eval/gold.json` average about 1.5 lines, and most test one thing (paracetamol in two brands, two PPIs, one drug in one patient). Indian outpatient audits report about 2.5 to 3.7 drugs per prescription ([PMC6058512](https://pmc.ncbi.nlm.nih.gov/articles/PMC6058512), [PMC8930124](https://pmc.ncbi.nlm.nih.gov/articles/PMC8930124)), and harm comes from **different** molecules combined across doctors.

### 5.2 Rules for v2 cases
- 3 to 7 lines, from 1 to 3 prescribers with specialties and dates, built from an ICMR STW or a standard regimen for each condition.
- The risk must come from **different compositions** (or an ingredient hidden inside an FDC), not the same molecule under two names.
- Each case records `realism` (why this combination is common, with a source), `expected` alerts with tiers, and `review: {by, date}` (empty until the GP looks).
- At least 30% clean cases that look busy (5 drugs, nothing wrong) to measure false alarms.
- Compositions below come from our `brands.json`; DDInter levels are from our `ddi.json`. Tiers are **proposed**, to confirm with the reviewer.

### 5.3 Scenarios

| ID | Setting | Lines (prescriber) | What hides | Expected (proposed) |
|---|---|---|---|---|
| R01 | Post-MI, then knee pain | Ecosprin-AV 75 OD (aspirin 75 + atorvastatin 10), Clopikind 75 OD, Metolar 25 BD, Cardace 5 OD (cardiology); Zerodol-P BD x7d (ortho, day 10) | Aceclofenac inside Zerodol-P on top of dual antiplatelets; aceclofenac not in DDInter | Interrupt: bleeding stack. Aspirin + clopidogrel itself Silent (intended) |
| R02 | Same patient, GP adds acidity cover | R01 cardiology lines + Omez 20 OD (GP) | Clopidogrel + omeprazole (DDInter major; label advises avoiding omeprazole) | Inform, with "pantoprazole is the usual alternative". Not an Interrupt |
| R03 | Triple whammy, 70 F, 52 kg, creat 1.1 | Telma-H OD (telmisartan 40 + HCTZ 12.5) (GP, chronic); Hifenac-P BD x10d (ortho) | Diuretic inside Telma-H; NSAID inside Hifenac-P | Interrupt: triple whammy; renal Inform (CrCl ~39) |
| R04 | AF on warfarin, UTI | Warf 5 OD (cardiology); Septran DS BD x5d (GP) | Sulfamethoxazole/trimethoprim raise INR (DDInter major) | Interrupt candidate (to confirm): "check INR" |
| R05 | Warfarin, dental infection | Warf 5 OD; Metrogyl 400 TDS x5d (dentist) | Metronidazole (DDInter major) | Same as R04 |
| R06 | RA on methotrexate, UTI | Folitrax 7.5 "once weekly, Sunday" (rheumatology); Septran DS BD x7d (GP) | Trimethoprim + methotrexate: marrow suppression | Interrupt (supplement rule, label) |
| R06b | Same, sig typed as daily | Folitrax 7.5 OD | Weekly drug written daily | Interrupt: schedule mismatch, never demoted |
| R07 | Gout + H. pylori | Zycolchin 0.5 BD (GP); Pylokit x14d (gastro: lansoprazole 30 + tinidazole 500 + clarithromycin 250) | Clarithromycin hidden inside a kit | Interrupt: colchicine + clarithromycin (label contraindication) |
| R08 | 74 F, anxiety, neuropathy, insomnia | Nexito Plus OD (psychiatry: escitalopram + clonazepam 0.5); Pregaba-M 75 HS (neuro); Alprax 0.25 HS (GP) | Clonazepam hidden inside Nexito Plus duplicates alprazolam | Inform group: benzo duplicate + Beers + CNS stack (3 CNS drugs), one card |
| R09 | Depression + back pain + cough | Nexito 10 OD (psych); Ultracet BD (ortho: tramadol + paracetamol); Grilinctus 10 ml TDS (GP: dextromethorphan + chlorphenamine + guaifenesin + ammonium chloride) | Two serotonergic drugs hidden in FDCs (DDInter major for both pairs) | Inform: serotonergic stack (tier to confirm) |
| R10 | 66 F on HCQ, chest infection, nausea | HCQS 200 BD (rheum); Azithral 500 OD x3d (GP); Domstal 10 TDS; Ondem 4 SOS | 4 QT drugs; domperidone not in DDInter | QT stack: Interrupt (≥3, age ≥65), to confirm |
| R11 | COPD + UTI | Deriphyllin BD (chest: etofylline 77 + theophylline 23); Ciplox 500 BD x5d (GP) | Theophylline inside Deriphyllin + ciprofloxacin (DDInter major) | Inform: "theophylline levels rise", to confirm |
| R12 | Epilepsy + one-off thrush | Eptoin 100 TDS (neuro); Forcan 150 single dose (gynae) | DDInter major, but a single 150 mg dose | Inform, not Interrupt (tests that "major" does not shout) |
| R13 | Bipolar + toothache | Lithosun 300 BD (psych); Combiflam TDS x5d (dentist: ibuprofen 400 + paracetamol 325) | Ibuprofen hidden in Combiflam raises lithium (DDInter major) | Interrupt candidate: "lithium level", to confirm |
| R14 | Heart failure, 72 M, CrCl 40, UTI | Aldactone 25 OD, Telma 40 OD (cardiology); Septran DS BD x5d (GP) | Trimethoprim + spironolactone + ARB (DDInter has spiro + trimethoprim major; spiro + telmisartan missing, supplement covers) | Interrupt: hyperkalaemia stack |
| R15 | Diabetic kidney disease, 71 M, 60 kg, creat 1.9 | Glycomet-GP 2 BD (metformin 500 + glimepiride 2), Januvia 100 OD, Telma 40 OD | Metformin and sitagliptin over renal doses; glimepiride in elderly | Inform: metformin ≤1,000 mg (eGFR 30-45); sitagliptin 100 > 50 mg; Beers sulfonylurea |
| R16 | TB + diabetes + AF | Akt 4 OD (rifampicin 450, isoniazid 300, ethambutol 800, pyrazinamide 750) (chest); Glycomet-GP 2 BD; Warf 5 OD | Rifampicin lowers warfarin (major) and glimepiride (moderate) | Interrupt candidate: warfarin + rifampicin; Inform: glucose |
| R17 | Angina, self-bought ED drug | Sorbitrate 5 SOS (cardiology); Manforce 50 SOS | Nitrate + sildenafil (DDInter has no entry; supplement) | Interrupt, never demoted (label contraindication) |
| R18 | AF rhythm change, 76 M, CrCl 35 | Lanoxin 0.25 OD; Cordarone 200 OD (new, cardiology) | Digoxin + amiodarone missing in DDInter | Interrupt candidate after adding to the supplement; digoxin renal Inform |
| R19 | Child, 4 y, 16 kg, fever | Calpol 250 syrup 5 ml QID (paediatrician); Meftal-P syrup 5 ml TDS (GP) | Trap: Meftal-P is mefenamic acid only, the "P" is not paracetamol | No paracetamol duplicate. Paracetamol 1,000 mg/day vs 60 mg/kg x 16 = 960 → Inform |
| R20 | 78 F, vertigo + cold | Stemetil MD BD; Vertin 16 TDS (ENT); Sinarest New TDS (GP: paracetamol + phenylephrine + chlorphenamine); Alprax 0.25 HS | Sedating antihistamine hidden in a cold FDC; anticholinergic and CNS load | Inform group only. Tests alert fatigue: zero Interrupts |
| R21 | Clean: DM + HTN + lipids, 58 M | Glycomet 500 SR BD, Telma-AM OD, Rosuvas 10 HS, Ecosprin 75 OD | Nothing | No Inform or Interrupt |
| R22 | Clean: chest infection, 30 F | Augmentin 625 Duo BD x5d, Dolo 650 SOS, Allegra 120 OD, Pan 40 OD x5d | Nothing | Clean |
| R23 | Two SOS paracetamol products, 25 M | Cyclopam SOS (dicycloverine 20 + paracetamol 500); Dolo 650 SOS | Paracetamol in both, as needed only | Inform (SOS-only over limit), not Interrupt |
| R24 | Penicillin allergy | Allergy: penicillin. Mox-CV 625 BD x5d (GP) | Amoxicillin inside a brand name that does not say it | Interrupt: allergy (needs Phase 2) |
| R25 | Pregnant, 28 F, 10 weeks | Telma 40 OD, Rosuvas 10 HS (old GP Rx refilled) | ARB + statin in pregnancy | Interrupt: pregnancy (needs Phase 2) |
| R26 | Family account | Ramesh 68: Ecosprin 75, Telma 40. Priya 30: Dolo 650 TDS x3d. Aarav 6 y: Calpol 250 syrup | Same phone number, three people | No cross-patient totals; paracetamol never summed across Priya and Aarav (needs 3.1) |
| R27 | Doctor switch | Pan 40 OD x30d (Dr A, 1 Oct); Razo-D OD (Dr B, 15 Oct) | Replacement, not duplication | Inform "possible switch" (needs 3.4) |
| R28 | No duration written | Augmentin 625 Duo BD, qty 10 (Dr A, 1 Sep); Taxim-O 200 BD x5d (Dr B, 25 Sep) | 30-day default would invent an overlap | No overlap: duration inferred as 5 days (needs 3.3) |

Brands to confirm in the resolver (a plain name lookup did not find them): Clopitab, Clopilet, Shelcal, Cetzine 10, Amlong 5, Atorva 10, Aldactone 25, Lasix 40, Eptoin 100, Licab. Use the forms that were found (Clopikind 75, Aldactone, Lasix, Eptoin, Lithosun 300) or add the missing ones to `brands.csv` with a pack-page source.

### 5.4 Review with the GP (10 minutes, per `HOLES.md`)
Show only R01, R03, R06b, R07, R13, R17, R20, R21 and ask one question each: "Would you want the pharmacist stopped for this? yes / note / no". Record the answers in `gold.json` `review`. Report agreement as "8 cases reviewed by an MBBS GP", nothing more.

---

## Phase 6: After the clinical fixes

- Re-run `npm run eval` on v1 + v2 cases; report v2 separately, with misses listed.
- Rewrite the demo around R01/R03 (one story across three doctors) plus R06b (schedule mismatch) as the 30-second "wow".
- Update `HOLES.md` H5, H14, H17, H20, H22 with what Phases 1-5 changed.

## Order of work

| Phase | Blocks | Can run in parallel with |
|---|---|---|
| 0 | nothing | everything |
| 1 | Phase 5 tiers | 2, 4 |
| 2 | R24, R25, R15 | 1, 4 |
| 3 | R26-R28 | 4 |
| 4 | Interrupt-list audit for 1.1 | 1, 2, 3 |
| 5 | final benchmark and demo | after 1 (cases can be written now) |
