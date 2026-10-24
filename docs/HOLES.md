# HOLES.md: holes a judge could poke, and the fixes that turn them into USPs

Goal: **win HM-02**, not build a company. Business thinking is here because judges reward it, not because we are raising money. Each hole is written as the question a judge would ask. Update this file after every grill / council session (prompts in `RED_TEAM_PROMPTS.md`).

**Legend**
- **Risk:** H = a judge will likely ask and we have no good answer; M = may ask, partial answer; L = unlikely or already covered.
- **Effort:** S < 1 h, M 1-3 h, L > 3 h (one dev).
- **Status:** `open` -> `fix chosen` -> `built` -> `in deck` (on a slide or in Q&A prep). `dropped` if we decide not to fix.
- Never invent numbers. A fix that needs a number says where the number comes from; unsourced = mark unverified.

## Confirmed parameters (grill session 1, 24 Oct 2026; source: the team)

| Parameter | Answer | Status |
|---|---|---|
| Problem statement | HM-02, track **Health & MedTech** (2 problem statements in that track; 6 tracks in total: AI & ML, Web3, Climate Tech, Health & MedTech, Smart Cities, Hardware). Verbatim text below | confirmed |
| Scoring rubric and weights | **Not disclosed yet** | unknown: we assume equal weights, unverified |
| Round 1 format | **PPT + prototype + presentation of both, in 10 minutes** | confirmed |
| Finals format, panel make-up, Q&A length | not known | unknown |
| Judges shared across tracks? | not known (nothing announced) | unknown |
| Interactive demo (judge types own prescription) | **Yes, as long as it cannot produce a wrong answer** | decision |
| Pharmacist / pharmacy-student help for the test set | A friend's grandfather has offered: **MBBS general doctor, 45 years of experience (not a pharmacist)**. The PS wording says "pharmacist or pharmacy student" | confirmed, see H25 |
| **Provenance rule** | Every slide and doc states exactly who checked what and when (for example "reference-labelled from published sources; reviewed by an MBBS GP on [date]"). Nothing is described as expert-reviewed unless a named person did it. Reference-based work is labelled as such | rule |
| Presentation work | **Deferred**: first clarify the PS and develop new things, then finalise the presentation. Also planned: landing page and a video | decision |
| Buyer | **E-pharmacies and chains only** (decision a). Local chemists are not a paying customer; H24 stays open | decision |
| Expert time | **10 minutes only**, no extra questions (sheet in `docs/expert-review/`). Answers to real-world questions come from published sources | decision |
| Demo story | One memorable reveal (the 68-year-old, hidden paracetamol), and it must be a case that really happens, not a rare one | decision |
| Ayurveda | **Full name mapping and conflict engine chosen** (grill 4, decision c). Starter version built by Track B: 15 herbs, 2 formulations, 12 evidence-graded rules, all unverified. See H26 | built (starter) |
| Judge-run hidden test set or baseline | **Unknown to the team** (none established so far) | unknown |
| Deliverables | An official slide **template exists** (the team will share it). Other required items (repo, live URL, video) not confirmed | partly confirmed |
| Hard rules (AI-assisted code, external APIs, scraped data) | not stated by the organisers as far as the team knows | unknown |
| Schedule | no round has happened; the team aims to finish the entire solution **by Round 1** | confirmed |
| Win condition | **First place overall**, across all six tracks | confirmed |

<details><summary>Problem statement as given (verbatim)</summary>

**Prescription Safety Checker for Indian Brand Medicines.**

*Phase 2, an extension of this problem statement:* Check a patient's whole history across several doctors, not one prescription.
- Merge prescriptions from three doctors into one timeline; flag overlaps and cross-doctor duplicates.
- Re-check doses when a new kidney-function value arrives.
- Mark unknown brands as unverified, or propose a likely composition with confidence.
- Rank alerts by severity so the most urgent appear first.

*Phase 1, unchanged:* Indian prescriptions use brand names, combination products and abbreviations that can hide drug interactions and dosage errors. Build a checker that reads a typed prescription, identifies each brand's active ingredients and strengths, and flags interactions, duplicate ingredients and potentially excessive doses.

*Explanation:* Different brands can share an ingredient, and combinations can hide duplication, such as two brands that both contain paracetamol. Frequencies use abbreviations like OD, BD, TDS and SOS. Safe doses depend on age, weight and kidney function. Too many minor alerts cause alert fatigue, so users ignore important warnings. **Teams must build their test set with help from a pharmacist or pharmacy student.**

