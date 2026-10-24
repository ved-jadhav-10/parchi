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
| Judge-run hidden test set or baseline | **Unknown to the team** (none established so far) | unknown |
| Deliverables and hard rules (AI-assisted code, external APIs, scraped data, live URL) | **Not answered clearly**; `PPT.md` refers to an "official 9-slide HYPNEXIS template" | open question |
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
| H5 | "What if you hide an alert that mattered?" | H | Recall per alert type; unsuppressible alert classes; Silent tier kept visible (**quiet, not blind**) | S-M | C | open |
| H6 | "Patients also buy at the local chemist. Your picture is incomplete" | M | Coverage label + ask-the-patient question for OTC-prone classes (**honest coverage**) | S | C, D | open |
| H7 | "Isn't this regulated medical-device software?" | M | Wording audit: never output a dose; outputs map to CDSCO "inform" column (**regulatory by design**) | S | C, D | open |
| H8 | "Your data is scraped / non-commercial" | M | Runs on the buyer's own catalogue (CSV import); licence column on Data page (**bring your own catalogue**) | S | A, D | open |
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
- **Why it's a hole:** `limits.json` has 11 ingredients, all `pharmacist_approved: false`. Kidney bands for 34 drugs are unverified.
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
