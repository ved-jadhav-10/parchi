# Parchi: final deck content (HYPNEXIS '26, HM-02)

Audience: hackathon judges (neither pharmacists nor developers). Build status stamp: 24 Oct 2026, ~16:00 IST (after `git fetch`): `main` is a skeleton (shared types, demo test fixture, unverified PWA config); `dev/track-d` adds design docs/tokens only. No engine feature is built and no metric has been measured.

Template: official HYPNEXIS '26 deck, 9 slides. Every content slide (2–8) shows "Team Name | Team ID" top right: fill as `[Team name] | [Team ID]`.

Status tags used on every feature: **(designed)** = a typed interface for it exists in `src/engine/contracts.ts`, no working code yet; **(planned)** = no code or data yet (UI items are specified in `docs/DESIGN.md` on `dev/track-d`, still no code); **(proposed)** = business model idea. Square brackets `[ ]` = placeholder to fill before finals. Word counts exclude the bold label and include citations and tags.

## Fact allocation (each fact appears on exactly one slide)

| # | Fact | Source | PS_ANALYSIS ref | Slide / box |
|---|---|---|---|---|
| F1 | 'Medzol' = midazolam and pantoprazole; identical brand names contribute most to such errors | Neelakantan et al., Lancet RH SE Asia 2024 | [80] | S2 Problem 1 |
| F2 | Paracetamol sits inside many fever, cold and pain FDCs (qualitative) | PS_ANALYSIS §5 compositions | §5, [21][59][60] | S2 Problem 2 |
| F3 | Polypharmacy 49% of older Indian adults | Bhagavathula et al., 2021 | [78] | S2 Problem 3 |
| F4 | Only the chemist counter sees every doctor's prescription | PS_ANALYSIS §9 core insight | §9 | S2 Problem 3 |
| F5 | ChatGPT severity correct 214/574 = 37.3% (Nepal hospital) | Thapa et al., 2025 | [92], Key Finding 3 | S2 Problem 4 |
| F6 | Alert override rates 46–96% in hospital prescribing systems | Poly et al., 2020 | [93], Key Finding 4 | S2 Problem 5 |
| F22 | Sep 2026: 330 NSQ samples + 1 spurious | CDSCO alert via The News Mill, 23 Oct 2026 | [12][13] | S2 Problem "Did you know?" |
| F9 | LLMs invent interactions in cases with none | Sicard et al., 2025 | [69], Key Finding 3 | S3 Architecture, engine rules |
| F13 | Duplication overrides appropriate 82–98% (two studies) | Poly et al., 2020 | [93] | S3 Architecture stage 4 |
| F7 | medThinks publicly offers brand unpacking, pairwise DDI, banned-FDC flag, severity tiers; USP items not stated on its public page | medThinks public page (24 Oct 2026) | [26] | S3 Unique points footnote |
| F8 | Alert-budget target: at most 1 Interrupt per prescription on average (a target, not a result) | PS_ANALYSIS §7 | §7 | S3 Unique points 3 |
| F10 | Demo: "Brufan 400" expected to resolve to Brufen 400 (ibuprofen) | `tests/fixtures/demo_rx.json` | §5 | S4 User flow 1 |
| F11 | Demo: paracetamol 4,100 mg/day expected vs 4,000 mg/day adult maximum | fixture; FDA label | §5, [81] | S4 User flow 2 |
| F12 | Demo: CrCl ≈34 mL/min (68 y, 55 kg, SCr 1.6) | PS_ANALYSIS §5 (Cockcroft-Gault) | §5 | S4 User flow 2 |
| F14 | Demo: expected 2 Interrupts, 3–4 Informs | fixture | §5 | S4 User flow 3 |
| F15 | DDInter is non-commercial (CC BY-NC-SA 4.0) | PS_ANALYSIS Key Finding 1 | [1], Key Finding 1 | S5 Economic 3 |
| F16 | CDSCO final MDSW guidance 21 Jul 2026: "inform" software in lowest-risk column | National Law Review; MedDeviceGuide | [82][83] | S5 Operational, regulatory 1 |
| F17 | Pharmacy Act 1948 s.42: only registered pharmacists dispense on prescription | Pharmacy Council of India | [84] | S5 Operational, regulatory 2 |
| F18 | DPDP Act: security-lapse penalty up to ₹250 crore | Bar & Bench | [85] | S5 Operational, regulatory 3 |
| F20 | Dose-recommending software modules are regulated MDSW | MedDeviceGuide (secondary) | [83] | S5 Operational, risk 1 |
| F21 | Zerodol-P exists in 325 mg and 500 mg paracetamol versions | 1mg pages (PS_ANALYSIS [20][21]) | [20][21] | S5 Operational, risk 4 |
| F23 | SDG 3.8 wording | UN SDGs | [88] | S6 Social lead |
| F24 | Self-medication pooled 53.6% in India | Rashid et al., 2020 | [79] | S6 Social 1 |
| F26 | PIM use 28% of older Indian adults | Bhagavathula et al., 2021 | Key Finding 9 | S6 Social 2 |
| F25 | Jan Aushadhi generics 50–80% cheaper (government claim) | PMBJP | [15][16] | S6 Social 3 |
| F27 | NABH 6th edition Chapter 3 "Management of Medication (MOM)" | NABH training page | [87] | S7 Target users 3 |
| F19 | India pharmacy retail USD 30.1B (2025) → 52.8B (2031), estimate | Ken Research | [70], §9.3 | S7 Revenue, long-term growth |
| F28 | DDInter 2.0: 302,516 DDIs across 2,310 drugs | Database Commons | [1], Key Finding 1 | S8 Datasets 1 |
| F29 | 156 FDCs banned Aug 2024; Delhi HC interim relief to petitioners | DT Next; ETV Bharat | [90][91] | S8 Regulatory hooks 1 |
| F30 | 16 FDCs banned 11 Jun 2026 incl. amoxicillin + serratiopeptidase | Medical Dialogues; Business Standard | [7][89] | S8 Regulatory hooks 2 |
| F31 | E-pharmacy rules still draft (notified 28 Aug 2018) | Novojuris | [86] | S8 Regulatory hooks 3 |
| F32 | NSQ failure applies only to the tested batch | CDSCO via The News Mill | [12] | S8 Regulatory hooks 4 |

