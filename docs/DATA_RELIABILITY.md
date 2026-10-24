# Data reliability audit (24 Oct 2026)

What was measured against sources outside this repo, what changed, and what is still open. Every number below comes from a test or a query that can be re-run. Nothing here was approved when it was written. Afterwards Dr. Sanjay Dhanushkar signed off the adult, elderly and paediatric limits of 19 everyday medicines (`approved_by` in `limits.json`, see `VERIFIED.md`). Paracetamol with alcohol and the less common medicines were not covered.

## 1. Brands the 2022 index does not have
**Problem.** The typo tests only misspell brands already in the index. Real input also has newer brands, and the nearest name is then often another medicine.
**Measured.** `src/engine/resolver/external.test.ts` against Eka.Care's Indian Drug MCQA list (MIT, 1,092 brands, `fixtures/ekacare_brands.json`). 879 brands had comparable compositions; 630 got a name. Before the fix 73 of 631 named brands (11.6%) were confidently a different composition (Aritep resolved to Aricep, donepezil instead of aripiprazole). Another 69 matched a subset of the real composition, missing an ingredient.
**Fix.** An open-set guard routes a fuzzy match to the pharmacist when the brand word differs in its first letter or by two or more typo edits, or when the typed name has a word the match lacks ("Plus", "MD", "D", "XT"). Confident mismatches fell to 9 (1.4%): one-letter look-alikes and exact names whose listing differs. Typo benchmarks held (74 hand-written: 100% top-1; 818 held-out: 97.9% top-1, 0.12% confidently wrong). The 54-case gold set is unchanged.
**Basis.** Most misspellings are a single edit (Damerau 1964, about 80%; Pollock and Zamora 1983, JASIS 34:51, 90-95% in scientific text). The claim that first letters are rarely wrong was not verified and is not relied on as fact: it is a heuristic the Eka numbers support.
**Open.** Agreement with Eka is 50% of named brands. Part of that is compositions the two sources list differently (strengths absent from Eka, extra excipients), not errors. A pharmacist should adjudicate a sample. 249 brands got no match at all; they are left out of totals and flagged.

## 2. Doses with no limit to compare against
**Problem.** Only 21% of ingredient occurrences in top-tier oral brands had an adult daily maximum. For the rest, "no dose alert" meant "not checked".
**Fix.** 22 adult maximums, each read from a primary source and recorded in the entry's `source` (all `pharmacist_approved: false`): US FDA labels via openFDA (DailyMed set ids), 21 CFR part 341 (phenylephrine 60, dextromethorphan 120, diphenhydramine 300, guaifenesin 2,400 mg/day), EMA/UK SmPCs (nimesulide 100 mg twice daily, thiocolchicoside 8 mg twice daily for 7 days, etoricoxib 120 mg for gout only, mefenamic acid 500 mg three times daily). The results now name every totalled ingredient with no limit ("No daily limit on file").
**Caveats.** These are US/EU labels, not Indian ones. Mefenamic acid's UK label states no separate ceiling, so 1,500 mg is the labelled regimen, not a stated maximum. Gabapentin 3,600 is the studied dose, not a label cap. Rosuvastatin 40 carries a caution for Asian patients. A pharmacist should confirm against the Indian label.
**Open.** Many ingredients still have no limit (see the unlimited list on the results page). Paediatric limits exist for two drugs.

## 3. Interaction gaps
**Problem.** DDInter has no domperidone, and several cardiac pairs.
**Measured.** `highPriorityDdi.test.ts` checks the ONC high-priority list (Phansalkar et al., JAMIA 2012;19:735; class table reproduced in Kim et al., PMC5102850) for members sold in India: all tested pairs are on file. Not testable because we hold no ingredient id: amphetamine, atazanavir, mercaptopurine, pethidine, ramelteon, citalopram.
**Fix.** 6 curated rules: domperidone with strong CYP3A4 inhibitors and with QT-prolonging drugs (EMA 2014 contraindications; the member lists are examples, not complete), amiodarone with sotalol, ivabradine with verapamil/diltiazem, verapamil/diltiazem with beta-blockers, and with digoxin. All major, all unverified, all labelled curated in the source chip.
**Why not just trust one database.** Abarca et al. 2004 found that of 406 major interactions in four compendia, only 9 were in all four and 291 in only one. Coverage depends on the source, so absence is never shown as safety.
**Open.** DDInter's 2.0 evidence grading was not found, so severity is taken as published. A second source (for example the Indian National Formulary) was not obtained.

## 4. Not changed, but a known weakness
- **Cockcroft-Gault uses actual body weight.** In obesity this overestimates clearance (a 2011 carboplatin study and a Japanese study of 107 patients agree on direction, but the Japanese study found actual weight most accurate overall, and adjusted weight better only at BMI over 30 with eGFR under 30). Height is not collected. Left as is and documented in `crcl.ts`.
- **Composition completeness.** About 34% of dataset brands are marked `composition_complete: false` (the source holds at most two ingredients). The Eka comparison shows real cases: Watace-SP lacks serratiopeptidase, Krose Gold lacks clopidogrel. 1,499 paracetamol/NSAID brands are still unverified (`data/reports/`).
- **No Indian prescription-level evidence** for the herb-drug feature (HOLES H26).

