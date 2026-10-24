# Parchi: final deck content (HYPNEXIS '26, HM-02)

Audience: hackathon judges (neither pharmacists nor developers). Build status stamp: 24 Oct 2026, branch `v1`: Tracks A to D are built and in the app. 814 automated tests (Vitest, re-run 24 Oct late) and 102 Python tests pass; the app builds and runs offline. The engine, the Phase 2 review desk (history timeline, kidney re-check, unverified brands, ranked queue), FHIR import and draft export, and an online customer-leaflet function are working. The benchmark has run the engine on a 54-case **draft** gold set (labels written by the team from drug labels and guidelines, not yet reviewed by a pharmacist); no chatbot has been scored yet. All limits and rules are still unapproved drafts. The pitch targets e-pharmacies and pharmacy chains (`BUSINESS_MODEL.md`); the demo script is `docs/DEMO.md`.

**Clinical review update (24 Oct 2026, late):** a clinical-realism review found severity problems (contraindicated pairs only Inform; the per-Rx cap can demote a third real Interrupt; any NSAID below CrCl 60 Interrupts; no allergy/pregnancy fields; test cases mostly one molecule under two brands). The fixes are planned in `docs/FIX_PLAN.md` (Phases 0-6) and **not yet built**. This file now follows Phase 0: no claim on a slide goes beyond what the app does today.

Template: official HYPNEXIS '26 deck (`HYPNEXIS26_Official_PPT_Template.pptx`), 9 slides, 13.33 × 7.5 in. Every content slide (2–8) shows "Team Name | Team ID" top right: fill as `[Team name] | [Team ID]`.

How to paste: only lines starting `- `, `1. ` or `> ` go on the slide (`> ` = plain paragraph, no bullet); everything else is an instruction. Each box has a **Fit:** line: font size, list style, and the text box's size in the template. Template body text is 14 pt Calibri, bullets with a 0.375 in hanging indent, 6 pt after each paragraph; a box marked 12 pt needs its font reduced to fit. Keep the template's box positions unless a Fit line says otherwise. Every box was checked to fit by wrapping its text with real Calibri metrics (see Checklist).

Status tags used on every feature: **(built)** = working code with automated tests in the repo and shown in the app; **(designed)** = a typed interface for it exists in `src/engine/contracts.ts`, no working code yet; **(planned)** = no code or data yet (UI items are specified in `docs/DESIGN.md` on `dev/track-d`, still no code); **(proposed)** = business model idea. Square brackets `[ ]` = placeholder to fill before finals.

## Fact allocation (each fact appears on exactly one slide)

