# Parchi: final deck content (HYPNEXIS '26, HM-02)

Audience: hackathon judges (neither pharmacists nor developers). Build status stamp: 24 Oct 2026, ~16:00 IST (after `git fetch`): `main` is a skeleton (shared types, demo test fixture, unverified PWA config); `dev/track-d` adds design docs/tokens only. No engine feature is built and no metric has been measured.

Status tags used on every feature: **(designed)** = a typed interface for it exists in `src/engine/contracts.ts`, no working code yet; **(planned)** = no code or data yet; **(proposed)** = business model idea. Square brackets `[ ]` = placeholder to fill before finals. Word counts exclude the bold label and include citations and tags.

## Fact allocation (each fact appears on exactly one slide)

| # | Fact | Source | PS_ANALYSIS ref | Slide / box |
|---|---|---|---|---|
| F1 | 'Medzol' = midazolam and pantoprazole; identical brand names contribute most to such errors | Neelakantan et al., Lancet RH SE Asia 2024 | [80] | S2 Problem 1 |
| F2 | Paracetamol sits inside many fever, cold and pain FDCs (qualitative) | PS_ANALYSIS §5 compositions | §5, [21][59][60] | S2 Problem 2 |
| F3 | Polypharmacy 49% of older Indian adults | Bhagavathula et al., 2021 | [78] | S2 Problem 3 |
| F4 | Only the chemist counter sees every doctor's prescription | PS_ANALYSIS §9 core insight | §9 | S2 Problem 3 |
| F5 | ChatGPT severity correct 214/574 = 37.3% (Nepal hospital) | Thapa et al., 2025 | [92], Key Finding 3 | S2 Problem 4 |
| F6 | Alert override rates 46–96% in hospital prescribing systems | Poly et al., 2020 | [93], Key Finding 4 | S2 Problem 5 |
| F7 | medThinks publicly offers brand unpacking, pairwise DDI, banned-FDC flag, severity tiers; USP items not stated on its public page | medThinks public page (24 Oct 2026) | [26] | S2 USP footnote |
| F8 | Alert-budget target: at most 1 Interrupt per prescription on average (a target, not a result) | PS_ANALYSIS §7 | §7 | S2 USP 4 |
| F9 | LLMs invent interactions in cases with none | Sicard et al., 2025 | [69], Key Finding 3 | S3 Engine principles 1 |
| F10 | Demo: "Brufan 400" expected to resolve to Brufen 400 (ibuprofen) | `tests/fixtures/demo_rx.json` | §5 | S3 Pipeline stage 1 |
| F11 | Demo: paracetamol 4,100 mg/day expected vs 4,000 mg/day adult maximum | fixture; FDA label | §5, [81] | S3 Pipeline stage 2 |
| F12 | Demo: CrCl ≈34 mL/min (68 y, 55 kg, SCr 1.6) | PS_ANALYSIS §5 (Cockcroft-Gault) | §5 | S3 Pipeline stage 3 |
| F13 | Duplication overrides appropriate 82–98% (two studies) | Poly et al., 2020 | [93] | S3 Pipeline stage 4 |
| F14 | Demo: expected 2 Interrupts, 3–4 Informs | fixture | §5 | S3 Pipeline stage 4 |
| F15 | DDInter is non-commercial (CC BY-NC-SA 4.0) | PS_ANALYSIS Key Finding 1 | [1], Key Finding 1 | S4 Finance 3 |
| F16 | CDSCO final MDSW guidance 21 Jul 2026: "inform" software in lowest-risk column | National Law Review; MedDeviceGuide | [82][83] | S4 Regulatory 1 |
| F17 | Pharmacy Act 1948 s.42: only registered pharmacists dispense on prescription | Pharmacy Council of India | [84] | S4 Regulatory 2 |
| F18 | DPDP Act: security-lapse penalty up to ₹250 crore | Bar & Bench | [85] | S4 Regulatory 3 |
| F19 | India pharmacy retail USD 30.1B (2025) → 52.8B (2031), estimate | Ken Research | [70], §9.3 | S4 Business 1 |
| F20 | Dose-recommending software modules are regulated MDSW | MedDeviceGuide (secondary) | [83] | S4 Risk 1 |
| F21 | Zerodol-P exists in 325 mg and 500 mg paracetamol versions | 1mg pages (PS_ANALYSIS [20][21]) | [20][21] | S4 Risk 4 |
| F22 | Sep 2026: 330 NSQ samples + 1 spurious | CDSCO alert via The News Mill, 23 Oct 2026 | [12][13] | S4 Did you know? |
| F23 | SDG 3.8 wording | UN SDGs | [88] | S5 SDG banner |
| F24 | Self-medication pooled 53.6% in India | Rashid et al., 2020 | [79] | S5 Social |
| F25 | Jan Aushadhi generics 50–80% cheaper (government claim) | PMBJP | [15][16] | S5 Economic |
| F26 | PIM use 28% of older Indian adults | Bhagavathula et al., 2021 | Key Finding 9 | S5 Healthcare System |
| F27 | NABH 6th edition Chapter 3 "Management of Medication (MOM)" | NABH training page | [87] | S5 Target audience 3 |
| F28 | DDInter 2.0: 302,516 DDIs across 2,310 drugs | Database Commons | [1], Key Finding 1 | S6 Datasets 1 |
| F29 | 156 FDCs banned Aug 2024; Delhi HC interim relief to petitioners | DT Next; ETV Bharat | [90][91] | S6 Regulatory hooks 1 |
| F30 | 16 FDCs banned 11 Jun 2026 incl. amoxicillin + serratiopeptidase | Medical Dialogues; Business Standard | [7][89] | S6 Regulatory hooks 2 |
| F31 | E-pharmacy rules still draft (notified 28 Aug 2018) | Novojuris | [86] | S6 Regulatory hooks 3 |
| F32 | NSQ failure applies only to the tested batch | CDSCO via The News Mill | [12] | S6 Regulatory hooks 4 |

