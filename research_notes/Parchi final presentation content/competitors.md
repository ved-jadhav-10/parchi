# Competitor capabilities in India (as of 24 Oct 2026)

Scope: tools an Indian pharmacist or prescriber could use today to check a multi-brand prescription. Parchi = offline PWA for pharmacists; Indian brand names + Indian dosing notation (1-0-1, TDS, SOS); FDC unpacking; per-ingredient mg/day summed across brands; patient limits (age, weight, CrCl); same-class duplication; DDI (DDInter); CDSCO banned FDC; 3-tier alerts (Interrupt / Inform / Silent) with a pharmacist suppression list; it informs the pharmacist and does not decide.

Labels used below:
- **[Self]** = the company says this on its own page or store listing. Nobody else has checked it.
- **[Indep]** = a peer-reviewed paper, a third party or a regulator states it. The authors' affiliation is noted where it matters.
- **NSP** = not stated publicly. The page I read does not mention this. It does **not** mean the product lacks the feature.

---

## Q1. medThinks: what it does, data sources, cumulative dose / patient limits / tiers, NLEM / Schedule H / Jan Aushadhi

### Takeaway
medThinks is the closest match to Parchi. It is an India-specific DDI checker that resolves Indian brands, unpacks FDCs pair by pair, flags CDSCO-banned FDCs and shows NLEM / Schedule / Jan Aushadhi / NPPA status. Its page says nothing about adding up an ingredient's daily dose across brands, dose limits by age, weight or kidney function, parsing dosing frequency, same-class duplication, or offline use. All of its claims are [Self].

