# AYUSH (Ayurveda, Siddha, Unani, Homeopathy, Sowa-Rigpa): which checks Parchi should add, the data behind them, and how to word them (as of 25 Oct 2026)

Scope note: the starting point is `src/engine/herbal/herbal.json`. It already has 15 herbs, 2 formulations (triphala, trikatu), 1 ambiguous name (brahmi), a `bhasma` keyword flag, and 12 rules: liquorice potassium/BP, guggul with propranolol/diltiazem, piperine levels, blood-sugar herbs, four ashwagandha rules, giloy liver, bleeding herbs and herbo-mineral metals. All are `pharmacist_approved: false`. Rule shape: `with: {ingredients, classes}`. The grades are `established` (tier inform) and `limited` (tier silent). There is no dose gating and no patient context (liver disease, CKD, age, pregnancy). Everything below either extends that file or flags gaps in it.

Three findings matter most:
1. **Schedule E(1) changed six weeks ago.** On 15 Sep 2026 Ayush replaced the list of poisonous substances (G.S.R. 862(E)), and the new list adds a catch-all for anything containing arsenic or mercury.
2. **AYUSH use is mainstream.** About half of Indians used AYUSH in the past year.
3. **The two largest Indian herb liver-injury signals (giloy, ashwagandha) come from Indian multicentre and single-centre series**, and the government disputes them.

---

## 1. Usage evidence: how many Indians combine AYUSH with allopathic drugs, and how big is AYUSH retail?

### Takeaway
About half of India used AYUSH in the last year (NSS 79th round, 2022-23), Ayurveda most of all. In NCD clinics, roughly half of patients use CAM alongside allopathic drugs, highest in diabetes. So AYUSH items will turn up in a real pharmacist's queue. Good figures on AYUSH sales through e-pharmacies do not exist; market-size estimates disagree by more than 10x.