---

## Slide 1: Title slide

- **Hackathon:** HYPNEXIS '26
- **Problem Statement ID:** HM-02
- **Problem Statement Title:** Indian Brand-Name Prescription Safety Checker [paste exact official HM-02 title]
- **Theme:** [Theme, e.g. HealthTech]
- **PS Category:** [Software]
- **Team ID:** [Team ID]
- **Team Name:** [Team name, e.g. Plot Armor: confirm]
- **Product:** Parchi ("parchi" = the prescription slip)
- **Tagline:** Count Doses, Not Brands.

---

## Slide 2: Parchi

### The Problem

- **Same name, different drug:** 'Medzol' is both midazolam (a sedative) and pantoprazole (an acid reducer); identical brand names contribute most to such errors (Neelakantan, 2024).
- **Ingredients hide inside brands:** FDCs (several drugs in one pill) hide repeats: paracetamol sits inside many fever, cold and pain brands.
- **Many medicines, many doctors:** Polypharmacy (many medicines at once) affects 49% of older Indian adults (Bhagavathula, 2021); only the chemist counter sees every doctor's prescription.
- **Chatbots misjudge severity:** ChatGPT found every drug interaction but graded its severity correctly only 37.3% of the time (Thapa et al., 2025, Nepal).
- **Too many warnings:** In hospital prescribing software, 46–96% of drug alerts are overridden; too many warnings get ignored (Poly et al., 2020).

### Our Solutions

- **Brand-to-ingredient unpacking:** Type the prescription as written; Parchi matches misspelt Indian brands to their ingredients and strengths, with a confidence score (designed).
- **Reads dosing shorthand:** Understands 1-0-1 (morning, none, night), TDS (three times daily), SOS (take only when needed), and syrup strengths per 5 mL (designed).
- **Daily totals vs limits:** Adds each ingredient's milligrams per day across all brands, then compares with limits for this patient's age, weight and kidney function (designed).
- **Duplicate and clash checks:** Flags two drugs of the same type, like two painkillers (planned); drug interactions, where two drugs clash (planned); banned FDCs and look-alike brands (designed).
- **Three alert tiers:** Interrupt (stop and check), Inform (worth knowing), Silent (logged only) (designed); Interrupts kept for overdoses, kidney risks, banned combinations (planned).

### Unique Selling Points

- **Counts, not pairs:** Goes beyond 'do these two drugs clash?' to 'how much paracetamol is this patient really taking?' (designed).
- **Minimal questions:** Requests weight or a kidney blood test only when a drug on the prescription needs it (planned).
- **Worst-case SOS:** Counts 'take when needed' medicines at their daily maximum, so as-needed doses are not under-counted (designed).
- **Alert budget:** Aims for at most one Interrupt per prescription on average; pharmacist's suppression list mutes routinely ignored alerts (planned).
- **Works offline:** Installs like an app and checks without internet; prescriptions stay on the pharmacist's device (planned).

