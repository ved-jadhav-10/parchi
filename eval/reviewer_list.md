# For the reviewer: where an outside source and our engine disagree

Ten minutes, answer one question per row: **would you want the pharmacist stopped (S), told (T) or left alone (N)?** Everything here comes from a source we did not write; nothing is on this list because we liked it. Generated 24 Oct 2026. After review, record who and when in `docs/VERIFIED.md`.

## A. Where we deliberately raise less than the ONC panel asks (`rules/oncEndToEnd.test.ts`)
| # | Pair, as Indian brands | ONC says | We show | Our reason | Your call |
|---|---|---|---|---|---|
| 1 | Azee 500 + HCQS 200 (azithromycin + hydroxychloroquine) | alert on every system | Inform | two QT drugs inform; three, or two antiarrhythmics, stop | S / T / N |
| 2 | Qutzal 0.25 + Emeset 4 (haloperidol + ondansetron) | alert on every system | Inform | same | S / T / N |
| 3 | Tonact 10 + Claribid 500 (atorvastatin + clarithromycin) | alert on every system | Inform | atorvastatin labelling allows it with a dose cap rather than forbidding it (from memory, to verify against the label) | S / T / N |

## B. Where the engine is stricter than we expected, and now stops (was Inform or Silent before the ONC test)
| # | Pair | Why it now stops |
|---|---|---|
| 4 | SSRI (Fludac, Nexito) + MAO inhibitor (Jumax, Rasalect) | serotonin syndrome |
| 5 | Tramadol + MAO inhibitor; amitriptyline + MAO inhibitor | serotonin syndrome, seizures, BP swings |
| 6 | Methylphenidate + selegiline; sumatriptan + selegiline | hypertensive crisis; raised triptan levels |
| 7 | Ergotamine + clarithromycin / ketoconazole / itraconazole / ritonavir | ergotism, gangrene |
| 8 | Febuxostat + azathioprine; tranylcypromine + procarbazine; amiodarone + sotalol | marrow suppression; hypertensive crisis; QT |

Question for 4-8: **is stopping the pharmacist right, or would you just inform?** (Alert fatigue is the other side of this.)

## C. Brands where our composition differs from Eka Care's (`resolver/external.test.ts`)
9 brands are confidently named with a different composition (1.4% of named brands), e.g. Aritep resolves to Aricep (donepezil) when the listed composition is aripiprazole. A pharmacist with the strip in hand settles these; a doctor usually cannot. List: run `npx vitest run src/engine/resolver/external.test.ts` and read the report.

## D. Doses where we match the Indian formulary
Ibuprofen 2.4 g, metformin 2 g, diclofenac 150 mg match NFI exactly. Nothing to decide; listed so the reviewer sees what was checked.

## Review record
- **Reviewer:** an MBBS general practitioner, 45 years of practice (not a pharmacist). Name to be added here.
- **Date:** 24 Oct 2026.
- **Scope:** sections A, B and D of this list (the 3 pairs we show as Inform, the 8 groups that now stop, the doses that match the formulary). Section C (brand compositions) needs a strip in hand and was not part of it.
- **Outcome as reported by the team:** the reviewer agreed with the tier we show on every row. This is the team's report of the session, not a signed sheet; attach the sheet if one exists.
- **What this does not cover:** the dose limits, the other alert rules and the 28 stacking and kidney rules were not on this list, so they remain unreviewed.

---

# Second review: Phase 2 (not yet reviewed)

Written 25 Oct 2026. **None of this was in the first review**; the record above does not cover it. Same question per row: stop (S), tell (T) or leave alone (N)?