---

## Slide 1: Title slide

Right-hand panel fields, top to bottom:

- **Team Name:** [Team name, e.g. Plot Armor: confirm]
- **Team ID:** [Team ID]
- **Problem Statement ID:** HM-02
- **Problem Statement Title:** Indian Brand-Name Prescription Safety Checker [paste exact official HM-02 title]
- **Theme / Domain:** [Theme, e.g. HealthTech]
- **Category:** Software

The template has no product or tagline field; both go in the Slide 2 title.

---

## Slide 2: PARCHI: COUNT DOSES, NOT BRANDS

Slide title replaces "IDEA / SOLUTION TITLE". "Parchi" = the prescription slip.

### PROBLEM STATEMENT (tall left box)

- **Same name, different drug:** 'Medzol' is both midazolam (a sedative) and pantoprazole (an acid reducer); identical brand names contribute most to such errors (Neelakantan, 2024).
- **Ingredients hide inside brands:** FDCs (several drugs in one pill) hide repeats: paracetamol sits inside many fever, cold and pain brands.
- **Many medicines, many doctors:** Polypharmacy (many medicines at once) affects 49% of older Indian adults (Bhagavathula, 2021); only the chemist counter sees every doctor's prescription.
- **Chatbots misjudge severity:** ChatGPT found every drug interaction but graded its severity correctly only 37.3% of the time (Thapa et al., 2025, Nepal).
- **Too many warnings:** In hospital prescribing software, 46–96% of drug alerts are overridden; too many warnings get ignored (Poly et al., 2020).