Footnote (small text under the USP boxes): Closest Indian checker, medThinks, publicly offers brand unpacking, pairwise interactions, banned-FDC flags and severity tiers. USPs above are not stated on its public page (checked 24 Oct 2026).

*Presenter note: say "designed" means the data shapes are written and the code is in progress. Do not demo anything live unless it has been built and re-checked.*

---

## Slide 3: TECHNICAL APPROACH

### Input sources

- Typed prescription with Indian brand names
- Patient age, sex and weight
- Serum creatinine (kidney blood test)
- Pharmacist-approved limits and suppression list

### Processing Tools (all planned)

- Fuzzy and sound-alike brand matching
- Rule-based Indian dosing-shorthand reader
- Cockcroft-Gault kidney-clearance formula
- Online-only AI for messy text

### Processing Layer (logo row)

TypeScript · React · Vite · Workbox (vite-plugin-pwa) · fuse.js

Caption: TypeScript (typed code), React (screens), Vite (build tool), Workbox (offline caching), fuse.js (fuzzy search).

**Front-end node:** Parchi PWA (a web app that installs and works offline): "Prescription X-ray" screen (planned)
- Arrow in: **Prescription in**
- Arrow out: **Alerts out**

### DATASET STORE (planned; compact files cached for offline use)

- Indian brand-to-ingredient table
- Dose limits, each source-tagged
- Interaction and banned-combination lists

### SAFETY CHECK LAYER (interfaces designed; code planned)

1. Brand Matcher
2. Dosing Reader
3. Dose Totals
4. Patient Limits
5. Duplicates & Interactions
6. Alert Tiers

### ENGINE PRINCIPLES (design rules)

- **Rules, not AI:** AI chatbots invented interactions in cases with none (Sicard 2025).
- **Repeatable results:** Same prescription in, same alerts out, on every run.
- **Every alert cited:** One-line reason plus its source: database entry, gazette notice, guideline.
- **Pharmacist decides:** Parchi informs; the registered pharmacist makes every dispensing decision.

### The Pipeline (demo = 68-year-old, 7 brands, 2 doctors; all values are expected targets from the test fixture, not results)

**1. READ THE PRESCRIPTION** (designed)
- Match each brand, even misspelt, to ingredients and strength; doubtful matches go to the pharmacist.
- Demo target: 'Brufan 400' should resolve to Brufen 400 (ibuprofen, a painkiller).

**2. COUNT DAILY DOSES** (designed)
- Convert shorthand like 1-1-1, TDS and SOS into doses per day; sum milligrams per ingredient.
- Demo target: paracetamol 4,100 mg/day from three brands, above the 4,000 mg adult maximum (FDA).

**3. CHECK THE PATIENT** (designed)
- Estimate CrCl (how well kidneys clear drugs) with Cockcroft-Gault; apply age and weight limits.
- Demo target: CrCl ≈34 mL/min at age 68 flags two NSAIDs (anti-inflammatory painkillers).

**4. SORT AND EXPLAIN** (tiers designed; suppression planned)
- Routine duplicates default to Inform: 82–98% of such overrides were appropriate (two studies, Poly 2020).
- Demo target: 2 Interrupts (stop and check), 3–4 Informs (worth knowing), rest logged silently.

*Presenter note: the 4,000 mg/day limit is the FDA adult label maximum; it still needs pharmacist sign-off and an Indian reference before it goes into the limits file. Paracetamol liver-failure statistics are US data (Larson 2005), so do not quote them as Indian.*

---

## Slide 4: FEASIBILITY AND VIABILITY

### Finance

- **Low running cost:** Checks run on the pharmacist's device; no per-check server cost (planned).
- **No licence fees:** Open-source stack (slide 3); no licence fees for the prototype.
- **Data licence cost:** DDInter (interaction database) is non-commercial; a paid version needs licensed data.

### Technical

- **Interfaces designed:** Typed hand-offs between all modules are written; engine code is next.
- **Demo case specified:** A test file fixes the demo's expected outputs (slide 3).
- **Proven libraries chosen:** Fuzzy-search, sound-alike and offline-caching libraries selected; no new algorithms needed.

### Regulatory

- **Informs, never decides:** CDSCO (drug regulator), 21 Jul 2026: 'inform-only' software sits in lowest-risk column.
- **Pharmacist stays accountable:** Pharmacy Act 1948, s.42: only registered pharmacists dispense on prescription.
- **Data-privacy law:** Security-lapse fines reach ₹250 crore (DPDP Act); no central prescription store (planned).

