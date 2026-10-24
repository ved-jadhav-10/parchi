# HM-02 Winning Playbook: Indian Brand-Name Prescription Safety Checker (HYPNEXIS '26)

> Research reference only. The stack (offline PWA, TypeScript engine in the browser), track split and timeline are in `PLAN.md`, which wins where the two differ.

**Bottom line: rival teams can generate a DDI checker in an hour, but they can't quickly build three things: (1) a per-ingredient daily-dose ledger across Indian brands that respects patient limits, (2) a pharmacist-curated alert budget that keeps Interrupt alerts to about one per prescription, and (3) a pharmacist-labelled Indian test set that shows raw chatbots failing. Lead with those three. Treat the DDI lookup as a must-have that won't win on its own.**

## TL;DR
- **Build the "Prescription X-ray" first:** fuzzy and phonetic brand resolution → combination unpacking → Indian sig parsing (1-0-1, TDS, SOS with a worst-case assumption) → cumulative mg/day per ingredient compared with age, weight and CrCl limits → class duplication (NSAID+NSAID, PPI+PPI) → 3-tier alerts. This covers all 4 key challenges in the problem statement, and the logic is deterministic, so it's hard to fake with a prompt.
- **Your moat is the pharmacist, not the model.** Use the session for a 50–60-prescription gold set, sign-off on dose limits, a suppression list and Indian LASA pairs. 2025 studies show LLMs over-flag interactions that don't exist. In Thapa et al. 2025 (301 discharged patients, checked against Micromedex), ChatGPT-4 graded severity correctly for only 214 of 574 interactions (37.3%). A measured "our engine vs ChatGPT/Claude" slide is the strongest finals asset you can have.
- **Use India-specific regulatory hooks no rival will think of:** CDSCO's 16 FDCs banned on 11 June 2026, the 156 banned in August 2024, the September 2026 NSQ list (330 NSQ samples + 1 spurious, published 23 Oct 2026), Jan Aushadhi (2,110 medicines) and LASA brand confusion. Note that medThinks already offers an Indian-brand DDI checker. Present yourselves as the dose, duplication and alert-fatigue engine it lacks.

## Key Findings

| # | Finding | Why it matters for winning |
|---|---|---|
| 1 | DDInter 2.0 has 302,516 DDIs across 2,310 drugs, plus 857 drug–food, 8,359 drug–disease and 6,033 therapeutic-duplication records. Free at ddinter2.scbdd.com; licence CC BY-NC-SA 4.0\[1\]\[2\] | Every rival can get it. Use it, but don't pitch it as your edge. The licence is non-commercial, so mention that in the business slide. |
| 2 | The NLM RxNav Drug Interaction API was discontinued on 2 Jan 2024. A vendor blog says DrugBank's free checker retires 25 Mar 2026 (unverified vendor claim)\[3\]\[4\] | Free global DDI APIs are disappearing, which supports an India-owned engine. Rivals who rely on RxNav will hit dead ends. |
| 3 | LLMs over-flag. Sicard et al., Ther Adv Drug Saf 2025, tested ChatGPT-4o, Claude 3.5 Sonnet and Gemini 1.5 Flash on 82 DDI cases and 22 negative controls from the French pharmacovigilance database. ChatGPT detected 99% of DDI cases, but "all the LLMs struggled to exclude the lack of interaction in ADR cases, often detecting non-existent DDIs." Fully correct answers: ChatGPT 66%, Claude 68%, Gemini 33%. Thapa et al., Explor Res Clin Soc Pharm 2025 (301 patients, vs Micromedex): ChatGPT-4 caught 100% of interactions but matched severity in only 214/574 (37.3%) and documentation in 20.6%. Rheumatology study, Dec 2025: best LLM F1 was 0.25\[5\] | Raw chatbots *cause* alert fatigue (false positives, wrong severity). This is your benchmark story. |
| 4 | Alert fatigue: Poly et al., JMIR Med Inform 2020 (review of 23 studies) found average override rates of 46.2–96.2% (DDI 56.3–95.6%, renal 74.4–97.1%, geriatric 2.1–87.1%). 82–99% of drug-duplication overrides were *appropriate*, while DDI, renal and geriatric overrides were often inappropriate | Gives you a defensible suppression policy: down-tier routine duplication noise, keep renal/geriatric/high-severity DDI alerts as interrupts. |
| 5 | LASA: Joshi et al., J Risk Saf Med 2007 (Indraprastha Apollo Hospital, New Delhi, six months; dated but still the main Indian figure) found that of 113,346 drug entries, 244 errors came from brand-name confusion. LASA incidents ≈ 2.67% of medication errors reported in Indian hospitals. A 2024 Lancet Regional Health – Southeast Asia article ("LASA drugs in India") says "Identical brand names contribute the most to such medication errors" and that "Prescription and dispensing errors are rampant in India, but we do not have any clue about the scale of the issue" | Your fuzzy resolver can become a safety feature: when a misspelling lands between two brands with *different* ingredients, flag it instead of silently guessing. |
| 6 | Banned FDCs: 156 FDCs (S.O. 3285–3440(E), Aug 2024), e.g. Aceclofenac 50 + Paracetamol 125; Cetirizine + Paracetamol + Phenylephrine; Levocetirizine + Phenylephrine + Paracetamol; Paracetamol + Tramadol + Taurine + Caffeine.\[6\] Plus **16 FDCs on 11 Jun 2026**: Amoxicillin + Serratiopeptidase, Cefuroxime + Serratiopeptidase, Cefadroxil + Probenecid, Dicyclomine + Paracetamol + Clidinium + Chlordiazepoxide, etc.\[7\]\[8\]\[9\]\[10\]\[11\] | A cheap deterministic check that looks like something only a pharmacist would know. The June 2026 list is too recent for most LLM training data. |
| 7 | CDSCO NSQ, September 2026 (reported 23 Oct 2026): 330 NSQ samples (42 by central labs, 288 by state labs) + 1 spurious drug (Delhi). August 2026: 220 NSQ\[12\]\[13\]\[14\] | A "batch recall" banner on a demo brand is a memorable novelty from yesterday's news. |
| 8 | PMBJP: 2,110 medicines + 315 surgicals; 20,149 Jan Aushadhi Kendras (30 Jun 2026); priced 50–80% below brands; target 25,000 by Mar 2027\[15\]\[16\] | Gives you a business and impact slide (₹ saved per prescription). |
| 9 | Polypharmacy in India: a Frontiers in Pharmacology 2021 meta-analysis (27 studies) found potentially inappropriate medication use in 28% (95% CI 24–32%) of older Indian adults | Justifies geriatric (Beers) rules and the elderly demo patient. |
| 10 | Regulation: CDSCO Draft Guidance on Medical Device Software (21 Oct 2025); a final guidance was reported in July 2026 (Lexology). Standalone decision-support software is classified by significance of output × severity of condition\[17\]\[18\]\[19\] | Pitch the tool as "informs the pharmacist" (lower-risk class), not "decides" — and say so explicitly. |

## Details

### 1. Exhaustive feature list, with uniqueness verdict
Key: **U** = truly unique / hard to replicate (needs curated Indian data, pharmacist validation, deterministic logic or a non-obvious design). **N** = niche novelty (small but memorable). **C** = commodity (an AI agent builds it from one prompt).