| # | Fact | Source | PS_ANALYSIS ref | Slide / box |
|---|---|---|---|---|
| F1 | 'Medzol' = midazolam and pantoprazole; identical brand names contribute most to such errors | Neelakantan et al., Lancet RH SE Asia 2024 | [80] | S2 Problem 1 |
| F2 | Paracetamol sits inside many fever, cold and pain FDCs (qualitative) | PS_ANALYSIS §5 compositions | §5, [21][59][60] | S2 Problem 2 |
| F3 | Polypharmacy 49% of older Indian adults | Bhagavathula et al., 2021 | [78] | S2 Problem 3 |
| F4 | E-pharmacies and chains hold each customer's orders from every doctor | BUSINESS_MODEL §1 | §11 | S2 Problem 3 |
| F33 | Tata 1mg's pharmacist team validates each prescription before dispatch | Tata 1mg FAQ | [98], §11 | S7 Target users 1 |
| F5 | ChatGPT severity correct 214/574 = 37.3% (Nepal hospital) | Thapa et al., 2025 | [92], Key Finding 3 | S2 Problem 4 |
| F6 | Alert override rates 46–96% in hospital prescribing systems | Poly et al., 2020 | [93], Key Finding 4 | S2 Problem 5 |
| F22 | Sep 2026: 330 NSQ samples + 1 spurious | CDSCO alert via The News Mill, 23 Oct 2026 | [12][13] | S2 Did you know? callout |
| F13 | Duplication overrides appropriate 82–98% (two studies) | Poly et al., 2020 | [93] | S3 Architecture, Sort step |
| F9 | LLMs invent interactions in cases with none | Sicard et al., 2025 | [69], Key Finding 3 | S3 Core technologies 4 |
| F8 | Alert-budget target: at most 1 Interrupt per prescription on average (a target, not a result) | PS_ANALYSIS §7 | §7 | S3 Unique points 3 |
| F10 | Demo: "Brufan 400" expected to resolve to Brufen 400 (ibuprofen) | `tests/fixtures/demo_rx.json` | §5 | S4 User flow 1 |
| F11 | Demo: paracetamol 4,100 mg/day expected; for the 68-year-old the engine applies its draft age-65+ cap of 3,000 mg/day (adult label max 4,000) | fixture; `limits.json` | §5, [81] | S4 User flow 2 |
| F12 | Demo: CrCl ≈34 mL/min (68 y, 55 kg, SCr 1.6) | PS_ANALYSIS §5 (Cockcroft-Gault) | §5 | S4 User flow 2 |
| F14 | Demo: expected 2 Interrupts, 3–4 Informs | fixture | §5 | S4 User flow 3 |
| F15 | DDInter is non-commercial (CC BY-NC-SA 4.0) | PS_ANALYSIS Key Finding 1 | [1], Key Finding 1 | S5 Economic 3 |
| F16 | CDSCO final MDSW guidance 21 Jul 2026: "inform" software in lowest-risk column | National Law Review; MedDeviceGuide | [82][83] | S5 Operational 1 |
| F17 | Pharmacy Act 1948 s.42: only registered pharmacists dispense on prescription | Pharmacy Council of India | [84] | S5 Operational 2 |
| F18 | DPDP Act: security-lapse penalty up to ₹250 crore | Bar & Bench | [85] | S5 Operational 3 |
| F20 | Dose-recommending software modules are regulated MDSW | MedDeviceGuide (secondary) | [83] | S5 Operational, risk 1 |
| F21 | Zerodol-P exists in 325 mg and 500 mg paracetamol versions | 1mg pages (PS_ANALYSIS [20][21]) | [20][21] | S5 Operational, risk 4 |
| F23 | SDG 3.8 wording | UN SDGs | [88] | S6 Social lead |
| F24 | Self-medication pooled 53.6% in India | Rashid et al., 2020 | [79] | S6 Social 1 |
| F26 | PIM use 28% of older Indian adults | Bhagavathula et al., 2021 | Key Finding 9 | S6 Social 2 |
| F27 | NABH 6th edition Chapter 3 "Management of Medication (MOM)" | NABH training page | [87] | S7 Target users 3 |
| F19 | India pharmacy retail USD 30.1B (2025) → 52.8B (2031), estimate | Ken Research | [70], §9.3 | S7 Revenue 3 |
| F25 | Jan Aushadhi generics 50–80% cheaper (government claim) | PMBJP | [15][16] | S7 Sustainability 3 |
| F7 | medThinks publicly offers brand unpacking, pairwise DDI, banned-FDC flag, severity tiers; our USPs not stated on its public page | medThinks public page (24 Oct 2026) | [26] | S8 Existing solutions |
| F28 | DDInter 2.0: 302,516 DDIs across 2,310 drugs | Database Commons | [1], Key Finding 1 | S8 Datasets 1 |
| F29 | 156 FDCs banned Aug 2024; Delhi HC interim relief to petitioners | DT Next; ETV Bharat | [90][91] | S8 Regulatory hooks 1 |
| F30 | 16 FDCs banned 11 Jun 2026 incl. amoxicillin + serratiopeptidase | Medical Dialogues; Business Standard | [7][89] | S8 Regulatory hooks 2 |
| F31 | E-pharmacy rules still draft (notified 28 Aug 2018) | Novojuris | [86] | S8 Regulatory hooks 3 |
| F32 | NSQ failure applies only to the tested batch | CDSCO via The News Mill | [12] | S8 Regulatory hooks 4 |

---

## Slide 1: Title slide

Right-hand panel, one value per field. Each value box is a single line (16 pt, 4.70 in wide); keep values to one line.

#### Team name
Fit: 16 pt, plain, 4.70 × 0.38 in
> [Team name, e.g. Plot Armor: confirm]

#### Team ID
Fit: 16 pt, plain, 4.70 × 0.38 in
> [Team ID]

#### Problem statement ID
Fit: 16 pt, plain, 4.70 × 0.38 in
> HM-02