## E. Pregnancy: medicines we stop on when pregnancy is entered
Source for each is the FDA label (boxed warning or contraindication) or the National Formulary of India category, quoted in `src/engine/rules/fixtures/pregnancy_evidence.json`.
| # | Medicines | Source | We show | Your call |
|---|---|---|---|---|
| 9 | ACE inhibitors and ARBs (ramipril, enalapril, lisinopril, telmisartan, losartan, olmesartan, valsartan) | FDA boxed warning, fetal toxicity | Stop | S / T / N |
| 10 | Methotrexate, misoprostol, isotretinoin, thalidomide, leflunomide, acitretin, ribavirin, valproate, mycophenolate | FDA boxed warning | Stop | S / T / N |
| 11 | Warfarin | FDA contraindication (except mechanical heart valves) | Stop | S / T / N |
| 12 | Danazol, clomifene, raloxifene, testosterone, miltefosine, ethinylestradiol, rubella and measles vaccines | NFI category X | Stop | S / T / N |
| 13 | Statins | FDA label: discontinue when pregnancy is recognized (not a contraindication) | Tell | S / T / N |
| 14 | Doxycycline, fluconazole, lithium | FDA label | Tell | S / T / N |
| 15 | Alprazolam, clonazepam, lorazepam, bleomycin | NFI category D | Tell | S / T / N |

**Left out on purpose, your judgement needed:** quinine (the formulary set says X, but malaria guidance uses it in early pregnancy) and urea (topical). Should either be added?

If pregnancy is not entered for a woman aged 12-50 on a "stop" medicine, we only ask for it (a note). Is that right, or should it stop?

## F. Allergy
A recorded penicillin allergy stops on any penicillin, including amoxicillin inside Mox-CV or Augmentin. A cephalosporin only gets a note. Same for sulfonamide antibiotics, NSAIDs (aspirin counts), macrolides, fluoroquinolones, tetracyclines. For aspirin allergy, NSAIDs get a note. Cross-reaction groupings are from recall of a 2022 allergy practice parameter, **not re-read**. **Is penicillin-then-cephalosporin as a note the right call?**

## G. Paracetamol limit (replaces the old age-65 cap)
Healthy adult 4,000 mg/day at any age. 3,000 mg/day with liver disease or heavy alcohol use. 60 mg/kg/day under 50 kg (recalled, not read from a label). Numbers are drafts. **Do you agree age alone should not lower it?**

## H. Judgement calls the engine currently shows as a note (from `scenarios.json`, marked "judgement call")
Not reviewed. The question for each is the same: **stop (S), tell (T) or leave alone (N)?** A pair that DDInter calls "major" but that no label or list we hold says must stop stays a note.
| # | Scenario | We show | Why it might deserve a stop |
|---|---|---|---|
| 16 | R04: warfarin, then co-trimoxazole (Septran DS) | Tell | raises INR; common and serious |
| 17 | R05: warfarin, then metronidazole (Metrogyl) | Tell | same |
| 18 | R11: Deriphyllin (theophylline) with ciprofloxacin | Tell | raises theophylline levels: toxicity, seizures |
| 19 | R13: lithium with ibuprofen (Combiflam) | Tell | raises lithium levels |
| 20 | R16: rifampicin (inside the Akt 4 TB pack) with warfarin | Tell | lowers warfarin effect |
| 21 | R18: digoxin with amiodarone | Tell | raises digoxin levels |
| 22 | Methotrexate with co-trimoxazole | **Stop** | **No FDA label sentence and not on the ONC list**; we stop on consensus alone. Right? |

## I. Workflow rules (Phase 3), each a judgement
- **Two doctors, two medicines of one class** is shown as "possible switch: confirm the earlier one was stopped" (a note). Two NSAIDs in a high-risk patient still stops. Right call?
- **No dosing written** (a cart line): the line is left out of the dose totals and the pharmacist is told, instead of assuming once a day. For a weekly drug (methotrexate) the note says it is normally weekly. Right?
- **No course length:** the ordered quantity is used (10 tablets twice a day = 5 days); antibiotics with neither are assumed to run 7 days; everything else keeps the 30-day default so a real overlap is not hidden. Is 7 days a fair antibiotic assumption?
- **A failed batch** (CDSCO list) is a quiet log line unless the batch number on the order matches, which then becomes a note.

## J. For a pharmacist with the strip in hand
`data/reports/composition_crosscheck.csv`: 480 brands where a second listing (same upstream, 1mg) has an ingredient we do not, 28 of them paracetamol and 40 paracetamol or an NSAID (for example Ace Proxyvon TH 4 lacks paracetamol in our data). 478 are already flagged "composition may be incomplete". Needs the pack, not an opinion.
