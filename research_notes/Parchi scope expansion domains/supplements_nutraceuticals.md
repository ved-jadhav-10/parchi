# Supplements and nutraceuticals in Parchi: market, regulation, worthwhile checks, data (India, Oct 2026)

Scope: whether Parchi (deterministic, offline Rx safety checker for the verifying pharmacist at Indian e-pharmacies and chains) should handle dietary supplements and nutraceuticals, and exactly which checks are worth building. Research date: 25 Oct 2026. Local repo facts were measured directly on the repo's own data files on that date; web facts are cited inline. Where a claim comes from my background knowledge and was not re-verified in this session, it sits under Gaps.

## Q0. Do supplements belong in Parchi at all? (summary verdict)

### Takeaway
Yes, but narrowly. In India the **dangerous doses of vitamins and minerals are sold as drugs, not as FSSAI supplements**: FSSAI caps a health supplement at 1 RDA per day, and anything above that must be sold as a drug. So the 60,000 IU vitamin D capsules, 600,000 IU injections, 100 mg pyridoxine "neuro" combinations and calcium/D3/K2 combinations are already brand-name Rx products in the 1mg dataset that Parchi uses. The highest-value work is (1) cumulative and frequency checks on Rx vitamin D, plus duplicate micronutrient sources across Rx and OTC lines, (2) finishing the chelation spacing rules (mostly built already), (3) vitamin A in pregnancy, vitamin K with acenocoumarol/warfarin, and potassium with RAAS drugs, and (4) two lab-interpretation notes: creatine distorts creatinine-based CrCl, and biotin distorts troponin and thyroid immunoassays. Skip protein label-fraud, steroid detection and "immunity" product claims. They cannot be checked from structured cart lines and have no deterministic data source.