| Area | Feature | Verdict | Why |
|---|---|---|---|
| Input | Fuzzy and phonetic brand resolver (fuse.js / fastest-levenshtein token match + Double Metaphone + Indic transliteration, e.g. "Dolo" / "dollo" / "डोलो") | U (tuning) | Rivals will fuzzy-match. Few will tune thresholds on a pharmacist's real misspellings or handle the strength suffix |
| Input | Strength-variant disambiguation (Dolo 650 vs 500; Zerodol-P 325 vs 500 mg paracetamol variant)\[20\]\[21\] | U | The brand alone is ambiguous. You need an "assume the higher strength + ask" rule |
| Input | Indian sig parser: OD/BD/TDS/QID/HS/SOS/STAT, 1-0-1, ½-0-½, "x5d", Hinglish ("subah-shaam", "khane ke baad", "raat ko") | U | Off-the-shelf parsers (parsigs, parserx, med7) are US-centric |
| Input | SOS worst-case assumption (pharmacist-set max doses/day per ingredient) | U/N | Non-obvious. Turns "as needed" into a computable maximum load |
| Input | Dosage-form handling: syrup mg/5 mL → mg/dose; drops; injections; topical/ophthalmic excluded from systemic load | U | Needs per-form rules (e.g. Ascoril LS is labelled per 5 ml)\[22\] |
| Input | OCR or handwritten prescription photo | C | Gemini/GPT vision does this in minutes. Low differentiation, high error risk |
| Input | Voice / WhatsApp input | C/N | Easy to replicate. Nice for the finals video only |
| Core | Combination unpacking into an ingredient ledger (brand → salts + mg) | U (data) | Needs a cleaned Indian composition table |
| Core | Cumulative mg/day per ingredient across all brands vs max | **U** | The core of HM-02. LLMs routinely miss the paracetamol in "cold" brands |
| Core | Therapeutic class duplication (2 NSAIDs, 2 PPIs, 2 antihistamines, 2 antibiotics) via ATC/DDInter duplication table | U | DDInter has 6,033 duplication records; mapping Indian brands to them is the hard part\[1\] |
| Core | DDI lookup with severity (DDInter) | C | Table stakes |
| Clinical | Patient limits: paediatric mg/kg, geriatric caps, CrCl (Cockcroft-Gault)/eGFR renal rules, hepatic caps | U | Deterministic tables that the pharmacist signs off |
| Clinical | Ask-only-when-needed prompts (request weight only if a mg/kg drug is present; creatinine only if a renally cleared drug is present) | **U/N** | Non-obvious UX. Shows clinical maturity |
| Clinical | Beers 2023 / STOPP-START subset for ≥65 | U (subset) | Encode the 15–20 rules that matter for Indian OPD drugs |
| Clinical | Pregnancy/lactation flags | C/U | Needs a toggle and a short curated list |
| Clinical | Drug–disease (DDInter DDSI) and drug–food/alcohol | C | Data exists; low demo value\[23\] |
| Clinical | Stacking scores: QT, anticholinergic burden (ACB), serotonergic, CNS-depressant (e.g. chlorpheniramine + levocetirizine + alprazolam) | U | Count-based stacking across combos is rarely done |
| Clinical | Duplicate antibiotics + WHO AWaRe tag (Access/Watch/Reserve, 2025 list) + duration check\[24\] | U/N | Stewardship angle judges like |
| Clinical | Steroid misuse / max duration checks (e.g. oral steroid > X days, PPI long-term) | N | Pharmacist-defined |
| India | Banned FDC detector (156 of 2024 + 16 of June 2026 + older lists) | **U/N** | Very recent data; deterministic\[9\] |
| India | NSQ/spurious batch alert (monthly CDSCO list; match brand + batch)\[12\] | **N** | "Yesterday's alert" wow moment |
| India | LASA confusion detector (resolver ambiguity across different ingredients) | **U/N** | Turns a weakness (misspellings) into a safety feature |
| India | Discontinued-brand flag (dataset Is_discontinued) + current alternative\[25\] | N | Easy, uses existing columns |
| India | Schedule H/H1/X flag | C/N | Needs a list; modest value |
| India | Jan Aushadhi generic substitution + ₹ savings | N | Strong business slide |
| India | NPPA ceiling-price overcharge flag | N | Data effort; finals only |
| Alerting | 3-tier Interrupt / Inform / Silent log + pharmacist suppression list + "alert budget" metric | **U** | Directly addresses HM-02's 4th challenge. Measured, not claimed |
| Alerting | Confidence score per resolution + "needs pharmacist" route | U | Honest uncertainty: a judge-pleaser |
| Explainability | One-line reason + source chip (DDInter ID, CDSCO S.O. number, Beers rule) | U/C | The format is easy; the curated sources are not |
| Explainability | "Prescription X-ray" visual: brand → ingredient → daily total vs limit bar | **N** | 30-second judge comprehension |
| Evaluation | Pharmacist-labelled gold set + precision/recall per alert type + alerts per Rx | **U** | Cannot be generated by AI |
| Evaluation | "Beat-the-chatbot" benchmark (same Rx to ChatGPT/Claude/Gemini, scored on the same rubric) | **U** | Strongest single slide |
| Workflow | Override-with-reason log + audit trail | C/U | Easy to build; strong with real reasons from the pharmacist |
| Output | Hindi/regional patient leaflet | C | LLM does this instantly |
| Output | e-prescription / ABDM FHIR MedicationRequest export | C/N | Signals scalability; low demo impact |
| Deploy | Offline PWA (engine + data run in the browser) for chemist shops | N | Built in by our stack choice; good business point |

### 2. Scored and ranked features
Scales are 1–5, higher is better. W = Winnability, U = Uniqueness, F = Feasibility in ~13 h, D = Demo impact, B = Business value, R = Recreation difficulty, A = AI-agent resistance, P = Pitch strength. Added parameters: **S** = patient-safety severity addressed, **C** = coverage of HM-02's 4 key challenges, **J** = judge comprehension in 30 s, **L** = low liability/error risk (5 = safe). Maximum 60.

| Rank | Feature | W | U | F | D | B | R | A | P | S | C | J | L | Total | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 3-tier alerting + pharmacist suppression + alert-budget metric | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 57 | MVP |
| 2 | Pharmacist gold set + beat-the-chatbot benchmark | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 57 | MVP (v1) → R2 |
| 3 | Cumulative mg/day per ingredient across brands | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 56 | MVP |
| 4 | LASA confusion detector | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 55 | R2 |
| 5 | Combination unpacking ledger | 5 | 3 | 5 | 5 | 5 | 3 | 3 | 5 | 5 | 5 | 5 | 5 | 54 | MVP |
| 6 | Ask-only-when-needed prompts | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 54 | MVP |
| 7 | Therapeutic class duplication | 5 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 4 | 5 | 4 | 54 | MVP |
| 8 | Banned FDC detector (incl. June 2026) | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | 3 | 3 | 5 | 5 | 53 | MVP |
| 9 | Prescription X-ray visual | 5 | 4 | 5 | 5 | 4 | 3 | 3 | 5 | 4 | 5 | 5 | 5 | 53 | MVP |
| 10 | SOS worst-case assumption | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 52 | MVP |
| 11 | Fuzzy/phonetic + strength-aware resolver | 5 | 3 | 5 | 4 | 5 | 3 | 3 | 5 | 4 | 5 | 5 | 4 | 51 | MVP |
| 12 | Indian sig parser (incl. Hinglish) | 5 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 51 | MVP |
| 13 | Patient limits (age/weight/CrCl) | 5 | 3 | 4 | 5 | 5 | 4 | 3 | 5 | 5 | 5 | 4 | 3 | 51 | MVP (paracetamol, NSAIDs, 5–8 renal drugs) |
| 14 | NSQ/spurious batch banner | 4 | 5 | 3 | 5 | 4 | 4 | 5 | 5 | 3 | 2 | 5 | 4 | 49 | R2 |
| 15 | Confidence score + "needs pharmacist" | 4 | 4 | 5 | 4 | 4 | 3 | 3 | 4 | 4 | 5 | 4 | 5 | 49 | MVP |
| 16 | Paediatric syrup mL→mg + mg/kg | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 5 | 4 | 3 | 48 | R2 |
| 17 | Cited explanations | 4 | 3 | 5 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 5 | 46 | R2 |
| 18 | Override log + audit | 4 | 3 | 5 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | 3 | 5 | 44 | R2 |
| 19 | Beers/STOPP subset | 4 | 3 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 44 | R2 |
| 20 | Topical exclusion from systemic load | 3 | 4 | 5 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 5 | 44 | MVP (cheap) |
| 21 | QT/ACB/serotonergic/CNS stacking | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 4 | 5 | 3 | 3 | 3 | 44 | R2 (CNS + ACB only) |
| 22 | AWaRe + duplicate antibiotic + duration | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 2 | 4 | 4 | 43 | Finals |
| 23 | Jan Aushadhi substitution + ₹ savings | 4 | 4 | 4 | 4 | 5 | 3 | 3 | 4 | 1 | 1 | 5 | 4 | 42 | R2 |
| 24 | DDI (DDInter) with severity | 4 | 2 | 4 | 4 | 4 | 2 | 2 | 3 | 5 | 3 | 4 | 4 | 41 | MVP (table stakes) |
| 25 | Discontinued-brand flag | 3 | 3 | 5 | 3 | 3 | 3 | 3 | 3 | 2 | 4 | 3 | 5 | 40 | R2 |
| 26 | Schedule H/H1/X | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 4 | 4 | 37 | Finals |
| 27 | Drug–disease / food / alcohol | 3 | 2 | 4 | 3 | 3 | 2 | 2 | 3 | 4 | 2 | 4 | 4 | 36 | Finals |
| 28 | NPPA ceiling-price flag | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 1 | 1 | 4 | 4 | 36 | Skip/slide |
| 29 | Offline PWA engine | 3 | 3 | 4 | 3 | 4 | 3 | 3 | 3 | 2 | 1 | 3 | 4 | 36 | MVP (built in by stack) |
| 30 | ABDM/FHIR export | 3 | 3 | 3 | 2 | 5 | 3 | 3 | 4 | 1 | 1 | 2 | 5 | 35 | Finals |
| 31 | Pregnancy/lactation | 3 | 2 | 4 | 3 | 3 | 2 | 2 | 3 | 4 | 2 | 4 | 3 | 35 | Finals |
| 32 | Hindi patient leaflet | 3 | 2 | 5 | 3 | 4 | 1 | 1 | 3 | 2 | 1 | 4 | 3 | 32 | Finals |
| 33 | WhatsApp/voice | 3 | 2 | 3 | 4 | 4 | 2 | 2 | 3 | 1 | 1 | 4 | 3 | 32 | Skip |
| 34 | OCR handwriting | 3 | 1 | 3 | 4 | 4 | 1 | 1 | 3 | 2 | 3 | 4 | 2 | 31 | Skip (state that input is typed, per the problem statement) |

