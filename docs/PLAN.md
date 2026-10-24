# Parchi (HM-02) Plan: Indian Prescription Safety Checker

Source of truth for scope: `PS_ANALYSIS.md` (long, read only the section you need). This file is the work split.

**Goal:** typed Rx (Indian brands) -> ingredient ledger -> mg/day vs patient limits -> duplicates/DDI -> 3-tier alerts (Interrupt / Inform / Silent), plus a measured "beat the chatbot" benchmark.

## Stack (agreed)
- **App:** PWA, React + Vite + TypeScript, `vite-plugin-pwa` (Workbox). Works fully offline after first load.
- **Engine:** TypeScript, runs in the browser. Deterministic, no server needed.
- **Data:** compact JSON in `public/data/`, cached for offline use. Online-only lists (NSQ) refresh when connected.
- **Fuzzy:** `fuse.js` / `fastest-levenshtein` + `double-metaphone`.
- **Online extras:** serverless `api/` functions (Vercel) for LLM calls. API key stays on the server. Offline, these features hide themselves.
- **Python 3.11:** only for data cleaning (`data/`) and the benchmark (`eval/`). Exports JSON for the app.
- **Tests:** Vitest (`npm test`), pytest for Python scripts.

## Layout (one owner per folder = no merge conflicts)
| Path | Owner |
|---|---|
| `data/` (Python, curated CSV -> `public/data/*.json`), `src/engine/resolver/` | A |
| `src/engine/sig/`, `src/engine/ledger/`, `src/engine/limits/`, `api/` | B |
| `src/engine/rules/`, `src/engine/alerts/`, `src/engine/pipeline.ts` | C |
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

### Track B: Sig Parsing and Dose Engine
- Indian sig parser: OD/BD/TDS/QID/HS/SOS/STAT, 1-0-1, 1/2-0-1/2, "x5d", Hinglish (rules first; LLM fallback via `api/` only when online).
- SOS worst-case doses/day, dosage forms (syrup mg/5 mL, drops), topical exclusion.
- Ingredient ledger: cumulative mg/day per ingredient across all brands.
- Patient limits: age/weight/CrCl (Cockcroft-Gault) tables, ask-only-when-needed prompts.
- R2: paediatric syrup mL -> mg and mg/kg.

### Track C: Rules, Alerting and Pipeline
- `pipeline.ts`: text + patient -> resolver -> sig -> ledger -> rules -> alerts. The single entry point the UI calls.
- Therapeutic class duplication (ingredient + class).
- DDI from DDInter (subset for our ingredients, exported to JSON by A) with severity.
- 3-tier alert engine, pharmacist suppression list, alert budget (Interrupts per Rx <= 1).
- One-line reason + source chip (DDInter ID, S.O. number, Beers rule).
- R2: Beers subset, CNS/ACB stacking. Finals: AWaRe antibiotic checks.

### Track D: PWA, Evaluation and Pitch
- PWA shell (installable, offline, online/offline indicator), input form, patient prompts.
- "Prescription X-ray" view (brand -> ingredient -> daily total vs limit bar), tier colours, override log (IndexedDB).
- Pharmacist session owner (questions in `PS_ANALYSIS.md` section 4). Book the slot in hour 0-1; limits and suppression data go to B/C.
- Gold set (30 by 3 AM, 50-60 later) + Python benchmark: engine vs ChatGPT/Claude/Gemini, precision/recall per alert type, alerts per Rx.
- Demo script (68 y patient case), deck, medThinks comparison slide. Finals: Hindi leaflet, FHIR export stub.

## Contracts (freeze in `src/engine/contracts.ts` in hour 0)
Tracks talk only through these shapes. Ingredient `id` = canonical lowercase INN slug from A.
1. **Resolver (A):** `{raw, brand, confidence, ingredients:[{id, mg, per_volume_ml?}], form, flags:("banned_fdc"|"lasa"|"discontinued")[]}`
2. **Sig (B):** `{doses_per_day, max_doses_per_day, sos, duration_days?}`
3. **Ledger (B):** `{[id]: {total_mg_day, sources:string[], limit_mg_day?}}`
4. **Alert (C):** `{tier, type, ingredients:string[], reason, source, confidence}`

`tests/fixtures/demo_rx.json` holds the demo Rx from `PS_ANALYSIS.md` section 5 with the expected output for every stage. Each track codes against it from hour 0 without waiting on the others.

## Timeline
| When | Goal |
|---|---|
| Hour 0-1 | Skeleton commit on main, contracts + fixtures frozen, branches created, pharmacist slot booked |
| By midnight | Resolver, sig, ledger, limits, class dup, banned FDC, 3-tier output, X-ray, offline PWA shell |
| By 3 AM (R1) | End-to-end on demo Rx, offline works, 20-30 Rx gold set, chatbot comparison on 10 |
| R2 (11:30 AM) | LASA, NSQ, paediatric, citations, Beers, Jan Aushadhi, 50-60 Rx benchmark |
| Finals (3 PM) | AWaRe, FHIR stub, leaflet, pharmacist quote, deck |

Sleep in staggered shifts. Before sleeping: checkpoint PR merged, status row updated.

## Status (update only your own row)
| Track | Dev | Branch | Done | Next | Blocked |
|---|---|---|---|---|---|
| A | Palash | `dev/track-a` | Canonical ids (271 curated), 32k-brand index, resolver (fuzzy/phonetic/strength, LASA, generic), banned FDC 156+16, DDInter export, NSQ/spurious export + `nsq` flag, Jan Aushadhi generics (`jan_aushadhi`), docs/track-a-data.md | Pharmacist-verified brands (needs D's pharmacist session) | |
| B |  | `dev/track-b` |  |  |  |
| C |  | `dev/track-c` |  |  |  |
| D |  | `dev/track-d` |  |  |  |

## Not doing
OCR, WhatsApp/voice, generic DDI-only checker, NPPA price flag.
