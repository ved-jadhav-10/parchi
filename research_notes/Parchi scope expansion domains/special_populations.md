# Special-population checks for Parchi: paediatrics, pregnancy, lactation, older adults, hepatic impairment (as of 25 Oct 2026)

Scope note for the report writer: "repo" citations point to files in this repository (read 25 Oct 2026). They show what Parchi already has, so the recommendations below only add what is missing. Everything marked "prior knowledge, not re-verified" is in Gaps, not in Cited Findings.

What the repo already has, so the writer does not over-claim or under-claim:
- `Patient` already carries `age_years`, `weight_kg`, `serum_creatinine`, `sex`, `allergies`, `pregnancy: 'yes'|'no'|'unknown'`, `liver_disease`, `heavy_alcohol_use`, `egfr`. There is no `height_cm`, no `breastfeeding` and no trimester or gestational week — [repo src/engine/contracts.ts](../../src/engine/contracts.ts) (lines 204-220).
- Pregnancy is further along than "one patient flag": `public/data/alert_rules.json` has 17 `pregnancy_rules` (ACE inhibitors/ARBs, methotrexate, misoprostol, isotretinoin, thalidomide, leflunomide, acitretin, ribavirin, valproate, mycophenolate, warfarin, statins, tetracyclines, fluconazole, lithium, plus National Formulary of India category X and D groups). Each rule has openFDA label evidence that a test checks (`pregnancyEvidence.test.ts`) — [repo public/data/alert_rules.json](../../public/data/alert_rules.json), [repo src/engine/rules/fixtures/pregnancy_evidence.json](../../src/engine/rules/fixtures/pregnancy_evidence.json), [repo src/engine/rules/fixtures/nfi_pregnancy_xd.json](../../src/engine/rules/fixtures/nfi_pregnancy_xd.json).
- Older adults: 8 Beers 2023 rules and a domperidone 65+ rule (`patient_rules`, `age_at_least: 65`), an anticholinergic burden scale and a CNS-stacking scale (`burden_scales`), and 7 `stack_rules` (triple whammy, bleeding, hyperkalaemia, serotonergic, QT) — [repo public/data/alert_rules.json](../../public/data/alert_rules.json).
- Paediatric mg/kg maximums exist for only 2 ingredients: paracetamol 60 mg/kg/day (Indian Dolo 250 suspension insert) and ibuprofen 40 mg/kg/day (US DailyMed label). Both are `pharmacist_approved: false` — [repo src/engine/limits/limits.json](../../src/engine/limits/limits.json).
- There is no paediatric age-gated rule. Every `patient_rules` entry uses `age_at_least`; none uses an upper age bound — [repo public/data/alert_rules.json](../../public/data/alert_rules.json).
- `liver_disease` and `heavy_alcohol_use` currently only lower the paracetamol limit. The limits sign-off scope says "paracetamol with alcohol or liver disease" is still unapproved — [repo src/engine/contracts.ts](../../src/engine/contracts.ts), [repo src/engine/limits/limits.json](../../src/engine/limits/limits.json) (`_meta` scope).
- Paediatric kidney checks are listed as not built because no height is collected — [repo docs/track-b-dose.md](../../docs/track-b-dose.md) ("Not built").

## Q1. Paediatrics in India: evidence of harm, and which checks are age gates rather than mg/kg limits

### Takeaway
The strongest India-specific, current and citable paediatric checks are **age gates**, not mg/kg maths. They are: the Union Health Ministry/DGHS advisory of 3 Oct 2025 (no cough and cold medicines under 2 years, generally not under 5), and the chlorpheniramine + phenylephrine FDC "not below 4 years" restriction. That restriction is now a Section 26A gazette notification, S.O. 4595(E) of 18 Aug 2026, after S.O. 1717(E) of 15 Apr 2025. Promethazine under 2, codeine under 12 (an EMA/FDA position; no Indian notice was found) and tetracyclines under 8 (with the doxycycline short-course nuance) round out a small, high-value rule set. Paracetamol strength confusion is the main mg/kg problem in India. The ledger's mL-to-mg conversion plus a weight-based check catches it once weight is captured.