**How to read it:** the top 13 are mostly deterministic Indian data plus pharmacist judgement, which is exactly what a Cursor/Claude Code rival can't copy. Ranks 23–34 are features judges have seen in every health hackathon.

**Phasing**
- **MVP by 3 AM (Round 1):** ranks 1, 3, 5–13, 15, 20, 24, plus a v1 gold set of 20–30 prescriptions with chatbot comparison results on 10 of them.
- **Round 2 (11:30 AM):** LASA detector, NSQ banner, paediatric syrup, cited explanations, Beers subset, CNS/ACB stacking, Jan Aushadhi savings, override log, full 50–60-prescription benchmark with precision/recall tables.
- **Finals (3 PM):** AWaRe stewardship, FHIR export stub, Hindi leaflet, regulatory and business slides, and a recorded pharmacist sign-off quote.

### 3. Existing products, companies and repos (≥75% similar), and what to borrow

**Indian**
| Product | What it does | What to borrow / how to differentiate |
|---|---|---|
| **medThinks** — https://medthinks.com/drug-interaction-checker-india | Closest match: resolves Indian brand combinations (Combiflam, Pan-D, Glycomet GP), 397,000+ pairs from DDInter + RxNorm classes + FDA labels, NLEM/Schedule H/Jan Aushadhi\[26\] | Judges may know it. Differentiate on cumulative dose, patient limits (CrCl, mg/kg), SOS logic, alert budget and a measured benchmark |
| GoDavaii — https://www.godavaii.com/alternatives/best-drug-interaction-checker-apps | Consumer app; says it has 93,000+ pairs on Indian brands in 90+ languages (self-claim)\[27\] | Its multilingual patient UX; consumer-facing, not pharmacist workflow |
| CureCheck — https://www.curecheck.in/drug-interaction | Free AI checker for 2–5 brand/generic names, Hindi + English\[28\] | Proof that "LLM wrapper" checkers exist: your benchmark should beat this style |
| MIMS/CIMS India (eMIMSplus) — https://cds.mims.com/emimsplus/ | Paid; 100,000+ Indian drugs; checks up to 20 medicines; allergy, condition and CYP450 checks\[29\]\[30\] | Severity scale and monograph format; incumbent for "why buy yours" (price, open, dose-aware) |
| HealthPlix EMR — https://blogs.healthplix.com/emr/ | 12,400+ doctors; AI DDI "nudge" since June 2022; warning when prescribing combination medicines; an IJBCP 2024 study analysed ~1.9M visits\[31\]\[32\] | Point-of-care nudge pattern; shows the market pays for in-EMR CDSS |
| Eka Care — https://www.eka.care/ | AI EMR, voice-to-Rx, real-time DDI alerts against the current medication list\[33\]\[34\] | Workflow integration target (ABDM ecosystem)\[35\] |
| Practo Ray — https://blog.practo.com/automate-prescription-management-and-patient-billing-with-practo-ray/ | Clinic software with e-Rx; claims real-time interaction alerts\[36\] | Integration/partner story |
| Tata 1mg — https://www.1mg.com/drugs/dolo-650-tablet-74467 | Per-drug interaction sections; source of composition data | Composition ground truth; "basic warnings", not prescription-level\[27\] |
| Apollo Pharmacy — https://www.apollopharmacy.in/medicine/ecosprin-75mg-tablet | Drug pages warn of duplicate paracetamol (e.g. Dolo + Numcold)\[37\] | Validates that duplication is a real dispensing concern |
| MSPC DICP — http://dic.mspcindia.org/Pages/DICP.aspx | Maharashtra State Pharmacy Council's prescription-level checker: hazardous/major, moderate, not significant\[38\] | Colour-coded 3-level severity: matches your 3 tiers |

**Global (licensed incumbents)**
| Product | Borrow |
|---|---|
| Lexicomp / UpToDate (Wolters Kluwer) — https://www.wolterskluwer.com/en/solutions/lexicomp | Risk rating A/B/C/D/X, which maps cleanly onto Silent/Inform/Interrupt |
| Medi-Span (Wolters Kluwer) — https://www.wolterskluwer.com/en/solutions/medi-span | Duplicate therapy classes; screening-module design |
| First Databank — https://www.fdbhealth.com | Dose range checking (min/max daily, age/weight bands) |
| Micromedex (Merative) — https://www.micromedexsolutions.com | Severity + documentation-level grading |
| Drugs.com checker — https://www.drugs.com/drug_interactions.html | Major/moderate/minor + plain-language consumer text\[39\] |
| Medscape checker — https://reference.medscape.com/drug-interactionchecker | "Serious – use alternative / Monitor closely / Minor" wording |
| Epocrates — https://www.epocrates.com | Mobile-first, multi-drug checking |
| DrugBank — https://go.drugbank.com | Structured DDI API (commercial); free checker reportedly retired Mar 2026\[4\] |
| NLM RxNav — https://lhncbc.nlm.nih.gov/RxNav | RxNorm/RxClass (ATC) still live for class mapping; DDI API discontinued 2 Jan 2024\[3\]\[40\] |

**GitHub repos and datasets**
| Repo / data | Borrow |
|---|---|
| Kaggle A-Z Medicine Dataset of India (~250K; prices Nov 2022)\[41\] — https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india | Brand, composition, pack, discontinued flag\[41\] |
| Kaggle Extensive A-Z (249,398; therapeutic/action class, habit-forming)\[42\]\[43\] — https://www.kaggle.com/datasets/riturajsingh2004/extensive-a-z-medicines-dataset-of-india | Class columns for the duplication fallback |
| Kaggle 1mg 2025 (~300,000 rows, CC BY-NC-SA 4.0)\[44\] — https://www.kaggle.com/datasets/apkaayush/india-medicines-and-drug-info-dataset | Freshest compositions |
| junioralive/Indian-Medicine-Dataset — https://github.com/junioralive/Indian-Medicine-Dataset | Clean JSON/CSV brand → composition\[25\] |
| nowitsidb/INDIAN_MEDICINE_MCP_SERVER — https://github.com/nowitsidb/INDIAN_MEDICINE_MCP_SERVER | Fuzzy threshold + combination flag + composition index\[45\] |
| SatvikU3/prescription-reader — https://github.com/SatvikU3/prescription-reader | Strength parsed from brand number ("Dolo 650"); Indian → RxNorm fallback\[46\] |
| ifaruqi/interact — https://github.com/ifaruqi/interact | DDInter bulk merge; pairwise checks inside combos; handling of missing drugs\[47\] |
| SPerekrestova/pillchecker-api — https://github.com/SPerekrestova/pillchecker-api | DDInter in SQLite + FTS; RxNorm → openFDA fallback\[48\] |
| reviver134/drug-interaction-safety-agent — https://github.com/reviver134/drug-interaction-safety-agent | "User confirms extracted ingredients" step; explicit missing-evidence reporting\[49\] |
| PurvaP9/drug-drug-interaction-system — https://github.com/PurvaP9/drug-drug-interaction-system | OCR → DDInter pairs (what rivals will build; don't copy)\[50\] |
| parsigs — https://github.com/royashcenazi/parsigs | NER sig parse schema (dose, frequency, duration, as-needed flag)\[51\]\[52\] |
| parserx — https://github.com/coderxio/parserx | Max-daily-dose computation; pharmacist-review flag\[53\]\[54\] |
| med7 — https://github.com/kormilitzin/med7 ; medspaCy — https://github.com/medspacy/medspacy | Entity schema; negation/context rules\[55\]\[56\] |
| Public Health Scotland dose_instruction_parser — https://pypi.org/project/dose-instruction-parser/ | Rules-after-NER design for free-text doses\[57\]\[58\] |