## 5. Where clinical numbers come from, and how that is checked (25 Oct 2026)
**Order of preference for a dose limit.** (1) Indian approved label or pack insert; (2) National Formulary of India; (3) Indian regulator notices (CDSCO S.O. numbers, the 325 mg paracetamol-in-FDC cap); (4) US FDA label or OTC monograph (21 CFR 341), EMA/UK SmPC. WHO ATC is used only to classify drugs and WHO DDD is a drug-use statistic, not a maximum; neither sets a limit. What we hold today: one Indian insert (Dolo, paediatric paracetamol), NFI 2011 figures as quoted in Eka's NFI question set for 5 drugs (`limits/nfiDose.test.ts`; we do not have NFI 2021), and FDA/EMA/UK labels for the rest.
**Checked by a script, not by trust.** `data/curated/limit_evidence.csv` holds the label sentence behind each limit; `data/limit_evidence.py` fails if the sentence is not in the label word for word. 31 limits carry `label_checked` (the date of that check). That is not an approval: `pharmacist_approved` stays `false` everywhere until a pharmacist signs, and a test keeps the two apart. Where labels disagree (ibuprofen 2,400 UK vs 3,200 US) the lower is used and both are named.
**Interactions that weaken a drug.** DDInter's bulk files give a level but not a direction. 12 curated rules in `ddi_supplement.json` say which drug loses effect and how (activation blocked, opposing action, absorption blocked, faster breakdown), each with an FDA label quote checked word for word (`data/tests/test_ddi_evidence.py`): clopidogrel + omeprazole/esomeprazole, ibuprofen + low-dose aspirin, NSAIDs with ACE inhibitors and diuretics, quinolones/tetracyclines/levothyroxine with calcium, iron and antacids, rifampicin and carbamazepine with hormonal contraceptives, carbamazepine with paracetamol, and timolol eye drops with reliever inhalers and oral beta-blockers (eye drops otherwise never count). Tiers still come from the existing policy: only a label contraindication interrupts.
**Not used as data:** Medscape and other commercial checkers (no stated source, proprietary; a 2021 comparison of eight checkers found poor agreement). They are a manual second opinion only. The Kaggle 1mg 2025 scrape (CC BY-NC-SA) only feeds a review list (`data/review_diff.py`), never the app.

## 6. Why rules decide and the language model does not
- The engine must give the same answer twice, name its source and work offline; a model does none of these.
- LLMs over-flag and misgrade severity: Sicard et al. 2025 (82 DDI cases, 22 negative controls): fully correct answers ChatGPT 66%, Claude 68%, Gemini 33%, all "often detecting non-existent DDIs". Thapa et al. 2025 (Nepal, 301 patients, vs Micromedex): severity matched in 214 of 574 interactions (37.3%).
- Even assisting a pharmacist, the best published LLM set-up caught 61% of errors (Ong et al., Cell Rep Med 2025, 91 scenarios).
- So the model only reads sig text the rules cannot parse (online, validated, never sets a tier) and writes the customer leaflet. Real-world need: an ICMR audit of 4,838 prescriptions found 9.8% with unacceptable deviations (Shetty et al., IJMR 2024;159:130).

## Sources
- Eka.Care Indian Drug MCQA: huggingface.co/datasets/ekacare/indian_drug_mcqa (MIT).
- Phansalkar S et al. High-priority drug-drug interactions for use in electronic health records. JAMIA 2012;19:735-43. Table via Kim et al., PMC5102850.
- Abarca J et al. Concordance of severity ratings provided in four drug interaction compendia. J Am Pharm Assoc 2004.
- EMA domperidone referral 2014; EMA thiocolchicoside 2013; EMA nimesulide Article 31 referral.
- openFDA drug label API; eCFR 21 CFR part 341; medicines.org.uk SmPCs (Arcoxia, Ponstan Forte, ivabradine, verapamil).
- Damerau FJ 1964, CACM 7:171; Pollock JJ, Zamora A 1983, JASIS 34:51.
- Sicard J et al. Ther Adv Drug Saf 2025 (doi 10.1177/20420986251339358); Thapa et al. Explor Res Clin Soc Pharm 2025 (PMC11786904); Ong JCL et al. Cell Rep Med 2025;6(10):102323; Shetty Y et al. IJMR 2024;159(2):130-141.
- FDA labels behind the interaction rules (DailyMed set ids): clopidogrel 0078fb3d, ibuprofen 0170876a and 0387bfaa, ciprofloxacin 0fac4466, doxycycline 0106a3d3, levothyroxine 008de8fd, rifampin 0391f1e1, carbamazepine 047bc284, albuterol 04c8a345, dorzolamide/timolol 02d89d37.