### Cited findings (all [Self], from https://medthinks.com/drug-interaction-checker-india)
- States "397,000+ peer-reviewed interaction pairs" from **DDInter 2.0**. Other layers: a curated clinical reference table, RxNorm's mechanism-of-action graph, and live FDA label text. FAERS signals come via TWOSIDES. A set of 15 "never-miss" rules (Phansalkar et al., JAMIA 2012) runs first. — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- Indian brands resolve to ingredients (examples given: Combiflam, Pan-D, Glycomet GP, Telma-H). A Hindi/Sanskrit alias table (e.g., haldi/haridra to turmeric, karela to bitter melon) is used for herb-drug checks. — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- Combination unpacking: every ingredient pair is checked across the layers, and the worst severity found is returned. — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- Severity and alert-noise handling: Major and Critical are named and are "never suppressed". Low-significance pairs are filtered out unless a curated row, a never-miss rule or a high-alert drug is involved. Each result carries a confidence tier (confirmed / plausible / inferred). — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- Regulatory context: "a CDSCO banned fixed-dose-combination flag where relevant"; NLEM 2022 status; Schedule H/H1/X status; Jan Aushadhi availability; NPPA ceiling price. — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- Role of AI: a rule-based engine decides whether drugs interact and how severely. An LLM only rewrites the result in plain language, and the rule text is shown if that step fails. — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- Target users: doctors (after NMC verification), pharmacists, nurses, medical students. Pricing: a free plan exists. Verifying registration unlocks "patient-specific reasoning and full severity detail". Paid tiers are not described. — [medThinks](https://medthinks.com/drug-interaction-checker-india)
- NSP on the page: cumulative daily dose across brands; dose limits by age, weight or renal function; parsing of dosing frequency (1-0-1/TDS/SOS); therapeutic (same-class) duplication; offline use; paid pricing; the full severity scale beyond Major/Critical. — [medThinks](https://medthinks.com/drug-interaction-checker-india)

### Inferences
- medThinks and Parchi draw on overlapping data (DDInter) and share India-specific features: brand to ingredient resolution and the banned-FDC flag. **Neither of these is unique to Parchi, so the pitch should not claim them as such.** What sets Parchi apart (per public info) is dose arithmetic: summed mg/day, per-patient limits and sig parsing. Also unique on the public record: same-class duplication, a pharmacist-editable suppression list, and offline use.
- The page's phrase "patient-specific reasoning" does not say which patient factors are used. Do not read it as age, weight or CrCl dose limits.

### Gaps
- No independent validation of medThinks' accuracy or its 397,000+ figure was found.
- Paid pricing and whether the suppression rules can be configured: NSP.

---

## Q2. MIMS / CIMS India (eMIMSplus, MIMS Integrated)

### Takeaway
eMIMSplus Asia, the standalone app, offers DDI, allergy, condition and CYP450 checks over "100,000+ drugs approved in India". MIMS Integrated, the enterprise API, adds dose, duplicate-therapy, pregnancy and lactation alerts, with severity and documentation filters, and lists India as an optional regional product list. All claims are [Self].

### Cited findings
- eMIMSplus Asia (developer MIMS Pte. Ltd.): "access to over 100,000 drugs approved in India". The MIMS Interaction Checker covers harmful drug combinations, allergy-profile conflicts, pre-existing-condition conflicts and CYP450 interactions. It also has clinical calculators in 15 categories, disease guides in 16+ specialties, and quarterly updates. "Strictly intended for use by healthcare professionals". Listed as "Free" on the App Store. Support email subscriptions.cds@cims.co.in (Indian phone numbers). [Self] — [App Store: eMIMSplus Asia](https://apps.apple.com/app/id6745163411)
- NSP for eMIMSplus: dose checking, offline use, subscription price, explicit Indian brand-name support. — [App Store](https://apps.apple.com/app/id6745163411)
- MIMS Integrated (enterprise CDS) modules: Drug Interaction Alert ("severity and documentation levels as filtering parameters"), Drug Duplicate Alert (therapeutic duplication), Drug Allergy, Pregnancy, Lactation, Drug Health Alert (contraindications, ICD-10), and **Drug Dose Alert** ("doses outside recommended therapeutic ranges", screened by age, gender, height, weight, BSA). "Extended Geographical Reach" add-on lists India among regional product lists. Customers: hospitals, pharmacies, clinics, telemedicine, health systems, via a "lightweight API". [Self] — [MIMS Integrated](https://cds.mims.com/mims-integrated/)
- NSP for MIMS Integrated: renal/CrCl-based dose limits; whether it adds up an ingredient's daily dose across several brands; parsing of Indian sig notation; banned-FDC flag; offline use; pricing. — [MIMS Integrated](https://cds.mims.com/mims-integrated/)

### Inferences
- MIMS Integrated is the incumbent with the widest stated range of checks (dose range, duplication, severity filters). It is sold as an API for hospital and pharmacy systems, not as a ready-made tool for a single pharmacist. Parchi's distinct points are a self-serve offline PWA, typed Indian sig parsing, CrCl-based limits, a CDSCO banned-FDC flag and a pharmacist-managed suppression list. None of these appears on MIMS's public pages.

### Gaps
- Whether the Dose Alert checks a single dose or a daily total, and whether it adds up an ingredient across multiple brands: NSP.
- India pricing and which Indian institutions use it: not found.

---

## Q3. Consumer and pharmacy-council tools: CureCheck, GoDavaii, MSPC DICP, 1mg / Apollo

### Takeaway
CureCheck and GoDavaii are consumer AI health apps that list an interaction checker but give few technical details. The MSPC DICP is a pharmacist-facing, CD-based checker for brands and generics, covering a limited set of drug classes with 3-colour severity. 1mg runs a free multi-medicine interaction checker with severity grouping. None of their public pages mention dose arithmetic or patient-specific limits.

### Cited findings
- **CureCheck** [Self]: an AI health platform for India with a report explainer, medicine guide, symptom checker, drug interaction checker ("Check if medicines are safe to take together") and health timeline. "Full Hindi support". Patient-facing, with a separate doctor copilot ("CureCheck OS"). "Free every day". Sources: "standard medical literature and established health guidelines" (none named). "CureCheck is not a doctor". NSP: combination unpacking, dose checks, patient limits, sig parsing, duplication, banned FDC, severity levels, offline. — [curecheck.in](https://curecheck.in)
- **GoDavaii** [Self]: "The World's Most Complete Health AI", 90+ languages, aimed at families. It cites a "93,000+ drug interaction dataset" and lists a "Drug Checker" and an "Interaction Playground". It scans prescriptions by photo or OCR. A user testimonial says it recognised local brand names. "Generic alternatives". "Photos and documents are analyzed on your phone" (on-device processing, which is not the same as stated offline use). "Free. No sign up needed to start"; business model "app subscriptions". NSP: dose calculator, patient limits, duplication, banned FDC, severity tiers. — [godavaii.com](https://www.godavaii.com)
- **MSPC DICP** (Maharashtra State Pharmacy Council, Drug Information Centre) [Self, from a statutory council]: "indigenous CD based interactive software". "Thousands of brands with corresponding generic drug names are loaded". The user enters a prescription and clicks "GENERATE INTERACTIONS". Colour code: red = hazardous/major, blue = moderate, green = clinically not significant. DICP-I covers antihypertensives, antibiotics, antianginals, antiasthmatics and antihyperlipidemics, and is "Available at MSPC's DIC office". DICP-II (antiretrovirals, antivirals, antitubercular; for ART/DOT-centre pharmacists) is described as "ready to launch and soon will be available for all". Target: pharmacists in pharmacies and hospitals. The page has a 2013 copyright. A search summary dated its creation to 2006 (not seen on the DICP page itself). Price NSP. — [MSPC DIC: DICP](https://dic.mspcindia.org/Pages/DICP.aspx)
- **Tata 1mg**: a free interaction checker where several medicines can be added ("Add at least two medicines to view their interactions"). — [1mg interaction checker](https://www.1mg.com/drug-interactions/diclotal-48356). A search-result snippet of the same page showed results grouped by severity, from life-threatening down to beneficial (e.g., diclofenac + nimesulide "avoid"). This was not confirmed on the fetched page shell. Product pages have an "Interaction with drugs" section and a disclaimer that content "may not cover everything about ... drug interactions". NSP: dose, patient limits, duplication, banned FDC, offline, target user. — [1mg medicine page](https://www.1mg.com/drugs/okacet-total-5-mg-10-mg-500-mg-tablet-142862)
- **Apollo (Apollo 24|7 / Apollo Pharmacy) per-drug interaction pages**: not researched in depth. No primary source was fetched, so capabilities are NSP.

### Inferences
- The MSPC DICP shows that Indian pharmacy councils have long seen the need for an offline, brand-aware checker for pharmacists. Parchi fits the same category but in modern form: a PWA, all drug classes via DDInter, plus dose arithmetic. Frame this as building on DICP, not replacing it.
- Consumer apps (CureCheck, GoDavaii, 1mg) are aimed at patients. Parchi is aimed at the pharmacist and its output informs a professional, so the two do not compete directly for the same user.

### Gaps
- No primary page was found for "MSPC DICP" pricing or for whether DICP-II was released.
- Apollo interaction pages: not verified.
- No independent accuracy studies were found for CureCheck, GoDavaii or 1mg.

---

## Q4. Doctor-side EMRs with DDI alerts: HealthPlix, Eka Care, Practo Ray

### Takeaway
HealthPlix (since July 2022) and Eka Care ([Self]) put DDI alerts inside the prescriber's EMR. HealthPlix's impact figures come from a peer-reviewed paper written by HealthPlix's own staff. For Practo Ray, no public statement of DDI alerts was found. These tools act at the prescriber step. Parchi acts at the dispensing step, which also covers handwritten prescriptions and prescriptions from several different doctors.

### Cited findings
- **HealthPlix launch** [Indep trade press reporting a company announcement]: a DDI feature went live in the HealthPlix EMR around 26 July 2022, for Indian doctors across 16 specialities. It prompts during prescribing. A "reference interactions library" was planned to grow "from 4 lakh to 10 lakh" entries by March 2023, partly through global third-party sources. — [BioSpectrum India](https://biospectrumindia.com/news/98/21699/healthplix-emr-launches-interactive-drug-drug-interaction-feature-.html); [MobiHealthNews](https://www.mobihealthnews.com/news/asia/roundup-healthplix-launches-drug-drug-interaction-feature-intellect-partners-swiss-life)
- **IJBCP 2024 study (VERIFIED as published)**: Jayanthy G, Majumdar A, Kaloo S, Shah S. "Enhancing patient safety: leveraging artificial intelligence-powered electronic medical records for effective drug-drug interaction nudge in real-world prescribing practices." *Int J Basic Clin Pharmacol* 2024;13(4):520–525, published 25 Jun 2024, DOI 10.18203/2319-2003.ijbcp20241653. A retrospective observational study of HealthPlix EMR prescriptions with 2+ drugs for adults over 18. Averages: about **1.9 million visits** analysed, about 1.2 million visits with interactions, about 185,745 interactions observed, about 72,383 molecules removed after nudges. The nudge feature was introduced June 2022. **All four authors work in HealthPlix's Department of Clinical Insights.** The article page states no study period, severity scheme, DDI knowledge source or conflict-of-interest statement. — [IJBCP](https://www.ijbcp.com/index.php/ijbcp/article/view/5620); [WHO IMSEAR index](https://imsear.searo.who.int/items/91e178a4-e919-4569-abcf-9224d87b18fb)
- Note the date mismatch: trade press reports a 26 July 2022 launch, while the IJBCP abstract says June 2022. — [BioSpectrum](https://biospectrumindia.com/news/98/21699/healthplix-emr-launches-interactive-drug-drug-interaction-feature-.html) vs [IJBCP](https://www.ijbcp.com/index.php/ijbcp/article/view/5620)
- **Eka Care** [Self]: EMR pages describe real-time DDI alerts during prescribing ("automatically checks for drug interactions and alerts doctors"). DocAssist lists "Drug interaction alerts" under "Prescription Intelligence" and is aimed at doctors. NSP: dose checks, duplication, severity levels, offline, pricing. — [Eka Care](https://www.eka.care/); [Eka DocAssist](https://www.eka.care/s/for-doctors/docassist); [Eka e-prescription explainer](https://info.eka.care/services/what-is-electronic-prescription-and-how-does-it-work)
- Eka Care's public MCP server offers "Indian Branded Drug Search" across "500,000+ branded drugs available in India" (it returns generic composition and manufacturer), "Indian Pharmacology Details" (based on National Formulary of India 2011) and treatment protocols. It has no interaction or dosing tool. [Self] — [Eka MCP README](https://cdn.jsdelivr.net/gh/eka-care/eka_mcp_server@main/README.md)
- **Practo Ray**: a search turned up no public Practo page describing DDI or dose alerts. NSP across the board. (No source.)

### Inferences
- An EMR's DDI nudge only covers drugs prescribed inside that EMR by that doctor. A pharmacist dispensing a paper prescription, or prescriptions from several doctors, is outside that loop. This is where Parchi fits alongside EMR tools, not against them.
- The HealthPlix "molecules removed" figure is self-evaluated, observational data. It is fair to quote it as evidence that DDI nudges change prescribing in India, with its HealthPlix authorship stated.

### Gaps
- Eka Care / HealthPlix DDI knowledge sources and severity scales: NSP.
- Practo Ray: no public info found.

---

## Q5. Global incumbents present in India: Lexicomp (Lexidrug), Medi-Span, Micromedex, First Databank

### Takeaway
Micromedex states the broadest international brand coverage, via Index Nominum (166 countries, 610,000+ trade names) and 700+ calculators. For Lexidrug (formerly Lexicomp), Medi-Span and FDB, no public statement was found about Indian brand-name coverage or dose-range checking for Indian products. These are mostly enterprise-licensed references.

### Cited findings
- **Micromedex (Merative)** [Self]: international content covering 166 countries, 610,000+ drug names. Index Nominum has 26,000 synonyms, 610,000+ trade names, therapeutic classes and ATC codes. 700+ clinical calculators including dosages. Interaction screening across nine types (drug-drug incl. herbal, drug-food, drug-ethanol, etc.). Merative became a standalone company under Francisco Partners in 2022. — [Micromedex expanded drug reference brochure](https://merative.com/content/dam/merative/documents/brief/micromedex-expanded-drug-reference-brochure.pdf); [Micromedex Core Drug Reference data sheet](https://assets.merative.com/m/1a0c4de488d44d85/original/Micromedex_Core-Drug-Reference_Data-Sheet.pdf)
- Micromedex NSP: automated dose-range checking against a whole prescription; summed daily dose across brands; Indian sig notation; CDSCO banned FDC; India pricing.
- **Lexidrug (renamed Lexicomp)** [Self]: a drug reference with dosing, administration, warnings and precautions, an interaction checker and calculators. No dose-range-checking product is named on the pages found. Indian brand coverage NSP. — [Shared Health Manitoba poster on Lexidrug/UpToDate](https://healthproviders.sharedhealthmb.ca/wp-content/uploads/Intended-use-for-Lexidrug-and-UpToDate-poster.pdf); [Wolters Kluwer Lexicomp announcement](https://assets.contenthub.wolterskluwer.com/api/public/content/2157463-lexicomp-customizable-announcement-8e4d916d33)
- **First Databank (FDB)**: its core product is MedKnowledge, a drug database for decision support. A company profile lists an office in Hyderabad, India. Indian brand coverage and dose-range checking for Indian products: NSP. — [Craft.co FDB profile](https://craft.co/first-databank) (aggregator)
- **Medi-Span (Wolters Kluwer)**: no India-specific page was found. NSP.

### Inferences
- The global vendors' interaction and dose content is mature, but their India brand mappings (where they exist) are not documented publicly in a way a pharmacist can check. Parchi's local brand to ingredient map, CDSCO list and Indian sig parser fill an India-specific need. Present this as a localisation layer, not as a claim of better clinical content.

### Gaps
- FDB, Medi-Span and Lexidrug India coverage: needs vendor confirmation.
- India pricing for all four: not public.

---

## Q6. Status of free DDI APIs (NLM RxNav, DrugBank)

### Takeaway
NLM has discontinued the RxNav drug-interaction API (DrugBank and NLM pages both point to this). The exact date of 2 Jan 2024 could **not** be confirmed on NLM's own site in this session, because NLM pages returned HTTP 403. **No evidence was found on DrugBank's own site that its free checker was retired.** DrugBank currently markets its DDI checker as a commercial API.

### Cited findings
- DrugBank's blog post "NIH Discontinues their Drug Interaction API" reports that NIH discontinued the RxNav drug-drug interaction API and related features. DrugBank data had powered that API, in a version without severity or management detail. (Seen as a search snippet; the page itself would not load because of a DNS failure, so no date was confirmed.) — [DrugBank blog](https://blog.drugbank.com/nih-discontinues-their-drug-interaction-api/)
- NLM RxNav news archive and API pages exist, but were not readable here (HTTP 403). — [RxNav news](https://www.lhncbc.nlm.nih.gov/RxNav/news/news.html); [RxNav Interaction API page](https://lhncbc.nlm.nih.gov/RxNav/APIs/InteractionAPIs.html)
- An OpenEMR community thread (2026) reports users finding RxNav interaction checks no longer working. Secondhand. — [OpenEMR forum](https://community.open-emr.org/t/drug-interaction-not-working/26687)
- DrugBank presents its DDI checker as a current commercial clinical API ("Drug-Drug Interaction Checker API"; implementation guide; demo). These pages contain no retirement notice. — [DrugBank DDI Checker API](https://go.drugbank.com/clinical/drug_drug_interaction_checker/); [DrugBank dev guide](https://dev.drugbank.com/guides/implementation/ddi_checker); [DrugBank demo](https://dev.drugbank.com/demo/ddi_checker)

### Inferences
- With RxNav's free DDI API gone, there is no free US government DDI API. Parchi's choice of a bundled, offline DDInter dataset avoids depending on an online API. This is a reasonable engineering point, framed neutrally.

### Gaps
- **The exact date "2 Jan 2024" is unverified.** Check it manually at lhncbc.nlm.nih.gov/RxNav/news in a browser.
- **The retirement of DrugBank's free public checker is unverified.** No statement on drugbank.com was found. Do not state it in the presentation unless it is confirmed on DrugBank's site.

---

## Capability matrix

Cell key: Y = stated on the cited page; NSP = not stated publicly; "Partial" is explained in the footnotes. Every Y traces to the source cited for that product in Q1 to Q5. Parchi's column is its own design (`docs/PLAN.md`), not an external claim.

| Capability | Parchi | medThinks | eMIMSplus (app) | MIMS Integrated (API) | MSPC DICP | 1mg checker | CureCheck | GoDavaii | HealthPlix EMR | Eka Care EMR | Micromedex |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Indian brand recognition | Y | Y | Partial (a) | Partial (b) | Y | Y (c) | NSP | Partial (d) | NSP | Y (e) | Partial (f) |
| Combination (FDC) unpacking | Y | Y | NSP | Y (allergy vs active ingredients) | NSP | NSP | NSP | NSP | NSP | Y (e) | NSP |
| Pairwise DDI | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Cumulative daily dose across brands | Y | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP |
| Patient dose limits (age/weight/renal) | Y (age, weight, CrCl) | NSP (g) | NSP | Partial: age, gender, height, weight, BSA; renal NSP | NSP | NSP | NSP | NSP | NSP | NSP | Calculators only (h) |
| Dosing-frequency parsing (1-0-1, TDS, SOS) | Y | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP |
| Therapeutic duplication | Y | NSP | NSP | Y | NSP | NSP | NSP | NSP | NSP | NSP | NSP |
| CDSCO banned FDC flag | Y | Y | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP | NSP |
| Severity tiers / alert-fatigue handling | Y: 3 tiers + pharmacist suppression list | Y: severity + confidence tiers; low-significance filter | NSP | Y: severity & documentation filters | Y: 3 colours | Y (c) | NSP | NSP | NSP | NSP | NSP |
| Offline use | Y (PWA) | NSP | NSP | NSP | Y (CD-based) | NSP | NSP | NSP (on-device analysis stated) | NSP | NSP | NSP |
| Target user | Pharmacist | Doctors, pharmacists, nurses, students | Healthcare professionals | Hospitals, pharmacies, clinics, telemedicine | Pharmacists | NSP (consumer site) | Patients (+ doctor copilot) | Families/consumers | Doctors | Doctors | Clinicians, institutions |
| Pricing | Free (hackathon) | Free plan; paid NSP | "Free" listing; subscription NSP | NSP | NSP | Free to use (no price shown) | "Free every day" | Free; subscriptions | NSP | NSP | NSP |

Footnotes:
- (a) Says "100,000 drugs approved in India"; brand names are not stated explicitly. [App Store](https://apps.apple.com/app/id6745163411)
- (b) India listed as an optional regional product list. [MIMS Integrated](https://cds.mims.com/mims-integrated/)
- (c) Accepts medicine names, as on the Diclotal page. Severity grouping was seen only in a search snippet. [1mg](https://www.1mg.com/drug-interactions/diclotal-48356)
- (d) A user testimonial only. [GoDavaii](https://www.godavaii.com)
- (e) An Eka MCP brand search returns generic composition for 500,000+ Indian brands. Whether the EMR's DDI alerts use this lookup is NSP. [Eka MCP](https://cdn.jsdelivr.net/gh/eka-care/eka_mcp_server@main/README.md)
- (f) Index Nominum: 610,000+ trade names across 166 countries. India coverage is not confirmed separately. [Micromedex brochure](https://merative.com/content/dam/merative/documents/brief/micromedex-expanded-drug-reference-brochure.pdf)
- (g) "Patient-specific reasoning" unlocks with verification, but the factors used are not specified. [medThinks](https://medthinks.com/drug-interaction-checker-india)
- (h) 700+ clinical calculators including dosages. Automated limit checking is not stated. [Micromedex data sheet](https://assets.merative.com/m/1a0c4de488d44d85/original/Micromedex_Core-Drug-Reference_Data-Sheet.pdf)

Lexidrug, Medi-Span, FDB, Practo Ray and Apollo are left out of the table. Almost every cell for them would be NSP based on what was found (see Q4 and Q5).

## What Parchi does that each competitor does not publicly offer (neutral phrasing)

- **medThinks:** Its public page does not describe adding up an ingredient's daily dose across brands, dose limits by age, weight or CrCl, parsing of Indian sig notation, same-class duplication, a pharmacist-editable suppression list, or offline use. (Both products publicly offer brand resolution, FDC unpacking, DDInter-based DDI, and the CDSCO banned-FDC flag.)
- **eMIMSplus / MIMS Integrated:** Their public pages do not describe summing a daily dose across brands, renal (CrCl) limits, Indian sig parsing, a CDSCO banned-FDC flag, a self-serve offline tool for a single pharmacist, or a user-managed suppression list. (MIMS Integrated publicly offers dose-range, duplication and severity filtering.)
- **MSPC DICP:** Its public page describes DDI only, for a set of drug classes. Parchi adds DDInter-wide coverage, FDC unpacking, dose summing, patient limits, sig parsing, duplication and the banned-FDC flag, and runs in a browser instead of from a CD.
- **1mg / CureCheck / GoDavaii:** Their public pages do not describe dose summing, patient-specific limits, sig parsing, duplication, banned-FDC flags, pharmacist-facing tiered alerts or offline use. They target consumers, while Parchi targets pharmacists.
- **HealthPlix / Eka Care / Practo Ray:** These work at prescribing time inside one EMR. Their public pages do not describe dispensing-side checks across prescriptions from several prescribers, dose summing, patient limits, sig parsing, the banned-FDC flag, or offline use.
- **Micromedex / Lexidrug / Medi-Span / FDB:** Their public pages do not describe Indian sig parsing, a CDSCO banned-FDC flag, a documented Indian brand to ingredient map, or a free offline pharmacist PWA. Their clinical references are broad and are licensed to institutions.

## Additional independent context
- Recent Indian studies (2026 ISPOR posters) report that DDI detection differs between databases, and that relying on a single database can miss clinically significant interactions. This supports Parchi's design of informing the pharmacist rather than deciding. — [Population Medicine abstract](https://www.populationmedicine.eu/Variability-in-Drug-Drug-Interaction-Databases-and-Its-Implications-for-Clinical,232821,0,2.html); [ISPOR 2026 poster](https://www.ispor.org/heor-resources/presentations-database/presentation-cti/ispor-2026/poster-session-4-3/variability-in-drug-drug-interaction-databases-and-its-implications-for-clinical-decision-support-systems-a-cross-sectional-study-from-a-tertiary-care-hospital-in-india)
- The Phansalkar et al. 2012 list of 15 high-severity interactions is recommended for inclusion in all EMRs. medThinks uses it, and Parchi could cite it for its Interrupt tier. — [AHRQ PSNet](https://psnet.ahrq.gov/issue/high-priority-drug-drug-interactions-use-electronic-health-records)