### 4. Exactly what to get from the pharmacist (30–60 min session)

**Priority A (first 20 min, must-have)**
1. Give us 15–20 real or realistic OPD prescriptions as you'd see them typed or written, including misspellings and abbreviations. Which 5 contain a problem you'd actually stop?
2. For paracetamol, ibuprofen, aceclofenac, diclofenac, cetirizine/levocetirizine, chlorpheniramine, pantoprazole/omeprazole, domperidone and metformin: what max mg/day do you use for adults, ≥65, <12 years (mg/kg) and CrCl <30 or 30–50?
3. How should SOS be counted? Max doses/day per drug class (e.g. paracetamol SOS = up to 4/day, NSAID SOS = up to 3/day)?
4. Which alerts do you *ignore* in practice (e.g. PPI + domperidone, paracetamol + ibuprofen in Combiflam alone)? These go on the suppression list. Which would make you call the doctor (Interrupt)?
5. Confirm or correct 20 combination brand compositions in our table (incl. strength variants like Zerodol-P 325 vs 500).

**Priority B (next 20 min)**
6. The 10 most dangerous combinations you see in Indian community pharmacies (e.g. two NSAIDs from two doctors, cold FDC + Dolo, benzodiazepine + sedating antihistamine, PPI duplicates).
7. LASA pairs you've personally seen confused (brand vs brand, and different strengths of the same brand).
8. Local abbreviations and Hinglish instructions (1-0-1, ½-0-½, HS, "khali pet", "x5d", "SOS for fever").
9. Elderly/renal rules you'd apply at the counter: which drugs need creatinine before dispensing? When would you ask for weight?
10. Paediatric syrup traps (mL vs tsp, drops vs syrup concentration, e.g. paracetamol 120 vs 250 mg/5 mL).

**Priority C (last 10–20 min)**
11. Label our test set (sheet below), twice for 10 prescriptions to measure agreement.
12. Review 5 chatbot answers: right, wrong, or noisy?
13. A 2-line quote and permission to name them (name, qualification, years of practice) for the pitch.

**Test-set construction:** 50–60 prescriptions (minimum 30 by 3 AM). Stratify roughly as follows: 10 clean (no alert, which measures false positives); 10 same-ingredient duplication (paracetamol across brands); 8 class duplication (NSAID/PPI/antihistamine/antibiotic); 8 dose excess incl. SOS; 6 renal/geriatric; 5 paediatric syrup; 5 DDI major; 3 banned FDC; 5 misspelling/LASA. Get a second rater (pharmacy student or the same pharmacist re-labelling 10 prescriptions blind) and report Cohen's κ.

**Labelling sheet columns:** Rx_ID | Category | Raw_prescription_text (as typed) | Patient_age | Sex | Weight_kg | Serum_creatinine | Pregnancy/lactation | Comorbidities | Line_no | Brand_as_written | Correct_brand | Strength | Form | Sig_raw | Sig_normalised (doses/day) | Duration | Ingredients+mg (gold) | Expected_alert_type (dup-ingredient / class-dup / overdose / renal / paeds / geriatric / DDI / banned FDC / LASA / none) | Ingredients_involved | Expected_tier (Interrupt / Inform / Silent) | Expected_action (stop / reduce / monitor / substitute) | Rationale + source | Rater_ID | Rater2_tier | Engine_output | ChatGPT_output | Claude_output | Gemini_output | Match (TP/FP/FN) | Notes

### 5. Demo script (verified compositions)

**Patient:** 68 y, 55 kg, serum creatinine 1.6 mg/dL → Cockcroft-Gault CrCl ≈ (140−68)×55/(72×1.6) ≈ 34 mL/min (the engine asks for creatinine *only because* NSAIDs are present).

**Typed Rx:** "Dolo 650 1-1-1 x5d; Crocin cold n flu max TDS; Zerodol P BD; Brufan 400 SOS; Ecosprin 75 OD; Pan D OD; Omez 20 OD"

| Brand (verified) | Composition | Engine catches |
|---|---|---|
| Dolo 650 | Paracetamol 650 mg\[59\] | PCM 1,950 mg/day |
| Crocin Cold & Flu Max | Paracetamol 500 + Caffeine 32 + Phenylephrine 10\[60\] | PCM 1,500 mg/day (hidden) |
| Zerodol-P | Aceclofenac 100 + Paracetamol 325\[21\] | PCM 650 mg/day → **total 4,100 mg > 4 g limit: INTERRUPT** |
| "Brufan" → Brufen 400 | Ibuprofen 400 | Misspelling resolved (confidence shown); NSAID + NSAID class duplication; NSAIDs with CrCl ~34 in an elderly patient: INTERRUPT |
| Ecosprin 75 | Aspirin 75\[61\] | Ibuprofen–aspirin antiplatelet interaction: Inform\[62\] |
| Pan-D | Pantoprazole 40 + Domperidone 30\[63\] | PPI + PPI duplication with Omez (omeprazole 20): Inform; domperidone in elderly: Inform |
| Omez | Omeprazole 20\[64\] | — |

The output should show 2 Interrupts, 3–4 Informs and the rest silent-logged. Then paste the same text into ChatGPT/Claude live or from a recording, count their alerts, and show the missed hidden paracetamol and the severity noise.

**Alt cases:** Sinarest New (Paracetamol 500 + Phenylephrine 10 + Chlorpheniramine 2)\[65\] + Montair-LC (Levocetirizine 5 + Montelukast 10)\[66\] gives antihistamine duplication + sedation stacking. Combiflam (Ibuprofen 400 + Paracetamol 325) + Brufen gives duplicate ibuprofen.\[67\] Sinarest-CCF (5 ingredients incl. paracetamol 500 and ambroxol 30)\[68\] + Ascoril LS syrup (ambroxol 30 mg/5 mL)\[22\] gives duplicate ambroxol across a tablet and a syrup. A generic "Cetirizine + Paracetamol + Phenylephrine" FDC entry triggers the banned-FDC banner (156-list).\[11\]

### 6. Data sources

| Source | Link | Use |
|---|---|---|
| DDInter 2.0 | https://ddinter2.scbdd.com | DDI, duplication, drug–disease, food\[23\] |
| CDSCO FDC page (16 of 11.06.2026; 156 of 2024; 14 of 2023; Section 26A master list)\[9\] | https://cdsco.gov.in/opencms/opencms/en/Drugs/FDC/ | Banned FDC table |
| CDSCO 156-FDC PDF | https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadNewsFiles/List%20of%20Prohibited%20FDC%20drugs_%20156%20FDCs_%20dated%2002.08.2024.pdf | Parse to CSV |
| CDSCO monthly NSQ/spurious alerts | https://cdsco.gov.in (Drug Alerts) | Brand + batch banner |
| PMBJP product list | https://janaushadhi.gov.in | Generic substitution + MRP |
| WHO AWaRe 2025 (Excel) | https://www.who.int/publications/i/item/B09489 | Antibiotic tagging |
| NLEM 2022 / NPPA ceiling prices | https://nppaindia.nic.in | Essential flag, price cap |
| AGS Beers Criteria 2023 / STOPP-START v3 | AGS / literature | Geriatric rules (encode subset) |
| openFDA drug labels | https://open.fda.gov/apis/drug/label/ | Max dose text, boxed warnings |
| RxNav RxClass (ATC) | https://lhncbc.nlm.nih.gov/RxNav | Class mapping for duplication |
| National Formulary of India (IPC) | https://ipc.gov.in | Indian dosing reference |

