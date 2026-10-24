# Parchi (HM-02) Plan: Indian Prescription Safety Checker

Source of truth for scope: `PS_ANALYSIS.md` (long, read only the section you need; Phase 2 is §11). Who we build for: `BUSINESS_MODEL.md`. This file is the work split.

**Goal:** typed Rx (Indian brands) -> ingredient ledger -> mg/day vs patient limits -> duplicates/DDI -> 3-tier alerts (Interrupt / Inform / Silent), plus a measured "beat the chatbot" benchmark.
**Phase 2 goal:** a customer's whole history (Rx from several doctors, dated) -> one timeline -> overlaps and cross-doctor duplicates -> re-check on a new kidney value -> severity-ranked alerts and a ranked review queue.
**User and buyer:** the verifying pharmacist at e-pharmacies and pharmacy chains. Doctors are never users; input is the buyer's structured order/Rx data, not OCR.

## Stack (agreed)
- **App:** PWA, React + Vite + TypeScript, `vite-plugin-pwa` (Workbox). Works fully offline after first load.
- **Engine:** TypeScript, runs in the browser. Deterministic, no server needed.
- **Data:** compact JSON in `public/data/`, cached for offline use. Online-only lists (NSQ) refresh when connected.
- **Fuzzy:** `fuse.js` / `fastest-levenshtein` + `double-metaphone`.
- **Online extras:** serverless `api/` functions (Vercel): LLM sig fallback, and (Phase 2) a JSON check API for buyers. API key stays on the server. Offline, these features hide themselves.
- **Interop (Phase 2):** CSV catalogue import, ABDM FHIR R4 `PrescriptionRecord` import/export (NRCeS profile).
- **Python 3.11:** only for data cleaning (`data/`) and the benchmark (`eval/`). Exports JSON for the app.
- **Tests:** Vitest (`npm test`), pytest for Python scripts.

## Layout (one owner per folder = no merge conflicts)
| Path | Owner |
|---|---|
| `data/` (Python, curated CSV -> `public/data/*.json`), `src/engine/resolver/` | A |
| `src/engine/sig/`, `src/engine/ledger/`, `src/engine/limits/`, `api/` | B |
| `src/engine/rules/`, `alerts/`, `history/`, `pipeline.ts`, `wiring.ts` | C |
| `src/ui/`, PWA config, `eval/`, `docs/` | D |
| `src/engine/contracts.ts`, `tests/fixtures/` | shared, see Contracts |

## Tracks

### Track A: Data and Brand Resolution
- Clean brand -> ingredients table (1mg 2025 / A-Z dataset, top ~2,000 OPD brands). Hand-curate the ~40 demo/test brands.
- **Canonical ingredient IDs** + alias table (`acetaminophen` -> `paracetamol`). Every track uses these IDs.
- Fuzzy + phonetic + strength-aware resolver ("Dolo 650"), confidence score, "needs pharmacist" route.
- Banned FDC table (156 of 2024 + 16 of Jun 2026) and detector.
- LASA detector (ambiguous match across different ingredients), discontinued-brand flag.
- R2: NSQ/spurious batch data, Jan Aushadhi substitution data.
- Phase 2: catalogue import (buyer CSV -> canonical ids, review list for low confidence); "proposed composition" for unknown brands (best candidate + confidence, marked unverified); same-composition alternatives from the buyer's own catalogue.

### Track B: Sig Parsing and Dose Engine
- Indian sig parser: OD/BD/TDS/QID/HS/SOS/STAT, 1-0-1, 1/2-0-1/2, "x5d", Hinglish (rules first; LLM fallback via `api/` only when online).
- SOS worst-case doses/day, dosage forms (syrup mg/5 mL, drops), topical exclusion.
- Ingredient ledger: cumulative mg/day per ingredient across all brands.
- Patient limits: age/weight/CrCl (Cockcroft-Gault) tables, ask-only-when-needed prompts.
- R2: paediatric syrup mL -> mg and mg/kg.
- Phase 2: start date + duration on every line (Rx date + `duration_days`; default window for no duration, in data, unverified); kidney-band limits for more drugs; `api/check` JSON endpoint wrapping the pipeline.

### Track C: Rules, Alerting and Pipeline
- `pipeline.ts`: text + patient -> resolver -> sig -> ledger -> rules -> alerts. The single entry point the UI calls.
- Therapeutic class duplication (ingredient + class).
- DDI from DDInter (subset for our ingredients, exported to JSON by A) with severity.
- 3-tier alert engine, pharmacist suppression list, alert budget (Interrupts per Rx <= 1).
- One-line reason + source chip (DDInter ID, S.O. number, Beers rule).
- R2: Beers subset, CNS/ACB stacking. Finals: AWaRe antibiotic checks.
- Phase 2: `checkHistory` entry point (several dated Rx + lab values); timeline merge and overlap windows; dose totals per overlapping window (calls B per window); cross-doctor duplicate alerts naming doctors and dates; re-check on a new creatinine with a "what changed" diff; unknown-brand alert with proposed composition; suggested order status (clear / clear with note / hold, contact doctor); review-queue ranking across orders; FHIR `PrescriptionRecord` -> history mapping.

### Track D: PWA, Evaluation and Pitch
- PWA shell (installable, offline, online/offline indicator), input form, patient prompts.
- "Prescription X-ray" view (brand -> ingredient -> daily total vs limit bar), tier colours, override log (IndexedDB).
- Pharmacist session owner (questions in `PS_ANALYSIS.md` section 4). Book the slot in hour 0-1; limits and suppression data go to B/C.
- Gold set (30 by 3 AM, 50-60 later) + Python benchmark: engine vs ChatGPT/Claude/Gemini, precision/recall per alert type, alerts per Rx.
- Demo script (68 y patient case), deck, medThinks comparison slide. Finals: Hindi leaflet, FHIR export stub.
- Phase 2: pharmacist review console (queue -> order -> timeline -> alerts -> decision + override log); history input (doctor + date per Rx, add lab value); demo data shaped like an e-pharmacy account (3 doctors, 3 orders, a lab result); gold-set cases for multi-doctor and kidney re-check; deck rewritten for e-pharmacy and chain buyers.