#### Problem statement title
Paste the exact official HM-02 title; if it runs past one line, drop this field to 14 pt.
Fit: 16 pt, plain, 4.70 × 0.38 in
> Prescription Safety Checker for Indian Brand Medicines

#### Theme / domain
Fit: 16 pt, plain, 4.70 × 0.38 in
> Health & MedTech

#### Category
Fit: 16 pt, plain, 4.70 × 0.38 in
> Software

---

## Slide 2: PARCHI: COUNT DOSES, NOT BRANDS

#### Slide title
Replaces "IDEA / SOLUTION TITLE". Must end before the "Team Name | Team ID" tag (about 10.5 in).
Fit: 34 pt Arial bold spc 2, plain, 10.50 × 0.80 in
> PARCHI: COUNT DOSES, NOT BRANDS

### PROBLEM STATEMENT
Shorten the template's body box to 3.25 in tall (y 2.50 to 5.75 in) to make room for the callout below.
Fit: 14 pt, bullets, 5.40 × 3.25 in
- **Same name, different drug:** 'Medzol' is both midazolam (sedative) and pantoprazole (antacid); identical names contribute most to such errors (Neelakantan 2024).
- **Ingredients hide in brands:** FDCs (multi-drug pills) hide repeats: paracetamol is in many fever, cold, pain brands.
- **Many medicines, many doctors:** Polypharmacy hits 49% of older Indians (Bhagavathula 2021); only the pharmacy's records join every Rx.
- **Chatbots misjudge severity:** ChatGPT caught all interactions, but only 37.3% got the right severity (Thapa 2025, Nepal).
- **Too many warnings:** 46–96% of drug alerts in hospital software are overridden and ignored (Poly 2020).

