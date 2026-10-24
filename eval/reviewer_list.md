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