### 7. Evaluation metrics to show
- Precision/recall/F1 **per alert type** (dup-ingredient, class-dup, overdose, renal, DDI, banned FDC) against the pharmacist gold set; Cohen's κ between raters.
- **Interrupts per prescription** (target ≤1) and total alerts per prescription vs raw LLMs: this is your alert-fatigue KPI.
- Brand resolution top-1 accuracy on misspellings; % routed to "needs pharmacist".
- Clean-prescription false-positive rate (LLMs over-flag; Sicard 2025).\[69\]
- Time-to-check (ms, deterministic) vs chatbot latency; run-to-run consistency (your engine: 100% identical; LLM: re-run 3× and show variance).

### 8. Market and pitch numbers
- India pharmacy retail ≈ USD 30.1B (2025) → USD 52.8B by 2031 (Ken Research).\[70\] Online pharmacy USD 3.71B (2025) → USD 14.08B by 2034 (IMARC).\[71\] Estimates conflict widely (TechSci puts e-pharmacy at only USD 394M for 2024; one vendor claims USD 347.5B retail, which is implausible), so cite one source and label it as an estimate.\[72\]\[73\]
- Customers: chemist shops (~1M outlets per Ken Research's model), Jan Aushadhi Kendras (20,149), e-pharmacies (prescription verification at scale), EMRs (HealthPlix/Eka as API buyers), hospital pharmacies.\[70\]\[74\]

### 9. Business viability
Judges will not read the engine. This section covers who uses it, who pays, who resists, and how to pitch it.

**Core insight: the chemist counter is the only place where every prescription meets.** Two doctors' prescriptions plus OTC purchases come together only at the pharmacy. A doctor's EMR (HealthPlix, Eka, Practo) sees only its own prescription, so it cannot notice that the orthopaedist prescribed Zerodol-P while the GP prescribed Dolo and Crocin Cold & Flu Max. This is why the product belongs at the pharmacy, not in the EMR.

**30-second hook (no technical words):**
> "A 68-year-old with weak kidneys gets 7 medicines from 2 doctors. Three different brands contain paracetamol: 4.1 g a day, above the safe limit, plus two painkillers that can harm the kidneys. We pasted it into ChatGPT. It [missed the hidden paracetamol / raised N alerts]. Our tool raised 2 alerts that matter, in milliseconds, offline, on a pharmacist's phone."

Follow it with one slide: engine vs ChatGPT/Claude/Gemini on the pharmacist gold set (alerts per Rx, missed dangers, false alarms). Use measured numbers only.

**Positioning line:**
> "medThinks tells you two drugs interact. We tell you this patient is taking 4.1 g of paracetamol across three brands, that their kidneys can't handle two NSAIDs, and we stay quiet about the 20 things the pharmacist would ignore anyway."

#### 9.1 Business points for the pitch
| # | Point | Why judges like it | Proof |
|---|---|---|---|
| 1 | "We reduce alerts, not add them" (≤1 Interrupt per Rx) | Everyone else pitches more warnings | Override rates 46–96% (Poly 2020); LLMs flag non-existent DDIs (Sicard 2025)\[69\] |
| 2 | Works offline at the counter | Indian chemist shops have patchy internet; rivals are cloud or app based | PWA stack (`PLAN.md`) |
| 3 | Regulation built in | Shows India-specific understanding | 16 FDCs banned 11 Jun 2026 (too recent for LLMs); NSQ Sep 2026 list\[9\]\[12\] |
| 4 | Saves the patient money | Social impact plus a rupee figure | Jan Aushadhi 50–80% cheaper (Kendra / government mode only, see 9.4)\[16\] |
| 5 | Pharmacist-validated, legally sensible | Answers "is this safe/legal?" before it's asked | Named pharmacist sign-off; "informs, never decides" keeps a lower CDSCO software risk class\[17\]\[18\] |

#### 9.2 Who uses it, who pays
The doctor is neither the user nor the buyer. Doctors care about time, ego and liability (not only money), so they won't pay and may resist being questioned. The user is the counter pharmacist or staff; the buyers are the organisations that carry dispensing risk at scale.

| Stakeholder | Cares about | Gains | Loses | Resistance |
|---|---|---|---|---|
| Doctor | Time, reputation, liability | Protection from errors they can't see (another doctor's Rx) | Gets questioned by a pharmacist; awkward given the hierarchy | Medium (social, not money) |
| Counter pharmacist / staff (user) | Speed, not getting in trouble | "Senior pharmacist in a box", especially for junior or unqualified staff | Time: typing an Rx during a 1–2 min sale | High if it adds steps |
| Independent chemist owner | Margin, licence, stock | Avoids selling banned FDC or NSQ stock (licence risk, returns) | Slightly fewer duplicate sales; Jan Aushadhi suggestion sends the sale to another shop | High for Jan Aushadhi, low for compliance |
| Pharmacy chains (Apollo, MedPlus, Wellness Forever) | Brand trust, consistency, liability | Same safety standard at every counter | Licence fee | Low |
| E-pharmacies (1mg, PharmEasy, Apollo 24/7) | Rx review throughput, compliance, liability | Faster pharmacist review at scale, audit log | Integration effort | Lowest: best first buyer |
| Hospital pharmacies | Accreditation, adverse events | Supports medication-safety standards (NABH, unverified) | HIS integration | Low, slow sales cycle |
| Pharma companies | Volume, esp. cold/cough FDCs | Nothing | Banned-FDC flags, fewer duplicate sales | Low in practice: no control over the counter, tiny volume |
| Patients | Cost, safety | Biggest benefit | Nothing | None, but won't pay |
| Government (PMBJP, drug controllers) | Public health, enforcement | Bans enforced at the counter, generic adoption | Nothing | None, slow procurement |
| Insurers (later) | Fewer ADE hospitalisations | Lower claims | Nothing | None, later-stage buyer |

#### 9.3 Segments and revenue model
| Segment | Viable? | Model | Why |
|---|---|---|---|
| E-pharmacies | **Yes, strongest** | Per-check API | Already pay pharmacists to review Rx at scale; we speed it up and cut liability |
| Pharmacy chains | **Yes** | Per-store licence | Standardises safety across stores, protects the brand |
| Hospital pharmacies | Yes, slower | Licence / HIS integration | Accreditation and adverse-event costs |
| EMR platforms (HealthPlix, Eka) | Yes, as partner | API | Adds dose-aware checks to their product; HealthPlix shows the market pays for in-EMR CDSS\[31\]\[32\] |
| Independent chemists (~1M) | Only free or bundled | Free offline app; reach via billing software | Won't pay standalone; compliance hook drives adoption |
| Doctors | No | — | Indirect beneficiaries only |
| Government / Jan Aushadhi Kendras (20,149) | Impact story | Tender / programme | Good for judges, slow for revenue\[74\] |

**Pitch line:** "We sell to the people who carry the risk at scale (e-pharmacies, chains, hospitals) and give it free to the independent chemist, where it protects their licence."

**Market size:** cite one estimate only, labelled as such: Ken Research, Indian pharmacy retail USD 30.1B (2025) → 52.8B (2031).\[70\]

#### 9.4 Adoption resistance and mitigations
| Resistance | Mitigation |
|---|---|
| Counter time: typing every Rx | Business version plugs into pharmacy billing software (e.g. Marg ERP, unverified market share): the bill already lists the brands, so the check runs with zero extra typing. Hackathon build stays typed input, per the problem statement |
| Chemist margin lost to Jan Aushadhi | Private-chemist mode suggests a cheaper same-composition alternative **in their own stock**; Jan Aushadhi mode only for Kendras and government deployments |
| Chemist doesn't value patient safety enough to pay | Lead with compliance: "protects your licence" (banned FDC, NSQ batch); safety is the side benefit |
| Doctor ego when questioned | Generate a short polite query: "Patient is also on Zerodol-P from Dr X. Total paracetamol is 4.1 g/day. Please confirm." Frame it as "a prescription you couldn't see", never "your error" |
| Alert fatigue wastes counter time | The alert budget is also a business feature: fewer interrupts mean less counter time and fewer awkward doctor calls |
| Liability for clinical decisions | Pharmacist decides; every alert cited; overrides logged |
| DDInter licence is non-commercial | Commercial version licenses DDI data (e.g. Medi-Span/CIMS); our IP is the pharmacist-curated Indian layer (compositions, strength variants, limits, SOS rules, suppression list)\[1\] |
| Pharma loses banned/duplicate FDC volume | Negligible, and they don't control the counter; no mitigation needed |