#### Did you know? callout
New text box inside the Problem card, y 5.85 to 6.55 in, on a slightly lighter rounded fill.
Fit: 12 pt, plain, 5.40 × 0.70 in, after 0
> **Did you know?** In September 2026 alone, CDSCO (India's drug regulator) flagged 330 medicine samples as 'not of standard quality' and one as spurious (fake) (monthly alert, reported 23 Oct 2026).

### OUR SOLUTION
Body box 2.25 in tall (template 2.20); 3 pt after each bullet (template 6 pt).
Fit: 12 pt, bullets, 5.40 × 2.25 in, after 3
- **Brand unpacking:** Misspelt Indian brands match to ingredients and strengths, with confidence; unknown ones marked unverified (built).
- **Reads shorthand:** 1-0-1, TDS, SOS, syrup mg per 5 mL; catches weekly methotrexate written as daily (built).
- **Whole history:** Sums mg/day per ingredient across brands and overlapping Rx from every doctor; re-checks on new kidney tests (built).
- **Duplicates and clashes:** Two same-type drugs, interactions, banned FDCs, look-alike brands, age and kidney limits (built).
- **Three tiers, ranked:** Interrupt (stop, check), Inform (FYI), Silent (logged), most urgent first (built); riskiest orders first (built).

### Image box
Concept diagram, no numbers, labels 11 pt: prescription slip with brand names → each brand split into ingredients → one daily-total bar per ingredient against its limit → tier label (Interrupt / Inform / Silent). Tag it "concept".

*Presenter note: "Parchi" means the prescription slip. "Built" means working code with automated tests, shown in the app. Do not demo anything live unless it has been built into the app and re-checked.*

---

## Slide 3: TECHNICAL APPROACH

### SYSTEM ARCHITECTURE
The card holds a flow chart (top) and the pipeline steps (bottom).

Flow chart: drawn with shapes in the area x 0.80 to 6.20 in, y 2.50 to 4.20 in; labels 10 pt. Three columns, left to right, with arrows labelled "Prescription in" and "Alerts out":
- Left, **Inputs (from the e-pharmacy or chain):** Order and Rx history (brands, doctor, date) · Age, sex, weight · Kidney test results · Approved limits and suppression list
- Middle, **Safety check layer** (built and tested, incl. history merge), six stacked chips: 1 Brand Matcher · 2 Dosing Reader · 3 Dose Totals · 4 Patient Limits · 5 Duplicates & Interactions · 6 Alert Tiers & Ranking. Strip under the chips: **Data, cached offline (built):** brand table · source-tagged limits · interaction and banned lists
- Right, **Pharmacist review console + check API:** ranked queue, "Prescription X-ray" (built)

#### Pipeline steps
Move the template's body box down to y 4.30 in, height 2.25 in.
Fit: 12 pt, bullets, 5.40 × 2.25 in
- **Read (1):** Match each brand, even misspelt, to ingredients and strength; doubtful matches go to the pharmacist (built).
- **Count (2–3):** Turn 1-1-1, TDS and SOS into doses per day; sum milligrams per ingredient (built).
- **Check (4):** Estimate CrCl (how well kidneys clear drugs) by Cockcroft-Gault; apply age and weight limits (built).
- **Sort and explain (5–6):** Each alert gets a one-line reason and source; routine duplicates go to Inform, as 82–98% of their overrides were appropriate (two studies, Poly 2020) (built).

### CORE TECHNOLOGIES
Fit: 12 pt, bullets, 5.40 × 1.60 in
- **Stack:** TypeScript, React, Vite; installable web app (PWA), any device.
- **Libraries:** Workbox (offline), fuse.js (fuzzy), sound-alike matching.
- **Formulas:** Indian shorthand rules; Cockcroft-Gault kidney formula.
- **Rules, not AI:** Same Rx, same alerts every run; chatbots invented interactions (Sicard 2025), so online AI only reads messy text.

### UNIQUE POINTS
Body box starts at y 4.97 in (template 5.05) and is 1.65 in tall; 3 pt after each bullet.
Fit: 12 pt, bullets, 5.40 × 1.65 in, after 3
- **Counts, not pairs:** Total mg per ingredient, not pairs (built).
- **Worst-case SOS:** As-needed doses at daily maximum (built).
- **Alert budget:** Target ≤1 Interrupt per Rx on average; mutes routinely ignored alerts (built).
- **Fits their stack:** Offline at counters; CSV and FHIR import (built); billing-system APIs (proposed).
- **Hard to copy:** Source-tagged Indian compositions, limits, SOS rules, suppression list, awaiting sign-off (built).

---

## Slide 4: USER EXPERIENCE & DESIGN

### USER INTERFACE
All items built; specified in `docs/DESIGN.md`.
Fit: 13 pt, bullets, 3.40 × 4.00 in
- **Key screens:** Review queue; history timeline; Prescription X-ray (daily total vs limit); alert cards.
- **Alert cards:** Tier icon and word, one-line reason, source; Interrupts first, Silent collapsed.
- **Minimal questions:** Asks weight or a kidney test only when a drug needs it, and says why.
- **Override log:** Overrides need a reason; saved on the device.
- **Honest uncertainty:** "Check match" on doubtful brands; "No limit on file", never a guess.
- **Accessibility:** WCAG AA contrast; tiers not colour-only; keyboard use.

### USER FLOW
Keep the three numbered dots. Make each step's text box 1.15 in tall, top-aligned with its dot (tops at y 2.50, 3.80, 5.10 in), text left-aligned. Demo = 68-year-old, 7 brands, 3 doctors; all values are expected targets from the test fixtures, not results.

#### Step 1
Fit: 12 pt, plain, 2.80 × 1.15 in
> **Order joins the queue:** 3 doctors' Rx merged; 'Brufan 400' should resolve to Brufen 400 (ibuprofen, a painkiller).

#### Step 2
Fit: 12 pt, plain, 2.80 × 1.15 in
> **Parchi counts and checks:** two NSAIDs (painkillers) plus aspirin with CrCl ≈34 mL/min; paracetamol 4,100 mg/day hidden in three brands, over the 65+ cap.

#### Step 3
Fit: 12 pt, plain, 2.80 × 1.15 in
> **Pharmacist reviews and decides:** 2 Interrupts (stop and check), 3–4 Informs; suggested 'Hold, contact doctor'.

#### Demo caption
New text box at the bottom of the Flow card, y 6.30 in.
Fit: 10 pt, plain, 3.40 × 0.32 in, after 0
> Demo: 68 y, 7 brands, 3 doctors; targets, not results.

### DESIGN GOAL
Fit: 14 pt, plain, 3.40 × 1.60 in
> At a glance, the pharmacist sees whether to act, why, and the source. Parchi informs; the pharmacist decides.

Wireframe area (template placeholder, 3.40 × 1.80 in): [Screenshot of the Prescription X-ray screen from the running app].

*Presenter note: lead with the painkiller + aspirin + kidney story; the paracetamol excess is the "hidden ingredient" reveal, not the clinical headline. The adult label maximum is 4,000 mg/day; the 3,000 mg cap the engine applies at 65+ is a draft, and FIX_PLAN 2.4 replaces it with risk factors (weight under 50 kg, alcohol, liver disease). Both need sign-off and an Indian reference (NFI 2021). Paracetamol liver-failure statistics are US data (Larson 2005), so do not quote them as Indian.*

---

## Slide 5: FEASIBILITY AND VIABILITY

### TECHNICAL FEASIBILITY
Fit: 14 pt, bullets, 3.40 × 3.80 in
- **Engine built:** Brand matcher, dosing reader, dose totals, limits and alert rules pass 814 automated tests.
- **Demo case tested:** A test file fixes the demo's expected outputs (slide 4); engine tests check them.
- **Proven libraries:** Fuzzy-search, sound-alike and offline-caching libraries chosen; no new algorithms needed.
- **Runs on what counters have:** Any phone, tablet or PC with a browser; no special hardware.

### ECONOMIC FEASIBILITY
Fit: 14 pt, bullets, 3.40 × 3.80 in
- **Low running cost:** Checks run on the pharmacist's device; no per-check server cost (planned).
- **No licence fees:** Open-source stack (slide 3); no licence fees for the prototype.
- **Data licence cost:** DDInter (interaction database) is non-commercial; a paid version needs licensed data.
- **Revenue sources:** See slide 7.

### OPERATIONAL VIABILITY
Body box starts at y 2.50 in (template 2.60) and is 4.05 in tall.
Fit: 12 pt, bullets, 3.40 × 4.05 in
- **Informs only:** CDSCO (21 Jul 2026): inform-only software is lowest risk.
- **Accountable:** Pharmacy Act 1948 s.42: only registered pharmacists dispense.
- **Privacy:** DPDP Act fines reach ₹250 crore; no central prescription store (planned).
- **Risk: reads as dose advice** (regulated) → show 'above reference max, source, review'; never a dose.
- **Risk: wrong limit** → every limit stores source + pharmacist-approved flag.
- **Risk: extra typing** → read the buyer's order data via CSV or FHIR (proposed).
- **Risk: two strengths** (Zerodol-P 325/500 mg paracetamol) → if unclear, assume higher, ask (planned).

*Presenter note: never say Parchi is "exempt" or "not a medical device". The class letters in CDSCO's Table 2 come from a secondary source; confirm on cdsco.gov.in before printing a class letter.*

---

## Slide 6: IMPACT AND BENEFITS

Each body box is extended to the card's bottom padding: 4.50 × 1.30 in (template 1.20). Bullets use a 0.20 in indent to save width.

### 1 SOCIAL IMPACT
Fit: 12 pt, bullets, 4.50 × 1.30 in, indent 0.2
> Aims at UN SDG 3.8: safe, affordable medicines for all.
- **Safer self-care:** 53.6% of Indians self-medicate (Rashid 2020); order-history checks catch overlaps no doctor sees (built).
- **Safer care for elders:** 28% of older Indians use risky medicines (Bhagavathula 2021); Beers checks (built).

### 2 ENVIRONMENTAL IMPACT
Qualitative only; nothing measured.
Fit: 12 pt, bullets, 4.50 × 1.30 in, indent 0.2
- **No server per check:** Runs on the counter's device (planned).
- **Less medicine wasted:** Duplicates caught before dispensing mean fewer unneeded strips (planned).
- **Light data:** Small files cached once; only quality lists refresh (planned).

### 3 TECHNICAL IMPACT
Fit: 12 pt, bullets, 4.50 × 1.30 in, indent 0.2
- **Open Indian test set:** 54 prescriptions, team-labelled (a regression test, not proof); 28 realistic multi-doctor cases next (planned).
- **Reusable drug data:** Indian brand-to-ingredient table with standard IDs; every limit source-tagged (built).

### 4 EDUCATIONAL IMPACT
Fit: 12 pt, bullets, 4.50 × 1.30 in, indent 0.2
- **Alerts that teach:** Each reason and source shows counter staff which brands hide which ingredients (built).
- **Brands made visible:** The Prescription X-ray shows in plain words what each brand contains (built).

*Presenter note: Beers list = drugs risky for older adults. Do not put a number on the environmental benefit.*

---

## Slide 7: BUSINESS MODEL & SUSTAINABILITY

### TARGET USERS
Fit: 12 pt, bullets, 3.40 × 3.80 in
- **E-pharmacies (first buyer, design target):** Tata 1mg's pharmacists validate every Rx; a ranked queue and audit log could speed review, cut liability.
- **Pharmacy chains (paying buyer):** One safety standard at every counter; customer history already joins every doctor's Rx.
- **Hospitals (later):** NABH accreditation's medication chapter (MOM) covers dispensing and look-alike drugs.
- **Independent chemists (free):** Offline app; flags banned combinations that risk their licence (built). Doctors are not users.

### REVENUE & COST MODEL
Fit: 14 pt, bullets, 3.40 × 3.80 in
- **Pilot phase:** Free prototype at [pilot pharmacy: confirm]; costs on slide 5.
- **Pricing:** Per-check API fee for e-pharmacies; per-store licence for chains; free for independent chemists (proposed).
- **Long-term growth:** India pharmacy retail USD 30.1B (2025) → 52.8B (2031), Ken Research estimate.

### SUSTAINABILITY
Fit: 12 pt, bullets, 3.40 × 3.80 in
- **Partnerships:** Pharmacist panel keeps limits and suppression list approved; billing software via CSV, then APIs (proposed).
- **Data upkeep:** Banned-combination and monthly quality lists refresh when online; every entry keeps its source (built).
- **Cheaper options:** Same-salt swaps from the buyer's own catalogue; Jan Aushadhi (50–80% less, PMBJP claim) for government use (planned).
- **Future expansion:** Children's syrup doses by weight, children's kidney checks, more Beers rules (planned).
- **Open source / community:** [Licence: team to decide]; open test set (slide 6) lets others check our claims.

*Presenter note: for e-pharmacies and chains, cheaper suggestions come from their own catalogue or own-label generics, so they keep the sale; Jan Aushadhi suggestions are for Kendras and government deployments only (`BUSINESS_MODEL.md` §4).*

---

## Slide 8: RESEARCH AND REFERENCES

Replace the template's single 16 pt body box with two text boxes side by side inside the card: left 7.00 in wide (x 0.80 in), right 4.40 in wide (x 8.10 in), both from y 2.50 in, 4.05 in tall. Subheads in the right column are bold 11 pt.

### Research material (left column)
Fit: 11 pt, bullets, 7.00 × 4.05 in, indent 0.25, after 3
1. T. N. Poly, M. M. Islam, H.-C. Yang, Y.-C. Li, "Appropriateness of overridden alerts in computerized physician order entry: systematic review," *JMIR Med. Inform.*, vol. 8, no. 7, e15653, 2020.
2. J. Sicard *et al.*, "Can large language models detect drug-drug interactions leading to adverse drug reactions?," *Ther. Adv. Drug Saf.*, vol. 16, 2025.
3. R. B. Thapa, S. Karki, S. Shrestha, "Exploring potential drug-drug interactions in discharge prescriptions: ChatGPT's effectiveness in assessing those interactions," *Explor. Res. Clin. Soc. Pharm.*, vol. 17, 100564, 2025.
4. A. S. Bhagavathula *et al.*, "Prevalence of polypharmacy, hyperpolypharmacy and potentially inappropriate medication use in older adults in India: a systematic review and meta-analysis," *Front. Pharmacol.*, vol. 12, 685518, 2021.
5. M. Neelakantan, P. Sharma, A. Kulkarni, "Look-alike, sound-alike (LASA) drugs in India," *Lancet Reg. Health Southeast Asia*, vol. 26, 100425, 2024.
6. M. Rashid *et al.*, "Prevalence and predictors of self-medication practices in India: a systematic literature review and meta-analysis," *Curr. Clin. Pharmacol.*, vol. 15, no. 2, pp. 90–101, 2020.
7. AGS Beers Criteria Update Expert Panel, "American Geriatrics Society 2023 updated AGS Beers Criteria for potentially inappropriate medication use in older adults," *J. Am. Geriatr. Soc.*, vol. 71, no. 7, pp. 2052–2081, 2023.
8. D. W. Cockcroft, M. H. Gault, "Prediction of creatinine clearance from serum creatinine," *Nephron*, vol. 16, no. 1, pp. 31–41, 1976.

### Datasets, existing solutions, regulatory hooks (right column)
Fit: 11 pt, bullets, 4.40 × 4.05 in, indent 0.2, after 3
- **Datasets:** DDInter 2.0 (open interaction database): 302,516 interactions across 2,310 drugs (Database Commons).
- Indian brand compositions: 1mg 2025 and A-Z Kaggle datasets; top ~2,000 outpatient brands, ~40 hand-checked (planned).
- Government lists: CDSCO banned-combination notices, monthly quality alerts, Jan Aushadhi product list (planned).
- **Existing solution studied:** medThinks publicly offers brand unpacking, pairwise interactions, banned-FDC flags, severity tiers; our USPs are not stated on its public page (checked 24 Oct 2026).
- **Regulatory hooks:** 156 FDCs (multi-drug pills) banned Aug 2024; some makers got interim relief (Delhi High Court).
- 16 more FDCs banned 11 Jun 2026, incl. amoxicillin (antibiotic) + serratiopeptidase (enzyme) (Health Ministry).
- E-pharmacy rules still in draft (Health Ministry, 28 Aug 2018); they require registered-pharmacist dispensing.
- NSQ (substandard) alerts cover only the tested batch, so matching needs brand, maker and batch.

*Presenter note: word banned-FDC alerts as "banned by notification, some products under litigation, pharmacist to verify", never "illegal".*

---

## Slide 9: THANK YOU

#### Bottom line
Template line under THANK YOU.
Fit: 16 pt, plain, 8.00 × 0.40 in
> [Team name] | [Team ID] | [contact email]

#### Links
New line under the bottom line, y 6.05 in.
Fit: 13 pt, plain, 8.00 × 0.35 in
> Idea video: [link] · Live prototype: [link]

#### Our mentor
New rounded card on the empty right half, styled like slide 1's team card: x 8.90 in, y 1.50 in, 3.90 × 4.90 in; text box inside 3.30 × 4.50 in. First two lines plain (name bold 16 pt, credentials 12 pt), then bullets.
Fit: 13 pt, bullets, 3.30 × 4.50 in
> **[Pharmacist name]**
> [Registered pharmacist, qualification, years in practice, community or hospital pharmacy]
- [Reviewed the demo prescription and expected alerts]
- [Signed off adult, elderly and kidney dose limits]
- [Set SOS maximum doses per drug class]
- [Listed alerts pharmacists routinely ignore (suppression list)]
- [Labelled test prescriptions; blind re-rating for agreement]

*Presenter note: fill mentor bullets only with things the pharmacist actually did.*

## Checklist

**Slides covered:** all 9 slides of the official HYPNEXIS '26 template (Title, Idea/Solution, Technical Approach, User Experience & Design, Feasibility and Viability, Impact and Benefits, Business Model & Sustainability, Research and References, Thank You), using each slide's own cards.

**Fit check:** every box's text was wrapped with real Calibri/Arial metrics at its Fit size and width (3% safety margin), and its height compared with the template text box (line height 1.22 × font size). All 34 boxes fit; the fullest are Our Solution, Problem Statement, User Interface and Target Users at 98–99%, so do not add words there. Kept at the template's 14 pt: Problem Statement, Design Goal, Technical and Economic Feasibility, Revenue & Cost Model. Reduced: slide 2 title 34 pt (template 36; at 36 pt it would touch the team tag); User Interface 13 pt; Our Solution, pipeline steps, Core Technologies, Unique Points, user-flow steps, Operational Viability, all four Impact boxes, Target Users, Sustainability 12 pt; References 11 pt (template 16). Layout changes, all inside the template's own cards: Problem body shortened for the Did-you-know callout; Our Solution and Unique Points bodies slightly taller with 3 pt bullet spacing; Architecture body moved below the flow chart; flow-step boxes taller and top-aligned, plus a demo caption; Operational and Impact bodies slightly taller; slide 8 split into two columns; slide 9 gains a links line and a mentor card. After pasting, check by eye: PowerPoint can wrap a word differently from the script. To re-check after an edit, run the fit script again (`extract.js` + `measure.ps1`, kept outside the repo).

**Where the old 6-slide content moved:** USPs → slide 3 Unique Points (except "Minimal questions" → slide 4 UI); engine principles → slide 3 ("Rules, not AI" and "Repeatable" → Core Technologies; "Every alert cited" → Sort step; "Pharmacist decides" → slide 4 Design Goal); demo targets → slide 4 User Flow; Did you know → slide 2 callout; regulatory and risks → slide 5 Operational Viability; finance → slide 5 Economic; market, revenue model, target audience → slide 7; Jan Aushadhi → slide 7 Sustainability; medThinks comparison → slide 8 Existing solution studied; links and mentor → slide 9. Nothing was dropped. New content (slide 4 UI and design goal, slide 5 hardware bullet, slide 6 Environmental and Educational, slide 7 Sustainability) comes from `docs/PLAN.md` and `docs/DESIGN.md`, adds no new numbers, and is tagged planned or proposed.

**Facts used once:** see the Fact allocation table at the top. Each number is assigned to one slide; other slides refer back to it instead of repeating it.

**Phase 2 / B2B update (24 Oct 2026, ~18:00):** reworded for e-pharmacy and chain buyers and Phase 2, and engine tags moved to *built* where code and tests exist. Edited boxes: slide 2 Problem 3 and Our Solution; slide 3 flow-chart labels, pipeline steps, Unique Points; slide 4 Key screens, Step 1, Step 3, demo caption; slide 5 Technical Feasibility 1–2, Operational risk 3; slide 6 Social 1; slide 7 Target Users, Pricing, Sustainability. Each edited box was kept at or below its old character count except Technical Feasibility (+~45 characters, box was not full), Partnerships (+11), Cheaper options (+8), Safer self-care (+6), Problem 3 (+1). **Fit was not re-measured:** run the fit script again before pasting.

**v1 update (24 Oct 2026):** status tags moved to *built* where the feature is now in the app (history, re-check, ranked queue, X-ray, FHIR import); test counts and the benchmark set size filled from real runs. **Fit was not re-measured.** Added since: WHO AWaRe antibiotic groups, more Beers rules, curated interaction pairs, customer leaflet (online), look-alike picker; mention only what the demo shows.

**Clinical review update (24 Oct 2026, late):** edited slide 2 Our Solution (shorthand bullet now names weekly-as-daily), slide 3 Unique Points (no "pharmacist-curated"), slide 4 Step 2 and presenter note (engine's 65+ cap, NSAID story first), slide 6 Technical and Educational (benchmark called a regression test; X-ray and reasons tagged built). **Fit not re-measured.** Kept out of slides on purpose: the Ayurveda starter engine (no real product brand resolves yet) and NSQ as a hold reason (a failure applies to one batch, unknown at review). Not changed yet: "Hold, contact doctor" stays on slide 4 Step 3 because the app still says it; FIX_PLAN 0.6 renames it in the app first.

**Left out or uncertain:**
- **Build status (most important):** see the stamp at the top. Everything described is built and tested; limits, rules, the WHO AWaRe list, the curated interaction rules and the benchmark labels are drafts until a pharmacist reviews them. No chatbot has been scored: fill those numbers only from `eval/outputs/` runs. Fill every other `[placeholder]` from real runs before finals.
- **Dropped as unverified or self-reported:** Joshi 2007's 113,346 entries; the gazette number range for the 156 FDCs; the RxNav shutdown date; DrugBank checker retirement; AIOCD chemist count (~10 lakh, self-reported); Marg ERP user numbers; competitor self-claims.
- **Corrected:** Thapa 2025 is a Nepal study; Poly's duplication figure is "82–98% in two studies"; paracetamol liver-failure data is US (Larson 2005), not India.
- **Medication-error incidence (Govil 2025):** the figures come from a news summary. Check them against the paper before use.
- **CDSCO software risk class letters:** they come from a secondary source. Confirm them in the CDSCO guidance PDF before showing them.
- **Environmental impact:** qualitative only; no measured or cited figure exists, so none is shown.
- **Pharmacist sign-off still needed:** dose limits (incl. 4 g/day paracetamol), SOS caps, suppression list, and the mentor card contents.
- **Team details:** team name, team ID, theme, contact, links, pilot pharmacy, open-source licence and the exact problem-statement title are placeholders.