## Contracts (freeze in `src/engine/contracts.ts` in hour 0)
Tracks talk only through these shapes. Ingredient `id` = canonical lowercase INN slug from A.
1. **Resolver (A):** `{raw, brand, confidence, ingredients:[{id, mg, per_volume_ml?}], form, flags:("banned_fdc"|"lasa"|"discontinued"|"nsq")[]}`
2. **Sig (B):** `{doses_per_day, max_doses_per_day, sos, duration_days?}`
3. **Ledger (B):** `{[id]: {total_mg_day, sources:string[], limit_mg_day?}}`
4. **Alert (C):** `{tier, type, ingredients:string[], reason, source, confidence}`

**Phase 2 (proposed, additive only; agree in the team before coding):**
5. **Prescription:** `{id, doctor, date (ISO), text}`; history = `Prescription[]`.
6. **LabResult:** `{type: "serum_creatinine", value, date}`; the latest value feeds CrCl.
7. **History result (C):** each line adds `rx_id`, `doctor`, `start`, `end?`, `unverified?`; result adds `status`, `priority` (queue rank), `changes?` (alerts added/cleared after a re-check).

`tests/fixtures/demo_rx.json` holds the demo Rx from `PS_ANALYSIS.md` section 5 with the expected output for every stage. Each track codes against it from hour 0 without waiting on the others. Phase 2 adds `tests/fixtures/demo_history.json` (same patient, 3 doctors, dated Rx, a creatinine arriving later).

## Timeline
| When | Goal |
|---|---|
| Hour 0-1 | Skeleton commit on main, contracts + fixtures frozen, branches created, pharmacist slot booked |
| By midnight | Resolver, sig, ledger, limits, class dup, banned FDC, 3-tier output, X-ray, offline PWA shell |
| By 3 AM (R1) | End-to-end on demo Rx, offline works, 20-30 Rx gold set, chatbot comparison on 10 |
| R2 (11:30 AM) | LASA, NSQ, paediatric, citations, Beers, Jan Aushadhi, 50-60 Rx benchmark |
| Phase 2 | Contracts 5-7 + history fixture, timeline/overlap, kidney re-check, unverified brands, ranked queue, review console, FHIR import |
| Finals (3 PM) | AWaRe, FHIR export, leaflet, pharmacist quote, deck |

Sleep in staggered shifts. Before sleeping: checkpoint PR merged, status row updated.

## Status (update only your own row)
| Track | Dev | Branch | Done | Next | Blocked |
|---|---|---|---|---|---|
| A | Palash | `dev/track-a` | Canonical ids (275 curated), 32k-brand index, resolver, banned FDC 156+16, DDInter, NSQ, Jan Aushadhi, liquid per-5-mL inference, 37 pack-verified brands, `schedule_hint`, docs/track-a-data.md; Phase 2: catalogue CSV import + review list, `proposed_composition`, same-composition alternatives; curated interaction supplement (`ddi_supplement.json`, 13 rules DDInter lacks, unverified) | Pharmacist-verified brands; verify 43 top-tier paracetamol/NSAID brands in data/reports/ | |
| B | Aditya | `dev/track-b` | Sig parser (1-0-1, OD..QID, SOS caps, q8h, weekly, mL/tsp, Hinglish, phased doses, course lengths in numbers or words), ledger (SOS worst case, mL to mg, topical excluded), limits.json (11 ingredients, all unverified), Cockcroft-Gault CrCl, ask-only-when-needed, `api/parse-sig` LLM fallback, Phase 2: dose adapters, dated windows, kidney bands for 34 drugs (unverified), `api/check` (keyed), `api/leaflet` (customer leaflet in 9 languages, grounded, online only) | Pharmacist-approved limits and SOS caps (needs a pharmacist) | |
| C | Ved | `dev/track-c` | Rules (dose, class dup, DDI incl. curated pairs, renal/geriatric, Beers 2023 subset of 8 rules, ACB/CNS stacking, WHO AWaRe, resolver flags), 3-tier engine, `pipeline.ts` + `wiring.ts`, Phase 2 `checkHistory` (overlap windows, cross-doctor alerts, kidney re-check diff, unknown-brand proposal, status, queue rank, refill smoothing), FHIR import (incl. patient, weight), contracts 5-7, docs/track-c-engine.md | Pharmacist review of draft policy (tiers, AWaRe list, Beers wording, refill grace, queue weights); paediatric kidney checks (no height collected, not built) | |
| D | Jayesh | `dev/track-d` | Landing (e-pharmacy and chain buyers), 5 pages incl. guided demo, override log, review desk on the engine's `checkHistory` (queue, order review, timeline, re-check diff, decision), history input, FHIR import and draft export, interaction-coverage note, look-alike picker, customer leaflet card; benchmark: 54-case draft gold set, engine runner, scorer, chatbot prompts (`eval/`, `npm run eval`), docs/DEMO.md | Pharmacist session; chatbot answers saved in `eval/outputs/`; a second rater for kappa; labels reviewed by a pharmacist | |

## Not doing
OCR (buyers already digitise Rx; we take structured lines), WhatsApp/voice, generic DDI-only checker, NPPA price flag, doctor-facing features.
