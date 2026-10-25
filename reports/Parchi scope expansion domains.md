# Grow Parchi through Indian dispensing law

Parchi should expand by adding a small set of deterministic rule layers tied to Indian law and Indian harm data, using the engine it already has. It should not turn into an OCR product or a supplement-quality tester. Five items should be built now, in this order. **First, paediatric age gates** tied to the Health Ministry's October 2025 cough-syrup advisory and the August 2026 chlorpheniramine + phenylephrine gazette notification. **Second, a Schedule H1/NDPS layer** that uses the Phase 2 multi-doctor timeline to catch early refills; pregabalin enters Schedule H1 on 12 November 2026, 18 days from now. **Third, a route-aware rules pass**, so eye drops, nasal sprays and steroid creams are no longer invisible to the engine. **Fourth, vitamin D frequency and duplicate-source checks**, because India's documented vitamin overdoses come from prescribed megadoses. **Fifth, defect fixes** in the repo, done before everything else.

Handwritten prescriptions should come in only as an online "Verify mode": a vision model transcribes the image word for word, and deterministic code compares it with the order lines the buyer already typed. No study has measured frontier models on real Indian doctor handwriting, and the authors of the only Indian benchmark call their best model "in no way deployable". Self-serve CSV import is worth finishing now, but the header matcher first has to recognise the columns Marg ERP actually exports, and the browser has to read .xlsx. Allergy checking should grow mainly by dropping alerts that the 2022 practice parameter shows are unnecessary. AYUSH needs a brand table, a few rules backed by EMA monographs or Indian studies, and a mineral classifier based on Schedule E(1). Protein-powder fraud and hidden steroids are real harms, but a structured-line checker cannot see them.

The research also found five defects in today's repo that a judge could find:
- a stale OCR rationale in `docs/PLAN.md`;
- a catalogue header list that loses Marg's composition column;
- allergy groups that cite a paper that does not support them;
- a giloy citation that points to a different PMC record;
- a bhasma keyword that flags iron and calcium calxes the same way as mercury.

The core build is about 30 developer-hours across the four tracks. Everything else belongs on a roadmap slide.

## Ten problems in today's repo come before any new scope

The research checked Parchi's data files and docs against primary sources. Several existing claims would not survive a judge's follow-up question. The brief named five; checking the repo turned up five more. Most take under an hour to fix. They come first because every expansion below writes into the same files.