#### 9.5 Competition (business view)
| Category | Players | Threat | Their gap / our angle |
|---|---|---|---|
| Direct: Indian-brand DDI checkers | medThinks (closest), GoDavaii, CureCheck, MSPC DICP\[26\]\[27\]\[28\]\[38\] | **High** | Pairwise DDI; per this doc, no cumulative dose, patient limits, SOS logic or alert budget (unverified, see 9.6) |
| Paid incumbent (India) | MIMS/CIMS eMIMSplus\[29\] | Medium-high | Most complete data; beat it on price, offline use, dose awareness, pharmacist workflow |
| Doctor-side EMRs | HealthPlix, Eka, Practo Ray | Low | See one doctor's Rx only; position them as API customers |
| Pharmacy portals | Tata 1mg, Apollo Pharmacy | Low | Per-drug warnings, not prescription-level (Apollo's Dolo + Numcold warning proves the problem)\[37\]; potential customers |
| Global incumbents | Lexicomp, Medi-Span, FDB, Micromedex, Drugs.com, Medscape | Low in India | Expensive, US-brand-centric, don't know Dolo or Zerodol-P |
| Raw LLMs | ChatGPT, Claude, Gemini | **The competitor in judges' minds** | Severity right 37.3% (Thapa 2025), false alarms, run-to-run variance; beaten by the benchmark |
| Disappearing free APIs | NLM RxNav DDI API (Jan 2024), DrugBank free checker (reported 2026)\[3\]\[4\] | — | Supports an India-owned engine |

**Defensibility:** a big player (e.g. MIMS) could add a dose ledger. The moat is the curated Indian data, pharmacist validation, offline-first design and distribution, not the algorithm.

#### 9.6 Judge Q&A prep
- **"Why not just use ChatGPT?"** Benchmark slide; deterministic (same answer every time), auditable, offline.
- **"medThinks already exists."** Name it first; use the positioning line.
- **"How do you make money on non-commercial data?"** Licensed DDI data in the commercial version; the curated Indian layer is the IP.
- **"Who's liable if it's wrong?"** The pharmacist decides; cited alerts, confidence score, "needs pharmacist" route, override log.
- **"Why would a chemist use it?"** Protects their licence; zero typing once integrated with billing.
- **"Won't doctors resist?"** Polite query template; framed as another prescription they couldn't see.

#### 9.7 Verify before the pitch
1. Run the demo Rx through medThinks and screenshot what it misses; the "pairs only" claim is unverified.
2. NABH medication-safety requirements, e-pharmacy rules and pharmacy billing software market share come from general knowledge, not sourced research.
3. Competitor claims (GoDavaii, CureCheck, medThinks, Practo) are self-reported.\[27\]\[28\]
4. Fill every bracketed benchmark number with measured results.

### 10. Verified additions and corrections (24 Oct 2026)
Checked against primary or reputable secondary sources for the final deck (`PPT.md`). Where this section conflicts with an earlier one, this section wins.

**Additions (new numbers and facts used in the deck)**
| Item | Value | Source |
|---|---|---|
| Polypharmacy, older Indian adults (60+) | 49% (95% CI 42–56); same meta-analysis as Key Finding 9 | \[78\] |
| Self-medication in India | 53.57% pooled mean, 17 articles, 10,248 participants | \[79\] |
| Identical-brand LASA example | 'Medzol' = midazolam and pantoprazole | \[80\] |
| Paracetamol adult maximum | 4,000 mg/day (FDA label); an Indian reference and pharmacist sign-off are still needed | \[81\] |
| CDSCO MDSW final guidance | Circular dated 21 Jul 2026 (Doc No. CDSCO/MD/GD/MDSW/01/2026). "Inform clinical management" is the lowest-risk column. Modules that recommend drug dosages are named as regulated MDSW. The class-letter matrix comes from a secondary source | \[82\]\[83\] |
| Pharmacy Act 1948, s.42 | Only a registered pharmacist may dispense on prescription; in force nationally since 1984 | \[84\] |
| DPDP Act 2023 | Up to ₹250 crore for failing reasonable security safeguards (s.8(5)); Rules notified Nov 2025, phased over 12–18 months | \[85\] |
| E-pharmacy rules | Draft notified 28 Aug 2018, still a draft; it requires a registered pharmacist for dispensing | \[86\] |
| NABH 6th edition | Chapter 3 "Management of Medication (MOM)" covers prescribing, dispensing, LASA drugs and adverse-event reporting (secondary) | \[87\] |
| SDG target 3.8 | "...access to safe, effective, quality and affordable essential medicines and vaccines for all" | \[88\] |
| 16 FDCs of June 2026 | S.O. 3068(E)–3083(E), dated 11 Jun 2026, Section 26A, immediate effect | \[7\]\[89\] |
| 156 FDCs of 2024 | Notification dated 12 Aug 2024 (published around 21 Aug 2024). Delhi HC gave petitioner companies interim relief (order of 2 Sep 2024); current status unverified | \[90\]\[91\] |
| NSQ scope | CDSCO says NSQ failure "relates only to the tested batch" | \[12\] |

**Corrections to earlier sections**
- Key Finding 3 and TL;DR: Thapa et al. 2025 was done at Koshi Hospital, Biratnagar, **Nepal**, not India. "Documentation 20.6%" means agreement with Micromedex's documentation-quality rating, not a documentation rate. The correct DOI is 10.1016/j.rcsop.2025.100564 (PMC11786904); the URL in source \[5\] (PII S2667276625000964) does not match this paper.\[92\]
- Key Finding 4: the share of duplication overrides judged appropriate is **82–98% in the two studies that assessed it** (Nanji 2014, 2018), not 82–99%. The setting is hospital order entry. DOI e15653.\[93\]
- Key Finding 5: Joshi et al. 2007 appeared in the *International* Journal of Risk & Safety in Medicine. Its abstract says "a general hospital in Delhi". The 113,346-entry figure is not in the abstract and is unverifiable, so drop it.\[94\]
- Key Finding 6: the S.O. 3285–3440(E) range for the 156 FDCs is unverified, and sources give conflicting gazette dates. Cite "August 2024".
- Key Finding 2, §3 and §9.5: the 2 Jan 2024 RxNav date and the DrugBank free-checker retirement are both unverified, so do not cite either.
- Key Finding 10: the CDSCO final MDSW guidance is dated 21 Jul 2026 (see additions).
- §8 and §9.3: "~1M outlets" does not come from Ken Research. The only figure is AIOCD's self-reported membership (~12.4 lakh chemists and distributors, ~9.8 lakh of them retailers). Label it self-reported or skip it.\[95\]
- §9.4: Marg ERP figures are vendor self-reported. Do not cite them as market share.
- Paracetamol acute-liver-failure figures (e.g. 42% of US cases) are US data (Larson 2005). In India, anti-TB drugs dominate drug-induced liver injury (Devarbhavi 2010). Do not present paracetamol liver-failure numbers as Indian.\[96\]\[97\]
- Market size: cite only Ken Research, USD 30.1B (2025) → 52.8B (2031), labelled as an estimate (as in §9.3).

## Recommendations
1. **Next 2 hours:** freeze the data model (brand → ingredients[mg, unit, per_volume] → ATC class) on the 1mg 2025 or A-Z dataset, filtered to the ~2,000 top OPD brands. Hand-curate the ~40 brands used in the demo and test set with the pharmacist.
2. **By midnight:** finish the resolver, sig parser, ledger, limits table (pharmacist-signed, ~25 ingredients), class duplication, banned-FDC table and 3-tier output with the X-ray visual. Use DDInter only for pairs among resolved ingredients.
3. **By 3 AM:** run the 20–30-prescription v1 gold set through the engine and ChatGPT/Claude, and put one metrics slide in the deck. A bad but honest number beats a claim.
4. **Round 2:** add the LASA detector, NSQ banner, paediatric syrups, cited explanations, Jan Aushadhi ₹ savings and the full 50–60-prescription benchmark.
5. **Pitch framing:** "Pharmacist-in-the-loop, deterministic, auditable, works offline at the counter; LLM (online only) parses messy text and writes the patient leaflet." Position it as informing a professional to stay in a lower SaMD risk class. Name medThinks proactively and state what you do that it doesn't.
6. **Don't spend time on** OCR, WhatsApp or a generic DDI table. Rivals will have them, and they dilute your 30-second story.

## Caveats
- DDInter (CC BY-NC-SA) and the scraped 1mg/Kaggle datasets are non-commercial or of unclear licence.\[44\]\[47\] Prices in the A-Z dataset date from Nov 2022.\[41\] Brand compositions change (e.g. Sinarest vs Sinarest New, Zerodol-P variants), so verify every demo brand on the pack or with the pharmacist. One retailer page labels an old "Crocin Cold & Flu" formulation as banned (unverified), so use "Crocin Cold & Flu Max" as verified.\[75\]
- The DrugBank checker retirement date comes from a vendor blog (RxLabelGuard), not DrugBank.\[4\] The status of CDSCO's software guidance is reported as final (July 2026) by Lexology, but some 2026 sources still call it a draft.\[18\]\[76\]
- The LLM benchmark literature is heterogeneous: some studies show high DDI sensitivity (e.g. GPT-5 perioperative).\[77\] Claim that LLMs are *noisy and inconsistent on severity and Indian brands*, not that they are "useless".
- Dose limits (e.g. paracetamol 4 g/day; lower caps in elderly or hepatic patients) must come from the pharmacist's sign-off and standard references. Present outputs as decision support for a pharmacist, never as autonomous advice.
- Competitor feature claims (GoDavaii, CureCheck, medThinks, Practo) are self-reported and not independently verified.

## Sources

1. [DDInter - Database Commons](https://ngdc.cncb.ac.cn/databasecommons/database/id/7473)
2. [Bioregistry - Curated Drug-Drug Interactions Database - Drug](https://bioregistry.io/ddinter.drug)
3. [NLM Drug Interaction API Discontinued: A Migration Guide for Development Teams](https://www.rxlabelguard.com/blog/nlm-rxnav-drug-interaction-api-discontinued-migration-guide)
4. [5 Drug Interaction APIs Compared (2026 Guide)](https://rxlabelguard.com/compare)
5. [Comparative evaluation of artificial intelligence platforms and drug interaction screening databases using real-world patient data - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2667276625000964)
6. [Add Tribune As Your Trusted Source](https://www.tribuneindia.com/news/india/citing-risks-govt-bans-156-fixed-dose-combo-drugs/amp)
7. [Health Ministry Bans 16 FDCs Including Amoxicillin, Serratiopeptidase; See Full List](https://medicaldialogues.in/news/industry/pharma/health-ministry-bans-16-fdcs-including-amoxicillin-serratiopeptidase-see-full-list-173339)
8. [Government Bans 16 Fixed Dose Combinations (FDCs) in India: Complete List, Reasons & Impact on Healthcare](https://gdcclasses.com/government-bans-16-fixed-dose-combinations-fdcs-in-india-complete-list-reasons-impact-on-healthcare/)
9. [FDC](https://cdsco.gov.in/opencms/opencms/en/Drugs/FDC/)
10. [Fixed Dose Combinations (FDCs)](https://www.shankariasparliament.com/current-affairs/fixed-dose-combinations-fdcs)
11. [Government Bans 156 Fixed-Dose Combinations (FDCs) Due to Health Risks](https://www.medboundtimes.com/medbound-blog/government-bans-156-fixed-dose-combinations-fdcs-due-to-health-risks)
12. [CDSCO identifies 330 substandard drugs, one spurious medicine in September](https://thenewsmill.com/2026/10/cdsco-identifies-330-substandard-drugs-and-one-spurious-medicine-in-september-testing/)
13. [CDSCO flags 330 substandard drug samples, one spurious medicine in September surveillance](https://news.webindia123.com/news/Articles/India/20261023/4514127.html)
14. [NSQ Alert: 42 Drug, Surgical Product Samples Fail CDSCO Quality Tests in September](https://medicaldialogues.in/news/industry/pharma/nsq-alert-42-drug-surgical-product-samples-fail-cdsco-quality-tests-in-september-181886)
15. [Govt targets 25,000 Jan Aushadhi Kendras by March 2027](https://www.indianpharmapost.com/policy/govt-targets-25000-jan-aushadhi-kendras-by-march-2027-21058)
16. [Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)](https://www.ibef.org/government-schemes/pradhan-mantri-bhartiya-janaushadhi-pariyojana)
17. [Navigating India's Medical Device Software Framework: A Guide](https://www.india-briefing.com/news/cdsco-draft-guidance-medical-software-40691.html)
18. [CDSCO releases final guidance document on medical device software - Lexology](https://www.lexology.com/library/detail.aspx?g=0049fff8-5f9c-469c-8701-0a30b009a4c5)
19. [CDSCO Medical Device Software: Regulatory Pathways and Classification](https://www.gadgeon.com/blog/cdsco-medical-device-software-regulatory-pathways-and-classification/)
20. [Buy Zerodol P 100mg/500mg Tablet Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/zerodol-p-100mg-500mg-tablet-943062)
21. [Buy Zerodol P Tablet Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/zerodol-p-tablet-67304)
22. [Buy Ascoril LS Syrup Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/ascoril-ls-syrup-63412)
23. [DDInter 2.0: an enhanced drug interaction resource with expanded data coverage, new interaction types, and improved user interface](https://academic.oup.com/nar/article/53/D1/D1356/7740584)
24. [www.who.int](https://www.who.int/publications/i/item/B09489)
25. [GitHub - junioralive/Indian-Medicine-Dataset: A curated dataset of Indian medicines, organized by brand. Essential for healthcare research and pharmaceutical analysis. · GitHub](https://github.com/junioralive/Indian-Medicine-Dataset)
26. [Drug Interaction Checker for India](https://medthinks.com/drug-interaction-checker-india)
27. [Top 7 Best Drug Interaction Checker Apps in India (2026)](https://www.godavaii.com/alternatives/best-drug-interaction-checker-apps)
28. [Drug Interaction Checker — Safe Medication Use in India](https://www.curecheck.in/drug-interaction)
29. [eMIMSplus - eMIMSplus](https://emims.plus/emimsplus/)
30. [eMIMSplus India - Android app](https://chrome-stats.com/d/com.mims.emimsplusindia?hl=en)
31. [India's largest EMR for Doctors - Digital Prescriptions, Mobile EMR.Free Trial for new doctors.](https://blogs.healthplix.com/emr/)
32. [Enhancing patient safety: leveraging artificial intelligence-powered electronic medical records for effective drug-drug interaction nudge in real-world prescribing practices](https://www.ijbcp.com/index.php/ijbcp/article/view/5620)
33. [How Eka.care’s EMR Is Giving Doctors Their Time Back](https://medium.com/@eka.care/how-eka-cares-emr-is-giving-doctors-their-time-back-5ba740441f67)
34. [Eka Care: AI-Native Health OS](https://www.eka.care/)
35. [EMR for Dentists](https://www.eka.care/services/emr-for-dentists)
36. [Automate Prescription Management and Patient Billing With Practo Ray](https://blog.practo.com/automate-prescription-management-and-patient-billing-with-practo-ray/)
37. [Buy Dolo-650 Tablet online](https://www.apollopharmacy.in/otc/dolo-650mg-tablet-15-s)
38. [Drug Interaction Checker for Prescription](http://dic.mspcindia.org/Pages/DICP.aspx)
39. [Drug Interaction Checker - Find Unsafe Combinations](https://www.drugs.com/drug_interactions.html)
40. [FAQs - RxNav More Information](https://lhncbc.nlm.nih.gov/RxNav/information/FAQs.html)
41. [A-Z Medicine Dataset of India](https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india)
42. [Extensive A-Z Medicines Dataset of India](https://www.kaggle.com/datasets/riturajsingh2004/extensive-a-z-medicines-dataset-of-india/data)
43. [Extensive A-Z Medicines Dataset of India](https://www.kaggle.com/datasets/riturajsingh2004/extensive-a-z-medicines-dataset-of-india)
44. [India Medicines and Drug Info Dataset](https://www.kaggle.com/datasets/apkaayush/india-medicines-and-drug-info-dataset)
45. [GitHub - nowitsidb/INDIAN\_MEDICINE\_MCP\_SERVER: A comprehensive API server for medicine information lookup, alternative suggestions, and composition analysis. This server provides multiple endpoints for searching, filtering, and analyzing medicine data with advanced features like fuzzy matching and price comparison. · GitHub](https://github.com/nowitsidb/INDIAN_MEDICINE_MCP_SERVER)
46. [GitHub - SatvikU3/prescription-reader: personal project for easy reading of prescriptions · GitHub](https://github.com/SatvikU3/prescription-reader)
47. [GitHub - ifaruqi/interact · GitHub](https://github.com/ifaruqi/interact)
48. [GitHub - SPerekrestova/pillchecker-api: Medication interaction checker API (OpenMed + RxNorm + DrugBank) · GitHub](https://github.com/SPerekrestova/pillchecker-api)
49. [GitHub - reviver134/drug-interaction-safety-agent · GitHub](https://github.com/reviver134/drug-interaction-safety-agent)
50. [GitHub - PurvaP9/drug-drug-interaction-system: A prescription-based Drug–Drug Interaction (DDI) detection system using PyTesseract OCR to extract medicines and a Gradio web interface to analyze interaction risks. · GitHub](https://github.com/PurvaP9/drug-drug-interaction-system)
51. [github.com](https://github.com/nadavof/parsigs/blob/master/README.md)
52. [GitHub - royashcenazi/parsigs: Parsigs is an open-source project that aims to extract the relevant dosage information from prescriptions text without compromising the patient׳s privacy. · GitHub](https://github.com/royashcenazi/parsigs)
53. [github.com](https://github.com/jrlegrand/parserx)
54. [GitHub - coderxio/parserx: A modern, lightweight medication sig parser. · GitHub](https://github.com/coderxio/parserx)
55. [GitHub - kormilitzin/med7 · GitHub](https://github.com/kormilitzin/med7)
56. [GitHub - medspacy/medspacy: Library for clinical NLP with spaCy. · GitHub](https://github.com/medspacy/medspacy)
57. [pypi.org](https://pypi.org/project/dose-instruction-parser/2024.1012a0)
58. [GitHub - Public-Health-Scotland/dose\_instruction\_parser: Parsing prescription dose instructions using Named Entity Recognition and rules · GitHub](https://github.com/Public-Health-Scotland/dose_instruction_parser)
59. [Buy Dolo 650 Tablet Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/dolo-650-tablet-74467)
60. [Buy Crocin Cold & Flu Max Tablet Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/crocin-cold-flu-max-tablet-117236)
61. [Buy Ecosprin 75 Tablet Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/ecosprin-75-tablet-40765)
62. [Brufen 400 mg Tablets - Summary of Product Characteristics (SmPC) - (emc)](https://www.medicines.org.uk/emc/product/6713/smpc)
63. [Buy Pan-D Capsule PR Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/pan-d-capsule-pr-343042)
64. [Buy Omez Capsule Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/omez-capsule-356834)
65. [Sinarest New Tablet](https://www.truemeds.in/medicine/sinarest-new-tablet-tm-tacr1-053965)
66. [Buy Montair-LC Tablet Online: View Uses, Side Effects, Price, Substitutes](https://www.1mg.com/drugs/montair-lc-tablet-565306)
67. [Combiflam Tablet 20: Uses, Side Effects, Price & Substitutes](https://www.truemeds.in/medicine/combiflam-tablet-tm-tacr1-009412)
68. [1 Sinarest-CCF Tablets COMPOSITION Each film coated tablet contains:](https://www.centaurpharma.com/downloads/Sinarest-CCF-Tab.pdf)
69. [Can large language models detect drug–drug interactions leading to adverse drug reactions? - Justine Sicard, François Montastruc, Coline Achalme, Annie Pierre Jonville-Bera, Paul Songue, Marina Babin, Thomas Soeiro, Pauline Schiro, Claire de Canecaude, Romain Barus, 2025](https://journals.sagepub.com/doi/10.1177/20420986251339358)
70. [India Pharmacy Retail Market Size, Share & Forecast, By Product Type, Distribution Channel & Care Setting, 2026-2031](https://www.kenresearch.com/industry-reports/india-pharmacy-retail-market)
71. [Online Pharmacy Market in India: Size, Share](https://www.imarcgroup.com/india-online-pharmacy-market)
72. [India E Pharmacy Market Size, Share, Growth and Forecast 2030](https://www.techsciresearch.com/report/india-e-pharmacy-market/7375.html)
73. [India Retail Pharmacy Market Size and Forecasts 2031](https://mobilityforesights.com/product/india-retail-pharmacy-market)
74. [From 300 to 20,149 Jan Aushadhi Kendras: How PMBJP is transforming affordable healthcare across India](https://organiser.org/2026/07/27/371959/bharat/from-300-to-20149-jan-aushadhi-kendras-how-pmbjp-is-transforming-affordable-healthcare-across-india/)
75. [Crocin Cold & Flu Tablet - Uses, Side Effects, Substitutes, Composition And More](https://www.lybrate.com/medicine/crocin-cold-flu-tablet)
76. [CDSCO Registration for SaMD & AI Diagnostics](https://mrdxregulatory.com/blog/cdsco-registration-samd-ai-diagnostic-tools-india-2026)
77. [ChatGPT as a Tool for Perioperative Safety: Evaluating Drug Interaction Detection in Anesthetic Regimens - PubMed](https://pubmed.ncbi.nlm.nih.gov/41952934/)
78. [Bhagavathula et al., Prevalence of Polypharmacy, Hyperpolypharmacy and Potentially Inappropriate Medication Use in Older Adults in India, Front Pharmacol 2021 (PMC8173298)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8173298/)
79. [Rashid et al., Prevalence and Predictors of Self-Medication Practices in India, Curr Clin Pharmacol 2020 (PubMed 31763976)](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=31763976&rettype=abstract&retmode=text)
80. [Neelakantan, Sharma, Kulkarni, Look-alike, sound-alike (LASA) drugs in India, Lancet Reg Health Southeast Asia 2024 (PMC11127203)](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11127203)
81. [FDA, acetaminophen maximum daily dose document](https://fda.gov/media/83588/download)
82. [National Law Review, Code to Compliance: Decoding India's Medical Device Software Guidance](https://natlawreview.com/article/code-compliance-decoding-indias-medical-device-software-guidance)
83. [MedDeviceGuide, India CDSCO MDSW guidance 2026 (secondary, vendor blog)](https://meddeviceguide.com/blog/india-cdsco-medical-device-software-mdsw-guidance-2026-guide)
84. [Pharmacy Council of India, Pharmacy Act 1948 text](https://www.pci.nic.in/pdf/3.pdf)
85. [Bar & Bench, Companies can save up to 250 crore navigating the DPDP Act 2023](https://www.barandbench.com/view-point/companies-can-save-up-to-250-crore-navigating-the-dpdp-act-2023)
86. [Novojuris, Draft rules for operation of e-pharmacies in India](https://www.novojuris.com/thought-leadership/draft-rules-for-operation-of-e-pharmacies-in-india.html)
87. [NABH, 6th edition Chapter 3 Management of Medication (MOM) masterclass](https://nabh.co/training/hco-full-accreditation-masterclass-6th-edition-chapter-3-management-of-medication-mom/)
88. [United Nations, Sustainable Development Goal 3](https://sdgs.un.org/goals/goal3)
89. [Business Standard, Centre bans 16 fixed drug combinations over health risks (20 Jun 2026)](https://www.business-standard.com/industry/news/centre-bans-16-fixed-drug-combinations-over-health-risks-126062000464_1.html)
90. [DT Next, Centre bans 156 fixed-dose combination drugs used for fever, pain, allergies](https://www.dtnext.in/lifestyle/wellbeing/centre-bans-156-fixed-dose-combination-drugs-used-for-fever-pain-allergies-800641)
91. [ETV Bharat, Court relief for pharma companies against prohibitory order on 156 drugs (31 Aug 2024)](https://www.etvbharat.com/en/!bharat/court-relief-for-pharma-companies-against-govt-prohibitory-order-on-156-drugs-enn24083105087)
92. [Thapa, Karki, Shrestha, Exploring potential drug-drug interactions in discharge prescriptions, Explor Res Clin Soc Pharm 2025 (PMC11786904)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11786904/)
93. [Poly et al., Appropriateness of Overridden Alerts in CPOE: Systematic Review, JMIR Med Inform 2020 (PMC7400042)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400042/)
94. [Joshi et al., A prospective study of medication errors arising out of LASA brand names confusion, Int J Risk Saf Med 2007 (Crossref)](https://api.crossref.org/works/10.3233/JRS-2007-416)
95. [The Federal, AIOCD general secretary on chemist membership (self-reported)](https://thefederal.com/category/business/cctv-chemist-shops-rajiv-singhal-aiocd-256909)
96. [Larson et al., Acetaminophen-induced acute liver failure: US multicenter prospective study, Hepatology 2005 (PubMed 16317692)](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=16317692&rettype=abstract&retmode=text)
97. [Devarbhavi et al., drug-induced liver injury in India, Am J Gastroenterol 2010 (PubMed 20648003)](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=20648003&rettype=abstract&retmode=text)