### Business

- **Market estimate:** India pharmacy retail USD 30.1B (2025) → 52.8B (2031), Ken Research estimate.
- **Revenue model:** Per-check fee for e-pharmacies; per-store licence for chains (proposed).
- **Hard to copy:** Pharmacist-curated Indian layer: compositions, limits, as-needed (SOS) rules, suppression list (planned).

### Risks ↔ Mitigations

1. **Risk:** Overdose alerts could be read as recommending doses, which CDSCO regulates as medical software.
   **Mitigation:** Show only 'above reference maximum, source, pharmacist to review'; never suggest a corrected dose.
2. **Risk:** A wrong or unverified dose limit produces a wrong alert.
   **Mitigation:** Each limit stored with its source and a pharmacist-approved yes/no flag; unverified limits marked 'no'.
3. **Risk:** Typing every prescription slows a busy chemist counter.
   **Mitigation:** Later, take brands straight from the pharmacy billing system; typed input stays for the prototype (proposed).
4. **Risk:** Same brand, different strengths: Zerodol-P has 325 mg and 500 mg paracetamol versions.
   **Mitigation:** Strength-aware matching; when strength is unclear, assume the higher and ask the pharmacist (planned).

### DID YOU KNOW?

In September 2026 alone, India's drug regulator (CDSCO) flagged 330 medicine samples as 'not of standard quality' and one as spurious (fake), from tablets and syrups to IV fluids (CDSCO monthly alert, reported 23 Oct 2026).

*Presenter note: never say Parchi is "exempt" or "not a medical device". The class letters in CDSCO's Table 2 come from a secondary source; confirm on cdsco.gov.in before printing a class letter.*

---

## Slide 5: IMPACTS AND BENEFITS

### SDG banner

UN SDG 3.8: 'access to safe, effective, quality and affordable essential medicines and vaccines for all.' Parchi aims at 'safe' and 'affordable' (planned).

### Impacts and Benefits

- **Social** | **Safer self-care at counters:** Pooled studies: 53.6% of Indians self-medicate (Rashid 2020); a counter check could catch overlaps no doctor sees (planned).
- **Economic** | **Cheaper generic options:** Jan Aushadhi generics (unbranded same medicines) cost 50–80% less than brands (PMBJP scheme claim); swap suggestions (planned).
- **Healthcare System** | **Safer care for elders:** 28% of older Indians use potentially inappropriate medicines (Bhagavathula 2021); Beers-list (risky-for-elderly drugs) checks planned.
- **Research** | **Open Indian test set:** [N] pharmacist-labelled Indian prescriptions to score Parchi against chatbots; rater agreement [κ], results [pending] (planned).

### Target Audience

- **E-pharmacies (first paying buyer):** Their pharmacists verify prescriptions at scale; cited checks and override log (planned) could speed review, cut liability.
- **Pharmacy chains (paying buyer):** One safety standard at every counter protects brand trust and store licences across the chain.
- **Hospital pharmacies and EMR partners:** NABH accreditation's medication chapter (MOM) covers dispensing and look-alike drugs; EMRs (doctor record software) could embed checks.
- **Independent chemists (free):** Free offline app; flags banned combinations that risk their licence (planned). Doctors benefit but are not buyers.

*Presenter note: in a private chemist, generic suggestions should come from the shop's own stock; Jan Aushadhi suggestions are for Kendras and government deployments only (PS_ANALYSIS §9.4).*

---

## Slide 6: RESEARCH AND REFERENCES

### Research Material

1. T. N. Poly, M. M. Islam, H.-C. Yang, Y.-C. Li, "Appropriateness of overridden alerts in computerized physician order entry: systematic review," *JMIR Med. Inform.*, vol. 8, no. 7, e15653, 2020.
2. J. Sicard *et al.*, "Can large language models detect drug-drug interactions leading to adverse drug reactions?," *Ther. Adv. Drug Saf.*, vol. 16, 2025.
3. R. B. Thapa, S. Karki, S. Shrestha, "Exploring potential drug-drug interactions in discharge prescriptions: ChatGPT's effectiveness in assessing those interactions," *Explor. Res. Clin. Soc. Pharm.*, vol. 17, 100564, 2025.
4. A. S. Bhagavathula *et al.*, "Prevalence of polypharmacy, hyperpolypharmacy and potentially inappropriate medication use in older adults in India: a systematic review and meta-analysis," *Front. Pharmacol.*, vol. 12, 685518, 2021.
5. M. Neelakantan, P. Sharma, A. Kulkarni, "Look-alike, sound-alike (LASA) drugs in India," *Lancet Reg. Health Southeast Asia*, vol. 26, 100425, 2024.
6. M. Rashid *et al.*, "Prevalence and predictors of self-medication practices in India: a systematic literature review and meta-analysis," *Curr. Clin. Pharmacol.*, vol. 15, no. 2, pp. 90–101, 2020.
7. AGS Beers Criteria Update Expert Panel, "American Geriatrics Society 2023 updated AGS Beers Criteria for potentially inappropriate medication use in older adults," *J. Am. Geriatr. Soc.*, vol. 71, no. 7, pp. 2052–2081, 2023.
8. D. W. Cockcroft, M. H. Gault, "Prediction of creatinine clearance from serum creatinine," *Nephron*, vol. 16, no. 1, pp. 31–41, 1976.