*Key challenges:* resolving misspelled medicine brand names; identifying all ingredients in combination products; applying patient-specific dosage limits; reducing alert fatigue.

</details>

## Summary

| # | Judge asks | Risk | Best fix (USP it creates) | Effort | Owner | Status |
|---|---|---|---|---|---|---|
| H1 | "Did you talk to a single real user?" | H | Time the pharmacist on the demo Rx, by hand vs with Parchi (**measured with a real pharmacist**) | M | D | open |
| H2 | "Why not just use ChatGPT?" | H | Gold-set benchmark + same-Rx-5-times consistency test (**deterministic, knows June 2026 bans**) | M | D | open |
| H3 | "medThinks / 1mg already do this, or will build it" | H | medThinks screenshot on the demo Rx + build-vs-buy slide (**plugs in, doesn't replace**) | S | D | open |
| H4 | "Who checked your clinical numbers?" | H | Pharmacist signs limits + SOS caps; UI badge per limit (**every number shows who approved it**) | M | B, D | open |
| H5 | "What if you hide an alert that mattered?" | H | Recall per alert type; unsuppressible alert classes; Silent tier kept visible (**quiet, not blind**) | S-M | C | open (Silent alerts are now listed on Check and on every order, collapsed) |
| H6 | "Patients also buy at the local chemist. Your picture is incomplete" | M | Coverage label + ask-the-patient question for OTC-prone classes (**honest coverage**) | S | C, D | open |
| H7 | "Isn't this regulated medical-device software?" | M | Wording audit: never output a dose; outputs map to CDSCO "inform" column (**regulatory by design**) | S | C, D | open |
| H8 | "Your data is scraped / non-commercial" | M | Runs on the buyer's own catalogue (CSV import); licence column on Data page (**bring your own catalogue**) | S | A, D | UI built (`#/catalogue`: import, review list, confirm, same-composition prompts); licence column on the Data page as before |
| H9 | "Where does patient data go?" (DPDP) | M | Engine is in-browser; verify `api/` stores nothing (**privacy by architecture**) | S | B | open |
| H10 | "Does it scale?" | M | Measure ms/Rx and a 1,000-order queue on a laptop (**measured scale**) | S | C | open |
| H11 | "How do you make money, and how much?" | M | One coherent line: per-check fee priced against pharmacist time saved (from H1) | S | D | open |
| H12 | "CDSCO lists change monthly. How do you stay current?" | L-M | "Data as of" stamp in UI + refresh script for NSQ/ban lists (**freshness you can see**) | S | A, D | open |
| H13 | "Doesn't this add work for a busy pharmacist?" | M | Zero typing (cart lines in), ranked queue, alert budget; show clicks per order (**fewer alerts = faster**) | S | D | open |
| H14 | "The PS says you must build your test set with a pharmacist. Where is it?" | H | _not brainstormed yet_ | - | - | open |
| H15 | "Half your deck is about e-pharmacy buyers. The PS is a typed-prescription checker" | M | _not brainstormed yet_ | - | - | open |
| H16 | "You have 10 minutes. Which of your nine screens do I see?" | H | _not brainstormed yet_ | - | - | open |
| H17 | "Try it on this prescription I just wrote" | H | _not brainstormed yet_ | - | - | open |
| H18 | "You're judged against AI, Web3, climate and hardware teams. Why does a pharmacy tool win overall?" | M | _not brainstormed yet_ | - | - | open |
| H19 | "You said everything is done by Round 1. What is not verified?" | H | _not brainstormed yet_ | - | - | open |
| H20 | "The doctor already has the patient's previous prescriptions. Your solution is of no use" | H | _not brainstormed yet_ | - | - | open |
| H21 | "The local pharmacist has no time and no incentive to do any of this" | H | _not brainstormed yet_ | - | - | open |
| H22 | "People buy medicines right after a diagnosis. Two doctors' prescriptions at once is rare. Where is the problem?" | H | _not brainstormed yet_ | - | - | open |
| H23 | "If Parchi shows no alert, is it safe? Your interaction data has gaps" | M | Result screens name the ingredients DDInter has nothing on; 13 curated pairs fill known gaps (**honest about what it cannot see**) | S | C, D | built |
| H24 | "Most Indians buy at local chemist shops. Your buyers (e-pharmacies, chains) are a small share" | H | _not brainstormed yet_ | - | - | open |
| H25 | "The PS says a pharmacist or pharmacy student helped build the test set. Yours is a general doctor" | M | _not brainstormed yet_ | - | - | open |
| H26 | "Where is the evidence that Ayurvedic and ordinary medicines are really taken together and really clash?" | H | _not brainstormed yet_ | - | - | open |

## Details

### H1. "Did you talk to a single real user?"
- **Why it's a hole:** all evidence is literature. The headline LLM study (Thapa 2025) is from Nepal. Nobody has watched an e-pharmacy pharmacist review an order.
- **Fixes (ranked):**
  1. In the pharmacist session (`PS_ANALYSIS.md` §4), time them reviewing the demo Rx by hand, then with Parchi. Record what they missed or flagged. That gives one real, measured "minutes and misses" number.
  2. Ask 3 questions on record: how often do you see the same ingredient across brands? How long does an order review take? What would make you trust or ignore an alert? Get a one-line quote they allow us to use.
  3. Quick form to pharmacy students / local chemists (5-10 replies is honest, label the n).
- **USP:** "Measured with a practising pharmacist" is something few teams will have.

### H2. "Why not just use ChatGPT?"
- **Why it's a hole:** the benchmark is planned but, per `PPT.md`, no metric is measured yet.
- **Fixes:** run the gold set (Track D `eval/`). Add a **consistency test**: the same Rx 5 times through ChatGPT, count different answers. Include a June 2026 banned FDC that models are unlikely to know. Show one live side-by-side in the demo.
- **USP:** same answer every time, cites a source, knows last month's CDSCO list, works offline.

### H3. "medThinks / 1mg already do this, or will build it"
- **Fixes:** run the demo Rx through medThinks and screenshot what it misses (`PS_ANALYSIS.md` §9.7, still to do). Build-vs-buy line: to copy us they need the curated limits, SOS rules, suppression list and a pharmacist gold set, not just code. Pitch Parchi as the engine inside their existing review console (`api/check` + FHIR import are built).
- **USP:** "We plug into your review desk; we don't replace it."

### H4. "Who checked your clinical numbers?"
- **Why it's a hole:** `limits.json` has adult maximums for 33 ingredients (22 read from FDA labels, the US OTC monograph and EMA/UK SmPCs on 24 Oct 2026), all `pharmacist_approved: false`. Kidney bands for 34 drugs are unverified. About 79% of ingredient occurrences in popular oral brands had no limit before that; the results now name the unlimited ones (`docs/DATA_RELIABILITY.md`).
- **Fixes:** in the session, sign off the demo-critical limits first (paracetamol, NSAIDs, SOS caps). UI shows a badge per limit: approved by [pharmacist] or unverified. Stamp a clinical-data version on every result.
- **USP:** transparent clinical provenance. A chatbot can't show who approved its numbers.

### H5. "What if you hide an alert that mattered?"
- **Why it's a hole:** the alert budget (≤1 Interrupt per Rx) is our pitch, but cutting alerts invites "you missed one".
- **Fixes:** report recall separately from alerts per Rx on the gold set. Make renal, high-severity DDI and banned-FDC alerts never suppressible (Poly 2020: those overrides are often inappropriate). Suppressed alerts stay in the Silent tier with a count, and every suppression is logged.
- **USP:** "Quiet, not blind."

### H6. "Patients also buy at the local chemist. Your picture is incomplete"
- **Fixes:** label coverage on every result ("history: 3 orders on this platform"). When the order includes OTC-prone classes (paracetamol, NSAIDs, cold FDCs), generate one ask-the-patient question for the pharmacist. Show FHIR import (built) as the path to records from other providers.
- **USP:** honest about what it can't see, and tells the pharmacist what to ask.

### H7. "Isn't this regulated medical-device software?"
- **Why it's a hole:** the CDSCO MDSW guidance names dose-recommending modules as regulated (F20 in `PPT.md`).
- **Fixes:** audit all alert and UI text so it never recommends a dose, only "exceeds reference limit X (source); pharmacist to review". One slide line mapping our outputs to the "inform" column. The override log proves a human decides.
- **USP:** regulatory by design, stated before a judge asks.

### H8. "Your data is scraped / non-commercial"
- **Fixes:** the Data page already lists sources and licences; add a "production replacement" column (buyer's own catalogue, licensed DDI data, CDSCO/PMBJP government lists). Point out that catalogue CSV import (Track A Phase 2) means production runs on the buyer's own SKU master.
- **USP:** "Bring your own catalogue." The IP is the curated rules layer, not the scraped table.

### H9. "Where does patient data go?" (DPDP Act)
- **Verified in code (24 Oct 2026, Track B):** nothing in `api/` writes, stores or logs, and only the sig text is sent to the model (a test asserts brand and patient data are not). Not verified: what the host (Vercel) and the model provider keep on their side.
- **Fixes:** the engine runs in the browser, so offline checks never leave the device. Verify and state that `api/check` and `api/parse-sig` store nothing and that the LLM fallback sends only sig text, no patient identifiers (unverified until checked in code).
- **USP:** privacy by architecture, not by policy.

### H10. "Does it scale?"
- **Fixes:** script over the gold set: ms per Rx, Rx per second on a laptop, offline bundle size, and a ranked queue of 1,000 synthetic orders. Put only measured numbers on slide 5.
- **USP:** near-zero marginal compute because the engine runs client-side.

### H11. "How do you make money, and how much?"
- **Fixes:** keep one line, not a spreadsheet: per-check API fee for e-pharmacies, per-store licence for chains, free for independents (`BUSINESS_MODEL.md` §4). Anchor price to pharmacist minutes saved from H1. Any salary figure must be sourced or labelled illustrative.
- **USP:** pricing tied to a number we measured ourselves.

### H12. "CDSCO lists change monthly. How do you stay current?"
- **Fixes:** show "data as of [date]" for banned FDC and NSQ lists in the UI. Track A's NSQ fetcher becomes a documented refresh script.
- **USP:** freshness you can see; a chatbot's training cutoff can't.

### H13. "Doesn't this add work for a busy pharmacist?"
- **Fixes:** input is cart lines or the buyer's digitised Rx, so there's no extra typing. Show clicks per order in the review console. The alert budget and ranked queue reduce review time.
- **USP:** "Fewer alerts is a speed feature, not just a safety one."

### H14. "The PS says you must build your test set with a pharmacist. Where is it?"
- **Why it's a hole:** this is a stated requirement of the problem statement, not a bonus: "Teams must build their test set with help from a pharmacist or pharmacy student." We have no pharmacist-labelled set. Our numbers so far are synthetic: the 97.9% brand top-1 is on generated typos, the parser tests use constructed sigs, and every limit is `pharmacist_approved: false`. A pharmacy student counts under the PS wording, so access may be easier than H1 assumed. Related: H1, H2, H4.
- **Risk:** H (a rule of the problem, visible on the slide). **Status:** open.

### H15. "Half your deck is about e-pharmacy buyers. The PS is a typed-prescription checker"
- **Why it's a hole:** judges score against the PS text: four key challenges (misspelled brands, ingredients in combinations, patient-specific limits, alert fatigue) plus the four Phase 2 items. The B2B buyer story is our addition. If it crowds out a clear answer to each key challenge, judges may read it as drift, or miss that we solved what was asked.
- **Risk:** M. **Status:** open.

### H16. "You have 10 minutes. Which of your nine screens do I see?"
- **Why it's a hole:** Round 1 is deck + prototype + presentation in 10 minutes combined. The prototype has nine pages and Phase 2 history, queue, FHIR and API behind it. Showing breadth will leave each part shallow; the live demo could also run out of time or fail on one click.
- **Risk:** H. **Status:** open.

### H17. "Try it on this prescription I just wrote"
- **Why it's a hole:** a judge may type or dictate their own prescription. The parser, the resolver and the alert rules were tested on lines we wrote or generated, not on real prescriptions. A confident wrong answer, or a crash, on judge input would be worse than any slide.
- **Risk:** H. **Status:** open.

### H18. "You're judged against AI, Web3, climate and hardware teams. Why does a pharmacy tool win overall?"
- **Why it's a hole:** the goal is first place overall, and the six tracks are very different. Judges may not be domain experts (the brief says they are not pharmacists), so a clinical-safety tool has to be understood and felt in seconds against flashier categories. We do not know whether the panel is shared across tracks.
- **Risk:** M. **Status:** open.

### H19. "You said everything is done by Round 1. What is not verified?"
- **Why it's a hole:** the team's plan is to finish the whole solution by Round 1. Several things cannot be finished by then without outside people: pharmacist-approved limits, a labelled test set, a measured chatbot comparison, a real-user timing (H1), a live deployment with offline use actually tested, and the unknown rubric. If any appears on a slide as done and is not, that is the hole a judge finds.
- **Risk:** H. **Status:** open.

### H20. "The doctor already has the patient's previous prescriptions. Your solution is of no use"
- **Raised by:** the team (anticipated question).
- **Why it's a hole:** when a patient sees one doctor, that doctor can see their own earlier prescriptions, and doctor-side systems such as HealthPlix and Eka already raise interaction alerts inside the doctor's records (`PS_ANALYSIS.md` §3, company claims). Parchi's value is only where records are split across doctors, pharmacies and over-the-counter purchases. We have not yet shown, with any evidence from a pharmacist or doctor, how often a doctor really lacks that picture.
- **Risk:** H. **Status:** open.

### H21. "The local pharmacist has no time and no incentive to do any of this"
- **Raised by:** the team (anticipated question). Related: H13, H11.
- **Why it's a hole:** an independent chemist is paid for dispensing, not for reviewing; a safety check adds work with no reward. Our buyer story (e-pharmacies and chains, where a pharmacist already verifies every order) answers this for those buyers, but that claim rests on a source in `BUSINESS_MODEL.md` that we have not checked with a person who works at one. The independent chemist, who is the free tier, remains unanswered.
- **Risk:** H. **Status:** open.

### H22. "People buy medicines right after a diagnosis. Two doctors' prescriptions at once is rare. Where is the problem?"
- **Raised by:** the team (anticipated question).
- **Why it's a hole:** Phase 2 and our history timeline assume one customer holding prescriptions from several doctors at overlapping times. We have no measurement of how often that happens. The statistics we cite are about older Indian adults' polypharmacy (Bhagavathula 2021) and self-medication (Rashid 2020), which are not the same thing as simultaneous multi-doctor purchases. Separately, Phase 1's own example (two brands that both contain paracetamol) does not need two doctors at all, so we have not yet said which of the two we claim is the real problem.
- **Risk:** H. **Status:** open.

### H23. "If Parchi shows no alert, is it safe? Your interaction data has gaps"
- **Why it's a hole:** DDInter has no entry for several common Indian drugs (aceclofenac, domperidone, nimesulide, etoricoxib, ambroxol) and some drug groups (`track-a-data.md`). The UI is careful ("No alerts from the checks run") and the Data page documents the gaps, but a result screen does not say which of the prescription's ingredients were not covered, so a quiet result can still read as reassurance.
- **Risk:** M. **Status:** built (24 Oct 2026, branch `v1`): the check and order pages list the ingredients with no interaction data ("Not covered by the interaction data"), and `public/data/ddi_supplement.json` adds 13 unverified rules for pairs DDInter lacks. The benchmark showed two misses (ACE inhibitor + spironolactone, ARB + ACE inhibitor) before that supplement.

### H24. "Most Indians buy at local chemist shops. Your buyers (e-pharmacies, chains) are a small share"
- **Raised by:** the team, on reviewing the "who is the user" answer (H21).
- **Why it's a hole:** our paying-buyer story needs a pharmacist who is already paid to verify each order, which exists at e-pharmacies and chains. The cited market estimates put online pharmacy at about USD 3.7B against about USD 30B for all pharmacy retail (IMARC and Ken Research, two different reports, so only a rough ratio and both are estimates), which suggests the local store is where most buying happens. The independent chemist is the largest group and the one with the weakest incentive (H21), and our answer for them is the free tier. So the segment with the clearest business reason is a minority of the places medicines are bought, and judges may count that.
- **Risk:** H. **Status:** open.

### H25. "The PS says a pharmacist or pharmacy student helped build the test set. Yours is a general doctor"
- **Why it's a hole:** the problem statement names a pharmacist or pharmacy student. Our available expert is an MBBS doctor with 45 years of general practice. He is a real clinician and can judge whether an alert is clinically sensible, but he is not a pharmacist, and the wording could be read strictly. We also cannot describe him as a pharmacist.
- **Risk:** M. **Status:** open.

### H26. "Where is the evidence that Ayurvedic and ordinary medicines are really taken together and really clash?"
- **Raised by:** the team, with the rule that the story must be real and not rare.
- **What we found (24 Oct 2026, web searches, not a full literature review):** no national measure of how often Indian patients take Ayurvedic and allopathic medicines together. Fragments only: NSS 2014 outpatient data, 6.43% used AYUSH systems against 90.26% allopathy; one Maharashtra study of 401 prescriptions from AYUSH practitioners, about 4.7% mixed the two; an AIIMS Delhi cancer-patient study, 23.4% used Ayurvedic treatment (not specific to concurrent use); a Pune survey (low quality). On interactions: no Indian herb-drug interaction reports found; the national AYUSH pharmacovigilance programme had only 463 suspected adverse-event reports up to August 2020, and a Gujarat study called reporting negligible; a 2001 review found 68.5% of herb-drug case reports could not be evaluated; an ashwagandha-warfarin interaction is not established.
- **Why it's a hole:** the feature has no solid frequency figure and weak interaction evidence, which is exactly the "assumption" the team wants to avoid. Ayurvedic brand-to-ingredient data and a cited interaction list are also unknown. The honest facts available are the gap itself (use is documented, harm is barely monitored).
- **Sources:** NSS 2014 via ThePrint; PhcogMag 5(19s) (Maharashtra prescriptions); AIIMS CAM study; PvPI papers (PMC3117316, PMC8963644); BJCP 52(5) herb-drug review.
- **Risk:** H. **Status:** open.

- **Update (24 Oct 2026, Track B): starter engine built** (`src/engine/herbal/`). 15 herbs with Hindi, Sanskrit, English and Latin names, 2 formulations, 1 ambiguous name (Brahmi), 12 rules (3 established, 9 limited), each with its sources and `pharmacist_approved: false`. It matches names before the ordinary resolver, which used to turn "Triphala churna" into an inhaler and "Haldi doodh" into an antipsychotic. Zero false matches over all 31,978 brand names in the index. It is in `api/check` (single and history modes, history only for overlapping courses). It reports unknown Ayurvedic products as unrecognised and never says "safe".
- **Still open:** no frequency figure for co-use was found, so the story still cannot claim how common this is; no brand-name Ayurvedic product has a verified composition; no pharmacist or doctor has reviewed the rules; the herbal result is now shown on Check and the order page (`HerbalCard`, starting rule set, every rule marked a draft); the evidence is mostly limited, so most findings are notes, not alerts.
- **Risk:** M (reduced from H: the feature now exists and is honest about its evidence; the frequency claim remains unbacked). **Status:** built (starter), evidence gap open.

## USP shortlist (pick 3-4 for the deck)
Ranked by judge impact ÷ effort. Update after each council run.
1. Measured with a real pharmacist (H1)
2. Beats the chatbot on consistency and recent bans (H2)
3. Quiet, not blind (H5)
4. Regulatory and privacy by design (H7 + H9)

## Session log
| Date | Session | New holes | Decisions |
|---|---|---|---|
| 24 Oct 2026 | Initial list (Claude review of docs) | H1-H13 | Goal = win HM-02 |
| 24 Oct 2026 | Grill 1: problem statement and parameters (Q1-Q7) | H14-H19 | PS text recorded verbatim. Round 1 = deck + prototype + presentation in 10 min. Win = first overall. Rubric, panel, finals format, hidden test and hard rules still unknown |
| 24 Oct 2026 | Grill 2: pharmacist help, the judge's hardest questions | H20-H23 | Presentation work deferred until the PS and new features are clear. Interactive demo allowed only if it cannot give a wrong answer. Slide template exists (to be shared). Panel sharing across tracks unknown. H9 partly verified in code |
| 24 Oct 2026 | Grill 3: expert access, who the buyer is | H24-H25 | Expert = MBBS GP, 45 years. **Provenance rule adopted: say exactly who checked what.** Alert fatigue and patient limits to be the strongest measured results. Interactive demo must show "not sure" and never guess |
| 24 Oct 2026 | Grill 4: sheet, buyer, Ayurveda | H26 | Buyer = e-pharmacies and chains. Expert time = 10 min sheet. Ayurveda evidence is thin (H26). Generic syrup input found not totalled (Track A) |