**Did you know?** (callout at the bottom of this box) In September 2026 alone, CDSCO (India's drug regulator) flagged 330 medicine samples as 'not of standard quality' and one as spurious (fake) (monthly alert, reported 23 Oct 2026).

### OUR SOLUTION (top-right box)

- **Brand-to-ingredient unpacking:** Type the prescription as written; misspelt Indian brands match to ingredients and strengths, with a confidence score (designed).
- **Reads dosing shorthand:** 1-0-1 (morning, none, night), TDS (three times daily), SOS (only when needed), syrup strengths per 5 mL (designed).
- **Daily totals vs limits:** Adds each ingredient's mg/day across all brands; compares with limits for this patient's age, weight, kidneys (designed).
- **Duplicate and clash checks:** Two same-type drugs, like two painkillers (planned); drug interactions (planned); banned FDCs and look-alike brands (designed).
- **Three alert tiers:** Interrupt (stop and check), Inform (worth knowing), Silent (logged only) (designed); Interrupts kept for overdoses, kidney risks, banned combinations (planned).

### Image box (bottom right)

Concept diagram, no numbers: a prescription slip with brand names → each brand split into ingredients → one daily-total bar per ingredient against its limit → a tier label (Interrupt / Inform / Silent). Label it "concept".

*Presenter note: say "designed" means the data shapes are written and the code is in progress. Do not demo anything live unless it has been built and re-checked.*

---

## Slide 3: TECHNICAL APPROACH

### SYSTEM ARCHITECTURE (tall left box)

Flow chart (top half of the box; interfaces designed, code planned):

```
INPUTS                          SAFETY CHECK LAYER                        PARCHI PWA
Typed Rx (Indian brands)  ──►   1 Brand Matcher                     ──►   "Prescription X-ray"
Patient age, sex, weight        2 Dosing Reader                           screen (planned)
Serum creatinine                3 Dose Totals
  (kidney blood test)           4 Patient Limits                          Prescription in ──►
Pharmacist-approved limits      5 Duplicates & Interactions               ◄── Alerts out
  and suppression list          6 Alert Tiers
                                       ▲
                     DATASET STORE (planned; compact files cached offline)
                     Indian brand-to-ingredient table · Dose limits, each
                     source-tagged · Interaction and banned-combination lists
```

Pipeline steps (bottom half):

1. **Read the prescription** (designed): Match each brand, even misspelt, to ingredients and strength; doubtful matches go to the pharmacist.
2. **Count daily doses** (designed): Convert shorthand like 1-1-1, TDS and SOS into doses per day; sum milligrams per ingredient.
3. **Check the patient** (designed): Estimate CrCl (how well kidneys clear drugs) with Cockcroft-Gault; apply age and weight limits.
4. **Sort and explain** (tiers designed; suppression planned): Routine duplicates default to Inform: 82–98% of such overrides were appropriate (two studies, Poly 2020).

Engine rules (one chip row under the steps; design rules):
- **Rules, not AI:** AI chatbots invented interactions in cases with none (Sicard 2025).
- **Repeatable:** Same prescription in, same alerts out, every run.
- **Every alert cited:** One-line reason plus source: database entry, gazette notice, guideline.
- **Pharmacist decides:** Parchi informs; the registered pharmacist makes every dispensing decision.

### CORE TECHNOLOGIES (top-right box; all planned)

- **Languages / frameworks:** TypeScript (typed code), React (screens), Vite (build tool).
- **Platform:** PWA (web app that installs and works offline) on phone, tablet or PC.
- **Libraries:** Workbox via vite-plugin-pwa (offline caching), fuse.js (fuzzy search), sound-alike brand matching.
- **Rules and formulas:** Rule-based Indian dosing-shorthand reader; Cockcroft-Gault kidney-clearance formula.
- **Online-only AI:** Reads messy text when online; never decides alerts.

### UNIQUE POINTS (bottom-right box)

- **Counts, not pairs:** Goes beyond 'do these two clash?' to 'how much paracetamol is this patient taking?' (designed).
- **Worst-case SOS:** Counts 'take when needed' medicines at their daily maximum, so none are under-counted (designed).
- **Alert budget:** Target: at most one Interrupt per prescription on average; suppression list mutes routinely ignored alerts (planned).
- **Works offline:** Checks without internet; prescriptions stay on the pharmacist's device (planned).
- **Hard to copy:** Pharmacist-curated Indian layer: compositions, limits, as-needed (SOS) rules, suppression list (planned).

Footnote (small text): Closest Indian checker, medThinks, publicly offers brand unpacking, pairwise interactions, banned-FDC flags and severity tiers. USPs above are not stated on its public page (checked 24 Oct 2026).

---

## Slide 4: USER EXPERIENCE & DESIGN

### USER INTERFACE (left box; planned, specified in `docs/DESIGN.md`)

- **Key screens:** Prescription and patient input; Prescription X-ray (each ingredient's daily total against a limit bar); alert cards.
- **Alert cards:** Tier icon and word, one-line reason, source chip, confidence; Interrupts first, Silent collapsed.
- **Minimal questions:** Requests weight or a kidney blood test only when a drug needs it, saying why (planned).
- **Override log:** Pharmacist overrides with a reason, saved on the device with time.
- **Honest uncertainty:** Doubtful matches show "Check match"; a missing limit shows "No limit on file", never guessed.
- **Accessibility:** High-contrast text (WCAG AA); tiers never shown by colour alone; full keyboard use.

### USER FLOW (middle box; demo = 68-year-old, 7 brands, 2 doctors; expected targets from the test fixture, not results)

1. **Pharmacist types the prescription:** Brands as written; 'Brufan 400' should resolve to Brufen 400 (ibuprofen, a painkiller).
2. **Parchi counts and checks:** Paracetamol 4,100 mg/day from three brands vs 4,000 mg adult maximum (FDA); CrCl ≈34 mL/min flags two NSAIDs (anti-inflammatory painkillers).
3. **Pharmacist reviews and decides:** 2 Interrupts (stop and check), 3–4 Informs (worth knowing), rest logged silently.

### DESIGN GOAL (right box)

At a glance, the pharmacist sees whether to act, why, and the source; Parchi informs, the pharmacist decides.

Wireframe area: [Screenshot of the Prescription X-ray screen once built; until then a mockup labelled "mockup"].

*Presenter note: the 4,000 mg/day limit is the FDA adult label maximum; it still needs pharmacist sign-off and an Indian reference before it goes into the limits file. Paracetamol liver-failure statistics are US data (Larson 2005), so do not quote them as Indian.*

---

## Slide 5: FEASIBILITY AND VIABILITY

### TECHNICAL FEASIBILITY

- **Interfaces designed:** Typed hand-offs between all modules are written; engine code is next.
- **Demo case specified:** A test file fixes the demo's expected outputs (slide 4).
- **Proven libraries chosen:** Fuzzy-search, sound-alike and offline-caching libraries selected; no new algorithms needed.

### ECONOMIC FEASIBILITY

- **Low running cost:** Checks run on the pharmacist's device; no per-check server cost (planned).
- **No licence fees:** Open-source stack (slide 3); no licence fees for the prototype.
- **Data licence cost:** DDInter (interaction database) is non-commercial; a paid version needs licensed data.
- **Revenue sources:** See slide 7.

### OPERATIONAL VIABILITY

Regulatory fit:
- **Informs, never decides:** CDSCO (drug regulator), 21 Jul 2026: 'inform-only' software sits in lowest-risk column.
- **Pharmacist stays accountable:** Pharmacy Act 1948, s.42: only registered pharmacists dispense on prescription.
- **Data-privacy law:** Security-lapse fines reach ₹250 crore (DPDP Act); no central prescription store (planned).

Risks → mitigations:
1. **Dose alerts read as dose advice** (CDSCO regulates that as medical software) → show only 'above reference maximum, source, pharmacist to review'; never a corrected dose.
2. **Wrong or unverified limit** → each limit stored with its source and a pharmacist-approved yes/no flag; unverified marked 'no'.
3. **Typing slows a busy counter** → later, take brands straight from the pharmacy billing system; typing stays for the prototype (proposed).
4. **Same brand, different strengths** (Zerodol-P: 325 mg and 500 mg paracetamol) → strength-aware matching; if unclear, assume higher and ask pharmacist (planned).

*Presenter note: never say Parchi is "exempt" or "not a medical device". The class letters in CDSCO's Table 2 come from a secondary source; confirm on cdsco.gov.in before printing a class letter.*

---

## Slide 6: IMPACT AND BENEFITS

### 1 SOCIAL IMPACT

Lead line: UN SDG 3.8: 'access to safe, effective, quality and affordable essential medicines and vaccines for all.' Parchi aims at 'safe' and 'affordable' (planned).
- **Safer self-care at counters:** Pooled studies: 53.6% of Indians self-medicate (Rashid 2020); a counter check could catch overlaps no doctor sees (planned).
- **Safer care for elders:** 28% of older Indians use potentially inappropriate medicines (Bhagavathula 2021); Beers-list (risky-for-elderly drugs) checks planned.
- **Cheaper generic options:** Jan Aushadhi generics (unbranded same medicines) cost 50–80% less than brands (PMBJP scheme claim); swap suggestions (planned).

### 2 ENVIRONMENTAL IMPACT

Qualitative only; nothing measured.
- **No server per check:** Checks run on the device already at the counter; no data-centre compute per prescription (planned).
- **Less medicine wasted:** Duplicate brands caught before dispensing means fewer unneeded strips bought and thrown away (planned, not measured).
- **Light data footprint:** Compact data files download once and are cached; only quality lists refresh online (planned).

### 3 TECHNICAL IMPACT

- **Open Indian test set:** [N] pharmacist-labelled Indian prescriptions to score Parchi against chatbots; rater agreement [κ], results [pending] (planned).
- **Reusable Indian drug data:** Brand-to-ingredient table with standard ingredient IDs; every dose limit source-tagged (planned).

### 4 EDUCATIONAL IMPACT

- **Alerts that teach:** Each alert's one-line reason and source shows counter staff which brands hide which ingredients (planned).
- **Brands made visible:** The Prescription X-ray shows, in plain words, what each brand actually contains (planned).

*Presenter note: in a private chemist, generic suggestions should come from the shop's own stock; Jan Aushadhi suggestions are for Kendras and government deployments only (PS_ANALYSIS §9.4). Do not put a number on the environmental benefit.*

---

## Slide 7: BUSINESS MODEL & SUSTAINABILITY

### TARGET USERS

- **E-pharmacies (first paying buyer):** Their pharmacists verify prescriptions at scale; cited checks and override log (planned) could speed review, cut liability.
- **Pharmacy chains (paying buyer):** One safety standard at every counter protects brand trust and store licences across the chain.
- **Hospital pharmacies and EMR partners:** NABH accreditation's medication chapter (MOM) covers dispensing and look-alike drugs; EMRs (doctor record software) could embed checks.
- **Independent chemists (free, early adopters):** Free offline app; flags banned combinations that risk their licence (planned). Doctors benefit but are not buyers.

### REVENUE & COST MODEL

- **Pilot phase:** Free prototype at [pilot pharmacy: confirm]; costs covered in Economic Feasibility (slide 5).
- **Pricing:** Per-check fee for e-pharmacies; per-store licence for chains; free for independent chemists (proposed).
- **Long-term growth:** India pharmacy retail USD 30.1B (2025) → 52.8B (2031), Ken Research estimate.

### SUSTAINABILITY

- **Partnerships:** Pharmacist panel keeps limits and suppression list approved; EMR vendors embed checks (proposed).
- **Data upkeep:** Banned-combination and monthly quality lists refresh when online; every entry keeps its source (planned).
- **Future expansion:** Children's syrup doses by weight, antibiotic-stewardship checks, hospital-record (FHIR) export (planned).
- **Open source / community:** [Licence: team to decide]; open test set (slide 6) lets others check our claims.

---

## Slide 8: RESEARCH AND REFERENCES

One wide box, laid out in two columns: references on the left; datasets and regulatory hooks on the right.

### KEY TECH & RESEARCH SOURCES

Research material:
1. T. N. Poly, M. M. Islam, H.-C. Yang, Y.-C. Li, "Appropriateness of overridden alerts in computerized physician order entry: systematic review," *JMIR Med. Inform.*, vol. 8, no. 7, e15653, 2020.
2. J. Sicard *et al.*, "Can large language models detect drug-drug interactions leading to adverse drug reactions?," *Ther. Adv. Drug Saf.*, vol. 16, 2025.
3. R. B. Thapa, S. Karki, S. Shrestha, "Exploring potential drug-drug interactions in discharge prescriptions: ChatGPT's effectiveness in assessing those interactions," *Explor. Res. Clin. Soc. Pharm.*, vol. 17, 100564, 2025.
4. A. S. Bhagavathula *et al.*, "Prevalence of polypharmacy, hyperpolypharmacy and potentially inappropriate medication use in older adults in India: a systematic review and meta-analysis," *Front. Pharmacol.*, vol. 12, 685518, 2021.
5. M. Neelakantan, P. Sharma, A. Kulkarni, "Look-alike, sound-alike (LASA) drugs in India," *Lancet Reg. Health Southeast Asia*, vol. 26, 100425, 2024.
6. M. Rashid *et al.*, "Prevalence and predictors of self-medication practices in India: a systematic literature review and meta-analysis," *Curr. Clin. Pharmacol.*, vol. 15, no. 2, pp. 90–101, 2020.
7. AGS Beers Criteria Update Expert Panel, "American Geriatrics Society 2023 updated AGS Beers Criteria for potentially inappropriate medication use in older adults," *J. Am. Geriatr. Soc.*, vol. 71, no. 7, pp. 2052–2081, 2023.
8. D. W. Cockcroft, M. H. Gault, "Prediction of creatinine clearance from serum creatinine," *Nephron*, vol. 16, no. 1, pp. 31–41, 1976.

Datasets:
- DDInter 2.0 (open interaction database): 302,516 drug interactions across 2,310 drugs (Database Commons).
- Indian brand compositions: 1mg 2025 and A-Z public Kaggle datasets; top ~2,000 outpatient brands, ~40 hand-checked (planned).
- Government lists: CDSCO (regulator) banned-combination notices, monthly quality alerts, Jan Aushadhi product list (planned).

India regulatory hooks:
- 156 FDCs (multi-drug pills) banned Aug 2024; some makers got interim relief (Delhi High Court).
- 16 more FDCs banned 11 Jun 2026, incl. amoxicillin (antibiotic) + serratiopeptidase (enzyme) (Health Ministry).
- E-pharmacy rules still in draft (Health Ministry, 28 Aug 2018); it requires registered-pharmacist dispensing.
- NSQ (substandard) alerts cover only the tested batch, so matching needs brand, maker and batch.

*Presenter note: word banned-FDC alerts as "banned by notification, some products under litigation, pharmacist to verify", never "illegal".*

---

## Slide 9: THANK YOU

- **Bottom line:** [Team name] | [Team ID] | [Contact email or phone]
- **Links** (small text under the bottom line): Idea video: [link] · Live prototype: [link]

Our Mentor (panel on the empty right half of the slide):

**[Pharmacist name]**
[Registered pharmacist, qualification, years in practice, community or hospital pharmacy]
- [Reviewed the demo prescription and expected alerts]
- [Signed off adult, elderly and kidney dose limits]
- [Set SOS maximum doses per drug class]
- [Listed alerts pharmacists routinely ignore (suppression list)]
- [Labelled test prescriptions; blind re-rating for agreement]

*Presenter note: fill mentor bullets only with things the pharmacist actually did. If the mentor panel crowds the slide, move it to slide 8's right column instead.*

## Checklist

**Slides covered:** all 9 slides of the official HYPNEXIS '26 template (Title, Idea/Solution, Technical Approach, User Experience & Design, Feasibility and Viability, Impact and Benefits, Business Model & Sustainability, Research and References, Thank You), using each slide's own boxes.

**Where the old 6-slide content moved:** USPs → slide 3 Unique Points (except "Minimal questions" → slide 4 UI); demo targets → slide 4 User Flow; Engine principles → slide 3 chip row; Did you know → slide 2 Problem callout; Regulatory and Risks → slide 5 Operational Viability; Finance → slide 5 Economic; Market estimate, Revenue model, Target audience → slide 7; Economic impact (Jan Aushadhi), Healthcare-system impact (elders) → slide 6 Social; Research impact (test set) → slide 6 Technical; Links and Mentor → slide 9. Nothing was dropped. New content (slide 4 UI and design goal, slide 6 Environmental and Educational, slide 7 Sustainability) comes from `docs/PLAN.md` and `docs/DESIGN.md`, adds no new numbers, and is tagged planned or proposed.

**Words per box vs limit:** re-check after any edit (body text only, bold labels excluded). Limits: Problem ≤22, Did you know ≤30, Our Solution ≤20, pipeline steps ≤20, engine rules ≤12, core technologies ≤14, unique points ≤16, UI bullets ≤16, user-flow steps ≤22, design goal ≤20, feasibility items ≤14, risk → mitigation ≤26 combined, SDG lead line ≤25, impact items and target users ≤20, business items ≤16. Research Material references run long; the template sets no limit for them. Re-check by eye after pasting, because the 3-column slides (4, 5, 7) are the tightest and fonts may overflow.

**Facts used once:** see the Fact allocation table at the top. Each number is assigned to one slide; other slides refer back to it instead of repeating it.

**Left out or uncertain:**
- **Build status (most important):** at the 24 Oct 2026 audit, `main` was a skeleton, so every feature is tagged *planned* or *designed*. Update the tags and fill every `[placeholder]` metric (accuracy, alerts per Rx, ms, κ, gold-set size) from real runs before finals.
- **Dropped as unverified or self-reported:** Joshi 2007's 113,346 entries; the gazette number range for the 156 FDCs; the RxNav shutdown date; DrugBank checker retirement; AIOCD chemist count (~10 lakh, self-reported); Marg ERP user numbers; competitor self-claims.
- **Corrected:** Thapa 2025 is a Nepal study; Poly's duplication figure is "82–98% in two studies"; paracetamol liver-failure data is US (Larson 2005), not India.
- **Medication-error incidence (Govil 2025):** the figures come from a news summary. Check them against the paper before use.
- **CDSCO software risk class letters:** they come from a secondary source. Confirm them in the CDSCO guidance PDF before showing them.
- **Environmental impact:** qualitative only; no measured or cited figure exists, so none is shown.
- **Pharmacist sign-off still needed:** dose limits (incl. 4 g/day paracetamol), SOS caps, suppression list, and the mentor panel contents.
- **Team details:** team name, team ID, theme, contact, links, pilot pharmacy, open-source licence and the exact problem-statement title are placeholders.