### Cited Findings
- FSSAI rule: vitamins and minerals in a nutraceutical can go up to, but not above, the RDA. "Products exceeding the RDA must be sold as pharmaceutical drugs rather than nutraceuticals." — [NutraIngredients, 26 Jul 2021](https://www.nutraingredients.com/Article/2021/07/26/India-s-new-RDA-rules-see-increase-in-vitamin-A-C-zinc-levels-while-biotin-remains-unchanged)
- Usage "shall not exceed one RDA in any case" — [ChemLinked compliance guide, updated 18 Sep 2026](https://food.chemlinked.com/foodpedia/india-health-supplement-regulation)
- In the repo's 1mg 2025 dataset, 343 unique brand names carry vitamin D3 60,000 IU, and only 1 of them lacks the Rx flag. Of 965 vitamin D3 brands, 5 lack the Rx flag. Of 466 calcium carbonate/citrate brands, none do. Also present: `Arachitol 6L Injection` (Vitamin D3 600000IU) and `Uprise-D3 6L Injection`. — [local: data/raw/kaggle_1mg_2025/India Medicines and Drug Info Dataset.csv](../../data/raw/kaggle_1mg_2025/India%20Medicines%20and%20Drug%20Info%20Dataset.csv) (regex over the Composition and Product Name text; deduplicated by Medicine Name; composition text is messy, so counts are approximate)
- PharmEasy 2025: "vitamins and supplements became PharmEasy's most ordered category for the first time", ahead of every other category — [PharmEasy Health Report 2025 via MediaInfoline, 23 Dec 2025](https://www.mediainfoline.com/health/pharmeasy-health-report-2025-how-india-cared-for-its-health)
- Indian vitamin D toxicity series all trace back to prescribed or injected megadoses: Delhi-NCR, 16/16 cases from "prescription of mega-doses" ([Kaur, Mishra, Mithal, Clin Endocrinol 2015](https://pubmed.ncbi.nlm.nih.gov/26053339/)); Kashmir, 32/32 "had received multiple intramuscular injections of vitamin D3" ([Misgar et al., IJEM 2019](https://pubmed.ncbi.nlm.nih.gov/31641640/))

### Inferences
- Parchi's existing pipeline (resolver -> sig incl. weekly -> mg/day ledger -> rules) already sees most high-dose micronutrient products, because they are Rx brands. The new piece is mainly data: ingredient IDs, IU/µg unit conversion, limit rows with sources, and a handful of rules. A full new "supplement module" is not needed.
- FSSAI-compliant OTC supplements add at most about 1 RDA per product per day. Their risk is **stacking** (several products plus an Rx megadose) and **non-compliance** (adulteration, wrong labels), not single-product overdose. Stacking is exactly what a ledger catches. Non-compliance is invisible to Parchi.
- Pitch line that is true and checkable: "In India the overdose risk is on the prescription side. 60K IU vitamin D is a drug, and every Indian vitamin D toxicity series we found traces back to prescribed or injected megadoses. Parchi adds the customer's OTC vitamins into the same ledger."

### Gaps
- No pharmacist or clinician has reviewed which of these checks they would want. Run them past the Track D pharmacist session before building.

---

## Q1. Market: how big is the supplement category on Indian e-pharmacies and chains?

### Takeaway
The category is large and growing, and at PharmEasy it is now the most ordered category by volume. But no public source splits orders or GMV by category for 1mg, Apollo, Netmeds or Amazon. Market-size estimates disagree by about 1.5x: USD 6-9 bn in 2024-25.

### Cited Findings
- India nutraceuticals market: USD 8.93 bn in 2025 — [IMARC](https://www.imarcgroup.com/india-nutraceuticals-market). USD 6,113.2 m in 2024, rising to USD 11,552.7 m by 2030 — [TechSci Research](https://www.techsciresearch.com/report/india-nutraceuticals-market/14150.html). Older forecasts of USD 18 bn by 2025 ([Indian Pharma Post interview, R.B. Smarta](https://www.indianpharmapost.com/interviews/lite/indian-nutraceutical-market-is-expected-to-touch-us-18-bn-by-2025-dr-rb-smarta-6)) did not hold up against the later estimates.
- Functional foods were 37.6% of nutraceutical sector revenue in 2024. Grocery stores were 40.3% of functional-food sales — [Ken Research summary](https://www.kenresearch.com/industry-reports/india-nutraceutical-market.md) (paywalled summary)
- PharmEasy 2025 report (orders 1 Jan to 20 Nov 2025): vitamins and supplements were the most ordered category for the first time. Vitamin B supplements were the most purchased health product, up 33% year on year. Calcium came close behind and vitamin D was among the top purchases. Multivitamins topped the monthly charts. Vitamin D tests were the most-booked test. Gurgaon and Mumbai led whey protein buying. The report covers PharmEasy only — [MediaInfoline](https://www.mediainfoline.com/health/pharmeasy-health-report-2025-how-india-cared-for-its-health)
- Tata 1mg FY25 consolidated revenue was Rs 2,392 cr (+22% from Rs 1,968 cr) with a loss of Rs 276 cr. No category split is disclosed — [Entrackr](https://entrackr.com/fintrackr/tata-1mg-revenue-nears-rs-2400-cr-in-fy25-trims-losses-9534620); [Inc42](https://inc42.com/buzz/tata-digitals-fy25-turnover-down-14-1mg-revenue-zooms-20)
- HealthKart (MuscleBlaze, TrueBasics, The Protein Zone) FY25 operating revenue was about Rs 1,313 cr (FY24: Rs 1,021 cr, roughly +29%). Product sales were about Rs 1,277 cr and net profit about Rs 120 cr. It also sells through Amazon and modern and general trade — [Entrackr](https://entrackr.com/fintrackr/healthkarts-revenue-nears-rs-1400-cr-in-fy25-profit-triples-10652315); [Inc42](https://inc42.com/buzz/healthkart-fy25-profit-surges-3x-yoy-to-inr-120-cr)
- E-pharmacy share (Redseer, as reported): 1mg 31% in Sep 2023 (19% in Oct 2022). PharmEasy fell from about 33% to 15% over the same period — [UnlistedZone, citing Redseer/Business Standard](https://unlistedzone.com/1mg-surpasses-pharmeasy-asserts-dominance-in-indias-e-pharmacy-realm) (2023 data)
- Pharmaceuticals were about 50% of Indian healthcare e-commerce revenue in 2025, with supplements, devices and wellness making up much of the rest. E-pharmacy orders rose from about 45 m (2020) to 140 m (2025). E-pharmacy market about USD 3.5 bn in 2025 — [Ken Research e-pharmacy](https://www.kenresearch.com/industry-reports/india-e-pharmacy-market.md); [Ken Research online healthcare products](https://www.kenresearch.com/industry-reports/india-online-healthcare-products-market.md) (paywalled summaries; treat as low confidence). IMARC gives USD 3.18 bn for 2024 online pharmacy — [IMARC](https://www.imarcgroup.com/india-online-pharmacy-market)

### Inferences
- For the pitch: "Vitamins and supplements are now PharmEasy's most ordered category, so mixed carts (Rx + vitamins) are the norm, not the edge case." This is supportable. Do not quote a supplement share of GMV; no source exists.
- HealthKart's Rs 1,313 cr is about 55% of 1mg's total FY25 revenue, which shows how big a pure supplement retailer is next to a full e-pharmacy. That is an inference from the two figures; the businesses differ.

### Gaps
- No public category split (supplement share of orders or GMV) for 1mg, Apollo 24|7, Netmeds, Truemeds or Amazon. No 2025-26 Redseer e-pharmacy share data found. Apollo's private-label wellness share was not found.
- No 2026 market-size update from a primary source (IQVIA, Redseer) found.

---

## Q2. Regulation: FSSAI rules, RDAs and TULs, the drug versus nutraceutical line, adulteration findings

### Takeaway
FSSAI regulates supplements as food: at most 1 RDA (ICMR-NIN 2020), "NOT FOR MEDICINAL USE", and no hormones or steroids. Anything above RDA is a drug under the Drugs and Cosmetics Act. Which text is in force is muddled: the 2016 Regulations, plus 2022 provisions operationalised by an FSSAI direction, plus amendments. A ministry committee has recommended moving dose-format and disease-risk-claim products to the drug regulator, but adoption is unconfirmed. FSSAI TULs exist only "for information". Independent testing shows serious label-claim and contamination problems in Indian protein powders.

### Cited Findings
**Which regulation applies (sources conflict)**
- ChemLinked (updated Sep 2026): the "FSS (Health Supplements, Nutraceuticals, FSDU, FSMP and Prebiotic and Probiotic Food) Regulations, 2022 ... supersede the previous 2016 regulations" — [ChemLinked](https://food.chemlinked.com/foodpedia/india-health-supplement-regulation). FSSAI "operationalised the new regulations from April 1 [2022], without any transition period" — [NutraIngredients, Apr 2022](https://www.nutraingredients.com/Article/2022/04/20/India-s-new-nutra-policies-to-benefit-NPD-and-imports-FSSAI-s-ex-director/)
- Contradiction: Nishith Desai (2024 wrap) says the 2022 Nutra Regulations were still "in the process of publication". An FSSAI direction of 30 Aug 2024 under Section 16(5) re-operationalised certain 2022 provisions from 1 Jul 2024, pending final notification — [Nishith Desai Associates](https://nishithdesai.com/research-and-articles/hotline/pharma-healthcare-update/regulatory-wrap-2024-food-industry-in-india-15246)
- The 20 Oct 2026 FSSAI advisory (PTI) cites the **2016** Regulations. It warns supplement makers about missing mandatory labels and warning statements, including permissible limits for plant and botanical extracts, and says action "may follow" — [Outlook India, 20 Oct 2026](https://www.outlookindia.com/national/fssai-warns-nutraceutical-and-health-supplement-makers-over-labelling-lapses)
- A 22 Sep 2025 "second amendment" to the 2016 nutraceutical regulations is listed by a law-firm notification page; I could not verify it against the Gazette — [Velco Legal](https://velcolegalindia.com/notifications)

**Caps, claims, labels**
- Minimum 15% RDA for a nutrient content claim and 30% for a "high" claim; never above 1 RDA. No claims to "treat, cure, mitigate or prevent" disease. Mandatory labels: "HEALTH SUPPLEMENT", "NOT FOR MEDICINAL USE", "Not to exceed the recommended daily usage", and warnings on "product-drug interactions (where applicable)". No "hormones, steroids, narcotic drugs, or psychotropic ingredients". Must not be a drug under the D&C Act 1940 — [ChemLinked](https://food.chemlinked.com/foodpedia/india-health-supplement-regulation)
- The 2021 amendment covered single or combined vitamin/mineral tablets, capsules and syrups "at levels equal to a maximum of one (01) RDA or below". The 2022 rules added drops, gummies and chewable strips — [Freyr / search summary](https://freyrsolutions.com/blog/fssai-revises-nutraceutical-regulations); [NutraIngredients](https://www.nutraingredients.com/Article/2022/04/20/India-s-new-nutra-policies-to-benefit-NPD-and-imports-FSSAI-s-ex-director/)
- Inter-Ministerial Committee (MoHFW): products with only nutritional or health claims stay with FSSAI. Products in dose or dosage formats, or with disease-risk-reduction claims under the Drugs Rules, would move to the drug regulator. Adoption "remain[s] to be seen" — [Nishith Desai](https://nishithdesai.com/research-and-articles/hotline/pharma-healthcare-update/regulatory-wrap-2024-food-industry-in-india-15246)

**RDA and TUL numbers**
- ICMR-NIN 2020 is the first edition to add EARs and Tolerable Upper Limits (TULs) to the RDAs. TULs were added because fortified foods are now widespread — [ICMR press release](https://icmr.gov.in/icmrobject/custom_data/1702892982_icmr_press_release_recommended_dietary_allowances_for_indians.pdf)
- RDA 2020 changes adopted by FSSAI: vitamin C 40 mg -> 80 mg (men) / 65 mg (women); zinc 12/10 mg -> 17/13.2 mg; biotin unchanged at 30 µg. Vitamin A, D, iron and calcium RDAs also rose (values not given). Effective 1 Jul 2023 — [NutraIngredients 2021](https://www.nutraingredients.com/Article/2021/07/26/India-s-new-RDA-rules-see-increase-in-vitamin-A-C-zinc-levels-while-biotin-remains-unchanged)
- FSSAI's TUL table (on its website since 2018) is "only for information", not for food businesses. Examples: vitamin C 2,000 mg, vitamin D 100 µg (= 4,000 IU). Industry (ENAC) lobbies to switch the cap from RDA to TUL — [same source](https://www.nutraingredients.com/Article/2021/07/26/India-s-new-RDA-rules-see-increase-in-vitamin-A-C-zinc-levels-while-biotin-remains-unchanged)
- EFSA 2023 vitamin B6 UL: 12.5 mg/day adults, with peripheral neuropathy as the critical effect (reference point 50 mg/day, uncertainty factor 4) — [EFSA J 2023;21:8006, PMC10189633](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10189633/)

**Adulteration, label claims, enforcement**
- Citizens Protein Project 1 (*Medicine* 2024;103(14):e37724): 36 Indian protein supplements. 25 (69.4%) had 10-50% less protein than labelled; some had more (possible "amino-spiking"). 5 (13.9%) had aflatoxins and 3 (8.3%) pesticide residues. Lead in 75%, copper in 94.4%, arsenic in 5, cadmium in 10. Herbal-blend products (green tea, curcumin, ashwagandha, garcinia) were flagged for liver toxicity risk — [PMC10994440](https://pmc.ncbi.nlm.nih.gov/articles/PMC10994440/); [DairyReporter](https://www.dairyreporter.com/Article/2024/04/29/Protein-products-tested-in-India-don-t-meet-label-claims/). Self-funded. Amway disputed the aflatoxin finding — [ThePrint](https://theprint.in/health/70-of-36-popular-protein-supplements-sold-in-india-mislabeled-14-contain-toxins-says-new-study/2035264/). Methodology critique: [Substack](https://sudomakes.substack.com/p/5-problems-with-viral-supplement)
- Citizens Protein Project 2 (*Medicine* 2025;104(46):e45970, 14 Nov 2025): 34 whey products, 18 "pharma/medical" and 16 "nutraceutical". Pharma products averaged 29.1 g protein/100 g against 75.6 g for nutraceuticals, and 83% of pharma products were outside label tolerance (one delivered 25% of the declared protein). Sucrose in 44% of pharma products. Lead only in pharma products. Aflatoxin in 2 and progesterone in 2 pharma products. Undisclosed taurine in 89% of pharma products against 12.5% of nutraceuticals — [MedBound Times](https://www.medboundtimes.com/amp/story/diet-and-nutrition/pharma-protein-powders-india-quality-study)
- FSSAI said it was "intensifying" rules on protein supplements after CPP1 (3 Jul 2024); no specific measures were published — [Medical Dialogues](https://health.medicaldialogues.in/diet-and-nutition/fssai-enforces-stricter-regulations-on-protein-supplements-after-study-reveals-misleading-claims-131083)
- Steroids: Indian athletes' doping cases blamed contaminated supplements (methyltestosterone in "Nitro Whey" and "Testo Matrik", testosterone in "Base Whey", ostarine in a GNC product, per documents reviewed by the outlet) — [Circle of Sport](https://circleofsport.com/?p=2749) (journalistic, not peer-reviewed). Thai survey: 5 of 20 whey products contained anabolic steroids (mostly stanozolol) — [IJPS 2023](https://he01.tci-thaijo.org/index.php/IJPS/article/view/252715) (not India)
- Reported Haryana FDA drive (Oct 2026): 73 suspect samples of nutraceuticals, whey and energy drinks collected — [Omnicuris](https://www.omnicuris.com/medshots/daily_updates/fitness-supplement-safety-haryana-fda-crackdown_09-Oct-26_16-09) (unverified, no results published)

**Vitamin D toxicity in India (evidence for the top check)**
- Delhi-NCR 2011-13: 16 patients, median age 64.5. Median 25(OH)D 371 ng/mL (range 175-1,161) and median calcium 13.0 mg/dL. All caused by prescribed megadoses. Median cumulative dose **3,600,000 IU** (2.22 m to 6.36 m). Presentations included acute kidney injury, pancreatitis and altered sensorium — [Kaur et al., Clin Endocrinol 2015, PMID 26053339](https://pubmed.ncbi.nlm.nih.gov/26053339/)
- Kashmir prospective: 32 patients, median calcium 13.95 mg/dL, median 25(OH)D 306 ng/mL. All had multiple intramuscular D3 injections. Median cumulative dose **4,200,000 IU** (1.8 m to 30 m). 78% had azotemia. Hypercalcaemia took a median 7 months to resolve — [Misgar et al., IJEM 2019, PMID 31641640](https://pubmed.ncbi.nlm.nih.gov/31641640/)
- Kashmir 2011: 10 cases, "prescribed doses far exceed the requirements" — [Koul et al., Oman Med J 2011, PMID 22043417](https://pubmed.ncbi.nlm.nih.gov/22043417/). Self-prescription case with AKI — [Bhat et al., JFMPC 2022, PMID 35516667](https://pubmed.ncbi.nlm.nih.gov/35516667/)

### Inferences
- The cumulative doses in these series are reachable with common Indian SKUs. 60,000 IU taken **daily** instead of weekly for 60 days is 3.6 m IU, the Delhi median. Six 600,000 IU injections (the "6L" products in the dataset) is also 3.6 m IU. A frequency check plus a cumulative-course check in the ledger directly targets the documented harm.
- For Parchi's `source` field, the citable cap for an FSSAI supplement is "1 RDA per day (FSSAI Nutra Regs)". Use TULs only as informational references, never as hard limits, since FSSAI itself labels them "for information". Every limit row stays `pharmacist_approved: false` until reviewed.
- Because the regulatory text is in flux (2016 vs 2022 vs committee proposal), cite the specific instrument and date on each data row.

### Gaps
- Full ICMR-NIN 2020 TUL table not obtained. The report is sold, and the online short-report PDF is a scanned image that could not be parsed here. One search summary stated an iron TUL of 45 mg/day (adults), but I could not confirm the page. Vitamin D, zinc, calcium and vitamin A TULs from NIN were not obtained.
- Calcium UL: the IOM 2011 values (2,500 mg/day at 19-50 y, 2,000 mg/day at 51+ y; vitamin D UL 4,000 IU) are background knowledge, not fetched this session (the NIH ODS site returned 403 / Cloudflare to both WebFetch and scripted access). Verify at the [IOM 2011 DRI report (NCBI Bookshelf)](https://www.ncbi.nlm.nih.gov/books/NBK56070/) before use.
- Exact gazette text of the Nutra Regulations as in force in Oct 2026, and whether the Inter-Ministerial Committee recommendation has been notified. Not confirmed.
- No FSSAI public recall list for supplements was found. CPP2 notes FSSAI does not require public disclosure of quality data.

---

## Q3. Highest-value checks: evidence, source, pipeline fit, effort, risk, pitch value

### Takeaway
In order of value per hour: (1) vitamin D frequency and cumulative-course check plus duplicate vitamin D sources; (2) duplicate micronutrient consolidation (B6, iron, zinc, calcium, vitamin A) across Rx and OTC lines, tiered mostly Inform/Silent; (3) chelation spacing, which is already about 80% built in `ddi_supplement.json`; (4) vitamin A in pregnancy; (5) vitamin K with acenocoumarol/warfarin; (6) potassium with ACEi/ARB/spironolactone; (7) lab-interference notes for creatine (CrCl) and biotin (troponin, thyroid). Fish oil with antiplatelets should be Silent or Inform only; the evidence says the bleeding concern is weak.

### Cited Findings
**Repo state today (measured locally)**
- `public/data/ddi.json` (DDInter export): 772 ingredients, 70,704 pairs. Supplement IDs present and their pair counts: `calcium_carbonate` 106, `iron` 49, `zinc_sulfate` 46, `melatonin` 30, `caffeine` 39, `pyridoxine` 4, `retinol` 54, `tocopherol` 71, `ascorbic_acid` 15, `vitamin_d` 125, `potassium_chloride` 394, `folic_acid` 336, `levocarnitine` 61. Most of the vitamin_d, potassium_chloride and folic_acid pairs are level 0 ("unknown"). There is **no** vitamin K (phytonadione/menaquinone), omega-3/fish oil, biotin, creatine, whey or St John's wort ingredient — [local: public/data/ddi.json](../../public/data/ddi.json)
- `public/data/ddi_supplement.json` already has `quinolone_cations` (cipro: "at least two hours before or six hours after multivalent cation-containing products"), `tetracycline_cations` and `levothyroxine_binders` (calcium, iron, sucralfate, antacids; "the label separates the doses by 4 hours"). Each quotes a DailyMed label and is marked `pharmacist_approved: false` — [local: public/data/ddi_supplement.json](../../public/data/ddi_supplement.json)
- The herbal starter module has 12 rules incl. `bleeding_herbs`, `ashwagandha_thyroid`, `giloy_liver`, `herbo_mineral_metals` — [local: src/engine/herbal/herbal.json](../../src/engine/herbal/herbal.json)
- Ingredient prevalence across 251,288 unique 1mg brand names: methylcobalamin 5,973; pyridoxine 2,207 (**644 at >= 100 mg**, 293 at 12.5-99 mg, 1,004 below 12.5 mg); zinc 1,016; vitamin D3 965 (343 at 60,000 IU); calcium carbonate/citrate 466; alpha-lipoic acid 458; iron salts 427; omega-3/DHA 313; levocarnitine 207; vitamin K2 143; melatonin 142; biotin 69; vitamin A 42; whey/protein 50 — [local: 1mg 2025 CSV](../../data/raw/kaggle_1mg_2025/India%20Medicines%20and%20Drug%20Info%20Dataset.csv) (approximate regex counts)

**Interaction and toxicity evidence**
- Calcium carbonate cut free T4 (17 -> 15 pmol/L) and raised TSH in 20 levothyroxine patients. Levothyroxine adsorbs to calcium carbonate — [Singh et al., JAMA 2000, PMID 10838651](https://pubmed.ncbi.nlm.nih.gov/10838651/)
- Ciprofloxacin bioavailability fell to about 60% with calcium carbonate and about 15% with aluminium hydroxide — [Frost et al., AAC 1992, PMID 1503446](https://pubmed.ncbi.nlm.nih.gov/1503446/)
- Vitamin A: supplemental preformed vitamin A above 10,000 IU/day gave a prevalence ratio of 4.8 (95% CI 2.2-10.5) for cranial-neural-crest defects, with an apparent threshold near 10,000 IU/day. "About 1 infant in 57 had a malformation attributable to the supplement" — [Rothman et al., NEJM 1995, PMID 7477116](https://pubmed.ncbi.nlm.nih.gov/7477116/)
- Vitamin K and warfarin: a steady 150 µg/day oral vitamin K *improved* INR stability in unstable patients (time in range +28% vs +15%), so the hazard is a *change* in vitamin K intake, not vitamin K itself — [Sconce et al., Blood 2007, PMID 17110451](https://pubmed.ncbi.nlm.nih.gov/17110451/)
- Omega-3 bleeding: "an objective assessment of the evidence for clinically significant bleeding reveals that such concerns are unfounded" — [Harris, Am J Cardiol 2007, PMID 17368278](https://pubmed.ncbi.nlm.nih.gov/17368278/)
- Creatine: a 2025 meta-analysis (21 studies) found a small rise in serum creatinine (MD reported as 0.07 µmol/L; units as printed in the abstract), significant at <= 1 week and at > 12 weeks, with no significant change in GFR: "likely due to metabolic turnover rather than renal impairment" — [Naeini et al., BMC Nephrol 2025, PMID 41199218](https://pubmed.ncbi.nlm.nih.gov/41199218/)
- Biotin: the FDA (2017, updated 5 Nov 2019) warns biotin can cause falsely low troponin and missed MI. Some assays are still affected, and the FDA keeps a list — [FDA](https://www.fda.gov/medical-devices/vitro-diagnostics/biotin-interference-troponin-lab-tests-assays-subject-biotin-interference). Biotin also gave a false "Graves'" thyroid picture — [Elston et al., JCEM 2016, PMID 27362288](https://pubmed.ncbi.nlm.nih.gov/27362288/); review — [Avery, Ann Clin Biochem 2019, PMID 31023057](https://pubmed.ncbi.nlm.nih.gov/31023057/)
- Potassium with RAAS blockade: SSaSS secondary analysis on hyperkalaemia with potassium-enriched salt substitute in RAAS-blocker users — [Yin et al., Circulation 2025, PMID 41183166](https://pubmed.ncbi.nlm.nih.gov/41183166/) (abstract not retrievable; title only)
- B6: EFSA UL 12.5 mg/day, with neuropathy as the critical effect — [EFSA 2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10189633/)
- Protein in CKD: the KDOQI 2020 nutrition guideline covers dietary protein for CKD stages 1-5 (non-dialysis and transplant) — [Ikizler et al., AJKD 2020, PMID 32829751](https://pubmed.ncbi.nlm.nih.gov/32829751/)

### Inferences (check cards)

**Check 1. Vitamin D: frequency, cumulative course, duplicate sources (build first)**
- Evidence: Kaur 2015 and Misgar 2019 (above); 343 x 60K IU brands plus "6L" 600,000 IU injections in the dataset.
- Rule design: (a) **Interrupt** when a product with >= 60,000 IU vitamin D3 has a sig more often than weekly (OD/BD/TDS, or "1-0-0" with no weekly marker). This is the classic weekly-vs-daily error. (b) **Inform** when vitamin D comes from 2 or more lines (Rx 60K + OTC D3 or calcium+D3 + multivitamin), showing the summed IU/day and the course total. (c) Phase 2: **Inform** on cumulative IU across dated Rx from several doctors (repeat 600K injections). Avoid comparing a supervised weekly loading course with the 4,000 IU/day TUL. That would fire on every routine 60K weekly script and burn the alert budget.
- Pipeline: resolver already maps the brands. Needs IU<->µg units (40 IU = 1 µg) in `data/rxdata/units.py` or the Track B ledger, `vitamin_d`/`cholecalciferol` alias unification, and limit rows in data with `source` + `pharmacist_approved: false`. The sig parser already handles "weekly" (PLAN status B).
- Effort: about 4-6 hackathon hours for (a)+(b); Phase 2 cumulative about 2-3 h more on top of existing `checkHistory` windows.
- Risks: brand compositions in the 1mg data are sometimes empty (e.g. `Uprise-D3 6L Injection` has a blank composition, so it needs hand curation). Weekly sigs are written inconsistently. Thresholds need pharmacist sign-off.
- Pitch value: **very high**. It is Indian-specific, backed by Indian case series, demoable in one line, and chatbots likely miss the weekly-vs-daily error on brand names (to be measured in the eval).

**Check 2. Duplicate micronutrients across Rx + OTC (B6, iron, zinc, calcium, vitamin A, B12)**
- Evidence: prevalence counts above (B6 >= 100 mg in 644 brands; methylcobalamin in 5,973 brands). EFSA B6 UL. FSSAI 1-RDA cap per OTC product.
- Rule design: reuse the existing ingredient duplication rule. Tier **Silent/Inform** for B12 and folate (low harm; ledger consolidation and cost). **Inform** for B6 when the summed daily dose comes from 2 or more products and the course is long. **Inform** for iron, zinc and calcium when summed amounts exceed a sourced reference.
- Pipeline: Track C duplication rule + Track B ledger; requires mg-normalised salts (elemental iron vs ferrous salt weight, zinc sulphate monohydrate vs elemental zinc). Salt-to-elemental conversion is the real work.
- Effort: about 3-5 h for duplication tiers. Salt-to-elemental tables need a sourced data file (about 1 day to do properly).
- Risks: alert fatigue (B-complex everywhere). Elemental-vs-salt confusion gives false totals. Never invent B6/iron/zinc caps; use EFSA/ICMR-cited values marked unverified.
- Pitch value: medium. It shows the alert budget working: "we saw 4 B12 sources and stayed Silent".

**Check 3. Chelation and absorption spacing (levothyroxine, quinolones, tetracyclines, bisphosphonates, dolutegravir)**
- Evidence: Singh 2000; Frost 1992; DailyMed quotes already in `ddi_supplement.json`.
- Status: about 80% built. Missing pieces are `zinc`/`magnesium` in `levothyroxine_binders`, a calcium/iron + alendronate rule (DDInter has `calcium_carbonate`-`alendronic_acid` and `iron`-`alendronic_acid` at level 2), iron + dolutegravir (DDInter level 3), and making sure multivitamin brands resolve to `calcium`/`iron`/`zinc` IDs so the existing rules fire.
- Output: **Inform** with spacing advice ("take 4 h apart"), never Interrupt.
- Effort: about 1-2 h.
- Risks: duplicates DDInter alerts, so dedupe by pair.
- Pitch value: high and cheap. It is the most common real-world supplement-drug interaction pharmacists counsel on.

**Check 4. Vitamin A in pregnancy**
- Evidence: Rothman 1995 (threshold near 10,000 IU/day of supplemental preformed vitamin A).
- Rule: pregnancy flag + summed preformed vitamin A (retinol/retinyl, not beta-carotene) above a sourced threshold -> **Interrupt**. Also catch isotretinoin/acitretin + vitamin A (DDInter has `retinol`-`acitretin` level 3).
- Pipeline: existing pregnancy rule path; needs IU<->µg RAE conversion data and retinol vs beta-carotene split.
- Effort: about 2-3 h.
- Risks: label units (IU vs µg RAE) and carotenoid forms. Only 42 retinol brands, so it fires rarely.
- Pitch value: high (teratogen, one-line story), low frequency.

**Check 5. Vitamin K with acenocoumarol/warfarin**
- Evidence: Sconce 2007 (stability depends on consistent intake). 143 vitamin K2 brands (calcium + D3 + K2 combinations are common).
- Rule: **Inform**: "new vitamin K-containing product with a VKA; INR may shift, keep intake consistent and check INR". Not an Interrupt.
- Pipeline: add `phytonadione`/`menaquinone_7` IDs plus one curated rule (DDInter export lacks vitamin K).
- Effort: about 2 h.
- Risks: K2 doses are small (micrograms) and evidence for MK-7 specifically is thin. Wording must not say "contraindicated".
- Pitch value: medium-high, because acenocoumarol is common in India.

**Check 6. Potassium supplements with ACEi/ARB/spironolactone/eplerenone; kidney band**
- Evidence: SSaSS 2025 analysis (title); existing curated `acei_k_sparing`/`arb_k_sparing` show the pattern. DDInter `potassium_chloride` pairs are mostly level "unknown".
- Rule: curated rule KCl/potassium citrate x RAAS/K-sparing -> **Inform**, raised to Interrupt when the Phase 2 CrCl band is low (pharmacist to decide).
- Effort: about 1-2 h.
- Pitch value: medium.

**Check 7. Lab-interpretation notes: creatine -> CrCl, biotin -> troponin/thyroid**
- Evidence: creatine meta-analysis 2025 (creatinine rises, GFR does not); FDA biotin communication.
- Rule: when creatine is in the order and Phase 2 computes Cockcroft-Gault from a serum creatinine, add an **Inform** note: "creatine supplements raise serum creatinine; CrCl may be underestimated". When biotin (high dose) is present, note possible interference with troponin and thyroid immunoassays.
- Pipeline: Track C `checkHistory` already re-checks on new creatinine; this is a note on that path. Needs `creatine` and `biotin` IDs.
- Effort: about 2-3 h each.
- Risks: creatine and biotin doses are often not in structured data. Notes must be worded as "consider", not a diagnosis.
- Pitch value: high novelty. It connects the supplement cart to the Phase 2 kidney re-check story.

**Lower value / skip**
- Fish oil/omega-3, vitamin E, ginkgo + antiplatelets/anticoagulants: Silent or Inform at most (Harris 2007). DDInter already carries `tocopherol`-`apixaban`/`aspirin` at level 2. Good as an "evidence-graded" example, not a headline.
- St John's wort: no Indian market evidence found. Low priority.
- Melatonin: DDInter has 30 pairs (e.g. fluvoxamine level 2), already covered. Indian melatonin brands in the dataset are Rx-flagged.
- Caffeine/pre-workout with MAOIs/stimulants: curated `onc_stimulant_maoi` and DDInter caffeine pairs exist. Pre-workout compositions are not in any dataset, so the resolver cannot see them.
- High protein in CKD: see Q5. Possible as an Inform tied to the CrCl band, but cart lines rarely carry grams of protein per day.

### Gaps
- No Indian prevalence data on supplement-drug co-use (e.g. calcium + levothyroxine) found; Europe PMC searches for Indian supplement-use surveys returned nothing relevant.
- The KDOQI 2020 protein target for CKD 3-5 not on dialysis (0.55-0.6 g/kg/day, or 0.6-0.8 in diabetes) is background knowledge; the abstract does not state it. Verify in the full guideline.
- Zinc-induced copper deficiency, niacin hepatotoxicity/flushing, and calcium + thiazide milk-alkali: no source fetched this session.
- Whether the Track B ledger already converts IU for vitamin D and vitamin A was not checked in code.

---

## Q4. Machine-readable data sources and licences

### Takeaway
For Indian supplement brands there is no open machine-readable label database. US-only DSLD and NIH ODS are free but do not cover Indian brands. Interactions are best taken from DDInter (already in repo) plus a small curated rule file with DailyMed label quotes, which is the repo's existing pattern. NatMed and MSK are reference-only. Licences for DDInter, MSK and NatMed were not confirmed.

### Cited Findings
- NIH DSLD: free public-use database created in 2008, with more than 71,000 labels by 2018 — [Dwyer et al., J Nutr 2018, PMID 31249427](https://pubmed.ncbi.nlm.nih.gov/31249427/). The full database is downloadable as JSON and has an API guide — [SupplySide SJ](https://www.supplysidesj.com/labeling/nih-dietary-supplement-label-database-dsld-is-robust-public-resource). A third-party wrapper lists `https://api.ods.od.nih.gov/dsld/v9` with "no authentication required" — [ToolUniverse source](https://zitniklab.hms.harvard.edu/ToolUniverse/_modules/tooluniverse/nih_dsld_tool.html) (unofficial). DSLD notes labels "may not have met ... FDA regulations".
- DDInter 2.0 (NAR 2025): 2,310 drugs, 302,516 DDI records, plus 857 drug-food, 8,359 drug-disease and 6,033 therapeutic-duplication records; "freely accessible" — [Tian et al., PMID 39180399](https://pubmed.ncbi.nlm.nih.gov/39180399/). DDInter 1.0 — [Xiong et al., NAR 2022, PMID 34634800](https://pubmed.ncbi.nlm.nih.gov/34634800/)
- The repo's DDInter export already holds key supplement IDs but not vitamin K, omega-3, biotin or creatine (see Q3) — [local: public/data/ddi.json](../../public/data/ddi.json)
- MSK About Herbs: described as a tool for the public and professionals, maintained by a pharmacist/botanicals expert. No licence or terms found — [search result listing](https://aps.bvs.br/lis/resource/?id=49641)
- NIH ODS fact sheets have an official XML/HTML API (`ods.od.nih.gov/api/?resourcename=...`), but in this session both WebFetch and curl got 403 / Cloudflare challenge pages — (attempted; no citable content)

### Inferences
- Recommended stack for Parchi: (1) **ingredient IDs and limits**: a small hand-curated `supplement_limits.csv` (vitamin D, A, B6, iron, zinc, calcium, vitamin C) with columns `value, unit, basis (RDA|TUL|UL), source, pharmacist_approved=false`, citing FSSAI/ICMR-NIN 2020, EFSA and IOM; (2) **interactions**: DDInter (already licensed into the repo pipeline) + about 6 new curated rules in `ddi_supplement.json` with DailyMed quotes; (3) **brands**: hand-curate the top ~50 OTC supplement SKUs from pack labels and e-pharmacy listings, then use the existing Phase 2 buyer-catalogue CSV import for the long tail. A buyer's own catalogue holds compositions for its wellness SKUs.
- DSLD is useful only for imported US brands (e.g. GNC, Optimum Nutrition) and as a schema reference. US government data is generally public domain, but that is not confirmed for DSLD here.
- Do not scrape NatMed, Drugs.com or MSK into data files. They are commercial or terms-unknown sources. Cite them in docs only.

### Gaps
- DDInter licence terms (commercial use by an e-pharmacy vendor) not verified. This matters for the business model, independent of supplements.
- NatMed (TRC) API licensing and pricing not found. MSK About Herbs terms not found. Drugs.com licensing not checked.
- FSSAI schedules (permitted nutrients, botanicals, limits) exist only as gazette PDFs; no machine-readable version found.

---

## Q5. Protein powders: which checks are real and which are not evidence-based?

### Takeaway
Real but out of Parchi's reach: label-claim fraud, heavy metals, aflatoxin and hidden steroids or hormones. All need lab testing of the batch, which a structured-line checker cannot do. Real and buildable: protein load in advanced CKD (tied to the Phase 2 CrCl band), creatine distorting creatinine, and herbal-blend protein products that add liver-toxic botanicals (route to the existing herbal module). PKU/aspartame and lactose are label-allergy items, worth at most a Silent note if the patient record carries the condition. "Protein damages healthy kidneys" is not supported by the evidence found.

### Cited Findings
- CPP1: 69.4% under-labelled protein; aflatoxin 13.9%; pesticides 8.3%; lead 75%; herbal blends worse than plain whey — [PMC10994440](https://pmc.ncbi.nlm.nih.gov/articles/PMC10994440/); [DairyReporter](https://www.dairyreporter.com/Article/2024/04/29/Protein-products-tested-in-India-don-t-meet-label-claims/)
- CPP2: "pharma/medical" protein powders (the kind sold through pharmacies) averaged 29.1 g protein/100 g, 83% were out of label tolerance, 44% contained sucrose, and progesterone was found in 2 products — [MedBound Times](https://www.medboundtimes.com/amp/story/diet-and-nutrition/pharma-protein-powders-india-quality-study)
- FSSAI bans steroids and hormones in health supplements — [ChemLinked](https://food.chemlinked.com/foodpedia/india-health-supplement-regulation). Contamination cases are still documented via doping — [Circle of Sport](https://circleofsport.com/?p=2749)
- Creatine raises serum creatinine without lowering GFR — [BMC Nephrol 2025](https://pubmed.ncbi.nlm.nih.gov/41199218/)
- Dietary protein in CKD is a guideline topic (KDOQI 2020) — [PMID 32829751](https://pubmed.ncbi.nlm.nih.gov/32829751/)
- Local data: only about 50 whey/protein products in the 1mg 2025 dataset; Ensure, Protinex and MuscleBlaze are absent (Q6).

### Inferences
- Parchi could at most show a batch or brand-level NSQ-style flag if a regulator publishes failing protein batches. None was found for supplements (CPP2: FSSAI does not require public disclosure of quality data). Do not build a "protein label fraud" check; it would invent data.
- Pharmacy-channel "medical" protein powders (the CPP2 pharma group) are the ones a pharmacist actually dispenses, and they performed worse than gym products in CPP2. That makes a good talking point, not an engine rule.
- The PKU/aspartame check is real (phenylalanine labelling) but needs both a patient condition field and sweetener data per SKU. Neither exists. Low priority.

### Gaps
- No peer-reviewed Indian study quantifying anabolic steroid adulteration in supplements was found; the evidence is doping cases and foreign surveys.
- No source fetched on high-protein diets in people with normal kidneys.

---

## Q6. Indian brand resolution: are supplement compositions in the existing datasets?

### Takeaway
Partly. The Rx-labelled "nutraceutical" brands (Shelcal-CT, Calcirol XT, Tayo, Neurobion variants, D-Rise 60K, D3 Must 2K, Livogen-XT, Fefol-Z, Autrin, Cobadex CZS, Calcimax K2, Omegabal, Folvite) are in the 1mg 2025 dataset, though some compositions are empty or garbled. The flagship OTC wellness brands are missing from both datasets: Supradyn, Becosules, Zincovit, Revital, Limcee, A to Z tablets, Ostocalcium, Dexorange, Maxirich, Protinex, Ensure and MuscleBlaze. Track A would need to hand-curate them or take them from the buyer's catalogue CSV.

### Cited Findings
- 1mg 2025 Kaggle dataset: 348,211 rows, 251,288 unique names. Only 4,161 rows carry `Is Prescription Required? = False`. Present (rows): Shelcal variants 10 (e.g. "Shelcal -CT Max Soft Gelatin Capsule": calcium carbonate 500 mg + calcitriol 0.25 mcg + DHA + methylcobalamin ...), Uprise-D3 6 (composition blank for "Uprise-D3 6L Injection 1ml"), Neurobion 8, Calcirol XT 2, Tayo 6, Livogen-XT 2, D-Rise 60K 2, D3 Must 2K 2, Calcimax K2 4, Arachitol 6L 3, Fefol-Z 1, Autrin 1, Cobadex CZS 1, Folvite 4 (non-Rx). **Absent (0 rows)**: Supradyn, Becosules, Zincovit, Revital, Limcee, A to Z (tablet), Ostocalcium, Dexorange, Maxirich, Protinex, Ensure, MuscleBlaze — [local: 1mg 2025 CSV](../../data/raw/kaggle_1mg_2025/India%20Medicines%20and%20Drug%20Info%20Dataset.csv)
- The Composition field mixes in manufacturer text and truncates (e.g. "& Gamble Health LtdMethylcobalamin (1500mcg) + ..."; trailing "ADD"), so parsing needs the existing Track A cleaners — (same file)
- A-Z dataset (junioralive): 253,973 rows, all typed "allopathy". Uprise-D3 60K Capsule is present with an empty composition. Neurobion RF Forte Injection lists "Methylcobalamin (1000mcg) + Vitamin B6 (Pyridoxine) (100mg) + Nicotinamide (100mg)". Supradyn, Becosules, Zincovit, Shelcal (plain), Protinex, Ensure and MuscleBlaze are absent — [local: data/raw/junioralive/DATA/updated_indian_medicine_data.csv](../../data/raw/junioralive/DATA/updated_indian_medicine_data.csv)
- The repo's 32k-brand index `public/data/brands.json` contains at least one match for Neurobion, Uprise, Calcirol, Evion and Omega (case-insensitive grep; the number of SKUs was not counted), and no match at all for Supradyn, Becosules, Zincovit, Shelcal, Revital, Protinex, Ensure, MuscleBlaze or Maxirich — [local: public/data/brands.json](../../public/data/brands.json)

### Inferences
- Resolution plan: (1) hand-curate about 30-50 top OTC wellness SKUs (multivitamins, B-complex, calcium+D3, zinc, vitamin C, iron, fish oil, protein drinks) from pack labels, marked `verified_by: pack` and unverified by a pharmacist. That is about 6-10 hackathon hours, mostly reading labels. (2) Route the long tail through the Phase 2 catalogue CSV import: e-pharmacies hold compositions for their own wellness SKUs. (3) Flag unresolved wellness lines as "unverified product, ingredients unknown" (Silent or Inform), not as an error. This uses the existing `proposed_composition` / unknown-brand path.
- Multivitamin labels list 10-25 ingredients with mixed units (IU, µg, mg, % RDA). The parser needs IU/µg RAE/mg-alpha-TE conversions in data. That is the main technical cost.
- Composition data for Ensure, Protinex and MuscleBlaze would add mostly protein, sugar and low-dose vitamins, with little safety signal outside CKD or PKU. Low priority compared with B-complex, calcium/D3 and zinc brands.

### Gaps
- Not checked: whether e-pharmacy listing pages (1mg/PharmEasy OTC pages) allow reuse of composition data. Scraping terms would need legal review.
- Whether the "Is Prescription Required?" flag in the Kaggle dataset is reliable (nearly every vitamin product is flagged Rx, which may reflect scraping bias rather than legal status).