| # | Problem | Where | What the research found | Fix | Effort |
|---|---|---|---|---|---|
| 1 | Stale OCR rationale | [`docs/PLAN.md`](../docs/PLAN.md) "Not doing" and line 7 | The premise holds: e-pharmacy pharmacists still read uploads by hand. But the earlier finding that no commercial Indian Rx-digitisation API exists is out of date. PrescriptoAI sells an extraction API and an "order vs Rx" validation API ([PrescriptoAI](https://www.prescriptoai.com/)). An MIT-licensed tool also called Parchi reads Indian handwritten Rx ([kotewar/parchi](https://github.com/kotewar/parchi)). | Reword: "commercial and open tools exist; none publishes validated accuracy on Indian handwritten Rx; Parchi checks OCR output instead of trusting it" | 10 min |
| 2 | Catalogue header matching | `HEADERS` in [`catalogue.ts`](../src/engine/resolver/catalogue.ts) | Headers are compacted, then matched exactly against fixed lists. Marg's item export has "Company name" and "Salt Name" ([Marg Care](https://care.margcompusoft.com/Question.aspx/169430/1/How-to-export-item-list)), which compact to `companyname` and `saltname`; neither is in the lists. There is no .xlsx support, no manual override, and no manufacturer, pack, HSN, schedule or GTIN field. | Add synonyms, a user override map, a sample-row preview and .xlsx parsing | 4-7 h |
| 3 | Allergy groups cite the wrong source | `allergy_groups` in [`alert_rules.json`](../public/data/alert_rules.json) | Every group cites Khan 2022 as "Recalled, not re-read". The full text has no tetracycline section and says macrolide cross-reactivity "is unknown" ([Khan et al., JACI 2022](https://health.ucdavis.edu/media-resources/antibiotic-stewardship/documents/pdfs/guidelines/drug-allergy-aaaai-2022.pdf)). | Cite table and statement numbers. Re-source the tetracycline and macrolide groups or narrow them to exact-ingredient matches. | ~1 h |
| 4 | Giloy citation | `giloy_liver` in [`herbal.json`](../src/engine/herbal/herbal.json) | The URL points to PMC9348287, but the verified Kulkarni 2022 multicentre paper is [PMC9134809](https://pmc.ncbi.nlm.nih.gov/articles/PMC9134809/). | Replace the URL. Add that all 4 deaths were in patients with pre-existing chronic liver disease. | 15 min |
| 5 | Bhasma keyword matching | `herbo_mineral.keywords` in [`herbal.json`](../src/engine/herbal/herbal.json) | The generic word "bhasma" treats Liv.52's iron calx, Mandur ([label](https://www.doz.pl/apteka/p7187-Liv_52_tabletki_100_szt.)), and Septilin's conch-shell calcium calx, Shankh ([label](https://www.vitaminstore.nl/en/product/himalaya-septilin-tablets-141574)), like mercury preparations. It misses rasa formulations whose names have no keyword, such as the pratap lankeshwar vati in India's liver-injury registry ([INDILI](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103312/)). | Replace it with a `bhasma_classes` map based on the new Schedule E(1) | 5-6 h |
| 6 | Non-oral blind spot | `NON_SYSTEMIC` in [`ledger.ts`](../src/engine/ledger/ledger.ts) | Eye, ear, nasal, inhaled, topical, rectal and vaginal lines leave the mg ledger with a `not_systemic` note. No route-specific rule exists, so an eye drop raises no dose or route conflict today. | Keep the ledger exclusion and add a separate route-aware pass. Add a test that an allergy plus an ophthalmic line still alerts. | Part of rank 4 below |
| 7 | No regulatory schedule tags | `data/rxdata/schedule.py`, `schedule_hints.csv` | `schedule_hint` is a dosing-frequency flag (weekly methotrexate), not Schedule H1/X/NDPS. The name invites confusion. | Add a separate regulatory tag and document the difference | Part of rank 3 below |
| 8 | Supplement brand gaps | [`brands.json`](../public/data/brands.json), 1mg 2025 data | Supradyn, Becosules, Zincovit, Shelcal and Revital are absent. `Uprise-D3 6L Injection` (600,000 IU) has a blank composition. | Hand-curate the top OTC wellness SKUs from packs; the long tail comes through buyer catalogues | 6-10 h |
| 9 | Licence exposure | `ddi.json`, herbal and terminology sources | A third-party repo states DDInter v1 downloads are CC BY-NC-SA 4.0; v2 terms are unconfirmed ([GitHub](https://github.com/mnarayan1/DDInter)). IMPPAT is CC BY-NC ([IMPPAT](https://cb.imsc.res.in/imppat/)). CDCI needs a SNOMED Affiliate Licence ([NRCeS](https://www.nrces.in/services/national-releases)). | Confirm DDInter v2 terms before any B2B pitch. Record `licence` for every source. | Investigation |
| 10 | Name collision | Pitch | An open-source "Parchi" with nearly the same philosophy ("The OCR reads. The model understands. The gate decides.") is public ([GitHub](https://github.com/kotewar/parchi)). | Name it in the pitch and state the differences | 0 h |

Three rows matter more than the rest:

- **Row 2.** A pharmacy that drops a real Marg export into Parchi today gets name-only resolution. It also silently loses the composition cross-check, which is the step that sends disagreements to the review queue.
- **Row 3.** Clinician judges check citations like this one, and the source does not support two of the eight groups.
- **Row 9.** This is the only problem here that could affect the business model rather than the demo. DDInter supplies the 70,704 pairs in `ddi.json`, and a non-commercial licence would block selling to e-pharmacies.

## New inputs: verify handwriting against typed lines, and import ERP exports as they really are

### Handwritten prescriptions: a model may read the image but never choose the drug

No published benchmark tests 2026 frontier vision models on real Indian doctor handwriting. The closest evidence argues for caution.

The only Indian benchmark is MIRAGE (IIT Bombay with Medyug Technology), built on 743,118 *simulated* handwritten records. Zero-shot GPT-4o scored an **F1 of 7.57%** for medicine name plus dosage. The best fine-tuned model reached 82%, and the authors wrote that this accuracy "is in no way deployable and should not be deployed" ([arXiv 2410.09729](https://arxiv.org/html/2410.09729)).

Frontier models do much better on tidier writing:
- A 2026 Dutch study of 33 handwritten ten-drug lists gave GPT-4.1 a median of **38.5 out of 40** points ([PMC13241658](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)).
- An April 2026 benchmark found leading models about **85% accurate** on the discrete fields of a hard handwritten medical form, with GPT 5.4 hallucinating 6% of the time ([arXiv 2604.16504](https://arxiv.org/abs/2604.16504)).

Neither result transfers to Indian clinics. Pharmacy staff wrote the Dutch lists, not doctors in a rushed OPD. On the August 2026 WildHandBench, the best model still scored **71.85% against 77.09% for humans** ([arXiv 2608.22959](https://arxiv.org/abs/2608.22959)). Azure's handwriting OCR covers nine languages, and Hindi is not one of them ([Microsoft Learn](https://learn.microsoft.com/en-my/Azure/ai-services/computer-vision/language-support)). Indian Rx mix English brand names with Hindi or regional instructions, so a multimodal LLM is the practical choice.

**The dangerous failure is a confident, real, wrong drug, not garbled text.**
- On WildHandBench, 63-91% of model errors were "prior-driven": the model wrote a plausible word instead of what was on the page ([arXiv 2608.22959](https://arxiv.org/abs/2608.22959)).
- The Dutch study recorded ciprofloxacin 500 mg read as 30 mg and replaced with gliclazide. GPT-4.1 misread dose or frequency in **35% of "as needed" entries against 3% of simple ones** ([PMC13241658](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)).
- A developer gave a local model 20 corrupted Indian brand lines. Nine answers came back wrong, all at 0.95 confidence, including Pan 40 turned into Panadol and Glycomet into Metformin ([DEV](https://dev.to/sankalpkotewar/i-poisoned-20-drug-names-to-find-out-whether-a-local-model-belongs-in-a-pharmacy-5ekh)).

This hits Parchi directly. Its resolver fuzzy-matches to real brands, so a misread that already looks like a valid brand passes straight through. If a misread turns a dangerous drug into a safe one, the alert disappears and the engine cannot get it back. Confirming the input, not the alert logic, is the safety-critical step.

Buyers already pay people to do this reading. Truemeds says "a pharmacist will call to confirm the medicines in your prescription". A 2026 paper describes PharmEasy as depending "on human pharmacists to read and verify prescriptions" ([Truemeds](https://www.truemeds.in/upload-prescription); [IJSAT 2026](https://www.ijsat.org/papers/2026/2/10892.pdf)). That supports PLAN.md's premise, but it changes what a scanner is for: a second reader, not a replacement.

The live pain in 2026 is authenticity:
- A Times of India investigation found online pharmacies accepting AI-generated prescriptions with made-up hospital and doctor details.
- AIOCD called a strike of over 12.4 lakh chemists on 20 May 2026, citing fake and reused scanned Rx ([Medianama](https://www.medianama.com/2026/05/223-chemist-strike-against-e-pharmacies-may-20-ai-generated-prescriptions/)).

OCR cannot detect a forgery. Comparing the cart with the paper does catch items added to an order that the Rx does not support. PrescriptoAI already sells exactly that comparison ([PrescriptoAI](https://www.prescriptoai.com/)), which shows e-pharmacies are willing to pay for it.

The handwriting problem is also shrinking. On 27 August 2025 the Punjab and Haryana High Court held that a legible prescription is part of the Article 21 right to health. It ordered typed prescriptions within two years in Punjab, Haryana and PGIMER ([LawBeat](https://lawbeat.in/top-stories/messy-handwriting-on-docs-prescriptions-hc-says-it-violates-your-fundamental-right-1516607)). In December 2025 the NMC told every medical college to monitor prescription legibility ([Careers360](https://news.careers360.com/nmc-medical-colleges-directive-sub-committee-dtc-monitor-prescription-legible-handwriting-generic-drugs-right-to-health/amp)). Handwriting support is a bridge feature for about 2026-2028, which argues against investing heavily in it.

**The recommended build is Verify mode.** It works like this:

1. **Read.** A new online-only `api/scan-rx` function sends the image to a vision model with a strict JSON schema. The model returns brand, strength and sig exactly as written, uses "?" for unreadable characters, and is told not to correct spellings or substitute known drugs. It returns no ingredients and no alerts.
2. **Normalise.** The existing Track A resolver and Track B sig parser map both the image lines and the typed lines to canonical ingredient IDs.
3. **Compare.** A deterministic diff produces a review checklist: "on order, not on Rx", "on Rx, not on order", "strength differs", "frequency differs". This is a checklist, not a new alert tier.

The engine is untouched and stays offline. When the device is offline the button hides, like the other `api/` features. Estimated effort is **5-7 hours for one developer**, plus 2-3 hours to measure it on 20-30 synthetic prescriptions written by the team. The test set should include SOS lines and a deliberate look-alike pair. Report per-field accuracy and the number of wrong-drug proposals that slipped through unflagged.

Use synthetic images only in the demo. In production, DPDP makes the e-pharmacy the Data Fiduciary and Parchi plus the model vendor its processors. That means processor contracts, consent wording that mentions AI processing, cropping out patient and doctor details before upload, and zero retention ([Legal500](https://www.legal500.com/intelligence/india/food-drugs-healthcare-life-sciences/healthcare-data-across-borders-reconciling-indias-dpdp-framework-with-the-gdpr)).

**A fuller Scan-assist mode belongs on the roadmap.** In that mode the pharmacist builds the order from the image. It fits Parchi's rules only if:
- every line is confirmed explicitly beside its image crop, with no "accept all";
- model confidence never acts as a gate;
- SOS, timing and strength fields always go to review.

The kotewar/parchi gate checks that the name appears on the page, validates the strength format and sig pattern, and ignores OCR confidence. It caught all nine dangerous answers in its author's test, but that test was 20 synthetic lines ([GitHub](https://github.com/kotewar/parchi)). Production would need:
- a consented Indian Rx image set annotated by pharmacists;
- pinned model versions;
- a two-reader agreement policy;
- a check with CDSCO on whether this counts as software as a medical device.

The research estimates 3-6 months for 2-3 engineers. The pitch should name the open-source Parchi and set out the differences: an e-pharmacy verifying-pharmacist user, a 32k-brand resolver, a cumulative mg/day ledger and multi-doctor history.

### CSV onboarding: Excel files, salt masters and a mapping layer signed off by a pharmacist

Indian pharmacy ERPs do store salt (composition) data, but it is optional and messy, and they export Excel rather than a documented CSV:
- **Marg ERP** keeps salt in a separate Salt Master, and the salt field on items has to be switched on in settings ([Marg Care](https://care.margcompusoft.com/margerp/inventory-master/38698/1/How-to-export-all-Salt)). Marg also offers a bulk "Change Salt in All Item" edit, which suggests salt data is often wrong and gets fixed in bulk ([Marg Care](https://care.margcompusoft.com/margerp/multi-editing/34906/1/how-to-change-salt-in-all-item-in-marg-software)).
- **Logic ERP** imports .xls/.xlsx through manual "External Column Mapping", and its import guide mentions no salt field ([Logic ERP KB](https://kb.logicerp.com/logic-erp-learning-hub-tutorials-and-best-practices/utilities/import-masters-transactions-from-external-files/import-masters-from-external-file/import-item-master-from-excel)).
- **Uprow's** import template has only four mandatory fields: Item Name, Item type, GST rate and HSN ([Uprow](https://uprowerp.zohodesk.in/portal/en/kb/articles/importing-products-via-excel-files)).

Three things follow. In-browser .xlsx parsing is a prerequisite for any "self-serve" claim. An ERP salt column is a hint, not the truth, so Parchi should keep its rule that a disagreement with the database goes to review. HSN codes appear everywhere but only work as a non-drug sanity check (3004 vs cosmetics), never for ingredient identity.

The UX pattern is well established:
- **Flatfile and OneSchema:** upload, then map columns (auto-detected, overridable and remembered per tenant), then validate in bulk, then show a summary before commit ([Flatfile](https://support.flatfile.com/articles/7763163677-importing-data-with-flatfile-overview)).
- **OHDSI Usagi** adds the entity-mapping layer: a pre-computed best match with a score, a review step that records who approved it, and reuse of old mappings when the source list changes ([Usagi](https://github.com/OHDSI/Usagi/blob/master/README.md)).

Usagi-style string matching fails on **combination drugs and varied concentrations** ([OHDSI 2025](https://ohdsi.org/wp-content/uploads/2025/01/03_Krittaphas-Chaisutyakorn_TMT-to-RxNorm.pdf)), and Indian catalogues are full of fixed-dose combinations. So Parchi's existing comparison of ingredient sets and strengths should stay the core, with this UX wrapped around it.

Two shortcuts cut review work. First, volume is skewed: across seven US pharmacy sources, **1.4-4.4% of product codes made up half of prescription volume** ([Simonaitis & McDonald 2009](https://www.lhncbc.nlm.nih.gov/LHC-publications/PDF/pub2010034.pdf)). A review queue sorted by risk times volume therefore covers most orders after a few hundred decisions. Second, mapping a few hundred salt strings once lets thousands of SKUs inherit the mapping, while each still passes the database cross-check.

Governance should copy mature drug-knowledge-base deployments. There, the vendor's knowledge base is read-only and the customer's pharmacist informaticists map a local formulary onto it. Mapping must be complete before screening is trusted, because the rules fire on mapped medications ([Bluesight](https://bluesight.com/?p=4366); [Amazing Charts](https://amazingcharts.com/wp-content/uploads/2024/07/AC-12.0-Release-Notes.pdf)). For Parchi that means:

- **Precedence:** curated > dataset > tenant-confirmed > proposal.
- **Tenant limits:** a tenant mapping may add a brand or annotate one, but never change a curated composition. A conflict goes to a curator queue.
- **Mapping record:** each mapping stores `approved_by`, approver role, `approved_at`, catalogue version, method and a FHIR ConceptMap equivalence code ([HL7](https://hl7.org/fhir/R4/valueset-concept-map-equivalence.html)), and exports as CSV and FHIR to stay vendor-neutral.
- **Re-import:** the diff drops approval on any row whose name, salt or strength changed.
- **UI wording:** "mapped by" and "verified by", never "approved safe".

Catalogue files contain no personal data. Order files do. DPDP's substantive obligations apply from about **13 May 2027**, with penalties of up to ₹250 crore for security failures ([PIB](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf); [Mondaq](https://www.mondaq.com/dpdp-act-and-rules-2025-the-2026-compliance-milestones-businesses-cant-afford-to-miss/1830402)). Parse order CSVs in the browser only, mark name, phone and address columns "ignore" by default, and never send rows to `api/`.

For standards, plan a crosswalk rather than a competing code. The national Common Drug Codes for India (CDCI) held **77,598 branded medicines** in its January 2025 release, partly contributed by 1MG Technologies ([CDCI release notes](https://nrces.in/download/files/pdf/doc_SnomedCT-IndiaDrugExtension-PRODUCTION-ReleaseNotes_Current-en-US_IN1000189_20250115.pdf)). The Bharat Health Terminology Service went live on 29 June 2026. It is rate-limited, and production use needs authorisation ([NRCeS](https://www.nrces.in/news); [nha-in/docs](https://github.com/nha-in/docs/pull/122)). An optional `cdci_code` column is cheap. Bundling CDCI data waits for the licence check.

The research costs a full demo-able flow at about 14 hours: header synonyms with override and preview, .xlsx, a risk-times-volume queue whose bulk-accept excludes LASA, banned and disagreeing rows, mapping export, re-import diff, and PII-aware order import. Only the first two are core; the rest come next. The biggest unknown is that nobody on the team has seen a real Marg or GoFrugal export, so ask a pilot pharmacy for one.

## Clinical scope: allergy, route and supplement checks should remove false alerts as well as add new ones

### Allergy: use the 2022 practice parameter to decide when not to alert

Broadening allergy checks mainly means making them more precise, not casting a wider net. Clinicians overrode **81% of more than 150,000 hospital allergy warnings and 77% of outpatient ones**, and reviewers judged over 96% of those overrides appropriate ([AHRQ PSNet](https://psnet.ahrq.gov/issue/cross-sectional-observational-study-high-override-rates-drug-allergy-alerts-inpatient-and)). Opioid allergy alerts were overridden 71.8% of the time ([Wasserman et al. 2025](https://informatics.bmj.com/content/32/1/e101259)).

The full 2022 practice parameter supports both rules that alert and rules that stay quiet ([Khan et al., JACI 2022](https://health.ucdavis.edu/media-resources/antibiotic-stewardship/documents/pdfs/guidelines/drug-allergy-aaaai-2022.pdf)):

- **Penicillins and cephalosporins.** Cross-reactivity "is largely based on R1 side chains". Amoxicillin and ampicillin share R1 side chains with cefalexin, cefadroxil, cefaclor and cefprozil.
- **Carbapenems.** These can be given to penicillin- or cephalosporin-allergic patients without testing; cross-reactivity was 0.87%.
- **Non-antibiotic sulfonamides.** Table XIV lists drugs with no or weak cross-reactivity: furosemide, hydrochlorothiazide, chlorthalidone, indapamide, gliclazide, glimepiride, celecoxib, topiramate, sumatriptan, tamsulosin, and the glaucoma drugs dorzolamide, brinzolamide and acetazolamide.
- **NSAIDs.** A COX-2 inhibitor is a reasonable alternative in any NSAID hypersensitivity phenotype.

The sulfonamide list matters most for India, because **gliclazide, hydrochlorothiazide and indapamide are everyday chronic drugs**. A class-wide "sulfa" alert on them is pure noise. A follow-up survey adds that none of 452 penicillin-allergic patients tested positive to cefazolin or ceftriaxone ([JACI Global 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11609518)).

One caution: the research confirmed statements 14, 17, 21, 22, 23 and 34 in the body text. Other statement numbers came from a scrambled PDF table, and Table XII has to be transcribed from the original before it goes into a data file.

Structured capture is what makes those quieter tiers safe. FHIR AllergyIntolerance already defines `type` (allergy or intolerance), `criticality`, `verificationStatus`, `reaction.severity` and `manifestation` ([HL7](https://hl7.org/fhir/R4/allergyintolerance.html)). An additive, optional `allergy_details` field that mirrors it fits the CSV/FHIR rule. The tiers then follow deterministically:

- **Interrupt:** an exact ingredient match where criticality is high or unknown, or any match after anaphylaxis or SJS/TEN/DRESS.
- **Inform:** a match through a shared R1 side chain or another cross-reactive group.
- **Silent with a note:** intolerances, drugs the customer has tolerated before, and the parameter's no-cross-reactivity lists.
- **Vague labels** such as "sulfa" or "painkiller" get an Inform asking the pharmacist to clarify, never a class-wide Interrupt.

India-specific additions should stay modest:
- **HLA-B\*15:02.** The allele appears in about 1.2% of 5,469 North Indians ([Mishra 2022](https://vacres.pasteur.ac.ir/article-1-304-en.html)). CPIC advises that carriers not start carbamazepine or oxcarbazepine ([CPIC](https://cpicpgx.org/wp-content/uploads/2016/02/HLA_CBZ_OXC-CPIC-Guideline_7.31.2017.docx)). The Indian association rests on five cases ([Khor 2014](https://pubmed.ncbi.nlm.nih.gov/25266342)), so a carbamazepine new start gets an Inform, not more.
- **Excipients.** The parameter calls excipients "a very rare cause" of reactions, and no machine-readable excipient data exists for Indian brands. In 2016, **98% of the Indian pharma industry used animal-based capsules** ([Outsourcing-Pharma](https://outsourcing-pharma.com/Article/2016/04/11/India-seeks-input-on-proposal-to-replace-gelatin-with-cellulose-in-capsules)). The right build is a "capsule shells are commonly gelatin, check the pack" prompt for vegetarian customers, not an excipient database.
- **Egg allergy.** A Silent note saying egg allergy does not rule out flu vaccine shows that Parchi considered it ([ASCIA](https://allergy.org.au/patients/food-allergy/egg-allergy-flu-vaccine)).
- **Not yet sourced:** aminoglycoside cross-reactivity (neomycin, framycetin), ACE-inhibitor angioedema and cross-sensitivity among aromatic anticonvulsants. Do not encode these until a source is found.

**Allergy matching must ignore the route.** A fluoroquinolone allergy plus moxifloxacin eye drops must still alert. So must a "sulfa" allergy plus sulfacetamide eye drops, because sulfacetamide is an antimicrobial sulfonamide, unlike dorzolamide.

### Eye drops and other routes: add them through a route-aware pass, not through DDInter

Yes, add non-oral checks. Several eye drops have well-documented systemic effects:
- **Timolol.** About 80% of a topical dose is absorbed through the conjunctival and nasal mucosa and bypasses first-pass metabolism ([Cyprus J Med Sci 2021](https://cyprusjmedsci.com/articles/an-unexpected-cause-of-symptomatic-bradycardia-anti-glaucoma-eye-drops/cjms.2021.2546)). The US label lists asthma, severe COPD, sinus bradycardia and AV block as contraindications ([Apotex label](https://www.apotex.com/products/us/downloads/pre/timo_opso_oad.pdf)). The Irish SmPC says to avoid it with oral calcium antagonists in impaired cardiac function ([HPRA](https://assets.hpra.ie/products/Human/16649/LicenseSPC_PA0290-072-001_01072008020048.pdf)).
- **Brimonidine** is contraindicated under 2 years ([Drugs.com](https://Drugs.com/pro/brimonidine-eye-drops.html)).
- **Phenylephrine 10%** eye drops are contraindicated in hypertension ([FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/203510s005lbl.pdf)).

The India story is steroid eye drops. In an Indian series of children with vernal keratoconjunctivitis who developed steroid-induced glaucoma, **two-thirds were blind in one or both eyes**, and commentary puts more blame on prescribers than on parents ([AAO EyeNet](https://aao.org/eyenet/article/steroid-overuse-in-india); [IJO 2019](https://pubmed.ncbi.nlm.nih.gov/31546501/)). In a Karnataka survey, only about 40% of pharmacy workers knew the complications of steroid eye drops ([Cogprints](https://web-archive.southampton.ac.uk/cogprints.org/7010/)).

The other routes have similar evidence:
- **Nasal decongestants.** In April 2026 the MHRA advised against using xylometazoline or oxymetazoline sprays for more than 5 consecutive days ([MHRA](https://gov.uk/drug-safety-update/nasal-decongestant-sprays-and-drops-containing-xylometazoline-hydrochloride-slash-oxymetazoline-hydrochloride-increased-risk-of-rebound-congestion-rhinitis-medicamentosa-and-tachyphylaxis-with-overuse)).
- **Aminoglycoside ear drops.** ENT guidance says not to use ototoxic drops when the eardrum is perforated ([ENTnet](https://bulletin.entnet.org/home/article/21246052/acute-otitis-externa-danger-of-using-ototoxic-topical-drops)).
- **Steroid-antifungal creams.** These are tied to India's dermatophytosis epidemic. One rural North Indian study reports topical steroid misuse in 29.2% of patients, mostly clobetasol, with pharmacists and local healers as the main source. The 2018 ban on 328 FDCs, 24 of them topical steroid combinations, reached few of the products that were actually sold ([PMC8216118](https://pmc.ncbi.nlm.nih.gov/articles/PMC8216118); [PMC7239529](https://pmc.ncbi.nlm.nih.gov/articles/PMC7239529)). Check which figure belongs to which paper against the full text before putting it on a slide.

The architecture matters more than the rule list. DDInter 2.0 is keyed by drug, not by route ([NAR 2025](https://academic.oup.com/nar/article/53/D1/D1356/7740584)). Feeding non-oral lines into it would catch timolol with verapamil, but it would also produce false pairs such as ciprofloxacin eye drops with theophylline. The safe design has three parts:
1. Keep the ledger exclusion.
2. Add a `route_rules.json` pass that runs on every resolved line. Each rule is keyed on ingredient and route, plus strength, age or duration, and carries a `source` and `pharmacist_approved: false`.
3. Add a small `systemic_relevance` table of about 20 rows that decides which non-oral lines may reach DDInter.

Some additive fields are needed:
- `strength_percent`, to tell phenylephrine 10% from 2.5% and atropine 1% from 0.01%;
- optional pharmacist-ticked patient flags (contact lenses, perforated eardrum, asthma, COPD).

Other medicines on the Rx can stand in for a diagnosis. For example, an inhaler on the same Rx suggests asthma when timolol is also ordered.

| Rule | Trigger | Tier | Source | Est. hours |
|---|---|---|---|---|
| Ophthalmic beta-blocker + oral beta-blocker or rate-limiting CCB | Timolol/betaxolol drops with an oral beta-blocker, verapamil or diltiazem | Inform | [HPRA SmPC](https://assets.hpra.ie/products/Human/16649/LicenseSPC_PA0290-072-001_01072008020048.pdf) | 1.5 |
| Ophthalmic timolol + asthma proxy | Timolol drops with any inhaled bronchodilator, ICS or montelukast | Inform ("label lists asthma; confirm") | [US label](https://www.apotex.com/products/us/downloads/pre/timo_opso_oad.pdf) | 1-2 |
| Brimonidine under 2 | Brimonidine and age < 2 | Interrupt | [US PI](https://Drugs.com/pro/brimonidine-eye-drops.html) | 0.5 |
| Steroid eye-drop review | Ophthalmic steroid, alone or in an FDC, with age < 16 or no duration | Inform | [AAO EyeNet](https://aao.org/eyenet/article/steroid-overuse-in-india) | 1-2 |
| Steroid-antifungal cream FDC | Topical corticosteroid + azole/allylamine in one product | Inform; Interrupt if on the banned-FDC list | [PMC8216118](https://pmc.ncbi.nlm.nih.gov/articles/PMC8216118) | 2-3 |
| Nasal decongestant duration | Oxymetazoline/xylometazoline with sig > 5 days | Inform | [MHRA 2026](https://gov.uk/drug-safety-update/nasal-decongestant-sprays-and-drops-containing-xylometazoline-hydrochloride-slash-oxymetazoline-hydrochloride-increased-risk-of-rebound-congestion-rhinitis-medicamentosa-and-tachyphylaxis-with-overuse) | 1-2 |
| Aminoglycoside ear drops | Neomycin/framycetin/gentamicin otic | Inform ("ask whether the eardrum is intact") | [ENTnet](https://bulletin.entnet.org/home/article/21246052/acute-otitis-externa-danger-of-using-ototoxic-topical-drops) | 1 |

Defer two things:
- **Corticosteroid load summed across inhaled, nasal and oral routes.** It needs a beclometasone-equivalence table approved by a pharmacist.
- **Glaucoma duplication rules** (oral acetazolamide with dorzolamide drops; two prostaglandin analogues). Their label wording was not verified.

Before building, query DDInter for timolol, brimonidine and phenylephrine to avoid duplicating pairs it already holds.

### Supplements: vitamins yes, protein powders mostly no

In India the dangerous vitamin doses are already drugs. FSSAI caps a health supplement at one RDA per day, and "products exceeding the RDA must be sold as pharmaceutical drugs" ([NutraIngredients](https://www.nutraingredients.com/Article/2021/07/26/India-s-new-RDA-rules-see-increase-in-vitamin-A-C-zinc-levels-while-biotin-remains-unchanged); [ChemLinked](https://food.chemlinked.com/foodpedia/india-health-supplement-regulation)). In the repo's 1mg 2025 data, **343 brand names carry vitamin D3 60,000 IU and all but one are flagged Rx**, alongside 600,000 IU "6L" injections ([local 1mg CSV](../data/raw/kaggle_1mg_2025/India%20Medicines%20and%20Drug%20Info%20Dataset.csv); approximate regex counts). In 2025, vitamins and supplements became PharmEasy's most-ordered category for the first time ([MediaInfoline](https://www.mediainfoline.com/health/pharmeasy-health-report-2025-how-india-cared-for-its-health)). Carts that mix Rx and vitamins are therefore the norm, not an edge case.

The harm evidence comes from the prescription side:
- **Delhi-NCR:** all 16 vitamin D toxicity cases came from prescribed megadoses, with a median cumulative dose of **3.6 million IU** ([Kaur et al. 2015](https://pubmed.ncbi.nlm.nih.gov/26053339/)).
- **Kashmir:** all 32 patients had received multiple intramuscular injections, with a median of 4.2 million IU, and 78% had azotemia ([Misgar et al. 2019](https://pubmed.ncbi.nlm.nih.gov/31641640/)).

Both totals are easy to reach with common SKUs. A 60,000 IU capsule taken daily instead of weekly for 60 days is 3.6 million IU, and so are six 600,000 IU injections. The rule design has three parts:
- **Interrupt** when a product with at least 60,000 IU has a sig more frequent than weekly.
- **Inform** when two or more lines supply vitamin D, showing the summed IU.
- **Phase 2:** an Inform on cumulative IU across dated prescriptions from several doctors.

Do not compare a supervised weekly loading course with the 4,000 IU/day upper limit. FSSAI itself publishes those limits "only for information", and the comparison would fire on every routine 60K script. The work is mostly data: IU-to-µg conversion, alias unification and hand-curating blank compositions such as Uprise-D3 6L. The estimate is 4-6 hours.

Next in value per hour:
1. **Chelation spacing, already about 80% built** in `ddi_supplement.json`. Calcium carbonate lowered free T4 in levothyroxine patients ([JAMA 2000](https://pubmed.ncbi.nlm.nih.gov/10838651/)), and cut ciprofloxacin bioavailability to about 60% ([AAC 1992](https://pubmed.ncbi.nlm.nih.gov/1503446/)). The missing pieces are zinc and magnesium, alendronate, dolutegravir, and making multivitamin brands resolve to calcium, iron and zinc IDs (1-2 hours).
2. **Vitamin A in pregnancy.** Supplemental preformed vitamin A above 10,000 IU/day gave a prevalence ratio of 4.8 for cranial-neural-crest defects ([Rothman 1995](https://pubmed.ncbi.nlm.nih.gov/7477116/)).
3. **Vitamin K with acenocoumarol or warfarin.** Worded as "keep intake consistent", because a steady 150 µg/day actually improved INR stability ([Sconce 2007](https://pubmed.ncbi.nlm.nih.gov/17110451/)).
4. **Two lab notes that connect to the Phase 2 kidney re-check.** Creatine raises serum creatinine without lowering GFR ([BMC Nephrol 2025](https://pubmed.ncbi.nlm.nih.gov/41199218/)), and biotin can falsely lower troponin results ([FDA](https://www.fda.gov/medical-devices/vitro-diagnostics/biotin-interference-troponin-lab-tests-assays-subject-biotin-interference)).

Fish oil with antiplatelets stays Silent at most, because the bleeding concern was judged "unfounded" ([Harris 2007](https://pubmed.ncbi.nlm.nih.gov/17368278/)).

Protein powders are where the line falls. The Citizens Protein Project found **69.4% of 36 Indian protein supplements under-labelled** and 13.9% with aflatoxins ([PMC10994440](https://pmc.ncbi.nlm.nih.gov/articles/PMC10994440/)). A follow-up found 83% of pharmacy-channel "medical" whey products outside label tolerance, with progesterone in two of them ([MedBound Times](https://www.medboundtimes.com/amp/story/diet-and-nutrition/pharma-protein-powders-india-quality-study)). These harms are real, but only a lab test of the batch can detect them, and FSSAI does not publish supplement quality failures. A "protein label fraud" or "hidden steroid" check would therefore invent data. Parchi can do three things for protein products:
- add the creatine lab note;
- route the botanicals in herbal-blend proteins to the existing herbal module;
- later, add a CKD protein Inform tied to the CrCl band.

US DSLD label data does not cover Indian brands. NatMed and MSK should be used only as a reviewer's cross-check, never scraped.

## Paediatric age gates, Schedule H1 and AYUSH make the problem statement clearly Indian

### Children: the strongest new checks are age gates backed by gazette numbers

**Paediatric age gates are the highest pitch value per hour of anything in this research.** They need no new patient input, and both Indian regulatory anchors date from the past thirteen months:
- **Background.** About two dozen children died after taking Coldrif cough syrup, which tested at **48.6% diethylene glycol** against a 0.1% limit ([Chemistry World](https://www.chemistryworld.com/news/23-indian-childrens-deaths-linked-to-contaminated-cough-syrup/4022312.article)).
- **DGHS advisory, 3 October 2025.** Cough and cold medicines should not be prescribed or dispensed to children under 2 and are "generally not recommended" under 5 ([The South First](https://thesouthfirst.com/news/child-deaths-no-cough-cold-medicines-for-children-below-2-years-says-health-advisory/)).
- **S.O. 4595(E), 18 August 2026.** Under Section 26A, it restricts every chlorpheniramine + phenylephrine FDC with a "not below four years" warning ([Medical Dialogues](https://medicaldialogues.in/news/industry/pharma/health-ministry-restricts-chlorpheniramine-phenylephrine-fdcs-for-children-below-4-mandates-warning-labels-177776)).
- **Other age limits:** codeine is contraindicated for cough under 12 by the EMA ([EMA](https://www.ema.europa.eu/en/news/codeine-not-be-used-children-below-12-years-cough-cold)); no Indian notice was found, so the source field must say so. Promethazine carries a US boxed warning under 2 ([DrugCentral](https://drugcentral.org/label/5f079815-f48b-8b21-2130-7f791d967c9a/view)). Tetracyclines carry the under-8 caution, with CDC data supporting short doxycycline courses ([CDC](https://www.cdc.gov/rmsf/doxycycline/)).

The repo has no rule with an upper age bound, so this needs:
- a new `age_below` key in `patient_rules` that accepts fractional years or months;
- a matcher for "this one product contains both ingredients" (CPM + PE);
- a test that runs every cough and cold brand against a 1-year-old to prove the class tags are complete.

The estimate is 4-6 hours. Be honest about one point: Coldrif was a contamination failure, which Parchi cannot detect beyond NSQ and recall lists. The age gate enforces the advisory issued in response. Word alerts as "the Ministry advises against", not "banned".

Paracetamol strength confusion is the main mg/kg hazard. Indian drops run up to 150 mg/mL, nearly three times the strongest suspension, and are "sold without oral syringes or dosing spoons" ([JPP 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3157121)). One Indian study names the 250 mg/5 mL syrup as the commonest cause of accidental single overdose (46%) ([Indian Pediatr 2014](https://www.indianpediatrics.net/oct2014/oct-839.htm)). When weight is known, the existing mL-to-mg ledger plus the 60 mg/kg/day limit already catches this. Otherwise, a counselling prompt ("confirm drops vs syrup at hand-over") is the honest output.

Extending mg/kg limits to nine common OPD drugs is roadmap work, about 1-2 days of quoting labels. No licensable Indian paediatric dataset exists; the IAP formulary app has no data licence ([App Store](https://apps.apple.com/dk/app/iapdf/id591789800)).

For other special populations:
- **Pregnancy** is already strong: 17 rules, each with a verbatim openFDA label quote ([alert_rules.json](../public/data/alert_rules.json)). Add only a 2-3 hour "female of reproductive potential" prompt for valproate and isotretinoin.
- **Hepatotoxic stacking with anti-TB therapy** is the best first post-hackathon item. It needs no new input. The LiverTox Master List is an uncopyrighted Excel file updated yearly ([NBK571102](https://www.ncbi.nlm.nih.gov/books/NBK571102/)), and an Indian cohort found 3.8% drug-induced liver injury on TB treatment, with alcohol and age over 60 as risk factors ([Gaude 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4408708/)).
- **Roadmap:** a lactation flag (LactMed allows free bulk download, [NBK501922](https://www.ncbi.nlm.nih.gov/books/NBK501922/)) and a STOPPFall count of fall-risk medicines ([PMC8244563](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244563)).
- **Defer:** Schwartz paediatric eGFR and Child-Pugh bands. Both need inputs pharmacists rarely have.

### Regulated drugs: Schedule H1 turns Phase 2 history into a compliance product

The strongest business case comes from Schedule H1. That one legal hook covers habit-forming drugs, 3rd- and 4th-generation antibiotics and anti-TB drugs. Each sale needs a prescription and a register kept for three years ([NTEP](https://ntep.in/node/938)).

The enforcement context is current:
- **Pregabalin** joins Schedule H1 under G.S.R. 377(E), **effective 12 November 2026** ([Medical Dialogues/PTI](https://medicaldialogues.in/amp/news/industry/pharma/punjab-seizes-rs-2064-crore-worth-of-medicines-suspends-520-chemist-licences-in-drug-law-crackdown-181441); [The Week](https://www.theweek.in/news/health/2026/05/22/pregabalin-schedule-h1-india.amp.html)).
- **Punjab** suspended **520 chemist licences** in its crackdown and said medicines "that can be misused for intoxication remain available online" with no regulatory framework (same source).
- **Uttar Pradesh:** the ED is pursuing about Rs 1,000 crore of proceeds of crime from a codeine-syrup racket ([Tribune](https://www.tribuneindia.com/news/india/ed-raids-across-three-states-in-cough-syrup-smuggling-case)).
- **Tramadol** has been an NDPS psychotropic substance since 2018 ([BioSpectrum](https://biospectrumindia.com/news/22/10849/govt-brings-tramadol-under-narcotics-law-regulation.html)).

Parchi has no regulatory schedule tags today. The build has four parts:
1. Hand-curate about 60 ingredients from the gazette lists (H1 plus pregabalin, Schedule X, NDPS).
2. Add an early-refill rule that reads the Phase 2 timeline's overlapping supply windows per ingredient and prescriber, and tighten the existing 7-day refill grace for these drugs.
3. Export the review log as the H1 register in CSV.
4. Optionally, add a `consult_mode` field on `Prescription` to flag NDPS or Schedule X drugs on a teleconsultation, which the Telemedicine Practice Guidelines prohibit ([Khaitan & Co](https://khaitanco.com/thought-leaderships/Telemedicine-Practice-Guidelines)).

Wording must inform, never accuse: "Third alprazolam supply in 30 days from 2 prescribers; check the prescriptions." The estimate is 6-10 hours, and no LLM is involved.

Paid incumbents already cover drug-disease and allergy screening ([eMIMSplus](https://apps.apple.com/app/id6745163411); [Medi-Span](https://www.wolterskluwer.com/en/solutions/medi-span/medi-span/clinical-screening)). The research found **no public evidence** that any of them handles Indian H1 registers, cross-order early refills or TB duties. That gap is the clearest one. "No public evidence" is not the same as confirmed absence, because e-pharmacies' internal tools are not public.

Tuberculosis and antibiotics fold into the same story:
- **TB.** A 2018 notification requires chemists who dispense anti-TB drugs to notify the patient to the district officer, with penal provisions ([Medical Dialogues](https://medicaldialogues.in/attention-doctors-chemists-notify-tb-or-go-to-jail)). NTEP publishes official weight-band dosing for the adult 4FDC ([NTEP](https://ntep.in/node/770)), and India notified 26.07 lakh TB cases in 2024 ([MoHFW](https://mohfw.gov.in/press-info/8566)). A weight-band check plus a "notify to Nikshay" flag takes 4-6 hours. The alert reflects a legal duty, not a judgement call.
- **Antibiotics.** In a 2024-25 simulated-patient study, **76% of 200 Coimbatore pharmacies dispensed antibiotics without a prescription** ([IJCMPH](https://www.ijcmph.com/index.php/ijcmph/article/view/13853)). Duplicate antibiotics across doctors, unusual course lengths and antibiotics in a cart with no Rx extend the existing AWaRe rules in 3-5 hours.

### AYUSH: treat products as real medicines with real ingredients

AYUSH belongs in scope because it already sits in the same carts:
- **46.3% of rural and 52.9% of urban Indians** used AYUSH in the past year ([MoSPI](https://mospi.gov.in/sites/default/files/press_release/PressNote_Ayush_13062024N.pdf)).
- In an NCD clinic, 49.8% of patients used allopathic and alternative treatment together ([PMC7941049](https://pmc.ncbi.nlm.nih.gov/articles/PMC7941049)).
- Complementary and alternative medicines are the **second most common cause of drug-induced liver injury in India's registry (13.9%)** ([INDILI](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103312/)).
- E-pharmacies sell Himalaya Diabecon as an OTC line ([1mg](https://csc.1mg.com/otc/himalaya-diabecon-tablet-otc64086)), so it can arrive in the same cart as metformin. No new input channel is needed.

No machine-readable, licence-clear dataset of brand compositions exists, but a few labels unlock the existing rules:
- **Septilin** contains giloy and liquorice ([label](https://www.vitaminstore.nl/en/product/himalaya-septilin-tablets-141574)), so `giloy_liver` and the liquorice rules would fire.
- **Diabecon** lists gymnema, guggulu and trikatu plus zinc, tin and mica bhasmas ([1mg](https://csc.1mg.com/otc/himalaya-diabecon-tablet-otc64086)).

A brand table for about 6-10 products, transcribed from Indian labels with variant and `checked_on` fields, takes 4-6 hours. It also exposes a dose problem: Septilin holds 6 mg of liquorice per tablet, so an "established" potassium rule firing on it overstates the risk. Matches derived from brands need a "small amount; product-level evidence not assessed" caveat.

Three new rules have strong sources:
- **Ispaghula (isabgol).** The EMA monograph says it can delay absorption of digoxin, coumarins, carbamazepine and lithium, so doses should be spaced half to one hour apart ([EMA](https://www.ema.europa.eu/en/documents/herbal-monograph/superseded-community-herbal-monograph-plantago-ovata-forssk-semen_en.pdf)).
- **Senna.** Its hypokalaemia potentiates cardiac glycosides and QT drugs ([EMA](https://www.ema.europa.eu/en/documents/herbal-monograph/superseded-community-herbal-monograph-cassia-senna-l-fructus-and-cassia-angustifolia-vahl-fructus_en.pdf)). Do not alias "cassia": Liv.52's *Cassia occidentalis* is not senna.
- **Shankhpushpi with phenytoin.** An Indian report linked the combination to lost seizure control ([AGRIS](https://agris.fao.org/search/en/records/65de503b4c5aef494fdb9af2)). The evidence is old and limited, but the severity is high.

The mineral flag needs its new anchor. Saper's study found that about 40% of rasa shastra products bought online contained lead, mercury or arsenic ([CDC Stacks](https://stacks.cdc.gov/view/cdc/223623)). On 15 September 2026, G.S.R. 862(E) replaced Schedule E(1), expanded the mineral entries, treated any ingredient containing arsenic or mercury as Schedule E(1), and required the caution "to be taken under medical supervision" ([TeamLease](https://teamleaseregtech.com/updates/article/60189/drugs-thirteenth-amendment-rules-2026/); [Outlook](https://www.outlookindia.com/healthcare-spotlight/ayush-ministry-expands-list-of-poisonous-substances-in-traditional-medicines)). The proposed build:
- A `bhasma_classes` map that separates toxic-metal entries (mercury, arsenic, lead, copper) from iron, calcium and zinc calxes.
- An `e1_needs_prescription` flag. A 2022 CCPA advisory reportedly allows e-commerce sale of E(1) drugs only against a prescription ([TaxGuru](https://taxguru.in/corporate-law/advisory-concerning-sale-ayurvedic-siddha-unani-drugs.html)).

This flag states a regulatory fact, not a clinical judgement, which makes it safe to show. The gazette PDF was not obtained, so transcribe the list from the gazette itself before encoding.

Wording is political, so it has to be neutral. The Ministry rebutted the giloy findings ([Udayavani](https://udayavani.com/?p=1080118)), and a hepatologist who publicised them received a notice from the Kerala council for Indian systems of medicine ([The News Minute](https://www.thenewsminute.com/article/doctor-flags-popular-herb-causing-liver-injury-gets-notice-ayush-practitioners-160634)). Alerts should:
- name the plant and the product, not the system;
- say who reported what and how strong the evidence is;
- give the pharmacist an action they own ("ask how long and how much");
- carry `study_type` and severity badges;
- link to the AyushSuraksha reporting portal, which recorded only about 3,000 adverse reactions since 2018 against roughly half the population using AYUSH ([ThePrint](https://theprint.in/health/65000-misleading-ads-flagged-3000-adverse-reactions-recorded-since-2018-says-ayush-secretary/2873880/)).

Homeopathy has no credible interaction evidence at high dilution. The only defensible check is ethanol in mother tinctures given with metronidazole or tinidazole ([FAMHP](https://www.afmps.be/sites/default/files/downloads/20120921_EN_Use%20of%20ethanol%20in%20children.pdf)). That is inferred, belongs at the Silent tier, and is low priority.

### Domains that would weaken the pitch

Several plausible domains are distractions:
- **Pharmacogenomics:** pharmacies hold no genotypes and screening is not practised in India ([Frontiers 2020](https://www.frontiersin.org/journals/genetics/articles/10.3389/fgene.2020.607532/epub)). The carbamazepine new-start Inform above is enough.
- **Full drug-disease screening:** incumbents already sell it.
- **QT stacking from CredibleMeds:** the list needs a commercial licence ([CredibleMeds](https://crediblemeds.org/licenses/license1)). Label-based tags signed off by a pharmacist are a later path.
- **Food and fasting interactions:** these belong in the leaflet, not the alert engine.
- **NPPA price flags:** already "Not doing", and they conflict with buyer margins.
- **Also out:** cold chain, veterinary products, Child-Pugh bands, excipient databases and protein-quality claims.

## Ranked plan: about 30 dev-hours to build now, the rest on the roadmap slide

The ranking weighs five things:
- India-specific harm evidence with a primary or regulator source;
- reuse of existing engine shapes;
- no new patient input;
- demo value;
- fit with Parchi's design rules.

Cut from the bottom when hours run out. Hours are the research's engineering estimates, not measurements.

| Rank | Build now | Tracks | Est. h | Cum. h | Why here; design-rule notes |
|---|---|---|---|---|---|
| 1 | Repo fixes: rows 1, 3, 4 and 10 of the problem table, and start the DDInter licence check (row 9). Rows 2, 5, 6 and 7 are fixed inside ranks 6, 8, 4 and 3. | A, C, D | 3 | 3 | Credibility. Every later item touches these files. |
| 2 | Paediatric age gates (DGHS 2025, S.O. 4595(E), codeine, promethazine, tetracycline) + class-sweep test | C, A | 5 | 8 | Highest pitch value per hour; no new input; worded as advice |
| 3 | Regulated-drug layer: H1/X/NDPS tags, early refill across prescribers, H1 register export | A, C, D | 8 | 16 | Unique use of Phase 2; legal hook 18 days away; deterministic; no accusation in wording |
| 4 | Route-aware pass (7 rules above) + route-agnostic allergy + sulfonamide, coxib and carbapenem silent lists | C, A | 9 | 25 | Closes the eye-drop blind spot and removes common false alerts; every row `pharmacist_approved: false` |
| 5 | Vitamin D frequency and duplicate sources + finish chelation spacing | B, C, A | 7 | 32 | Indian case series; mostly data; thresholds need sign-off |
| 6 | Catalogue import that works with Marg: synonyms, override, sample preview, .xlsx | A, D | 5 | 37 | Makes the B2B onboarding claim true |
| 7 | Handwriting Verify mode + 20-30 synthetic-Rx measurement | B, A, D | 9 | 46 | Answers the obvious judge question; online-only; LLM transcribes verbatim, code decides |
| 8 | AYUSH: ispaghula, senna, shankhpushpi; top-6 brand table; bhasma classes + E(1) flag | C, A | 13 | 59 | Demo cart Glycomet + Amaryl + Diabecon DS; regulatory flag rather than a clinical judgement |
| 9 | Structured allergy details (FHIR-shaped) + R1 side-chain subgroups | C, D | 5 | 64 | Precision; needs Table XII transcribed from the original PDF |
| 10 | TB weight-band check + Nikshay notify flag | C, B | 5 | 69 | Legal duty, small official table |

Pitch these as roadmap only:

| Roadmap item | Why not now | Rough effort |
|---|---|---|
| Scan-assist mode and production handwriting | No Indian accuracy evidence; needs a consented dataset, DPDP processor stack and SaMD check | 3-6 months, 2-3 engineers |
| CDCI/BHTS crosswalk, GTIN/QR scan at verification | SNOMED licence; BHTS rate limits; H2 QR coverage grows only from 2027 | 2-4 months |
| Multi-tenant mapping governance, server sync, second reviewer | Needs roles, audit log and India hosting | 1-3 months |
| Multivitamin unit conversions, salt-to-elemental tables, top-50 OTC wellness SKUs | Mostly label reading plus sourced conversion data | 1-2 weeks |
| Hepatotoxic stacking with anti-TB therapy via LiverTox; paediatric mg/kg for 9 OPD drugs; lactation flag; STOPPFall | Data curation and pharmacist sign-off dominate | 1-2 days each |
| Corticosteroid total load across routes; QT and hypoglycaemia stacking | Equivalence tables and licensed or signed-off tags | Weeks |
| Classical rasa formulations from AFI; homeopathy potency parser; liquorice dose gating | Unverified thresholds; no machine-readable AFI | Days to months |

Every new data row ships with `source` and `pharmacist_approved: false`. Most of this plan is therefore data and sign-off work, not engine work. Bring a short list to the pharmacist session:
- age-gate wording;
- early-refill windows for H1 drugs;
- vitamin D thresholds;
- route-rule tiers;
- whether verification desks value Verify mode or Scan-assist more.

Several legal anchors were read only through secondary reports: the DGHS PDF, S.O. 4595(E), G.S.R. 862(E), G.S.R. 506(E) and the full H1 list. Open the gazette text before encoding each one.

## Conclusion

The research changes what Parchi's differentiator is. Pharmacology depth is where paid incumbents win, and pairwise interaction checking is already sold in India. What nobody publicly offers is a checker that knows Indian dispensing law, such as a two-month-old Section 26A notice, a pregabalin H1 date or a six-week-old Schedule E(1). Parchi can also read a customer's whole multi-doctor history, and the strongest additions need both. Early refill of an H1 drug across two prescribers is invisible to a single-prescription checker and has a statutory register attached. Several of the best checks also make Parchi quieter rather than louder: the sulfonamide and carbapenem silent lists, the vitamin D rule that leaves supervised weekly loading alone, and AYUSH alerts that name the ingredient instead of condemning the system. With allergy alerts overridden more than three-quarters of the time, being precise counts as a safety feature in its own right.

The handwriting evidence also clarifies where Parchi's safety boundary sits. A misread that swaps a dangerous drug for a safe one removes the alert before the deterministic engine ever runs, so any image-input feature is only as safe as its line-by-line confirmation step. That is why Verify mode, which double-checks lines a human already typed, is the right first step, and why "scan replaces typing" should stay off the slides until someone measures it on real Indian prescriptions. The binding constraint across all of this is no longer engineering hours. It is verified sources and pharmacist sign-off. The team that turns up to its pharmacist session with gazette texts already transcribed will ship more of this list than the team that writes more code.
