# Parchi pitch deck: clinical and patient-safety evidence fact sheet (verified 24 Oct 2026)

Verdict key: VERIFIED = matches primary source. CORRECTED = the claim needs a fix (corrected value given). UNVERIFIABLE = could not confirm from a primary source.
Method: I checked primary records through PubMed/PMC (NCBI E-utilities), Crossref and PMC full text. ScienceDirect, SAGE and IOS Press returned 403 errors, so I read those papers through their PubMed/PMC/Crossref records.

## Q1. Poly TN et al., JMIR Med Inform 2020: overridden alerts systematic review

### Takeaway
VERIFIED, with one nuance: the 82–99% "duplication overrides were appropriate" figure rests on only two studies (both by Nanji et al.). The deck should say "in the studies that assessed it."

### Cited Findings
- Citation: Poly TN, Islam MM, Yang HC, Li YC(J). "Appropriateness of Overridden Alerts in Computerized Physician Order Entry: Systematic Review." JMIR Med Inform. 2020;8(7):e15653. doi:10.2196/15653. PMID 32706721. PMCID PMC7400042. Note: the DOI is e15653, not e17903. — [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/); [TMU record](https://hub.tmu.edu.tw/en/publications/appropriateness-of-overridden-alerts-in-computerized-physician-or-2/)
- 23 studies included. Searched January 2000 to March 2019. VERIFIED — [PMC7400042](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/)
- Overall override rate: "The range of average override alerts was 46.2%-96.2%" (abstract). VERIFIED — [PMC7400042](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/)
- Override rates by alert type (Results section, not the abstract). All VERIFIED — [PMC7400042](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/)
  - Drug-drug interaction (DDI): 56.3–95.6%.
  - Renal: 74.4–97.1%.
  - Geriatric: 2.1–87.1%.
  - Also reported: drug-allergy 46–95%, dose 82–96.8%.
  - Duplication has no range. The two per-study values are 51.9% (Nanji 2018) and 28.6% (Nanji 2014).
- Share of overrides judged appropriate: "An average of 29.4%-100% of the overrides alerts were classified as appropriate." By alert type:
  - Drug-allergy 63.4–100%.
  - DDI 0–95%.
  - Dose 43.9–88.8%.
  - Geriatric 14.3–57%.
  - Renal 27–87.5%.
  - Source: [PMC7400042](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/)
- Duplication overrides appropriate, 82–99%. VERIFIED as written in the Discussion, but Table 2 gives 82.0% (Nanji 2014) and 98.0% (Nanji 2018). The safest wording is "82–98% in the two studies that assessed it." Formulary alerts were 82.8% appropriate (Her et al). — [PMC7400042](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/)
- Authors' conclusion: large proportions of drug duplication, drug-allergy and formulary alerts were appropriate to override, and "these groups of alerts can be primary targets to revise and update the system for reducing alert fatigue." — [JMIR abstract via TMU hub](https://hub.tmu.edu.tw/en/publications/appropriateness-of-overridden-alerts-in-computerized-physician-or-2/)
- Most common override reasons were "will monitor" and "patients have tolerated before." These come from the preprint; I did not check them against the final paper. — [JMIR preprint 15653](https://preprints.jmir.org/preprint/15653)

### Inferences
- This supports Parchi's 3-tier design. Overrides cluster in low-value categories such as duplication and formulary. A tool that suppresses or downgrades those, and keeps hard stops for overdose and banned combinations, addresses the documented cause of alert fatigue.
- The setting is hospital CPOE (prescriber-facing), not pharmacist dispensing. Slides should say "in hospital order-entry systems."

### Gaps
- The source gives no pooled override estimate. All figures are ranges across heterogeneous studies.

## Q2. Sicard J et al., Ther Adv Drug Saf 2025: LLMs and DDIs

### Takeaway
VERIFIED. Over-flagging is the key point for the pitch: in negative controls, specificity was only 0.68 (ChatGPT), 0.64 (Claude) and 0.36 (Gemini).

### Cited Findings
- Citation: Sicard J, Montastruc F, Achalme C, Jonville-Bera AP, Songue P, Babin M, Soeiro T, Schiro P, de Canecaude C, Barus R. "Can large language models detect drug-drug interactions leading to adverse drug reactions?" Ther Adv Drug Saf. 2025 May 16;16:20420986251339358. doi:10.1177/20420986251339358. PMID 40385316. PMCID PMC12084699. — [PubMed record via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=40385316&rettype=abstract&retmode=text); [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
- Data source: individual case safety reports (ICSRs) from the French National Pharmacovigilance Database. 82 ICSRs had DDIs and 22 had none (negative controls). Of 137 DDI reports extracted, 55 were excluded as redundant. VERIFIED — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
- Models tested: ChatGPT-4o, Claude 3.5 Sonnet and Gemini 1.5 Flash. — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
- DDI detection: ChatGPT 99% (95% CI 98–99), Claude 95%, Gemini 95% (95% CI 90–99). VERIFIED — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
- Fully correct answers across all DDI questions: ChatGPT 66%, Claude 68%, Gemini 33%. VERIFIED — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
- Negative controls: specificity was 0.68 (ChatGPT), 0.64 (Claude) and 0.36 (Gemini). On the drug-detection question that means about 7, 8 and 14 false positives out of 22. The counts come from Table 1 as read by the fetch tool, so recheck them before printing. — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
- Over-flagging quotes (VERIFIED wording):
  - Abstract conclusion: "LLMs can detect DDIs leading to pharmacovigilance cases, but cannot reliably exclude DDIs in cases without interactions." — [PubMed 40385316](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=40385316&rettype=abstract&retmode=text)
  - Full text: LLMs "often detect non-existent DDIs"; they "invent drug interactions to explain ADRs"; and they "struggled to exclude the lack of interaction in ADR cases." — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)
  - The authors add that pharmacologists remain essential to judge whether a DDI contributed to an ADR. — [PMC12084699](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084699/)

### Inferences
- This supports Parchi's rule that LLMs may parse text but never decide alerts. A deterministic engine avoids invented interactions, and over-flagging is exactly what feeds alert fatigue.

### Gaps
- I did not see a CI reported for Claude's 95% detection rate.

## Q3. Thapa et al., Explor Res Clin Soc Pharm 2025: ChatGPT and DDIs

### Takeaway
CORRECTED. The numbers are right, but the study is from Nepal, not India. "Documentation 20.6%" means ChatGPT agreed with Micromedex's documentation-quality rating only 20.6% of the time. It is not a rate at which interactions were documented. The PII S2667276625000964 does not match this paper: its DOI resolves to PII S2667276625000058.

### Cited Findings
- Citation: Thapa RB, Karki S, Shrestha S. "Exploring potential drug-drug interactions in discharge prescriptions: ChatGPT's effectiveness in assessing those interactions." Explor Res Clin Soc Pharm. 2025 Jan 15;17:100564. doi:10.1016/j.rcsop.2025.100564. PMID 39896176. PMCID PMC11786904. Full author names are not listed here, only initials. — [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=39896176&rettype=abstract&retmode=text); [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
- The DOI resolves to `linkinghub.elsevier.com/retrieve/pii/S2667276625000058`. I could not resolve S2667276625000964 to any article. — [doi.org redirect](https://doi.org/10.1016/j.rcsop.2025.100564)
- Setting: General Medicine Ward, Koshi Hospital (government tertiary care), Biratnagar, Nepal, January–April 2024. — [PMC11786904](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
- Patients and drugs: 301 discharged patients, 1,551 drugs (5.15 per patient). VERIFIED — [PMC11786904](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
- Potential DDIs: 574 in 181/301 patients (60.13%), 3.17 per patient. VERIFIED — [PMC11786904](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
- ChatGPT-4.0 compared against the Micromedex Drug Interaction Checker. All VERIFIED — [PMC11786904](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
  - Occurrence: 574/574 (100%).
  - Severity: 214/574 (37.3%).
  - Onset: 374/574 (65.2%).
  - Documentation quality: 118/574 (20.6%).
- The authors recommend that clinical pharmacists verify interactions using established sources. — [PMC11786904](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
- Related paper by the same group (possibly the source of the confusion): Thapa RB, Khadka R, Dahal P, Karki S, Shrestha S. "Dosage adjustments in renal impairment among medical ward patients: ChatGPT® and DeepSeek® models' effectiveness in assessing those adjustments." Explor Res Clin Soc Pharm. 2025;21:100698. doi:10.1016/j.rcsop.2025.100698. PMCID PMC12775794. — [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=41509008&rettype=abstract&retmode=text)

### Inferences
- Suggested slide wording: "ChatGPT found every interaction but got severity right only 37% of the time (Nepal, 2025)." This pairs well with Sicard: LLMs find interactions but cannot grade them reliably.

### Gaps
- I could not identify which article PII S2667276625000964 belongs to. It may be the renal-dosing paper (100698), but that is unconfirmed.

## Q4. Frontiers in Pharmacology 2021 meta-analysis: PIM use in older Indian adults

### Takeaway
VERIFIED. Pooled PIM use was 28% (95% CI 24–32) across 27 studies. The same paper gives polypharmacy 49% and hyperpolypharmacy 31%, both usable as scale statistics.

### Cited Findings
- Citation: Bhagavathula AS, Vidyasagar K, Chhabra M, Rashid M, Sharma R, Bandari DK, Fialova D. "Prevalence of Polypharmacy, Hyperpolypharmacy and Potentially Inappropriate Medication Use in Older Adults in India: A Systematic Review and Meta-Analysis." Front Pharmacol. 2021;12:685518 (published 19 May 2021). doi:10.3389/fphar.2021.685518. PMCID PMC8173298. — [PMC8173298](https://pmc.ncbi.nlm.nih.gov/articles/PMC8173298/)
- Scope: 27 studies (of 1,890 screened) of adults aged 60+ in India, covering inception (2002) to September 2020. — [Frontiers/DOAJ record](https://doaj.org/article/1b0685215ad04518b3454acb9a24b66f)
- Pooled prevalences ("among older Indian adults"). All VERIFIED — [PMC8173298](https://pmc.ncbi.nlm.nih.gov/articles/PMC8173298/)
  - PIM use: 28% (24–32; p < 0.01).
  - Polypharmacy: 49% (95% CI 42–56).
  - Hyperpolypharmacy: 31% (21–40).

### Inferences
- This supports Parchi's age-specific checks (Beers-based).

### Gaps
- None for this item.

## Q5. Lancet Regional Health – Southeast Asia 2024: "LASA drugs in India"

### Takeaway
VERIFIED. The "rampant" quote and the identical-brand-name examples are both in the primary text.

### Cited Findings
- Citation: Neelakantan M, Sharma P, Kulkarni A. "Look-alike, sound-alike (LASA) drugs in India." Lancet Reg Health Southeast Asia. 2024;26:100425 (online 16 May 2024). doi:10.1016/j.lansea.2024.100425. PMCID PMC11127203. Article type is a Viewpoint. — [PMC record via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11127203); [DOAJ](https://doaj.org/article/356f0b1c9fd84768a6350339f5a8ae45)
- Quotes (VERIFIED verbatim), all from [PMC11127203](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11127203):
  - "Prescription and dispensing errors are rampant in India, but we do not have any clue about the scale of the issue."
  - "It is likely to be quite large considering that most prescriptions in India are handwritten lists of brand names"
  - "Identical brand names contribute the most to such medication errors."
  - "There are instances of two different drugs having same name but manufactured and marketed by different entities."
- Identical-brand examples from the paper:
  - 'Medzol' is used for both midazolam and pantoprazole.
  - 'Flucor' is used for both fluconazole and flupentixol + melitracen.
  - 'Linamac' is used for both lenalidomide and linagliptin.
  - Source: [PMC11127203](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11127203)
- Many brands of one molecule: molnupiravir is sold as Cipmolnu, Molnunat, Molflu, Molxvir, Molulife, Molnumize and Molnutor. — [PMC11127203](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11127203)

### Inferences
- The authors admit "we do not have any clue about the scale." That makes this a strong problem slide, but it is not a source for a numeric scale figure.

### Gaps
- The paper gives no national count of brands.

## Q6. Joshi MC et al., 2007: brand-name confusion at a Delhi hospital

### Takeaway
PARTLY CORRECTED. The journal is the *International* Journal of Risk & Safety in Medicine. The abstract says "a general hospital in Delhi" over 6 months. "244 errors" fits the published percentages exactly. "113,346 entries" does not appear in the abstract, so it is UNVERIFIABLE.

### Cited Findings
- Citation: Joshi MC, Joshi HS, Tariq K, Ejaj A, Prayag S, Raju A. "A prospective study of medication errors arising out of look-alike and sound-alike brand names confusion." Int J Risk Saf Med. 2007;19(4):195–201. doi:10.3233/JRS-2007-416. Not indexed in PubMed. — [Crossref record](https://api.crossref.org/works/10.3233/JRS-2007-416); [IOS Press page](https://content.iospress.com/articles/international-journal-of-risk-and-safety-in-medicine/jrs416)
- Affiliation: first author at "AHEL, Indraprasta Apollo Hospital, New Delhi" (spelled that way in the search-indexed record). The abstract itself says "a general hospital in Delhi," six months, electronic drug orders. — [IOS Press search snippet](https://content.iospress.com/articles/international-journal-of-risk-and-safety-in-medicine/jrs416); [Crossref](https://api.crossref.org/works/10.3233/JRS-2007-416)
- Category shares of brand-confusion errors. VERIFIED — [Crossref abstract](https://api.crossref.org/works/10.3233/JRS-2007-416)
  - Look-alike, same generic: 4.51%.
  - Look-alike, different generic: 4.92%.
  - Sound-alike, same generic: 0%.
  - Sound-alike, different generic: 6.56%.
  - Identical brand names, same generic: 84.01%.
- Conclusion quote (VERIFIED): "Most commonly brand name confusion is seen with almost identical brand names for combination drugs." The authors recommend writing generic names in brackets beside brand names. — [Crossref](https://api.crossref.org/works/10.3233/JRS-2007-416)

### Inferences
- Total of 244 errors: my own arithmetic, not stated in the abstract. The percentages map exactly onto 11 + 12 + 0 + 16 + 205 = 244 (for example 205/244 = 84.02%, 11/244 = 4.51%, 12/244 = 4.92%, 16/244 = 6.56%). This strongly suggests the full text reports 244 errors.
- The finding that identical brands of combination drugs cause most errors maps directly onto Parchi's hidden-duplicate-ingredient check.

### Gaps
- "113,346 entries" was not in the abstract, and the full text sits behind IOS Press (403). Drop it from the slide or cite it as "reported in the full text (not independently verified)."
- "Indraprastha Apollo" is supported only by the affiliation line, not the study text.

## Q7. India-specific scale statistics (2–4 strongest options per topic)

### Takeaway
The strongest peer-reviewed India figures are: medication-error incidence in Indian hospitals (median 34.11%, 40 studies), polypharmacy in older adults (49%) and PIM use (28%), and self-medication (53.57% pooled). Paracetamol liver-injury figures are global: in India, drug-induced liver injury (DILI) is dominated by anti-TB drugs. I found no current official count of registered pharmacists. The latest government figure is about 7.5 lakh (2016).

### Cited Findings
**Medication errors and ADRs in India**
- Govil D, Khan RA, Agarwal A, Ghosh P. "Epidemiology of Medication Errors in Indian Hospital Settings: A Systematic Literature Review." Indian J Crit Care Med. 2025;29(11):954–966. doi:10.5005/jp-journals-10071-25080. — [Crossref](https://api.crossref.org/works?query.bibliographic=Epidemiology+of+Medication+Errors+in+Indian+Hospital+Settings+Systematic+Literature+Review+Govil&rows=3); figures via [Medical Dialogues](https://medicaldialogues.in/medicine/news/indian-hospitals-face-34-percent-medication-error-rate-new-systematic-evidence-166827) (news summary, not the primary paper)
  - Scope: 40 observational studies, 307,106 hospitalised patients, January 2014 to April 2025.
  - Median medication-error incidence was 34.11%, and the overall frequency was 26.74%.
  - Prescribing accounted for about 40% of errors.
  - Status: citation VERIFIED via Crossref, numbers from news only. Confirm them from the paper before printing.
- Community pharmacies in Karnataka (South India), prospective study: 1,416 medication errors among 514 participants. Prescription errors were about 88% of them. Status: conference abstract (ISPOR 2020), not peer-reviewed full text. — [ISPOR Europe 2020 abstract](https://www.ispor.org/heor-resources/presentations-database/presentation/euro2020-3282/107429)
- Pharmacovigilance Programme of India (PvPI, government) receives about 16,500–18,500 ICSRs per month, follow-ups included:
  - July 2025: 18,540.
  - August 2025: 16,531.
  - October 2025: 17,015.
  - These are monthly report counts, not prevalence. Sources: [IPC PvPI Jul 2025](https://www.ipc.gov.in/images/ADR_reporting_status_of_PvPI_-_July-2025.pdf); [Aug 2025](https://ipc.gov.in/images/pvpi/ADR-reporting-status-of-PvPI---Aug-2025.pdf); [Oct 2025](https://ipc.gov.in/images/pvpi/ADR-reporting-status-of-PvPI---Oct-2025.pdf)
- ADR prevalence in a North Indian hospital: 167 of 1,033 admitted patients (16.2%) had at least one ADR. This is a single centre. — [Haile et al., PMC3613814](https://pmc.ncbi.nlm.nih.gov/articles/PMC3613814)

**Paracetamol liver injury and the 4 g/day maximum**
- Global (US) figure: acetaminophen caused 42% of acute liver failure (275/662), rising from 28% (1998) to 51% (2003). About 48% of those cases were unintentional overdoses and 44% suicide attempts. — Larson AM, Polson J, Fontana RJ, et al. "Acetaminophen-induced acute liver failure: results of a United States multicenter, prospective study." Hepatology. 2005;42(6):1364–72. doi:10.1002/hep.20948. PMID 16317692. [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=16317692&rettype=abstract&retmode=text); unintentional/suicide split via [ScienceDaily](https://sciencedaily.com/releases/2002/12/021217072713.htm) (secondary)
- Europe (SALT study): overdose was 20% of acute liver failure cases listed for transplant, and paracetamol was involved in 97% of those overdoses. The UK share was 28%. — via [Consultant360 summary](https://consultant360.com/story/rates-paracetamol-induced-liver-failure-vary-widely-europe) (secondary; primary not fetched)
- India contrast: in 313 Indian DILI patients, anti-TB drugs caused 58% of cases. Acetaminophen was not a leading cause. — Devarbhavi H, et al. Am J Gastroenterol. 2010;105(11):2396–404. doi:10.1038/ajg.2010.287. [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=20648003&rettype=abstract&retmode=text)
- 4 g/day adult maximum: the FDA's maximum for adults is 4,000 mg/day. Some OTC labels set lower caps. The FDA label warns of severe liver damage if the dose is exceeded or the user takes other acetaminophen-containing products. — [FDA document](https://fda.gov/media/83588/download); [Cleveland Clinic J Med review](https://www.ccjm.org/content/77/1/19.full.pdf)
  - Status: VERIFIED from search results only (the FDA page was not fetched in full). Get an Indian source too (NFI / CDSCO-approved label) for `pharmacist_approved`.

**Banned combinations (directly relevant to the banned-FDC check)**
- In August 2024 the Health Ministry banned 156 FDCs under Section 26A of the Drugs and Cosmetics Act. A Rajya Sabha reply cites S.O. 3285(E)–3440(E), dated 02.08.2024, and says 14 of the 156 are antibiotics.
  - Paracetamol-containing FDCs on the list: aceclofenac + paracetamol; paracetamol + tramadol + taurine + caffeine; cetirizine + paracetamol + phenylephrine; camylofin + paracetamol.
  - Status: the ban is VERIFIED, but the exact gazette date conflicts across sources (02, 12 or 21 Aug 2024). Cite "August 2024" and link the CDSCO list.
  - Sources: [Tribune](https://www.tribuneindia.com/news/india/citing-risks-govt-bans-156-fixed-dose-combo-drugs); [Goa FDA banned list (govt)](https://www.goa.gov.in/wp-content/uploads/2024/09/BANNED-DRUGS.pdf); [Rajya Sabha PQ 11.03.2025](https://rsdebate.nic.in/bitstream/123456789/759034/1/PQ_267_11032025_U1406_p432_p433.pdf) (PDF redirected; not opened)

**Polypharmacy**
- Older Indian adults, meta-analysis: polypharmacy 49% (42–56) and hyperpolypharmacy 31%. — [Bhagavathula 2021, PMC8173298](https://pmc.ncbi.nlm.nih.gov/articles/PMC8173298/)
- Urban study of 600 older adults in six Indian cities: polypharmacy 33.7% (95% CI 29.9–37.6), associated with multiple comorbidities, recent hospitalisation and transitions of care. Sci Rep 2025, doi:10.1038/s41598-024-84627-2. — [PubMed 39900582](https://pubmed.ncbi.nlm.nih.gov/39900582/); [Springer](https://link.springer.com/article/10.1038/s41598-024-84627-2)

**Self-medication / OTC**
- India overall: the mean prevalence of self-medication was 53.57% across 17 articles (10,248 participants). NSAIDs and anti-allergens were the most used, for "headache and cold and cough." — Rashid M, Chhabra M, Kashyap A, Undela K, Gudi SK. "Prevalence and Predictors of Self-Medication Practices in India: A Systematic Literature Review and Meta-Analysis." Curr Clin Pharmacol. 2020;15(2):90–101. doi:10.2174/1574884714666191122103953. [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=31763976&rettype=abstract&retmode=text)
- Pregnant women in India: 19.3% (95% CI 7.5–41.3) across 8 studies. Antipyretics, analgesics, antihistamines and antacids were common. — Chaudhary V et al. Pharmacoepidemiol Drug Saf. 2024;33(4):e5791. doi:10.1002/pds.5791. [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=38565527&rettype=abstract&retmode=text)
- Children in India, antibiotic self-medication: 19.8% (95% CI 13.5–28.2) across 17 studies. — Atem TD et al. BMC Pediatr. 2025;25:451. doi:10.1186/s12887-025-05676-8. [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=40468262&rettype=abstract&retmode=text)

**Pharmacists and retail outlets**
- Registered pharmacists: about 7.5 lakh, with about 1.36 lakh annual intake (Lok Sabha answer, December 2016). This is the latest government figure I found. The earlier figure was about 6.5 lakh (Lok Sabha, April 2008), which also notes that "Records of chemists are not maintained centrally" (state licensing authorities hold them). — [eparlib Lok Sabha answers](https://eparlib.nic.in/bitstream/123456789/709936/1/8121.pdf); [eparlib 2008](https://eparlib.nic.in/bitstream/123456789/563048/1/62337.pdf)
  - Status: from search snippets only. The eparlib host failed DNS when I tried to open it, and I cannot confirm which PDF holds the 2016 figure.
- Retail chemists: about 12.4 lakh "chemists and drug distributors". This is AIOCD's own membership claim (an industry body, self-reported; it mixes retailers and wholesalers), reported by [ETV Bharat, May 2026](https://www.etvbharat.com/amp/en/health/pharmacies-across-india-shut-may-20-epharmacy-concerns-enn26051305103). UNVERIFIED as an official count.
- The Pharmacy Council of India has a Pharmacist Registration & Tracking System, but I found no published national headcount from it. — [Digital Health News](https://www.digitalhealthnews.com/apti-calls-for-common-pharmacist-registration-across-india)

### Inferences
- Best scale slide (all peer-reviewed India data):
  - 1 in 3 hospital patients affected by medication errors (Govil 2025).
  - 1 in 2 older adults on 5+ drugs (Bhagavathula 2021).
  - More than half of people self-medicate (Rashid 2020).
  - Pair these with the Lancet "rampant" quote.
- For paracetamol, call it a "global leading cause of acute liver failure (US 42–51%)." Do not imply it is India's leading DILI cause. In India the risk is hidden paracetamol duplication across cold/pain FDCs, and the 2024 ban list shows how many paracetamol FDCs exist.

### Gaps
- I found no peer-reviewed India pooled estimate of community-pharmacy dispensing errors.
- I found no India-specific paracetamol overdose or liver-failure incidence.
- I found no current (2023–2026) official count of registered pharmacists or licensed retail outlets. Check the PCI annual report or a recent parliamentary question before using any number.
- The Govil 2025 numbers need checking against the full text.

## Q8. AGS Beers Criteria 2023 and Cockcroft-Gault 1976 citations

### Takeaway
Both VERIFIED via PubMed.

### Cited Findings
- American Geriatrics Society 2023 Beers Criteria® Update Expert Panel. "American Geriatrics Society 2023 updated AGS Beers Criteria® for potentially inappropriate medication use in older adults." J Am Geriatr Soc. 2023;71(7):2052–2081. doi:10.1111/jgs.18372. PMID 37139824. VERIFIED — [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=37139824&rettype=abstract&retmode=text)
- Cockcroft DW, Gault MH. "Prediction of creatinine clearance from serum creatinine." Nephron. 1976;16(1):31–41. doi:10.1159/000180580. PMID 1244564. VERIFIED (matches the requested 16:31–41) — [PubMed via E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=1244564&rettype=abstract&retmode=text)

### Inferences
- These are the standard citations for Parchi's age (Beers) and kidney-function (CrCl) checks.

### Gaps
- None.