### Cited Findings
**Contaminated syrups and the 2025 advisory (pitch evidence)**
- Coldrif (Sresan Pharma, Tamil Nadu) was linked to child deaths in Chhindwara, Madhya Pradesh, in Sept-Oct 2025. Lab results showed 48.6% diethylene glycol (DEG) against a 0.1% impurity limit — [Chemistry World](https://www.chemistryworld.com/news/23-indian-childrens-deaths-linked-to-contaminated-cough-syrup/4022312.article); [WION](https://www.wionews.com/india-news/cough-syrup-deaths-states-ban-coldrif-after-diethylene-glycol-presence-confirmed-beyond-permissible-limits-1759597609077/amp).
- The death toll reached 24 by mid-October 2025, after two more Chhindwara children died of suspected renal failure in Nagpur. A further infant death was linked to an Ayurvedic syrup, not Coldrif (25 in total for liquid formulations) — [Tribune](https://www.tribuneindia.com/news/madhya-pradesh/mp-coldrif-cough-syrup-fatality-count-reaches-24-after-2-more-children-die); [Tribune, Ayurvedic syrup death](https://www.tribuneindia.com/news/india/one-more-cough-syrup-linked-death-in-mp-infant-dead-after-having-ayurvedic-formulation); [ETV Bharat](https://www.etvbharat.com/en/bharat/madhya-pradesh-coldrif-cough-syrup-fatality-count-rises-after-many-children-die-enn25101506375).
- The Sresan Pharma owner was arrested on 9 Oct 2025, Tamil Nadu revoked the firm's manufacturing licence, and the prescribing Chhindwara doctor was arrested for alleged negligence. The WHO issued an alert on three Indian oral syrups (Coldrif, Respifresh TR, ReLife) — [Onmanorama](https://www.onmanorama.com/news/india/2025/10/05/coldrif-cough-syrup-ban-mp.amp.html); [Gulf News](https://gulfnews.com/world/asia/india/indian-states-ban-cough-syrup-after-child-deaths-all-you-need-to-know-1.500294980). (The WHO alert reached me through search summaries of these articles; I did not open the WHO alert itself.)
- Conflicting early statement: on about 3 Oct 2025 the Centre said the tested MP samples had no DEG or ethylene glycol. It also said the Rajasthan product involved contained dextromethorphan, "not recommended for children under national and WHO safety standards". The Coldrif DEG result came later from the state lab — [Tribune, "no toxins found"](https://www.tribuneindia.com/news/rajasthan/no-toxins-found-in-cough-syrup-samples-linked-to-deaths-in-rajasthan-madhya-pradesh-centre).
- DGHS advisory of 3 Oct 2025 to all states and UTs: cough and cold medicines should not be prescribed or dispensed to children under 2. They are "generally not recommended" under 5. For older children the advisory asks for careful clinical evaluation, correct dosing, the shortest duration and **avoidance of multiple drug combinations** — [The South First](https://thesouthfirst.com/news/child-deaths-no-cough-cold-medicines-for-children-below-2-years-says-health-advisory/); [Scroll](https://scroll.in/latest/1087291/health-ministry-advisory-calls-for-rational-use-of-cough-syrups-for-children); [Onmanorama](https://www.onmanorama.com/news/india/2025/10/03/cough-syrup-advisory-children-under-2-years.html). Karnataka, Telangana and two other southern states issued orders banning cough and cold syrups for under-2s — [The South First](https://thesouthfirst.com/news/four-southern-states-ban-cough-and-cold-syrups-for-children-under-two-step-up-surveillance). (Press-reported advisory text; the DGHS PDF was not opened.)
- A draft notification proposes removing cough syrups from the Schedule K (over-the-counter) list — [WION](https://wionews.com/india-news/india-bans-nimesulide-oral-tablets-syrups-above-100-mg-under-drugs-act-here-s-why-1767186127982); [Deccan Herald](https://www.deccanherald.com/amp/story/india%2Fhealth-ministry-moves-to-remove-syrups-as-otc-medicine-ban-nimesulide-3847955).

**Chlorpheniramine + phenylephrine FDC, under 4**
- CDSCO letter dated 18 Dec 2023, following a Subject Expert Committee meeting on 6 June 2023. Manufacturers must label the FDC "FDC should not be used in children below 4 years of age" — [The Wire](https://thewire.in/health/cdsco-says-anti-cold-fdc-not-to-be-used-in-children-below-4); [Tribune](https://www.tribuneindia.com/news/india/regulator-bans-anti-cold-syrup-for-under-4-children-574238).
- S.O. 4595(E), 18 Aug 2026, under Section 26A of the Drugs and Cosmetics Act (on DTAB and Expert Committee advice), restricts the manufacture, sale and distribution of **all formulations** of FDCs containing chlorpheniramine maleate + phenylephrine HCl. It requires the warning "fixed dose combination shall not be used in children below four years of age" and takes effect on gazette publication. It follows S.O. 1717(E) of 15 Apr 2025, which made a "similar restriction" — [Medical Dialogues](https://medicaldialogues.in/news/industry/pharma/health-ministry-restricts-chlorpheniramine-phenylephrine-fdcs-for-children-below-4-mandates-warning-labels-177776). (Secondary report; gazette text not opened.)

**Nimesulide**
- S.O. 6091(E), 29 Dec 2025, under Section 26A, bans "all oral formulations containing Nimesulide above 100 mg in immediate release dosage form" — [gazette PDF, Goa FDA](https://dfda.goa.gov.in/wp-content/uploads/2026/01/S.O.-6091E-Dated-29.12.2025-BAN-ON-ORAL-FORMULATIONS-NIMESULIDE-100-MG-IMMEDIATE-RELEASE.pdf). Strengths of 100 mg and below, and sustained- or extended-release forms, are reportedly outside the ban. ICMR reportedly also recommended a black-box warning and restricting prescriptions to people aged 18-60 (a recommendation, not law) — [Deccan Herald](https://www.deccanherald.com/amp/story/india%2Fhealth-ministry-moves-to-remove-syrups-as-otc-medicine-ban-nimesulide-3847955); [The South First](https://thesouthfirst.com/health/why-did-india-ban-high-dose-nimesulide-painkiller-formulations-above-100mg/).

**Codeine, promethazine, tetracyclines**
- EMA/CMDh: codeine for cough and cold is contraindicated under 12. The EMA found 14 published cases of codeine intoxication in children aged 17 days to 6 years treated for cough or respiratory infection, 4 of them fatal (the cause is ultra-rapid conversion to morphine) — [EMA](https://www.ema.europa.eu/en/news/codeine-not-be-used-children-below-12-years-cough-cold); [BASG Austria](https://basg.gv.at/en/market-surveillance/official-announcements/detail/use-of-codeine-no-longer-indicated-in-children-with-cough-under-12-years-of-age).
- India: no CDSCO or DTAB codeine age limit was found. A 2016 report said most Indian codeine syrup brands carried no child or breastfeeding warning — [Hindustan Times via PressReader](https://www.pressreader.com/india/hindustan-times-st-mumbai-ht-navi-mumbai-live/20160424/281483570566365). An Indian hospital page states that codeine syrups are Schedule H and contraindicated under 12, citing international action — [Medanta](https://www.medanta.org/medicine-detail/codeine-uses-side-effects-precautions-and-dosage).
- Promethazine US label (boxed): "should not be used in pediatric patients less than 2 years of age because of the potential for fatal respiratory depression", and labels list it as contraindicated under 2. The warning dates from 2005 and was based on postmarketing fatalities — [DrugCentral label](https://drugcentral.org/label/5f079815-f48b-8b21-2130-7f791d967c9a/view); [Vanderbilt Poison Center, 2005](https://www.vumc.org/poison-control/toxicology-question-week/april-18-2005-administration-promethazine-phenerganr-pediatric-patients).
- Tetracyclines: since 1970 the FDA label has warned against tetracycline-class use under 8 (dental staining). A CDC/IHS study of 58 children who had received about 1.8 doxycycline courses before age 8 found no tetracycline-like staining — [CDC](https://www.cdc.gov/rmsf/doxycycline/); [CDC RMSF data](https://www.cdc.gov/rocky-mountain-spotted-fever/hcp/data-research/index.html). A secondary source says the FDA label allows doxycycline for 21 days or less regardless of age; this was not checked against the label — [Orange County HCA PDF](https://ochealthinfo.com/sites/hca/files/import/data/files/84504.pdf).

**Paracetamol strength confusion (the main Indian mg/kg hazard)**
- An editorial in J Pharmacol Pharmacother (2011): the highest-strength paracetamol drops are 150 mg/mL, "nearly thrice" the strongest suspension (50 mg/mL). One brand (Febrex) sells a 250 mg/5 mL suspension and a 125 mg/5 mL syrup, both 60 mL. These products "are sold without oral syringes or dosing spoons", and household spoons "range in volume from a teaspoon to a dessertspoon". It also says "an infant with fever receiving the paracetamol prescribed for a 5-year-old child is all too common" — [Gitanjali, JPP 2011;2(3):147](https://pmc.ncbi.nlm.nih.gov/articles/PMC3157121).
- A letter in Indian Pediatrics (2014) lists Indian paracetamol liquids at "120/125/150/250/500 mg/5 mL". Citing an earlier Indian study (Lakshmi and Radhika), it says 250 mg/5 mL syrup was the "common reason of accidental single over dose (46%)" and drops the "common formulation causing toxicity due to multiple dose ingestion (63%)". The authors' hospital stocks only 125 mg/5 mL, and they ask IAP to push a single strength — [Balasubramanian & Ramesh, Indian Pediatr 2014;51:839](https://www.indianpediatrics.net/oct2014/oct-839.htm).
- A case report: a child prescribed 120 mg/5 mL suspension was given 150 mg/mL drops, about 333 mg/kg/day for 2 days, and recovered by day 5. The authors call for standardising liquid strengths — [Pediatric Oncall](https://www.pediatriconcall.com/pediatric-journal/view/fulltext-articles/1651/J/0/0/911/0). (Attribution comes from a search summary; the page was not opened.)
- The Saudi FDA (Oct 2025) warns that 100 mg/mL drops are stronger than suspensions and that household spoons should not be used. This is a non-Indian regulator, cited only for the 100 mg/mL drops hazard — [SFDA](https://www.sfda.gov.sa/sites/default/files/2025-10/Paracetamol%20SFDA%20Drug%20Safety%20Communication.pdf).

**Indian paediatric prescribing-error data (no Indian 10-fold study found)**
- Nagpur, 1,376 outpatient paediatric prescriptions from 4 community pharmacies: heavy use of FDCs and brand names; error scores differed by prescriber type — [Indian J Community Med 2010 (DOAJ)](https://doaj.org/article/15b0d80371b9465690f313d36babbebd).
- A secondary hospital in north India had a mean baseline paediatric OPD prescription error rate of 72.2% (95% CI 63.2-81.1), all error types — [PMC11007580](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11007580/). A New Delhi tertiary audit found 11.66% of 343 paediatric prescriptions inappropriate by the POPI tool — [Indian J Child Health](https://mansapublishers.com/ijch/article/view/3892).
- International 10-fold data: one US children's hospital logged 252 tenfold errors in 5 years, 22 of which caused harm and nearly 30% of which were underdoses — [PSNet](https://psnet.ahrq.gov/issue/fatal-mistakes-why-do-ten-fold-medication-errors-children-keep-happening); [PubMed 22473367](https://pubmed.ncbi.nlm.nih.gov/22473367). (Which of the two links holds which figure was not checked.)

### Inferences
Each check below gives its evidence, source, how it plugs in, the inputs it needs, the effort, the risks and the pitch value.

**Check P1: paediatric age gates.** Implement as a new `age_below` (and `age_below_months`) key in the existing `patient_rules` shape in `alert_rules.json`, mirroring `age_at_least`, with `source` and `pharmacist_approved`.
- Rule candidates:
  - (a) Any cough/cold class (antitussive, decongestant, first-generation antihistamine, expectorant syrup) under 2 years: Interrupt candidate. Source: DGHS 3 Oct 2025.
  - (b) The same classes under 5: Inform.
  - (c) Chlorpheniramine + phenylephrine on the **same product** under 4: Interrupt. Source: S.O. 4595(E). This needs a same-line "FDC contains all of" matcher; Track A's `banned_fdc.json` matching may be reusable.
  - (d) Promethazine under 2: Interrupt (US boxed warning).
  - (e) Codeine under 12: Interrupt (EMA/FDA; no Indian notice, so the source must say so).
  - (f) Tetracycline class under 8: Inform, with a doxycycline short-course note.
  - (g) Nimesulide under 12: prior knowledge, see Gaps. The new 100 mg IR ban is a product-level check for Track A's banned list, not an age rule.
  - (h) Dextromethorphan in young children: wording from the Centre's 2025 Rajasthan statement.
- Inputs: age only, which is already collected. Under 2 needs months, so the UI should accept "8 months", and `age_years` can be fractional.
- Effort: about 3-5 hackathon hours for the rule engine key, data rows, wording and Vitest. The FDC same-line matcher adds about 2 h.
- Risks: class tagging of Indian cough/cold FDCs must be complete (Track A classes), or under-2 syrups slip through. The advisory is "advice", so word alerts as "the Ministry advises against", not "banned". Alert fatigue is low because these trigger only in children.
- Pitch value: highest of anything in this brief. It ties the product to the Coldrif deaths and to a gazette notification two months old.

**Check P2: liquid-strength sanity.**
- If weight is known, the existing mL-to-mg ledger plus the paracetamol 60 mg/kg/day limit already catches drops-for-syrup mix-ups written on the Rx.
- If weight is not known, a weight-free check is possible: "drops product dosed in ≥ X mL" or "two paracetamol liquids of different strengths for one child" (a duplicate ingredient across lines is already summed by the ledger). Any X threshold must come from a pharmacist, not from us.
- Effort: about 2 h. Pitch: high (Gitanjali 2011, Indian Pediatr 2014).
- Risk: the Rx rarely shows what the parent actually gives. Parchi only sees the order, so its most useful output is a counselling prompt ("confirm drops vs syrup at hand-over").

### Gaps
- Nimesulide under 12: prior knowledge, not re-verified this session. India prohibited nimesulide formulations for children under 12 in 2011, I believe under G.S.R. 82(E). Confirm the gazette number before encoding; Track A's banned list may already hold it.
- No CDSCO or DTAB codeine-under-12 or promethazine-under-2 notice was found. Indian labels may or may not carry these warnings, and an India source for both is still missing.
- The DGHS advisory PDF and the S.O. 4595(E)/1717(E) gazette texts were not opened (press only). Read the exact class list ("cough and cold medicines") before encoding.
- Fluoroquinolones in children and aspirin/Reye's syndrome were not researched this session. Both are well-known label cautions (prior knowledge). Sources still needed: an Indian or US label quote for the age bound (aspirin: under 16 in UK/BNF practice; FQs: "not first line under 18").
- No Indian study quantifying 10-fold or decimal-point errors in paediatric prescriptions was found.
- The exact DEG death counts differ by outlet (23, 24, 25) and by date. Use "two dozen children" in the pitch.

## Q2. Paediatric mg/kg maximums for top Indian OPD drugs: machine-readable sources, weight capture, Schwartz eGFR

### Takeaway
No free, licensable, machine-readable paediatric dosing dataset suitable for India was found. The IAP Drug Formulary is a free app with no data licence. BNFc and Lexicomp are commercial. Kinderformularium (NL/DE) is free to read but has no open data licence. WHO's 2010 children's formulary is a PDF. The practical route is the one the repo already uses: quote each label (Indian pack insert first, then DailyMed or SmPC) into `limits.json` for about 9 drugs, unapproved until the pharmacist session. Paediatric kidney dosing needs height plus an IDMS-traceable creatinine for the bedside Schwartz equation, which is rare in an OPD prescription. It is a low-priority build.

### Cited Findings
- IAP Drug Formulary: the IAPDF app is free (developer SIDSSOL), auto-updates its content, and includes the IAP Essential Medicine List and General Prescribing Information — [Apple App Store](https://apps.apple.com/dk/app/iapdf/id591789800). The formulary launched in 2004 as a CD-ROM plus book and is an official IAP publication — [Indian Pediatrics 2006](https://www.indianpediatrics.net/mar2006/mar-274-275.htm). No bulk download or data licence was found.
- Kinderformularium.de (Erlangen) is free for health professionals since Jan 2021. It has more than 500 monographs and later more than 2,000 dosing recommendations, including renal dosing, and is built under licence from the Dutch NKFK Kinderformularium — [Pharmazeutische Zeitung](https://www.pharmazeutische-zeitung.de/grosse-datenbank-fuer-kleine-patienten-133019/); [German Health Ministry, PaedDos3](https://www.bundesgesundheitsministerium.de/service/publikationen/details/paeddos3). No API, open licence or English bulk export was found.
- A 2024 study comparing anti-infective dosing across the German Kinderformularium, SwissPedDose and BNF for Children found differences and argued for a unified European formulary — [Paediatr Drugs 2024](https://link.springer.com/10.1007/s40272-024-00674-2). This supports the point that sources disagree, so each Parchi limit needs one named source.
- Parchi's existing paediatric limits are label quotes: paracetamol 60 mg/kg/day from the Indian Dolo 250 insert ("max. daily dosage: 60 mg/kg ... 10-15 mg/kg"), and ibuprofen 40 mg/kg/day from a DailyMed suspension label. The UK Brufen SmPC gives 20 mg/kg as usual, not maximum — [repo limits.json](../../src/engine/limits/limits.json).
- Bedside Schwartz (CKiD 2009): eGFR (mL/min/1.73 m²) = 0.413 × height (cm) / serum creatinine (mg/dL). It was derived in 349 children aged 1-16 with CKD — [Schwartz et al., JASN 2009, PubMed 19158356](https://pubmed.ncbi.nlm.nih.gov/19158356/); [PMC2653687](https://pmc.ncbi.nlm.nih.gov/articles/PMC2653687).
- The 0.413 coefficient assumes an enzymatic, IDMS-traceable creatinine assay. With a Jaffé assay, the original Schwartz k (0.33-0.70 by age) is used instead — [ClinicalTrials.gov protocol NCT05915026](https://cdn.clinicaltrials.gov/large-docs/26/NCT05915026/Prot_000.pdf). The bedside equation performs well in moderate-to-severe CKD and less well in mild disease — [PMC3718461](https://pmc.ncbi.nlm.nih.gov/articles/PMC3718461).

### Inferences
**Check P3: extend paediatric mg/kg to the top OPD drugs.** Add `paediatric.max_mg_per_kg_day` for amoxicillin, amoxicillin-clavulanate (amoxicillin component), azithromycin, cefixime, ondansetron, cetirizine, levocetirizine, salbutamol and domperidone. Also add a `max_mg_day_cap` so a heavy child never exceeds the adult maximum.
- Sources, in this order:
  1. the Indian pack insert of the market-leading brand, quoted word for word, as the repo did for Dolo;
  2. the DailyMed or openFDA "Pediatric Use"/dosage section;
  3. a UK SmPC (emc).
- IAP Formulary/BNFc values can be shown to the pharmacist for sign-off but should not be scraped.
- Several drugs are age-banded rather than mg/kg (cetirizine and levocetirizine by age band; ondansetron by weight band; domperidone mg/kg with an EMA restriction). Support `paediatric.bands: [{age_from, age_to, max_mg_day}]` in addition to mg/kg.
- Inputs: weight, asked only when a weight-dosed drug is on the Rx for a child under 12. This already exists.
- Effort: about 1-1.5 h per drug to find and quote a label, so 1-2 days for 9 drugs. Banded limits need a small schema and engine change (2-3 h).
- Risk: labels give "usual" and "maximum" inconsistently (see ibuprofen). Never put "usual" into a max field without saying so.

**Check P4: paediatric kidney function (Schwartz).**
- Needs `height_cm` (additive `Patient` field), a creatinine value and an assay caveat.
- Trigger: only when a child is on a drug with a kidney band and creatinine is known.
- Value is low for OPD e-pharmacy volume. Children with known CKD are mostly managed in hospital, and the 0.413 coefficient is assay-dependent.
- Effort: 3-4 h of code and tests. Paediatric renal bands, however, need a new data table with pharmacist sign-off, which takes weeks.
- Recommendation: build the formula and the ask-height prompt only if time remains; mark every paediatric band unverified.

### Gaps
- WHO Model Formulary for Children (2010): its free-PDF status and lack of updates are prior knowledge, not checked this session. Also not checked: the BNFc licence terms, whether SwissPedDose has an open export, and the IAP Drug Formulary's current edition number.
- No Indian-specific mg/kg maximums were collected this session for the 9 drugs. They must be read from labels before encoding. Do not take numbers from this brief.

## Q3. Pregnancy: from letter categories to label-based statements; teratogens commonly dispensed in India

### Takeaway
The FDA's Pregnancy and Lactation Labeling Rule (PLLR) removed the A/B/C/D/X letters (effective 30 June 2015) in favour of narrative risk summaries. Parchi has already adopted the right pattern: each pregnancy rule carries a verbatim openFDA label quote. NFI letter categories are kept only as secondary evidence. The remaining gaps are:
- **trimester- or gestational-week-specific rules**, for example NSAIDs late in pregnancy (prior knowledge, see Gaps);
- **"female of reproductive potential" checks** for valproate and isotretinoin when pregnancy status is unknown;
- misoprostol and MTP-kit dispensing context. Self-sourcing from chemists is documented in India.

### Cited Findings
- PLLR: final rule issued Dec 2014, effective 30 June 2015. It removed the five letter categories and requires three subsections: Pregnancy (with registry information), Lactation, and Females and Males of Reproductive Potential, each with a risk summary and data. It applies to new approvals and is phased in for older labels when they are revised — [MDedge](https://mdedge.com/content/fda-issues-new-pregnancylactation-drug-label-standards); [Pregistry](https://blog.pregistry.com/fda-pregnancy-drug-categories/); [ASCO Post 2015](https://ascopost.com/issues/july-25-2015/fdas-pregnancy-category-labeling/).
- TGA (Australia) still uses categories A, B1, B2, B3, C, D, X, and one medicine can sit in several categories by dose, route or duration. The database is searchable by name or category and updated periodically (Dec 2025, May 2026). No bulk download was found — [TGA categorisation](https://www.tga.gov.au/resources/health-professional-information-and-resources/australian-categorisation-system-prescribing-medicines-pregnancy); [TGA May 2026 update](https://www.tga.gov.au/node/561916).
- Parchi's 17 pregnancy rules cite openFDA boxed warnings or contraindications (ACE inhibitors/ARBs, methotrexate, misoprostol, isotretinoin, thalidomide, leflunomide, acitretin, ribavirin, valproate, mycophenolate, warfarin) or label text (statins, tetracyclines, fluconazole, lithium). NFI X/D groups are added from "Eka NFI MCQA (MIT)", which the repo itself labels "LLM-written questions derived from NFI 2011, so treat as secondary" — [repo pregnancy_evidence.json](../../src/engine/rules/fixtures/pregnancy_evidence.json); [repo alert_rules.json](../../public/data/alert_rules.json).
- Misoprostol/mifepristone self-use: in a prospective study at a tertiary centre in Moradabad (120 women, 2015-16), husbands brought the pills (85%) on a chemist's advice (70%). The commonest complaint was heavy bleeding, and moderate anaemia was the commonest complication (38.3%) — [MSJ Online](https://www.msjonline.org/index.php/ijrms/article/view/972). A review describes chemist- or vendor-sourced mifepristone-misoprostol without a prescription as the principal abortion method in India — [PMC7371025](https://pmc.ncbi.nlm.nih.gov/articles/PMC7371025).

### Inferences
**Check G1: females of reproductive potential.**
- Trigger: `sex: 'F'`, age 12-50 and `pregnancy` unknown, with valproate, isotretinoin, acitretin, mycophenolate, methotrexate, leflunomide, warfarin or an ACE inhibitor/ARB on the Rx.
- Output: an Inform asking "Is the customer pregnant or planning pregnancy?". This reuses the existing ask-only-when-needed mechanism. The repo may already ask for pregnancy status; if so, G1 only adds wording such as "contraception counselling (label section 8.3)".
- Inputs: sex and age, plus a one-tap pregnancy question.
- Effort: 2-3 h.
- Pitch: medium-high (valproate is widely dispensed for epilepsy and bipolar disorder in India).

**Check G2: gestational-week rules.**
- Add optional `gestational_week?: number` (additive), asked only when a drug with a week-dependent rule is on the Rx (NSAIDs in later pregnancy).
- Effort: 3 h, plus a sourced statement (FDA 2020 NSAID communication; see Gaps).
- Risk: pharmacists rarely know the week. The UI should accept "trimester 1/2/3/don't know".

**Check G3: misoprostol context.**
- An Rx line with misoprostol alone, or a mifepristone + misoprostol kit, gets a "confirm the prescriber is an MTP-registered provider/indication" Inform. The existing preg_misoprostol rule already fires when pregnancy is 'yes'.
- Effort: 1-2 h. Pitch: moderate. It is sensitive, so word it as a dispensing-compliance prompt, not a judgement.

Replacing letters entirely: keep NFI letters as secondary, but show the PLLR-style label sentence as the alert reason. The repo already stores verbatim label quotes, so this is mostly UI wording.

### Gaps
- FOGSI guidance on drugs in pregnancy was not searched. No Indian pregnancy dataset that is machine-readable was found.
- FDA Oct 2020 Drug Safety Communication on NSAIDs at about 20+ weeks (oligohydramnios, fetal renal dysfunction): prior knowledge, URL not re-verified. Also not re-verified: the MHRA valproate Pregnancy Prevention Programme, isotretinoin/iPLEDGE-style programmes, and the 2024 MHRA topiramate measures.
- The current Indian scheduling of mifepristone/misoprostol and MTP kits (Schedule H vs H1, and the MTP Act 2021 rules for who may prescribe) was not verified this session. A 2008 letter says both are Schedule H.

## Q4. Lactation: LactMed and e-Lactancia coverage, and Indian relevance

### Takeaway
LactMed (NIH/NLM) is free and offers bulk download through the NCBI LitArch Open Access subset. It is the only free lactation source with a documented bulk path. Its content is narrative, so Parchi would need a hand-curated, pharmacist-approved "avoid / caution / compatible" table for the 20-40 ingredients that matter in Indian OPD prescriptions, each citing a LactMed chapter. No categorical score should be machine-derived. The input cost is one `breastfeeding` question, asked only for women of child-bearing age when a flagged drug is present.

### Cited Findings
- LactMed is free on NCBI Bookshelf. NLM says the LitArch Open Access Subset is "the preferred access point for bulk downloading the LactMed dataset", downloading is free, and translations must carry an NLM no-liability disclaimer — [LactMed, NBK501922](https://www.ncbi.nlm.nih.gov/books/NBK501922/); [LactMed data access, NBK547437](https://www.ncbi.nlm.nih.gov/books/NBK547437/) (via search snippet; a direct fetch hit a bot check).
- data.gov lists a LactMed download URL of `https://ftp.ncbi.nlm.nih.gov/pub/litarch/90/6c/`. An older 2015-2019 release at `ftp.nlm.nih.gov/projects/lactmedlease/` is "no longer updated", and a third path (`nlmdata/.lactmedlease/`) also appears, so the listings conflict — [data.gov LactMed](https://catalog.data.gov/dataset/lactmed-drugs-and-lactation-database); [data.gov record](https://catalog.data.gov/dataset/lactmed-09a41).
- Under the PLLR, US labels now have a Lactation subsection covering drug amounts in milk and effects on the breastfed child — [MDedge](https://mdedge.com/content/fda-issues-new-pregnancylactation-drug-label-standards). openFDA, which the repo already uses, can therefore supply a label quote per ingredient.
- Codeine: the 2016 Indian report says codeine syrup brands lacked breastfeeding warnings — [Hindustan Times via PressReader](https://www.pressreader.com/india/hindustan-times-st-mumbai-ht-navi-mumbai-live/20160424/281483570566365).

### Inferences
**Check L1: lactation flag.**
- Add additive `breastfeeding?: 'yes'|'no'|'unknown'` and a `lactation_rules` block shaped like `pregnancy_rules` (ingredients/classes, evidence quote from a LactMed chapter or label 8.2, `pharmacist_approved: false`).
- Candidates (prior knowledge, verify each against LactMed): codeine and tramadol (ultra-rapid metaboliser risk in the infant), and domperidone and metoclopramide (sometimes used as galactagogues in India, a counselling point). Others: amiodarone, lithium, methotrexate and other antineoplastics, ergot alkaloids such as methylergometrine (often prescribed postpartum in India), high-dose aspirin, isotretinoin and retinoids, and combined oestrogen contraceptives in early lactation.
- Ask rule: only when sex is F, age is 15-50 and a lactation-flagged drug is on the Rx.
- Effort: about 1 day to curate 20-30 entries with chapter quotes, plus 3 h engine work. A full LactMed ingest takes weeks and is not advisable, because the content is narrative.
- Pitch: medium. Postpartum prescriptions (methylergometrine, analgesics, antibiotics) are common at Indian pharmacies, and the check is cheap to explain.
- Risk: over-alerting. Most drugs are compatible, so only "avoid" and a small "caution" list should alert, and "compatible" should never be shown as a green tick.

### Gaps
- The LactMed bulk file format (XML/NXML vs PDF) and licence text were not confirmed; the direct NCBI fetch was blocked by a bot check. Verify by listing the litarch directory.
- e-Lactancia (APILAM, Spain) was not researched. Prior knowledge, unverified: it is free online with a 4-level risk scale but has no documented open data licence or API. Confirm before citing.
- No Indian data were found on how often lactating customers are dispensed lactation-incompatible drugs.

## Q5. Older adults beyond Beers: STOPP/START v3, Indian criteria, anticholinergic and fall-risk stacking

### Takeaway
STOPP/START v3 (2023, 190 criteria) is the natural next layer after Beers. Many STOPP items map onto rule shapes Parchi already has (`patient_rules`, `stack_rules`, `burden_scales`, kidney bands). START items mostly need diagnoses, which Parchi does not collect, so they are out of scope. No Indian consensus PIM list was found: Indian studies apply Beers, STOPP/START, PRISCUS, EU(7)-PIM and FORTA, and these disagree. STOPPFall (2021) gives a consensus FRID list that can be added as a `burden_scales` "fall-risk count" with no new patient input.

### Cited Findings
- STOPP/START v3 (O'Mahony et al., Eur Geriatr Med 2023;14(4):625-632) has 190 criteria: 133 STOPP and 57 START. Version 2 had 114 (80 + 34) — [Correction, PMC10447589](https://pmc.ncbi.nlm.nih.gov/articles/PMC10447589); [PSNet summary](https://psnet.ahrq.gov/issue/stoppstart-criteria-potentially-inappropriate-prescribing-older-people-version-3).
- India: a Tata Memorial study of older cancer patients compared Beers 2015, STOPP/START v2, PRISCUS 2010, FORTA 2018 and EU(7)-PIM 2015, and found the tools "sometimes do not concur with each other" — [Cancer Medicine 2024, PMC10807583](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807583/). AIIMS New Delhi used Beers 2015 — [Aging Medicine 2022](https://doaj.org/article/e5ca63e5276a4cd48927bed7013ecc2c). A 2025 scoping-review protocol sets out to evaluate deprescribing tools for applicability to Indian elderly patients, so the question is still open — [Systematic Reviews 2025](https://systematicreviewsjournal.biomedcentral.com/articles/10.1186/s13643-025-02884-2/tables/3).
- STOPPFall (Seppala et al., Age Ageing 2021;50(4):1189-1199) came from a EuGMS Delphi of 24 experts over 3 rounds with a 70% consensus threshold. It identified 18 differences in fall risk between pharmacological subclasses and comes with a deprescribing tool. Its effect on falls is not yet proven in trials — [PMC8244563](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244563); [BGS](https://www.bgs.org.uk/stoppfall-a-delphi-study-by-the-eugms-task-and-finish-group-on-fall-risk-increasing-drugs).
- Parchi already has Beers rules (sedating antihistamines, benzodiazepines, Z-drugs, ketorolac, tricyclics, glibenclamide/glimepiride, muscle relaxants, metoclopramide) at 65+, an anticholinergic burden score table, and CNS stacking (3+ CNS-active drugs) — [repo alert_rules.json](../../public/data/alert_rules.json).

### Inferences
**Check E1: a STOPP v3 subset (drug-only items).** Pick about 10-15 STOPP criteria that need only drugs, age and CrCl. Examples, all to be checked against the v3 appendix:
- PPI at full dose for more than 8 weeks. Needs the Phase 2 history duration, which already exists.
- NSAID with an anticoagulant (already present as a stack rule).
- Two or more drugs of the same class (already present).
- Drugs with a CrCl threshold (already partly covered by kidney bands).
- Benzodiazepine for 4 weeks or more (needs duration, which history provides).
- Opioid without a laxative. This is a START-like "missing drug" check; it is feasible because it needs only the Rx.

Effort: 1 day for 10-15 rules with appendix citations; each fits existing shapes. Pitch: medium. Beers is already shown, so judges may see v3 as incremental. "Duration-aware" rules (PPI for more than 8 weeks across refills) show off Phase 2 history well.

**Check E2: fall-risk (FRID) stacking.**
- Add a `burden_scales` entry "fall-risk medicines" using STOPPFall classes: benzodiazepines, Z-drugs, antipsychotics, antidepressants, opioids, antiepileptics, alpha-blockers for BPH, centrally acting antihypertensives, sedating antihistamines, loop diuretics and others to confirm against the paper.
- Threshold: 2 or more FRIDs at 65+ gives an Inform. The threshold is a pharmacist decision and must not be invented.
- No new input. Effort: 2-3 h. Pitch: medium-high (falls and hip fracture are intuitive to judges).

**Check E3: Indian context.** Domperidone (already 65+), chlorzoxazone FDCs and nimesulide in the elderly (the ICMR recommendation for over 60, see Q1) are India-specific additions that Beers does not cover.

### Gaps
- The full STOPP v3 appendix was not opened, so criterion wording and numbers must be read from the supplement before encoding.
- No Indian consensus PIM list (for example a "2018 Indian consensus" or PRISCUS-like list) was found in this session. The search returned only applications of Western tools. Treat any claimed Indian list as unverified until a citation is found.
- The anticholinergic scale in the repo was not compared with ACB 2012 updates, the Anticholinergic Drug Scale, CRIDECO or the 2022/2023 ACB revisions (not searched).

## Q6. Hepatic impairment: Child-Pugh, paracetamol with alcohol, hepatotoxic stacking (anti-TB), LiverTox

### Takeaway
The highest-value hepatic check for India needs **no patient input**: a hepatotoxic-stack rule that fires when isoniazid/rifampicin/pyrazinamide (anti-TB therapy, ATT) is co-dispensed with another known hepatotoxin (for example high-dose paracetamol, nimesulide, azoles, methotrexate, valproate or alcohol-flagged patients). LiverTox is free and its Master List spreadsheet, with likelihood scores A-E, is uncopyrighted and updated yearly. It is the citable source for "known hepatotoxin" tags. Child-Pugh-based dose adjustment needs LFTs and clinical grading that pharmacists rarely have. Keep it to an optional `liver_disease` severity, already partly present.

### Cited Findings
- LiverTox (NIH/NIDDK, NCBI Bookshelf) scores drugs on a likelihood scale. A: well known and well described, more than 50 cases. B: highly likely, 12-50 cases. C: probable, fewer than 12 cases. D: possible, rare. E: unlikely, with E* for unproven but suspected. The scale is less accurate for new or little-used drugs and herbals — [LiverTox likelihood scale, NBK548392](https://www.ncbi.nlm.nih.gov/books/NBK548392/).
- The LiverTox Master List is an Excel file of all agents with the likelihood score, last update, year approved and agent type. It is "not copyrighted", may be used in analyses and is updated yearly — [LiverTox Master List, NBK571102](https://www.ncbi.nlm.nih.gov/books/NBK571102/).
- Anti-TB drug-induced liver injury (DILI) in India:
  - Belgaum (Karnataka), a prospective nested case-control study: 150 DILI cases in a cohort of 3,900 patients on ATT, a prevalence of 3.8%, using ATS criteria (ALT/AST over 5× ULN, bilirubin over 1.5 mg/dL, or any rise with symptoms, viral hepatitis excluded). Independent risk factors were female sex, prior hepatitis, **alcohol**, hypoalbuminaemia, **age over 60** and extensive disease — [Gaude et al., J Family Med Prim Care 2015;4(2):238](https://pmc.ncbi.nlm.nih.gov/articles/PMC4408708/).
  - South India, 5 years: 24 of 253 patients (9.48%) developed DILI, with no significant association for alcohol, HBV, HCV or HIV — [PubMed 27056794](https://pubmed.ncbi.nlm.nih.gov/27056794/). Alcohol is therefore a risk factor in some Indian cohorts but not all.
  - AIIMS New Delhi case-control: cases had higher alcohol intake, more extensive disease and more slow acetylators — [Thorax 1996;51:132](https://thorax.bmj.com/content/51/2/132).
- In Parchi, `liver_disease` and `heavy_alcohol_use` already lower the paracetamol limit, but this part is outside the signed-off scope — [repo contracts.ts](../../src/engine/contracts.ts); [repo limits.json](../../src/engine/limits/limits.json).
- In the herbal module, a 2022 Indian giloy (Tinospora) liver-injury series is noted as one of the strongest India-relevant items — [repo docs/track-b-dose.md](../../docs/track-b-dose.md).

### Inferences
**Check H1: hepatotoxic stacking.**
- Add a `stack_rules` entry "Several liver-toxic medicines": group 1 = ATT ingredients (isoniazid, rifampicin, pyrazinamide; FDC brands such as AKT-4/Forecox resolve through Track A); group 2 = other LiverTox category A/B ingredients on the Rx.
- Escalate to Interrupt when `heavy_alcohol_use` or `liver_disease` is true, or age is 60 or more (the Gaude risk factors). Otherwise Inform.
- Tag the ingredients with a `hepatotoxic_likelihood` field taken from the LiverTox Master List. This is a one-off import of an uncopyrighted spreadsheet into Track A's ingredient table with `source: "LiverTox Master List <year>"`.
- Effort: about 1 day (spreadsheet import and mapping to canonical IDs for perhaps 150 overlapping ingredients, plus the rule and tests). Pitch: high for India (TB burden, NTEP), and it needs no extra pharmacist input.
- Risk: likelihood A/B means "can cause DILI", not "dangerous in combination". Word it as "two or more medicines known to cause liver injury; consider LFT monitoring per prescriber". Herbals such as giloy could link to the existing herbal module.

**Check H2: paracetamol with alcohol or liver disease.** This already exists. Only sign-off and an Indian source are needed: pharmacist time, no build.

**Check H3: Child-Pugh dose bands.**
- Add optional `child_pugh?: 'A'|'B'|'C'` and per-drug `hepatic` bands in `limits.json`, mirroring kidney bands.
- Inputs are hard to get: Child-Pugh needs bilirubin, albumin, INR, ascites and encephalopathy grading, which an e-pharmacy pharmacist will not have. Ask only "known liver disease: mild / moderate-severe / don't know".
- Effort: 2 h of schema work, but data curation per drug from labels takes weeks.
- Recommendation: defer. Pitch value is low relative to cost.

### Gaps
- Not checked this session: whether LiverTox covers nimesulide (not US-marketed) and Indian-only FDC ingredients such as aceclofenac and chlorzoxazone FDCs. Gaps in LiverTox for India-only drugs would need another source.
- The current NTEP (India) guidance on ATT hepatotoxicity monitoring and reintroduction was not retrieved.
- No source was found on how often Indian pharmacies co-dispense ATT with other hepatotoxins.
- LiverTox bulk PDF/FTP download is mentioned only by a third-party blog and was not verified.

## Q7. Data sources (free/machine-readable vs commercial) and the cost of capturing patient inputs

### Takeaway
Free and usable now:
- openFDA/DailyMed labels, already used for pregnancy and limits;
- LiverTox Master List (Excel, uncopyrighted);
- LactMed (free bulk via LitArch, format to verify);
- CDSCO/gazette notifications (PDFs, hand-encoded);
- STOPP/START v3 and STOPPFall (open-access papers, hand-encoded).

Readable but not licensable as data: IAP Drug Formulary (free app), Kinderformularium (free web), TGA pregnancy database (web search only), e-Lactancia. Commercial: BNF/BNFc, Lexicomp, Micromedex.

Input cost ranks as follows:
- Free, already captured: age and sex.
- Already asked only when needed: weight.
- Cheap: pregnancy (already asked) and breastfeeding (one tap).
- Moderate: gestational week or trimester.
- Expensive and rarely available: height, LFTs/Child-Pugh.

### Cited Findings
- LactMed is free with bulk access via LitArch — [NBK501922](https://www.ncbi.nlm.nih.gov/books/NBK501922/); [data.gov](https://catalog.data.gov/dataset/lactmed-drugs-and-lactation-database).
- The LiverTox Master List is uncopyrighted Excel, updated yearly — [NBK571102](https://www.ncbi.nlm.nih.gov/books/NBK571102/).
- The TGA pregnancy database is searchable online, and no bulk download was found — [TGA](https://www.tga.gov.au/resources/health-professional-information-and-resources/australian-categorisation-system-prescribing-medicines-pregnancy).
- The IAP Drug Formulary is a free app with no data licence found — [App Store](https://apps.apple.com/dk/app/iapdf/id591789800).
- Kinderformularium.de is free for professionals, and no open-data licence was found — [Pharmazeutische Zeitung](https://www.pharmazeutische-zeitung.de/grosse-datenbank-fuer-kleine-patienten-133019/).
- The repo reads openFDA's drug label API (`api.fda.gov/drug/label.json`) for verbatim quotes — [repo pregnancy_evidence.json](../../src/engine/rules/fixtures/pregnancy_evidence.json).
- Bedside Schwartz needs height plus an IDMS-traceable creatinine — [PubMed 19158356](https://pubmed.ncbi.nlm.nih.gov/19158356/); [NCT05915026 protocol](https://cdn.clinicaltrials.gov/large-docs/26/NCT05915026/Prot_000.pdf).

### Inferences
Capture rule, consistent with Parchi's "ask only when needed" design. Each new question appears only when a drug on the current Rx (or the overlapping history) needs it:

| Input | New field? | Asked when | Annoyance |
|---|---|---|---|
| age in months (under 2) | no (`age_years` fractional) | always, for any child; the UI accepts months | none |
| weight | no | child plus a weight-dosed drug (exists) | low |
| pregnancy | no | women 12-50 plus a pregnancy-rule drug (exists) | low |
| breastfeeding | yes (`breastfeeding`) | women 15-50 plus a lactation-rule drug | low |
| trimester / gestational week | yes | pregnancy 'yes' plus a week-dependent rule | medium |
| height | yes (`height_cm`) | child plus a kidney-band drug plus creatinine known | medium-high |
| liver disease severity | extend `liver_disease` | hepatic-band drug (deferred) | medium |
| LFTs / Child-Pugh | not recommended | none | high |

FHIR/ABDM imports may already carry weight, height and pregnancy observations (Track C FHIR import handles weight). Pulling height from an ABDM bundle would remove the manual ask. This is unverified for Indian ABDM payloads.

### Gaps
- Not checked: the licence terms (attribution, redistribution inside an offline PWA bundle) for LactMed and LiverTox derivatives. NLM content is generally public domain, but the specific terms pages were not opened.
- e-Lactancia, SwissPedDose and the WHO children's formulary were not checked for data access.

## Q8. Ranking: which special-population checks most strengthen Parchi (per-check summary)

### Takeaway
Order by pitch value per hackathon hour:
1. **P1 paediatric age gates.** Cough/cold under 2 and under 5 (DGHS 2025), CPM+PE under 4 (S.O. 4595(E) 2026), promethazine under 2, codeine under 12, tetracyclines under 8. About 4-6 h, no new input, the strongest India story.
2. **H1 hepatotoxic stacking with ATT** using LiverTox tags. About 1 day, no new input, India-specific.
3. **P3 paediatric mg/kg for 9 OPD drugs** plus banded limits. 1-2 days, weight capture already exists.
4. **E2 fall-risk stacking (STOPPFall)** and a small **STOPP v3** subset. About 0.5-1 day, no new input.
5. **G1 reproductive-potential prompt** for valproate and isotretinoin. 2-3 h.
6. **L1 lactation flag** with a curated LactMed-cited list. About 1.5 days, one new tap.
7. Deferred: P4 Schwartz paediatric kidney checks (height) and H3 Child-Pugh bands. Low OPD yield, high input cost, and they need pharmacist-built tables.

### Cited Findings
- Paediatric regulatory basis: [DGHS advisory coverage](https://thesouthfirst.com/news/child-deaths-no-cough-cold-medicines-for-children-below-2-years-says-health-advisory/); [S.O. 4595(E)](https://medicaldialogues.in/news/industry/pharma/health-ministry-restricts-chlorpheniramine-phenylephrine-fdcs-for-children-below-4-mandates-warning-labels-177776); [CDSCO Dec 2023](https://thewire.in/health/cdsco-says-anti-cold-fdc-not-to-be-used-in-children-below-4); [Coldrif DEG 48.6%](https://www.chemistryworld.com/news/23-indian-childrens-deaths-linked-to-contaminated-cough-syrup/4022312.article).
- Hepatic basis: [Gaude 2015, 3.8% DILI, alcohol and age over 60 as risk factors](https://pmc.ncbi.nlm.nih.gov/articles/PMC4408708/); [LiverTox Master List](https://www.ncbi.nlm.nih.gov/books/NBK571102/).
- Geriatric basis: [STOPP/START v3, 190 criteria](https://pmc.ncbi.nlm.nih.gov/articles/PMC10447589); [STOPPFall](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244563).
- Paediatric strength confusion: [Gitanjali 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3157121); [Indian Pediatr 2014](https://www.indianpediatrics.net/oct2014/oct-839.htm).

### Inferences
- Shared risks:
  - Every new rule must ship `pharmacist_approved: false` with a verbatim source.
  - Advisory-based rules (DGHS) must be worded as advice, not law.
  - Class tagging completeness (Track A) decides whether age gates actually fire on Indian cough/cold FDC brands. A test that sweeps every brand with an antitussive, decongestant or first-generation antihistamine class for a 1-year-old would make that measurable, mirroring the existing `sweep.test.ts` approach.
- Fixture work: add a paediatric case to `tests/fixtures/` (additive) covering a 14-month-old with a CPM+PE drop, a promethazine syrup and paracetamol drops dosed in syrup-like mL. It would exercise P1, P2 and the mg/kg ledger in one demo.
- Demo line for judges: "After two dozen children died in Chhindwara in 2025, the Ministry told every pharmacy not to dispense cough and cold medicines to children under two. Parchi checks that on every line, offline, with the notification number on the alert."

### Gaps
- Effort estimates are the researcher's judgement from the repo's data shapes, not measured.
- How often these populations appear in e-pharmacy order streams (share of paediatric, pregnant, lactating, 65+ and ATT orders) is unknown. No Indian e-pharmacy data were found. This limits any claim about alert volume.