### Datasets

- DDInter 2.0 (open interaction database): 302,516 drug interactions across 2,310 drugs (Database Commons).
- Indian brand compositions: 1mg 2025 and A-Z public Kaggle datasets; top ~2,000 outpatient brands, ~40 hand-checked (planned).
- Government lists: CDSCO (regulator) banned-combination notices, monthly quality alerts, Jan Aushadhi product list (planned).

### Links

- Idea video: [link]
- Live prototype: [link]

### Our Mentor

**[Pharmacist name]**
[Registered pharmacist, qualification, years in practice, community or hospital pharmacy]
- [Reviewed the demo prescription and expected alerts]
- [Signed off adult, elderly and kidney dose limits]
- [Set SOS maximum doses per drug class]
- [Listed alerts pharmacists routinely ignore (suppression list)]
- [Labelled test prescriptions; blind re-rating for agreement]

### India regulatory hooks (sub-box)

- 156 FDCs (multi-drug pills) banned Aug 2024; some makers got interim relief (Delhi High Court).
- 16 more FDCs banned 11 Jun 2026, incl. amoxicillin (antibiotic) + serratiopeptidase (enzyme) (Health Ministry).
- E-pharmacy rules still in draft (Health Ministry, 28 Aug 2018); it requires registered-pharmacist dispensing.
- NSQ (substandard) alerts cover only the tested batch, so matching needs brand, maker and batch.

*Presenter note: word banned-FDC alerts as "banned by notification, some products under litigation, pharmacist to verify", never "illegal". Fill mentor bullets only with things the pharmacist actually did.*

## Checklist

**Slides covered:** all 6 template slides (Title, Problem/Solutions/USPs, Technical Approach, Feasibility and Viability, Impacts and Benefits, Research and References), with the same box structure as the SIH template.

**Words per box vs limit:** an automated pass counted each bullet's body text, excluding bold labels. No bullet on slides 2–5 exceeds its limit (Problem ≤22, Solutions ≤25, USPs ≤18, feasibility items ≤12, risks ≤14 / mitigations ≤16, impacts and audience ≤18, Did you know ≤40). Only the Research Material references (24–34 words each) run long, and the template sets no limit for them. Re-check by eye after pasting, because fonts in the PPT may still overflow.

**Facts used once:** see the Fact allocation table at the top. Each number is assigned to one slide; other slides refer back to it instead of repeating it.

**Left out or uncertain:**
- **Build status (most important):** at the 24 Oct 2026 audit, `main` was a skeleton, so every feature is tagged *planned* or *designed*. Update the tags and fill every `[placeholder]` metric (accuracy, alerts per Rx, ms, κ, gold-set size) from real runs before finals.
- **Dropped as unverified or self-reported:** Joshi 2007's 113,346 entries; the gazette number range for the 156 FDCs; the RxNav shutdown date; DrugBank checker retirement; AIOCD chemist count (~10 lakh, self-reported); Marg ERP user numbers; competitor self-claims.
- **Corrected:** Thapa 2025 is a Nepal study; Poly's duplication figure is "82–98% in two studies"; paracetamol liver-failure data is US (Larson 2005), not India.
- **Medication-error incidence (Govil 2025):** the figures come from a news summary. Check them against the paper before use.
- **CDSCO software risk class letters:** they come from a secondary source. Confirm them in the CDSCO guidance PDF before showing them.
- **Pharmacist sign-off still needed:** dose limits (incl. 4 g/day paracetamol), SOS caps, suppression list, and the mentor box contents.
- **Team details:** team name, team ID, theme, links and the exact problem-statement title are placeholders.
