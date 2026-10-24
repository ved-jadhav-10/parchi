# Test and holes plan: reliable tests, and what we can honestly claim

Written 24 Oct 2026. Companion to `HOLES.md` (the questions) and `FIX_PLAN.md` (the clinical fixes). Goal: when a judge asks "who checked this?", every test can be traced to a source we did not write ourselves, or says plainly that it is ours.

## 1. The rule: every test carries a provenance tier

A test is only as reliable as the source of its expected answer. We name the tier on every result, deck line and report. Nothing in a lower tier is described as a higher one.

| Tier | Where the expected answer comes from | What we may say |
|---|---|---|
| **T1 External truth** | A published or third-party source the engine does not read | "checked against [source]" |
| **T2 Generated from T1** | Cases built by script from our brand table; the expected result comes from a T1 source | "N cases generated from [source]" |
| **T3 Self-written** | We wrote the case and the answer (gold set, scenario tests, fixtures) | "regression test", never "accuracy" |
| **T4 Human-reviewed** | A named person judged the case on a named date | "reviewed by [name, role] on [date]" |

Today: no T4 exists. Every disagreement between the engine and a T1 source goes on a short **reviewer list** (`eval/reviewer_list.md`), which is what the 10 minutes with the doctor are spent on.

## 2. Independent sources, what each tests, and status

| Source (T1) | Tests | Licence | Status |
|---|---|---|---|
| Eka Care IndianDrugMCQA, 1,092 brands | brand name → composition (open-set, unseen brands) | MIT | **Built** (`resolver/external.test.ts`) |
| ONC high-priority DDI list (Phansalkar 2012) | pair is on file | published | **Built** (`highPriorityDdi.test.ts`) |
| ONC list, **end to end** | the pair, prescribed as real Indian brands, actually reaches an Interrupt | published | **Built** (`rules/oncEndToEnd.test.ts`): found 13 of 16 not stopping; fixed 10 with curated rules, 3 documented deviations |
| Eka NFI MCQA, 925 questions from the National Formulary of India | our adult max doses vs the Indian formulary | MIT | **Built** (`limits/nfiDose.test.ts`): 5 of 5 comparable drugs agree |
| Eka NFI MCQA, 166 pregnancy-category answers | which drugs the formulary rates pregnancy D/X (FIX_PLAN 2) | MIT | **Built** (`rules/pregnancyEvidence.test.ts`): 18 X/D drugs in our table, 16 covered, 2 excluded with reasons |
| Eka NFI MCQA, 166 contraindication answers | contraindications we do not yet check | MIT | Next |
| AGS Beers 2023 tables | elderly rules, expected answers | published | Next (needs the table text) |
| openFDA labels | pregnancy boxed warnings and contraindications (used); max doses and contraindicated pairs (next) | public domain | **Partly built** |
| Synthea synthetic patients | false-alarm rate and FHIR import at scale (T2) | unrestricted | Next |
| TWOSIDES / DrugBank via TDC | coverage gaps only, never an answer key | non-commercial | Optional |
| n2c2 2018 (US discharge summaries) | dose and frequency reading | data-use agreement | Later, outside Round 1 |

Not usable: KEGG (download prohibited), MIMIC (credentialing), handwriting images (we take typed lines).

## 3. Every hole, sorted by what can be done

### A. Reliable-test stream (code, this plan)
| Hole | Action | Tier produced |
|---|---|---|
| H14, H25 | Reviewer list from T1 disagreements; 10-minute sheet shows only those; report says "reference-labelled, reviewed by an MBBS GP on [date]" | T1 → T4 |
| H19 | `docs/VERIFIED.md`: one table of every claim with its tier and what is not verified; deck reads from it | n/a |
| H17 | Judge-input test: unseen brands and typos never produce a confident wrong composition (done in `external.test.ts`); add "not sure" path test for unknown brands in the full pipeline | T1 |
| H2 | Consistency test: same Rx 5 times, byte-identical alerts (deterministic test exists); chatbot side needs an API key, run later | T3 |
| H5 | Recall per alert type in the benchmark, plus a test that protected types are never suppressed or demoted (Phase 1) | T3 |
| H10 | `eval` script: ms per Rx, a 1,000-order queue; put only measured numbers on slides | measured |
| H7 | Wording audit test: no alert text recommends a dose or an action beyond "pharmacist to review" | T3 |
| H9 | Test that `api/` does not log or store (partly exists); host retention stays "not verified" | T3 |

### B. Product changes the holes ask for
| Hole | Action | Owner |
|---|---|---|
| H4 | Show approved / unverified badge per limit; stamp a data version on every result | B, D |
| H6 | One ask-the-patient question for OTC-prone classes; coverage label | C, D |
| H12 | "Data as of" stamp for ban and NSQ lists | A, D |
| H13 | Clicks per order in the review console | D |
| H16 | A 10-minute demo path: three screens, one failure fallback | D |
| H23 | Built | done |

### C. Needs people, cannot be automated
| Hole | What is needed | Plan |
|---|---|---|
| H1, H21 | A real pharmacist reviewing an order | Time one review by hand vs Parchi; ask 3 questions; ask a pharmacy student too |
| H4 | Sign-off on limits | Doctor reviews only the numbers that disagree with NFI or labels |
| H14, H25 | Pharmacist or pharmacy student on the test set | Ask a pharmacy student (the PS wording allows it) to rate the reviewer list; label the GP review as such |
| H20, H22, H24 | Frequency of multi-doctor cases, doctor visibility, share of chain purchases | Cannot be measured by us; answer with sources only and state the gap |

### D. Narrative, no code
H3 (plugs into their console, medThinks screenshot), H8 (bring your own catalogue), H11 (price from H1 minutes saved), H15 (map each slide to a key challenge), H18, H26 (say what is built and what is unproven).

## 4. Order of work
1. **Done 24 Oct:** this plan; NFI dose test; ONC end-to-end test; `eval/reviewer_list.md`; `VERIFIED.md`; H7 wording test; H10 measurement.
2. Next: Phase 2 pregnancy rule backed by the NFI pregnancy categories; Synthea false-alarm run; `VERIFIED.md`; UI badges (H4, H12).
3. Last: doctor session on the reviewer list only.

## 5. What we will not claim
- That any test measures clinical accuracy. T1 and T2 measure agreement with a source; only T4 measures judgement.
- That a US label or US synthetic patient reflects Indian practice.
- Anything about chatbots until an `eval/outputs/` file from a real run exists.