### Cited Findings
- First all-India NSSO AYUSH survey (79th round, Jul 2022 to Jun 2023, 1,81,298 households): 46.3% of rural and 52.9% of urban persons used AYUSH for prevention or treatment in the last 365 days. Ayurveda alone: 40.5% rural, 45.5% urban. All other systems (Yoga & Naturopathy, Unani, Siddha, Sowa-Rigpa, Homoeopathy) combined: 9.4% rural, 12.8% urban — [MoSPI Press Note, 13 Jun 2024](https://mospi.gov.in/sites/default/files/press_release/PressNote_Ayush_13062024N.pdf) (PDF text extracted directly)
- Same survey: about 95% of rural and 96% of urban respondents are aware of AYUSH. "Ayush is predominantly used for rejuvenation and preventive measures" more than for treatment. Average spend per user in 365 days was Rs 472 (rural) and Rs 574 (urban) — [MoSPI Press Note](https://mospi.gov.in/sites/default/files/press_release/PressNote_Ayush_13062024N.pdf); [MoSPI Fact sheet](https://mospi.gov.in/sites/default/files/publication_reports/Fact_sheet-Survey_on-Ayush.pdf)
- The usage definition counts treatment "anytime with or without prescription". Self-medication is therefore included — [MoSPI Press Note](https://mospi.gov.in/sites/default/files/press_release/PressNote_Ayush_13062024N.pdf)
- A different measure gives much lower numbers. Among outpatients who sought treatment for an ailment in the last 15 days, AYUSH's share fell from 6.43% (NSS 71st round, 2014) to 4.54% (75th round, 2017-18) — [NCAER authors in ThePrint](https://theprint.in/opinion/ayush-medicine-usage-declining-nss-data-shows-integrate-with-allopathy-for-better-reach/1368506/)
- Concurrent use in NCD patients (Uttarakhand urban health centre, 2018, n=233; Nailwal et al., J Public Health Res 2021) — [PMC7941049](https://pmc.ncbi.nlm.nih.gov/articles/PMC7941049):
  - 49.8% used both allopathic and alternative treatment, 3.4% used CAM only, and 29.8% used Indian/Ayurvedic medicine.
  - "Both" by condition: diabetes 55.0% (n=109), hypertension 42.2% (n=102), cardiovascular disease 43.3% (n=30), chronic lung disease 55.0% (n=20).
- Doctors' side (77 allopathic doctors, Mumbai, Ojha et al., Int J Gen Med 2020): 68% had never recommended AYUSH as an add-on for diabetes, and 52% had safety concerns. The paper's text and tables are internally inconsistent on some effectiveness figures — [PMC6968815](https://pmc.ncbi.nlm.nih.gov/articles/PMC6968815)
- CKD: in a Telangana study of CKD of unknown cause (Indian J Nephrol), 40% had used unprescribed alternative herbal "medicines" — [The South First](https://thesouthfirst.com/health/kidney-disease-mystery-in-telangana-solved-culprit-is-unprescribed-alternative-herbal-medicines). A Mangalore nephrology study (Saudi J Kidney Dis Transpl 2019) says Ayurvedic CAM use in CKD is "widespread" but prevalence data are lacking — [DOAJ](https://doaj.org/article/ccc8682c5f0e47e2bd25acd2acadf9f6)
- Liver injury burden: in India's prospective INDILI registry (Devarbhavi et al., J Clin Exp Hepatol 2021, n=1,288 idiosyncratic DILI), complementary and alternative medicines were the second most common cause at 13.9%, after anti-TB drugs (46.4%). Mortality was 13.6% in the CAM group against 12% for prescription drugs — [PMC8103312](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103312/)
- Market size estimates, all from paid market-research firms and in sharp disagreement:
  - IMARC: Indian Ayurvedic products market INR 1,017.51 billion in 2025, about 15.5% CAGR to 2034 — [IMARC](https://imarcgroup.com/india-ayurvedic-products-market)
  - ReportCubes: USD 4.56 billion in 2025, with the online channel at "nearly 38%" share — [ReportCubes](https://www.thereportcubes.com/public/report-store/ayurvedic-products-market-india)
  - Ken Research: AYUSH/herbal exports of USD 689 million in 2024-25, with the US the largest destination — [Ken Research](https://www.kenresearch.com/healthcare/skin-and-personal-care-industry/india-alternative-medicine-herbal-market-research-report/592-91.html)
- Major players named repeatedly: Dabur, Patanjali, Himalaya Wellness, Emami, Shree Baidyanath — [IMARC](https://imarcgroup.com/india-ayurvedic-medicine-market)
- Major Indian e-pharmacies list proprietary Ayurvedic products in their OTC catalogues, for example Himalaya Diabecon on 1mg ([1mg](https://csc.1mg.com/otc/himalaya-diabecon-tablet-otc64086)), Apollo ([Apollo Pharmacy](https://www.apollopharmacy.in/ta/otc/himalaya-diabecon-ds-tablet-60-s)) and PharmEasy ([PharmEasy](https://pharmeasy.in/online-medicine-order/himalaya-diabecon-ds-tablets-60-s-43386))

### Inferences
- Pitch line, with the denominator stated: "About half of Indians used AYUSH last year (NSSO 2022-23). In NCD clinics, about half of diabetics take CAM alongside their tablets. CAM is India's #2 cause of drug-induced liver injury."
- Because e-pharmacies sell Diabecon, Liv.52 and similar items as OTC lines, they can sit in the same cart as metformin. That is exactly the "cart line" input Parchi already takes, so no new input channel is needed.
- "Rejuvenation/preventive" use (Chyawanprash, ashwagandha, giloy) means many AYUSH items are not linked to a diagnosis. A rule should therefore fire on the ingredient, not on an inferred indication.

### Gaps
- No nationally representative figure for concurrent AYUSH plus allopathic use. NSSO measured use, not co-use with prescription drugs.
- A population-based Chennai study (CURES-80) reportedly found only about 2.7% of medicated diabetics using Indian systems or homeopathy. A hospital study reportedly found 63% CAM use in diabetes, with only 29% of physicians aware of it. Both appeared only in search snippets and were not opened; attribution is unverified.
- Not found: Indian data on concurrent use in cancer, or company-level revenue by e-pharmacy channel (needs Dabur/Emami annual reports, or Himalaya/Patanjali filings, which are mostly private).
- Expert Market Research's figure (USD 847.3M for 2024) appeared in a snippet with unclear URL attribution and is not used.

---

## 2. Proprietary Ayurvedic brand compositions: where can machine-readable ingredient lists be found?

### Takeaway
There is no public, machine-readable, licence-clear dataset of brand-name Ayurvedic product compositions. Compositions must be transcribed by hand from labels, and they vary by market and variant (e.g. "DS"). Even this small sample shows why it matters:
- Septilin contains giloy and liquorice.
- Diabecon contains gymnema plus zinc, tin and mica bhasmas.
- Liv.52 contains an iron bhasma, Mandur.

So brand lookup would make the existing rules fire on real products, and would also expose false positives from the current "bhasma" keyword.

### Cited Findings
- **Liv.52** (EU label), per tablet: Capparis spinosa 65 mg, Cichorium intybus 65 mg, Solanum nigrum 32 mg, Terminalia arjuna 32 mg, Cassia occidentalis 16 mg, Achillea millefolium 16 mg, Tamarix gallica 16 mg, and Mandur bhasma 33 mg (contains 3 mg iron) — [doz.pl label](https://www.doz.pl/apteka/p7187-Liv_52_tabletki_100_szt.); the same figures per 3 tablets are at [vitaminstore.nl](https://www.vitaminstore.nl/en/product/himalaya-liv-52-tablets-241011). Liv.52 DS is a different formulation: Capparis 260/520 mg and Mandur bhasma 132/264 mg per 2/4 tablets — [shop-apotheke](https://www.shop-apotheke.com/arzneimittel/upmGGRKLX/himalaya-liv-52-ds.htm)
- **Septilin** (EU retailer), per tablet: purified guggulu (Commiphora mukul) 162 mg, Maharasnadi quath 65 mg, Guduchi (Tinospora cordifolia) 49 mg, Rubia cordifolia 32 mg, Shankh bhasma (conch-shell calx) 32 mg, amla 16 mg, Moringa 16 mg, liquorice 6 mg — [vitaminstore.nl](https://www.vitaminstore.nl/en/product/himalaya-septilin-tablets-141574)
- **Cystone** (Romanian label), per tablet: Didymocarpus pedicellata 130 mg, Saxifraga ligulata 98 mg, Rubia cordifolia, Cyperus scariosus, Achyranthes aspera, Onosma bracteatum and Vernonia cinerea at 32 mg each, Hajrul yahood bhasma 32 mg, Shilajeet 26 mg. A US retailer lists different main ingredients — [catena.ro](https://www.catena.ro/cystone-x-60-tablete)
- **Diabecon**:
  - The Indian 1mg listing names the ingredients without weights: Meshashringi (Gymnema), Asana (Pterocarpus marsupium), purified Shilajeet, Guggulu, Trikatu, plus Abhraka bhasma, Pravala bhasma, Vanga bhasma, Yashad bhasma and Akik pishti. Dose: 1 tablet twice daily — [1mg](https://csc.1mg.com/otc/himalaya-diabecon-tablet-otc64086)
  - The Romanian label gives mg (Shilajeet 30, Gymnema 30, Pterocarpus 20, Commiphora mukul 30 mg, ...) and lists no bhasma — [catena.ro](https://www.catena.ro/diabecon-60-comprimate-himalaya)
  - Diabecon DS descriptions differ between retailers. Apollo mentions Guduchi, Shilajeet, Karela, Meshashringi and Pitasara — [Apollo](https://www.apollopharmacy.in/ta/otc/himalaya-diabecon-ds-tablet-60-s); [PharmEasy](https://pharmeasy.in/online-medicine-order/himalaya-diabecon-ds-tablets-60-s-43386)
- **e-AUSHADHI** (Ministry of AYUSH, launched Feb 2019, e-aushadhi.gov.in) is a licensing portal. It promised "real-time information" on licensed manufacturers and their products, cancelled and spurious drugs. No source describes a public composition search or bulk export — [Medical Dialogues](https://business.medicaldialogues.in/ayush-ministry-launches-e-aushadhi-portal-for-online-licensing-of-drugs); [BIMSTEC 2023 report](https://tpd.dtam.moph.go.th/wp-content/uploads/e-book/EB-BIMSTEC-2023/files/basic-html/page61.html)
- **DRAVYA** (CCRAS) is a searchable portal of medicinal substances used across AYUSH systems. It covers ingredients, not licensed products — [Rau's IAS summary](https://compass.rauias.com/current-affairs/dravya-portal/)
- **IMPPAT 2.0** (IMSc Chennai) covers 4,010 Indian medicinal plants, 17,967 phytochemicals, 1,095 therapeutic uses and 1,133 traditional Indian medicinal formulations. The site footer licence is CC BY-NC 4.0 — [IMPPAT 2.0 preprint](https://www.biorxiv.org/content/10.1101/2022.06.17.496609.full.pdf); [IMPPAT 1 paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5847565/); [IMPPAT site](https://cb.imsc.res.in/imppat/)

### Inferences
- **Proposed feature: `brands` table** (or reuse the existing `formulations` map, whose `herbs[]` expansion already does the work).
  - **Fields:** `aliases` ("liv 52", "liv.52", "septilin", "diabecon", "diabecon ds", "cystone"), `herbs[]`, `minerals[]` (bhasma id + metal), `mg_per_unit` (optional), `label_market: "IN"`, `variant`, `source_url`, `checked_on`, `pharmacist_approved`.
  - **What it would do:** Septilin would expand to guggul + giloy + liquorice + amla, so `giloy_liver` and the two liquorice rules would fire. Diabecon would expand to gymnema + guggul + black/long pepper via trikatu (+ karela + giloy for DS), so `blood_sugar_herbs`, `piperine_levels` and `giloy_liver` would fire.
  - **Effort:** 4-6 h for about 10 top brands transcribed from Indian e-pharmacy and brand-site labels, plus tests. Months for broad coverage; there is no bulk source.
  - **Risk:**
    - Compositions differ between EU and Indian labels and between variants (DS), so storing the wrong one could miss an interaction or create a false one.
    - Retailer pages go stale.
    - Encoding Liv.52 as "contains bhasma" would trip the existing heavy-metal note on an iron calx.
    - Mitigate with Indian labels only, a `checked_on` date, and keeping variants separate.
  - **Pitch value:** very high. Demo cart: Glycomet (metformin) + Amaryl (glimepiride) + Diabecon DS. Parchi notes additive low-sugar risk (limited evidence) and giloy liver reports, each with its source and grade, all offline.
- Dose context matters. Septilin's liquorice is 6 mg per tablet, a tiny root amount, so `liquorice_potassium` firing on it at grade "established" would overstate the risk. Brand-derived matches therefore need either dose gating or a caveat: "present in small amount; product-level evidence not assessed".
- IMPPAT's 1,133 formulations could seed classical formulation compositions such as Mahasudarshan churna and Chyawanprash. They are plant-level only, and the NC licence blocks commercial (B2B pharmacy-chain) use without permission.

### Gaps
- Not found: machine-readable Ayurvedic Pharmacopoeia of India (API) or Ayurvedic Formulary of India (AFI) texts, or their licence. TKDL access terms in 2026 (historically restricted to patent offices) were not checked.
- Indian-label compositions with mg for Liv.52, Septilin, Cystone and Diabecon were not confirmed from Himalaya India's own site. The mg values above are from EU labels.
- Not researched: compositions of Chyawanprash (Dabur), Arogyavardhini, Mahasudarshan, Patanjali Giloy/Ashwagandha tablets, and Baidyanath and Kerala Ayurveda products. Arogyavardhini is a classical rasa formulation whose metal ingredients must be checked against AFI before encoding.
- The repo's `giloy_liver` source URL is PMC9348287, but the Kulkarni et al. 2022 paper resolves to PMC9134809 (verified, see §3). Check whether PMC9348287 is the same paper or a letter.

---

## 3. Highest-evidence herb-drug interactions and safety signals relevant to Indian patients

### Takeaway
The strongest additions, all with a regulator monograph or Indian clinical data:
1. **Senna** with digoxin, diuretics, corticosteroids, QT drugs (EMA monograph).
2. **Isabgol (ispaghula)** absorption and timing interactions (EMA monograph). Very common in India.
3. **Upgraded liver signals** for ashwagandha (Indian case series) and giloy (Indian 13-centre series), plus a turmeric/curcumin liver note (US DILIN, HLA-linked).
4. **Shankhpushpi with phenytoin**: an Indian-discovered interaction, evidence limited.

Most other herb-drug pairs remain "limited" and should stay silent notes.

### Cited Findings
**Giloy (Tinospora cordifolia)**
- Kulkarni et al., Hepatol Commun 2022;6(6):1289-1300, "Tinospora Cordifolia (Giloy)-Induced Liver Injury During the COVID-19 Pandemic: Multicenter Nationwide Study From India". 43 patients from 13 centres at 9 locations — [PMC9134809](https://pmc.ncbi.nlm.nih.gov/articles/PMC9134809/):
  - Median latency 46 days (IQR 21-106).
  - RUCAM causality probable in 67.4%, possible in 32.6%.
  - ANA positive in 41.9%. Biopsies showed herb-induced injury with autoimmune features; none met criteria for definite autoimmune hepatitis.
  - 4 deaths (9.3%), all with acute worsening of chronic liver disease; 2 transplants.
  - Heavy metals exceeded limits in 2 of 6 analysed products.
- A letter in the same journal criticised it as a retrospective, insufficiently designed study with questionable patient selection — [Hepatol Commun letter, doi 10.1002/hep4.1986](https://doi.org/10.1002/hep4.1986)
- The Ministry of AYUSH called the earlier Jaslok (Mumbai, 6-case) report "misleading" (Jul 2021). After the 2022 study it said guduchi "is safe" while stressing dosing. It also warned that look-alike Tinospora crispa may be confused with T. cordifolia — [Udayavani](https://udayavani.com/?p=1080118); [The Wire Science](https://science.thewire.in/?p=465583)
- A hepatologist who publicised giloy liver injury received a notice from the Kerala state council for Indian systems of medicine — [The News Minute](https://www.thenewsminute.com/article/doctor-flags-popular-herb-causing-liver-injury-gets-notice-ayush-practitioners-160634)

**Ashwagandha (Withania somnifera)**
- Liver: Philips et al., Hepatol Commun 2023 — [PubMed 37756041](https://pubmed.ncbi.nlm.nih.gov/37756041/); [PMC10531359](https://pmc.ncbi.nlm.nih.gov/articles/PMC10531359/):
  - 23 ashwagandha-associated liver injury patients (2019-2022), 8 with single-ingredient products analysed.
  - Mostly cholestatic hepatitis.
  - 5 had pre-existing chronic liver disease; 3 developed acute-on-chronic liver failure and all 3 died.
  - Product analysis found only natural phytochemicals, with no adulterants.
  - An earlier Iceland/US series reported 5 patients.
- Regulators:
  - Denmark banned ashwagandha in food supplements in 2023, after a DTU 2020 report concluded no safe lower intake limit for root or root extracts could be set — [Sagentia](https://sagentia.com/blog/navigating-ashwagandha-balancing-safety-consumer-demand-and-regulatory-concerns/); [SupplySide FAQ](https://www.supplysidesj.com/supply-chain/ashwagandha-regulation-root-leaf-faq)
  - A J Ayurveda Integr Med 2024 editorial disputes the ban — [PMC11403136](https://pmc.ncbi.nlm.nih.gov/articles/PMC11403136)
  - Ministry of AYUSH advisory (6 Oct 2021): manufacturers should not use ashwagandha leaves in any form. It was put to an expert group for re-examination in Nov 2021 — [SupplySide FAQ](https://www.supplysidesj.com/supply-chain/ashwagandha-regulation-root-leaf-faq) (per search summary)
- Thyroid: double-blind pilot RCT (Sharma et al., J Altern Complement Med 2018;24(3):243-248; Varanasi; 50 subclinical-hypothyroid patients; 600 mg/day root extract for 8 weeks). TSH, T3 and T4 moved toward normal — [PubMed 28829155](https://pubmed.ncbi.nlm.nih.gov/28829155/). This supports the existing `ashwagandha_thyroid` rule with a primary trial, not just the NIH fact sheet.

**Turmeric / curcumin**
- The US DILIN network reported 10 turmeric-associated liver injury cases: 5 hospitalised, 1 death from acute liver failure. Injury was hepatocellular with 1-4 month latency, and 7/10 carried HLA-B*35:01 (allele frequency 0.45 vs 0.056-0.069 in controls) — [LiverTox/NCBI Bookshelf NBK548561](https://www.ncbi.nlm.nih.gov/books/NBK548561/); [NutraIngredients](https://www.nutraingredients.com/Article/2022/10/24/A-rare-phenomenon-Experts-weigh-in-on-DILIN-data-linking-turmeric-supplements-to-liver-injury)
- High-bioavailability purified curcumin (with piperine or lipid nanoparticles) has been linked to cases and to an Italian hepatitis cluster — [NBK548561](https://www.ncbi.nlm.nih.gov/books/NBK548561/)

**Shankhpushpi with phenytoin (Indian discovery)**
- Dandekar et al., J Ethnopharmacol 1992: two patients lost seizure control and had lower phenytoin levels while taking the Ayurvedic syrup "Shankhapushpi" (SRC). In rats, repeated co-dosing lowered phenytoin levels and effect. The authors concluded "the clinical combination of SRC with phenytoin is not advised" — [AGRIS record](https://agris.fao.org/search/en/records/65de503b4c5aef494fdb9af2); [MeSH C079204](https://meshb.nlm.nih.gov/record/ui?ui=C079204)
- The plant identity behind "shankhpushpi" varies: Convolvulus pluricaulis, and up to four plants are sold under the name — [same AGRIS record and 1988 review summarised there](https://agris.fao.org/search/en/records/65de503b4c5aef494fdb9af2)

**Senna (sanay, sonamukhi)**
- EMA/HMPC senna monograph (superseded 2008 text, retained in the draft revision 1): hypokalaemia from long-term laxative abuse "potentiates the action of cardiac glycosides and interacts with antiarrhythmic medicinal products ... and with medicinal products inducing QT-prolongation". Use with "other medicinal products inducing hypokalaemia (e.g. diuretics, adrenocorticosteroids and liquorice root) may enhance electrolyte imbalance" — [EMA superseded senna fruit monograph](https://www.ema.europa.eu/en/documents/herbal-monograph/superseded-community-herbal-monograph-cassia-senna-l-fructus-and-cassia-angustifolia-vahl-fructus_en.pdf); [EMA draft rev 1, senna leaf](https://www.ema.europa.eu/en/documents/herbal-monograph/draft-european-union-herbal-monograph-senna-alexandrina-mill-cassia-senna-l-cassia-angustifolia-vahl-folium-revision-1_en.pdf)

**Ispaghula / isabgol (Plantago ovata)**
- EMA/HMPC community herbal monograph, EMEA/HMPC/340861/2005 (26 Oct 2006; replaced by a 2013 version not read here), section 4.5, read directly — [EMA monograph PDF](https://www.ema.europa.eu/en/documents/herbal-monograph/superseded-community-herbal-monograph-plantago-ovata-forssk-semen_en.pdf):
  - "Enteral absorption of concomitantly administered medicines such as minerals, vitamins (B12), cardiac glycosides, coumarin derivatives, carbamazepine and lithium may be delayed", so take it ½ to 1 hour apart from other medicines.
  - Insulin-dependent diabetics taking it with meals may need a lower insulin dose.
  - Use with thyroid hormones "requires medical supervision".
  - Use with peristalsis inhibitors (opioids, loperamide) only under medical supervision, because of obstruction risk.
  - Contraindicated in "diabetes mellitus, which is difficult to regulate".

**Graded evidence on interactions in general**
- A systematic review of 108 suspected herb-drug interaction cases found most "unevaluable" and only a minority well documented — [Fugh-Berman & Ernst, Br J Clin Pharmacol 2001](https://www.bps.ac.uk/publishing/our-journals/british-journal-of-clinical-pharmacology/volume-52/issue-5/herb-drug-interactions-review-and-assessment-of-r)

### Inferences
Candidate rules. Grade uses Parchi's existing scale; "NatMed-style" maps to Natural Medicines likelihood wording (§7). Effort is per rule: data + Vitest + pharmacist sign-off form.

| # | Rule id (new or changed) | Herb aliases to add | `with` | Parchi grade / NatMed-style | Source | Plug-in | Effort | Risk | Pitch |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `senna_potassium` (new herb `senna`) | senna, sanay, sana, sonamukhi, swarnapatri, sennosides (coordinate with Track A, which may already resolve "sennosides" as an allopathic ingredient) | ingredients: digoxin; classes: loop_diuretic, thiazide_diuretic, corticosteroid, antiarrhythmic, qt_prolonging; herb-herb: liquorice | established / probable, moderate | EMA senna monograph | Same shape as `liquorice_potassium`. Herb-herb pairs need a small engine change (`with.herbs`) | 1 h data; +2 h for `with.herbs` | Do NOT alias "cassia": Liv.52's Cassia occidentalis (kasamarda) is not senna. Risk is mainly long-term or abuse use | Medium: common in "churna" laxatives |
| 2 | `ispaghula_absorption` (new herb `isabgol`) | isabgol, isapgol, ispaghula, psyllium, sat isabgol, plantago | ingredients: digoxin, lithium, carbamazepine, warfarin, acenocoumarol, levothyroxine, insulin*, loperamide; classes: cardiac_glycoside, coumarin_anticoagulant, thyroid_hormone, opioid | established / likely (absorption timing), mild-moderate | EMA ispaghula monograph s4.5 | Existing shape; effect text says "space ½-1 h" | 1 h | It is a timing message, not a "don't combine"; word it as counselling. Insulin advice applies to meal co-ingestion | High: everyday Indian product, gives a concrete counselling action |
| 3 | `shankhpushpi_phenytoin` (new herb `shankhpushpi`) | shankhpushpi, shankhapushpi, shankpushpi, convolvulus pluricaulis | ingredients: phenytoin | limited / possible, high severity (seizure control) | Dandekar 1992 | Existing shape. Consider allowing the pharmacist to raise tier to inform despite limited evidence (severity) | 0.5 h | Species ambiguity; 1992 evidence (2 cases + rat). Treat like `brahmi` and note plant identity varies | High: Indian-discovered, from Indian drug-level monitoring |
| 4 | `ashwagandha_liver` (new; note-only) | (existing) | `{}`, plus optional context `liver_disease` to raise tier | limited / possible | Philips 2023; Denmark DTU 2020 via secondary | Existing note shape (like `giloy_liver`); context gating needs engine work | 0.5 h data; 3-6 h for context field | Indian AYUSH establishment disputes; word as "reports", not "toxic" | High |
| 5 | `giloy_liver` (update text + source) | add "amrita", "amritavalli", "gilo" (verify) | `{}` + context `liver_disease`/autoimmune | limited (keep) | Kulkarni 2022 PMC9134809 | Fix source URL; add the fact that deaths were confined to pre-existing chronic liver disease | 0.5 h | Ministry rebuttal; T. crispa misidentification | High |
| 6 | `turmeric_liver` (new; note-only) | (existing) + curcumin brands | `{}`; fire mainly when curcumin is a concentrated extract or combined with piperine/bioperine in one product | limited / possible | LiverTox NBK548561 (DILIN) | Needs "same product contains turmeric + black_pepper" check (both already herbs) | 1-2 h | Culinary turmeric must not trigger it: restrict to extract/capsule forms | Medium |
| 7 | `cam_hepatotoxic_cooccurrence` (new, inferred) | any herb with a liver note | classes: anti-TB (isoniazid, rifampicin, pyrazinamide), methotrexate, valproate | limited, `inferred: true` | INDILI (CAM #2 and anti-TB #1 causes of Indian DILI); no study of the combination | Existing shape with `inferred` | 1 h | No direct evidence of additive harm; keep silent | Medium-high in India (TB burden) |
| 8 | Dose gating for liquorice (change) | — | — | — | EMA liquorice monograph (threshold not verified here) | Use mg/day ledger × brand `mg_per_unit` | 4-8 h | Needs a verified glycyrrhizin threshold; root mg ≠ glycyrrhizin mg | Medium |

\* Insulin applies only to the EMA meal-timing advice.

- **Keep as is:** the existing rules on karela/gymnema/fenugreek (`blood_sugar_herbs`), bleeding herbs and piperine. The evidence has not improved enough to upgrade any of them.
- **Do not add:** "St John's wort analogues". No Indian AYUSH herb has comparable CYP3A4/P-gp induction evidence. Do not port SJW-style rules to Indian herbs without human PK data.

### Gaps
- Guggul with statins or thyroid hormone: no human interaction data found in this pass. The existing rule rests on Dalvi 1994 (propranolol/diltiazem) only.
- Jamun (Syzygium cumini) and vijaysar (Pterocarpus marsupium) as hypoglycaemic additions to `blood_sugar_herbs`: no interaction source found. Do not add without one.
- Garlic/ginger/turmeric with warfarin: no new controlled data beyond the existing PMC9586694 review.
- No ashwagandha thyrotoxicosis case report found in this pass.
- The current (2013) EMA ispaghula monograph and the final senna revision were not read. Confirm the wording has not changed before citing the 2006/2008 text in production.
- The EMA liquorice glycyrrhizin threshold for dose gating was not verified.

---

## 4. Rasa shastra / bhasma heavy metals: is a "contains bhasma/heavy-metal ingredient" flag reasonable?

### Takeaway
Yes, but the current flat keyword list is both too broad and too narrow:
- **Too broad:** it treats iron, calcium and zinc calxes (Mandur, Shankh, Yashad) like mercury preparations.
- **Too narrow:** it misses classical rasa formulations whose names carry no "bhasma/rasa" word.

The new 2026 Schedule E(1) list, with its arsenic/mercury catch-all and mandatory caution label, is the right regulatory anchor. Indian clinical data (lead poisoning presenting as abdominal pain) supports keeping the note.

### Cited Findings
- **US/online sample:** Saper et al., JAMA 2008;300(8):915-923. About 1 in 5 Ayurvedic products bought online had detectable lead, mercury or arsenic, and about 40% of rasa shastra products did — [CDC Stacks](https://stacks.cdc.gov/view/cdc/223623) (as already summarised in herbal.json)
- **Indian tertiary-centre retrospective series** (2005-2013), as reported in secondary commentary — [Edzard Ernst blog summarising the paper](https://edzardernst.com/2017/03/lead-and-arsenic-intoxications-due-to-natural-health-products/):
  - Of 786 patients tested for blood lead during workup of unexplained abdominal pain, 75 (9.5%) had levels above 25 µg/dL, and 73 of those had used Ayurvedic medicines.
  - Five products tested contained 14 to 34,950 ppm lead.
  - All 73 had anaemia and abnormal liver tests.
  - All improved within 3-4 months of stopping the medicines and chelation.
- **Case reports:**
  - Jambrulin, blood lead 102 µg/dL — [PMC3259062](https://pmc.ncbi.nlm.nih.gov/articles/PMC3259062)
  - Indian sailor, 102 µg/dL, Italy 2021 — [Ciocan et al.](https://iris.unito.it/bitstream/2318/1795300/1/Ciocan%20C%2c%202021%2c%20lead.pdf)
- **CDC:** 12 adult cases across 5 US states — [MMWR mm5326a3](https://www.cdc.gov/mmwr/preview/mmwrhtml/mm5326a3.htm). Elevated blood lead in 40% of 115 users of an Indian clinic's products — [MMWR mm6133a1](https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6133a1.htm) (the search summary misstated units as mg/dL; the threshold is µg/dL)
- **New Zealand (2024):** the National Poisons Centre alerted on a cluster of severe lead toxicity linked to Ayurvedic products. It advised asking about Ayurvedic use in patients of Indian ethnicity with unexplained colicky abdominal pain — [NZSG pharmacy FYI](https://nzsg.org.nz/news-and-events/article/bGZJTt3/fyi-pharmacy-information)
- **Giloy products** in the Kulkarni series: heavy metals above limits in 2 of 6 — [PMC9134809](https://pmc.ncbi.nlm.nih.gov/articles/PMC9134809/)
- **Limits:**
  - AYUSH permissible levels in Ayurvedic products: lead 10 ppm, mercury 1 ppm, arsenic 3 ppm — [Lok Sabha answer, 2009](https://eparlib.nic.in/bitstream/123456789/571049/1/69762.pdf)
  - AYUSH matches FAO/WHO for lead (10 µg/g), mercury (1 µg/g) and cadmium (0.3 µg/g), but sets a lower arsenic limit (3 µg/g vs 10) — [PMC8882783](https://pmc.ncbi.nlm.nih.gov/articles/PMC8882783)
  - The two sources disagree on whether the 3 ppm arsenic figure is WHO's or AYUSH's own.
- A 2020s ICP-MS study of marketed Ayurvedic **decoctions** (herbal, not bhasma) found them within Ayurvedic Pharmacopoeia limits and concluded contamination "may not be widespread as suspected" — [Amrita University](https://www.amrita.edu/publication/evaluation-of-toxic-heavy-metal-content-in-marketed-ayurvedic-decoctions-using-closed-vessel-microwave-digestion-in-icpms/)
- **New Schedule E(1)** (Drugs (Thirteenth Amendment) Rules, 2026, G.S.R. 862(E), notified 15 Sep 2026, in force on gazette publication) — [TeamLease RegTech](https://teamleaseregtech.com/updates/article/60189/drugs-thirteenth-amendment-rules-2026/); [Outlook India, 15 Oct 2026](https://www.outlookindia.com/healthcare-spotlight/ayush-ministry-expands-list-of-poisonous-substances-in-traditional-medicines):
  - Mineral-origin entries grow from 7 to 20 (Ayurveda) and 10 to 17 (Unani); Siddha has 18 and Sowa-Rigpa 9 (new).
  - Examples: arsenic compounds, mercury and its compounds, copper sulphate, lead oxide, galena, copper acetate, stibnite, cinnabar, litharge, red mercuric sulphide, and mercury amalgams.
  - Catch-all: any ingredient "containing arsenic or mercury as a chemical constituent will be treated as a Schedule E(I) drug".
  - Internal-use E(1) medicines must carry "Caution: to be taken under medical supervision" in English and Hindi.
- **Existing rules:** Rule 161(2) requires the E(1) caution label. A 2022 CCPA advisory requires e-commerce sale of E(1) ASU drugs only against a valid practitioner's prescription — [TaxGuru (advisory text)](https://taxguru.in/corporate-law/advisory-concerning-sale-ayurvedic-siddha-unani-drugs.html) (via search summary; not opened)

### Inferences
- **Proposed change: `bhasma_classes` map**, replacing the flat `herbo_mineral.keywords`. Each entry: keyword → `{metal, schedule_e1: true|false|unknown, source}`.
  - E(1)/toxic-metal group (note, tier inform): parada/mercury, kajjali, rasa sindura, makaradhwaja, hingula (cinnabar), the arsenic minerals (e.g. haratala, manahshila, somala), naga (lead) bhasma, tamra (copper) bhasma, and possibly vanga (tin) — the Outlook summary mentions tin compounds.
  - Other-mineral group (silent or no note): mandur/loha (iron), shankh/praval/mukta/kapardika (calcium), yashad (zinc), abhraka (mica). This group is what makes Liv.52 (Mandur) and Septilin (Shankh) noisy today.
  - Add Unani and Siddha terms for calcined metals (proposed: "kushta" for Unani; "parpam", "chendooram/chenduram" for Siddha). These need verifying against the gazette list before use.
  - Effort: 3-4 h to transcribe the E(1) mineral list from the G.S.R. 862(E) gazette PDF, plus 2 h of code and tests.
- **Proposed compliance flag: `e1_needs_prescription`.** An E(1)-listed product in an e-pharmacy cart with no registered-practitioner Rx line gets a "Schedule E(1): sale requires prescription (CCPA 2022); label must say 'to be taken under medical supervision'" note.
  - This is a regulatory fact, not a clinical judgement, so it is safer to show.
  - Effort: 2 h once the list exists.
  - Pitch value: very high for an e-pharmacy buyer. The rule is six weeks old, and catching it is a compliance win.
- **Named-formulation gap:** INDILI's example CAM case included "pratap lankeshwar vati" and "sutshekhar vati", classical rasa preparations whose names contain no bhasma keyword ([PMC8103312](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103312/)). The fix is a classical-formulation table from AFI listing metal constituents.
  - Effort: 1-2 days for the top ~30 rasa formulations; months for full AFI coverage.
- **Context to add later:** pregnancy, children and CKD make metal exposure more concerning. This is an inferred context and needs a patient-context field.
- **Wording:** "contains a mineral ingredient listed in Schedule E(1)", not "contains poison". The Act's own word is "poisonous substances", but in the UI the regulatory label reads better than a judgement.

### Gaps
- Not obtained: the full substituted Schedule E(1) text (G.S.R. 862(E)). Counts and examples come from secondary summaries.
- Not verified: whether purely herbal ASU drugs must be tested for heavy metals while rasa (herbo-mineral) drugs are exempt, and the current rule number for that requirement.
- Not found: a recent (2020-2026) Indian market survey of metals in rasa products comparable to Saper 2008.
- The original Indian lead series (reported via the Ernst blog) was not opened; journal and authors are unconfirmed.

---

## 5. Homeopathy: mother tinctures, low-potency toxic sources, delayed treatment. Is there real interaction evidence?

### Takeaway
No credible pharmacokinetic or pharmacodynamic interaction evidence exists for high-dilution homeopathic remedies. The defensible checks concern the physical product:
- ethanol in mother tinctures (Q) and low potencies, with disulfiram-like drugs, in children, and in liver disease;
- toxic source materials (belladonna, arsenic) at low dilution, where manufacturing variability is documented.

The "delayed effective treatment" harm is real but not something a line-by-line engine can check. It belongs in UI copy, not rules.

### Cited Findings
- Mother tinctures are made by maceration or percolation in a hydroalcoholic solvent — [British Pharmacopoeia, homoeopathic preparations](https://www.drugfuture.com/Pharmacopoeia/BP2012/data/4863.html). One commercial Thuja mother tincture is 55% v/v, about 0.45 g ethanol per 50 drops — [product listing](https://www.soin-et-nature.com/en/4187-thuja-tincture-homeopathy-weleda-dilution-60ml.html)
- The Belgian regulator (FAMHP) notes ethanol may cause a disulfiram-like reaction with some antibacterials. It says ethanol-containing medicines in children should be subject to prior medical evaluation, and that homeopathic doses should be diluted in water — [FAMHP, Use of ethanol in children](https://www.afmps.be/sites/default/files/downloads/20120921_EN_Use%20of%20ethanol%20in%20children.pdf)
- A 14-year-old had a possible disulfiram-like reaction on metronidazole plus an alcohol-containing oral liquid (prednisone). The authors note alcohol-containing oral liquids are often missed as the cause — [PMC6782120](https://pmc.ncbi.nlm.nih.gov/articles/PMC6782120/)
- Breath alcohol was positive in 9 of 30 subjects within 1 minute of taking a mother tincture — [Homeopathy journal](https://thieme-connect.de/products/ejournals/html/10.1054/homp.2002.0006)
- FDA (2016-2017): lab analysis of Hyland's homeopathic belladonna teething tablets found belladonna varied between batches, sometimes far above the label claim. FDA: "the body's response to belladonna in children under two years of age is unpredictable" — [CPBJ/AP report](https://www.cpbj.com/fda-confirms-elevated-levels-of-belladonna-in-certain-homeopathic-teething-products)
- In 2020 the Ministry of AYUSH advised Arsenicum album 30 for 3 days as COVID-19 prophylaxis. Critics noted there was no supporting evidence — [The Scientist](https://www.the-scientist.com/indian-authorities-propose-use-of-homeopathy-to-prevent-coronavirus-67075); [The Wire Science](https://science.thewire.in/health/covid-19-homeopathy-arsenicum-album-succusion-ministry-of-ayush/)
- A 2022 Cureus series reported acute liver injury (1 death) in 3 patients on Arsenicum album 30C. A 2023 Homeopathy journal article disputes its data — [Thieme 2023](https://thieme-connect.de/products/ejournals/html/10.1055/s-0043-1768917)
- In NSSO 2022-23, homeopathy is grouped with all non-Ayurveda systems: 9.4% rural and 12.8% urban use — [MoSPI Press Note](https://mospi.gov.in/sites/default/files/press_release/PressNote_Ayush_13062024N.pdf)

### Inferences
- **Proposed parser: `homeopathy_potency`.** Recognise Indian notation: "Q" or "MT" (mother tincture), "3X/6X", "6C/30C/200C/1M", plain "30"/"200" after a remedy name, and the source/brand names SBL, Dr. Reckeweg, Schwabe, Bakson, Allen.
  - Store potency, and mark "ethanol likely" for Q/MT and dilution liquids.
  - Effort: 2-3 h with tests. Pitch: medium.
- **Proposed rule `homeopathic_tincture_alcohol`:** Q/MT or liquid dilution with metronidazole, tinidazole or disulfiram; also with a patient aged under 6, or with liver disease, once context exists.
  - Grade: limited and `inferred: true`, because evidence is on ethanol in medicines generally, not homeopathy specifically. Tier silent.
  - Effect text: "This mother tincture is usually alcohol-based. With metronidazole or tinidazole, alcohol can cause flushing and vomiting in some people; ask about the dose and whether it is diluted."
  - Effort: 1 h after the parser.
- **Proposed rule `homeopathic_low_potency_toxic_source`:** belladonna, arsenicum, aconitum, nux vomica or mercurius at Q/MT to about 3X, in a child under 2. Note-only, citing the FDA belladonna analysis.
  - At ≥12C, say plainly that no pharmacological interaction is expected. That keeps the output from implying a risk that does not exist.
  - Effort: 1 h. Risk: overreach if the potency is misparsed.
- **"Delay of effective treatment":** handle in UI copy, not as an alert. Example: when a homeopathic line appears and the cart has no allopathic medicine for a serious chronic condition, add nothing; the pharmacist knows the patient. Parchi cannot know indication, so any "substitution" rule would be invented.

### Gaps
- No published case of a homeopathic mother tincture with metronidazole or disulfiram was found. The rule is an inference from ethanol pharmacology.
- Indian Homoeopathic Pharmacopoeia ethanol percentages for typical Indian mother tinctures, and the Drugs Rules labelling requirement for alcohol content on homeopathic products, were not verified.
- No Indian homeopathy pharmacovigilance data separated by system was found.

---

## 6. Regulation: Schedule E(1), Rule 170 / misleading ads, AYUSH pharmacovigilance

### Takeaway
2024-2026 changed the landscape:
- Schedule E(1) was replaced (Sep 2026) and now covers Sowa-Rigpa, with an arsenic/mercury catch-all.
- Rule 170, which required pre-approval of ASU ads, was deleted in July 2024. The Supreme Court's stay was vacated in Aug 2025, so the deletion is in effect.
- The AyushSuraksha portal (May 2025) centralises adverse drug reaction and misleading-ad reports, but no public per-product ADR dataset exists.

### Cited Findings
- **Schedule E(1)** substitution:
  - Draft: G.S.R. 115(E), dated 4 Feb 2025 per TeamLease, or 28 Jan 2025 per Outlook; comments were due 8 Mar 2025 — [TeamLease draft](https://teamleaseregtech.com/updates/article/39351/draft-drugs-amendment-rules-2025)
  - Final: G.S.R. 862(E), notified 15 Sep 2026 under section 33N after consulting the Ayurvedic, Siddha and Unani Drugs Technical Advisory Board — [TeamLease final](https://teamleaseregtech.com/updates/article/60189/drugs-thirteenth-amendment-rules-2026/)
  - Plant-origin counts: Ayurveda 13 to 16, Siddha 17 to 20, Unani 8 to 13, Sowa-Rigpa 13 (new). Snake poison and Mylabris (blister beetle) added as animal-origin entries.
  - Licences for patent/proprietary products containing E(1) ingredients now need safety studies and efficacy evidence — [Outlook India](https://www.outlookindia.com/healthcare-spotlight/ayush-ministry-expands-list-of-poisonous-substances-in-traditional-medicines)
- The previous E(1) list is held by the Tamil Nadu ISM licensing authority — [TN Schedule E(1) PDF](https://www.tnslaim.tn.gov.in/docs/lib/Schedule%20E%20(1)%20Drugs.pdf)
- **Rule 170:**
  - Omitted by Ayush notification on 1 Jul 2024. The Supreme Court stayed the omission in Aug 2024 in the IMA v. Patanjali matter — [Bar & Bench](https://www.barandbench.com/news/supreme-court-stays-centre-decision-omit-key-rule-misleading-ayush-ads)
  - In Aug 2025 the Court disposed of the petition and vacated the stay, so the omission is in effect, with liberty to challenge it separately — [LiveLaw](https://www.livelaw.in/amp/top-stories/supreme-court-vacates-stay-on-ayush-ministrys-notification-that-permitted-advertisements-of-ayurvedic-unani-siddha-drugs-300536); [Medical Dialogues](https://medicaldialogues.in/news/health/misleading-medical-ads-case-sc-disposes-ima-plea-lifts-stay-on-ayush-ad-pre-approval-rule-153283)
- **AyushSuraksha portal and pharmacovigilance:**
  - The portal was launched in May 2025 following a Supreme Court order of 30 Jul 2024 (WP(C) 645/2022) calling for a dashboard of misleading ads and ADRs. It sits on a three-tier ASU&H pharmacovigilance network and the public can report directly — [BioSpectrum](https://biospectrumindia.com/news/16/26188/ayush-ministry-launches-portal-to-address-issues-of-adverse-drug-reaction.html); [IMPRI](https://www.impriindia.com/?p=76528)
  - The Ayush Secretary reported about 65,000 misleading ads flagged over eight years under the Drugs and Magic Remedies Act, and about 3,000 ADRs recorded since 2018 (headline figures) — [ThePrint](https://theprint.in/health/65000-misleading-ads-flagged-3000-adverse-reactions-recorded-since-2018-says-ayush-secretary/2873880/)
  - BIS circulated a draft Indian Standard for ASU&H pharmacovigilance centres in Sept 2025 — [BIS draft](https://www.services.bis.gov.in/tmp/WCAYD44328469_12092025_1.pdf)
- The 2021 ashwagandha-leaf advisory (§3) shows Ayush issuing product-level safety advisories — [SupplySide FAQ](https://www.supplysidesj.com/supply-chain/ashwagandha-regulation-root-leaf-faq)

### Inferences
- About 3,000 ADRs since 2018, against roughly half the population using AYUSH, implies heavy under-reporting. That supports the existing herbal.json statement: "Absence of a rule is NOT evidence of safety".
- **Proposed feature: an "Report to AyushSuraksha" link** in the finding card. It is a link, not an API; the portal supports public reporting.
  - Effort: 0.5 h. Pitch: high. It closes the loop with the government's own system and is non-adversarial.
- Rule 170's removal means product marketing claims are less filtered. Parchi should never ingest brand claims ("liver protective", "safe, no side effects") as evidence.

### Gaps
- Not obtained: the gazette PDF of G.S.R. 862(E) and its full list.
- Not verified: the AYUSH pharmacovigilance programme's start date (widely cited as 2017) and its national/intermediary/peripheral centre counts.
- No public per-product or per-herb ADR export from AyushSuraksha was found.
- The CCPA 2022 e-commerce advisory text was not opened.

---

## 7. Responsible framing: evidence grading, alert wording, and how Indian integrative policy treats co-prescription

### Takeaway
Use a Natural Medicines-style split of likelihood (evidence) and severity, mapped onto Parchi's two grades plus explicit study-type labels. Word every finding as "what has been reported, by whom, how strong", naming the ingredient, never the system. Avoid "unsafe" or "toxic", and never tell the pharmacist to stop a product.

India has political will for "integrative" medicine (an ICMR ethics addendum, an AYUSH-ICMR centre, ministerial rhetoric). No official co-prescription or interaction-screening guidance was found, so there is a gap Parchi can fill neutrally. Expect pushback: the ministry rebutted the giloy findings, and a hepatologist got a regulatory notice for speaking about them.

### Cited Findings
- **Natural Medicines interaction scales:**
  - Likelihood: likely, probable, possible ("documented in animal or in vitro research, or in humans but limited to case reports or conflicting clinical research"), unlikely (animal or in vitro only).
  - Severity: high, moderate, mild, insignificant.
  - Evidence levels: A = high-quality RCTs and meta-analyses; B = non-randomised trials, cohort and case-control studies, lower-quality RCTs — [NatMed editorial process](https://naturalmedicines.therapeuticresearch.com/Content/nm/EditorialProcess); [NatMed stoplight rating](https://naturalmedicines.therapeuticresearch.com/Content/nm/StoplightRating)
  - The current checker uses Major/Moderate/Minor combining severity, likelihood and evidence — [NatMed 2023 FAQ](https://naturalmedicines.therapeuticresearch.com/news/news-items/2023/april/interaction-checker-faqs-on-ratings-and-updates.aspx)
  - Older version: a red/yellow/green traffic light — [RACGP](https://www.racgp.org.au/getattachment/fd664992-742b-4b4b-aa9b-fcc160c02968/Drug-and-herb-interactions.aspx)
- **Hardy 2000 evidence table** labels each claim by study type: controlled trial (CT), case series (CS), case report (CR), animal study (AS), traditional use (TU), pharmacology (P), theoretical (TH) — [Relias/Alternative Medicine Alert](https://www.reliasmedia.com/articles/54750-herb-drug-interactions-an-evidence-based-table)
- Most published herb-drug interaction reports are unevaluable — [Fugh-Berman & Ernst 2001](https://www.bps.ac.uk/publishing/our-journals/british-journal-of-clinical-pharmacology/volume-52/issue-5/herb-drug-interactions-review-and-assessment-of-r)
- A 2026 paper on Chinese herb-drug interaction monographs found existing databases show "limited CHM coverage, inconsistent evidence grading, and poor clinical interpretability". The traditional-medicine coverage gap is not unique to India — [eCMTA 2026](https://www.sciopen.com/article/10.26599/eCMTA.2026.9570040)
- **Indian integrative policy:**
  - ICMR's 2025 addendum to its 2017 ethics guidelines sets a framework for research in integrative medicine and requires AYUSH experts on ethics committees — [ETV Bharat](https://www.etvbharat.com/en/!health/new-icmr-framework-india-health-traditional-modern-medicine-enn25030506472)
  - Ayush and ICMR have an agreement for clinical trials of Ayurveda alongside modern medicine, and an AYUSH-ICMR Advanced Centre for Integrated Health Research at AIIMS Delhi — [Digital Health News](https://www.digitalhealthnews.com/mansukh-mandaviya-launches-ayush-icmr-advanced-centre-for-integrated-health-research-at-aiims-delhi); [Rau's IAS](https://compass.rauias.com/current-affairs/ayush-collaboration-with-icmr-for-scientific-validation/)
  - A parliamentary committee urged integrating facilities — [Medical Dialogues](https://medicaldialogues.in/news/health/parliamentary-committee-calls-for-allopathy-ayush-integration-162446)
  - Ayush MoS Prataprao Jadhav (Mar 2026): "Our vision is not alternative but integrative medicine" (headline) — [The Week](https://www.theweek.in/magazine/theweek/cover/2026/03/21/our-vision-is-not-alternative-but-integrative-medicine-prataprao-jadhav.html)
- **Sensitivity signals:**
  - Ministry rebuttals on giloy — [Udayavani](https://udayavani.com/?p=1080118)
  - Kerala ISM council notice to a hepatologist — [The News Minute](https://www.thenewsminute.com/article/doctor-flags-popular-herb-causing-liver-injury-gets-notice-ayush-practitioners-160634)
  - A JAIM editorial contesting the Danish ashwagandha ban — [PMC11403136](https://pmc.ncbi.nlm.nih.gov/articles/PMC11403136)

### Inferences
- **Proposed grading (additive to `types.ts`; keeps the existing `evidence` field):**
  - add `study_type` ∈ {regulator_monograph, rct, cohort, case_series, case_report, pk_volunteer, database_only, inferred};
  - add `severity` ∈ {high, moderate, mild}.
  - Map: regulator_monograph / rct / Indian multicentre case_series → `established`. Everything else → `limited`. animal/in-vitro → excluded (already policy).
  - Allow the pharmacist (not the engine) to raise a `limited` + `high` severity rule (e.g. shankhpushpi-phenytoin) to `inform`.
  - Effort: 2-3 h including UI badges. Pitch: high, because judges can see the honesty.
- **Wording rules for alert text:**
  - Name the plant and the product, not the system: "This product contains giloy (Tinospora cordifolia)", not "Ayurvedic medicine may damage the liver".
  - Say who reported what and how strong: "43 patients in a 13-centre Indian study (2022); method criticised; government states guduchi is safe at proper doses."
  - Give an action the pharmacist owns: "ask how long and how much", "space by ½-1 h", "check if liver disease is known". Never write "stop", "unsafe" or "contraindicated" unless a regulator monograph says so (e.g. the ispaghula contraindication in poorly controlled diabetes).
  - Always add the disclaimer: "No finding is not a safety clearance."
  - Use regulatory labels as labels ("Schedule E(1): to be taken under medical supervision"), not editorial judgement.
- **Respectful framing for the pitch:** "Parchi treats AYUSH products as real medicines with real ingredients, which is why it checks them." That matches the government's integrative line rather than opposing it.
- **Prioritised shortlist** for the hackathon (about 16-20 h total):
  1. `ispaghula_absorption` + `senna_potassium` (2 h; established).
  2. Brand table for about 6 Himalaya/Dabur products (5 h).
  3. Bhasma classes + Schedule E(1) prescription flag (6 h).
  4. `shankhpushpi_phenytoin` + `ashwagandha_liver` + `giloy_liver` fix (2 h).
  5. `study_type`/`severity` badges + AyushSuraksha report link (3 h).
- **Defer to months:**
  - dose gating with verified thresholds;
  - patient-context gating (liver, CKD, pregnancy, children);
  - AFI classical-formulation coverage;
  - homeopathy potency parsing beyond a demo.

### Gaps
- No ICMR or Ayush guideline on co-prescription, cross-referral, or interaction screening was found (searched; results described research oversight only).
- NatMed Level C/D definitions were not retrieved.
- No published Indian pharmacist-facing wording standard for herb-drug alerts was found.

---

## 8. Data sources and licences

### Takeaway
For a hackathon and a possible B2B product, the usable sources are:
- public regulator documents (EMA/HMPC monographs, NIH ODS, LiverTox, MoSPI, gazette);
- primary papers, cited individually and hand-curated.

The commercial gold standard (Natural Medicines) needs a licence. MSK About Herbs is free to read but has no open reuse licence. DDInter has no herbal coverage. IMPPAT is CC BY-NC, so non-commercial only. HEDRINE is a free academic reference, but its evidence scoring is undocumented.

### Cited Findings
- **Natural Medicines (Therapeutic Research Center):** commercial, with an interaction checker rated Major/Moderate/Minor. Described by a pharmacy-data vendor as "the gold-standard, evidence-graded database for dietary supplements and herbs" — [NatMed FAQ](https://naturalmedicines.therapeuticresearch.com/news/news-items/2023/april/interaction-checker-faqs-on-ratings-and-updates.aspx); [HelloPharmacist data sources](https://hellopharmacist.com/data-sources)
- **MSK About Herbs:**
  - Free website and app (iOS/Android, about 290 entries including interactions, updated regularly), run by an MSK pharmacist/botanicals expert — [MSK About Herbs](https://www.mskcc.org/cancer-care/diagnosis-treatment/symptom-management/integrative-medicine/herbs/about-herbs); [App Store](https://apps.apple.com/kn/app/about-herbs/id554267162)
  - Terms: a general-information disclaimer; no open licence found — [MSK disclaimer](https://www.mskcc.org/cancer-care/diagnosis-treatment/symptom-management/integrative-medicine/herbs/disclaimer)
- **HEDRINE** (Université libre de Bruxelles + Université Grenoble Alpes): a database of "validated or theoretical" plant-drug interactions, with origins in transplant-patient work — [HEDRINE](https://hedrine.ulb.be/); [DUMAS thesis](https://dumas.ccsd.cnrs.fr/dumas-00858658)
- **DDInter 2.0:** 2,310 drugs, 302,516 drug-drug interaction records. It also covers drug-food, drug-disease and therapeutic duplication, but has no herbal category. Freely accessible — [NAR 2025 / PMC11701621](https://pmc.ncbi.nlm.nih.gov/articles/PMC11701621/); [DDInter 2.0](https://ddinter2.scbdd.com/). A third-party repo states DDInter (v1) downloads are CC BY-NC-SA 4.0 — [GitHub](https://github.com/mnarayan1/DDInter) (unconfirmed for v2)
- **IMPPAT 2.0:** CC BY-NC 4.0 per site footer — [IMPPAT](https://cb.imsc.res.in/imppat/); [paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5847565/)
- **NIH ODS ashwagandha fact sheet** (already used by the repo) — [ODS](https://ods.od.nih.gov/factsheets/Ashwagandha-Consumer/)
- **LiverTox** (NCBI Bookshelf), turmeric entry — [NBK548561](https://www.ncbi.nlm.nih.gov/books/NBK548561/)
- **EMA/HMPC herbal monographs** (senna, ispaghula, liquorice): public, citable regulator documents — [EMA senna](https://www.ema.europa.eu/en/documents/herbal-monograph/superseded-community-herbal-monograph-cassia-senna-l-fructus-and-cassia-angustifolia-vahl-fructus_en.pdf); [EMA ispaghula](https://www.ema.europa.eu/en/documents/herbal-monograph/superseded-community-herbal-monograph-plantago-ovata-forssk-semen_en.pdf)
- **Indian datasets:**
  - INDILI DILI registry paper — [PMC8103312](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103312/)
  - MoSPI NSS 79th-round unit-level data, published on microdata.gov.in — [MoSPI Press Note](https://mospi.gov.in/sites/default/files/press_release/PressNote_Ayush_13062024N.pdf); [microdata catalog](https://microdata.gov.in/nada/index.php/catalog/219)
  - DRAVYA (CCRAS) — [summary](https://compass.rauias.com/current-affairs/dravya-portal/)
  - e-AUSHADHI — [Medical Dialogues](https://business.medicaldialogues.in/ayush-ministry-launches-e-aushadhi-portal-for-online-licensing-of-drugs)

### Inferences
- **Licensing plan:** hand-curate rules from EMA monographs, LiverTox, NIH ODS and primary papers (citation is fine; no bulk copying). Use MSK and NatMed only as a reviewer's cross-check during pharmacist sign-off, never as an imported dataset.
- IMPPAT is fine for a hackathon demo. For a commercial chain deployment, get IMSc permission or drop it.
- **MoSPI unit-level NSS 79th data:** free government microdata that could produce a state-wise "AYUSH use prevalence" slide, e.g. highest in Himachal Pradesh and lowest in Goa per the fact sheet. Effort: 3-4 h in Python. Pitch: medium.
- **For each new herbal.json source, record** `source_type` (regulator/primary/secondary/database), `licence` and `checked_on`. This matches the CLAUDE.md "every clinical number has a source" rule and makes licence audits trivial.

### Gaps
- Not obtained: Natural Medicines India/academic pricing, and whether a hackathon or startup trial licence exists.
- HEDRINE's evidence-scoring method and licence terms were not found.
- MSK reuse terms beyond the disclaimer were not found.
- DDInter 2.0's official licence was not confirmed.
- e-AUSHADHI public product search fields and export capability were not confirmed; the live portal was not checked.
- NCCIH ("Herbs at a Glance") was not reviewed in this pass. Like NIH ODS it is US-government content, but its reuse terms were not checked.
