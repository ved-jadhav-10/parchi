# Parchi: Built vs Planned Inventory (local codebase audit, 24 Oct 2026)

Audit scope: working tree of `D:/Coding/Projects/Personal/plot-armor-hm-02-hypnexis` on branch `main` at commit `6ffc33e` (clean working tree), plus `git ls-remote origin` for remote branch heads. Read-only; nothing was installed, fetched, checked out or edited. Source links below are repo-relative file paths.

**Headline for the deck writer: as of `main@6ffc33e` (24 Oct 2026, 15:41 IST), Parchi is a project skeleton. No engine module, data file, API function, UI feature, gold set or benchmark exists on `main`. Every product feature in PLAN.md is PLANNED. The only implemented artefacts are the shared type contracts, a PWA build config, a one-line React placeholder, the demo fixture, and one fixture-shape test.**

## 1. What does docs/PLAN.md say is done (status table, timeline, "Not doing")?

### Takeaway
The PLAN.md status table is completely empty for all four tracks (no dev, no "Done", no "Next"), so the plan itself claims nothing is done. Only the "Hour 0-1" timeline item (skeleton commit, contracts + fixtures frozen, branches created) is visibly achieved in the repo.

### Cited Findings
- Status table rows for A, B, C, D contain only the branch names (`dev/track-a` .. `dev/track-d`); the Dev, Done, Next and Blocked columns are blank for every track — [docs/PLAN.md lines 77-83](docs/PLAN.md)
- Goal statement: "typed Rx (Indian brands) -> ingredient ledger -> mg/day vs patient limits -> duplicates/DDI -> 3-tier alerts (Interrupt / Inform / Silent), plus a measured 'beat the chatbot' benchmark" — [docs/PLAN.md line 5](docs/PLAN.md)
- Track A (Data and Brand Resolution): brand -> ingredients table (top ~2,000 OPD brands, ~40 hand-curated demo brands), canonical IDs + alias table, fuzzy + phonetic + strength-aware resolver with confidence and "needs pharmacist" route, banned FDC table (156 of 2024 + 16 of Jun 2026) and detector, LASA detector, discontinued flag; R2: NSQ, Jan Aushadhi — [docs/PLAN.md lines 27-33](docs/PLAN.md)
- Track B (Sig and Dose): Indian sig parser (OD/BD/TDS/QID/HS/SOS/STAT, 1-0-1, 1/2-0-1/2, x5d, Hinglish, LLM fallback via `api/` online only), SOS worst case, syrup mg/5 mL, drops, topical exclusion, ingredient ledger, age/weight/CrCl (Cockcroft-Gault) limits, ask-only-when-needed prompts; R2: paediatric mL -> mg and mg/kg — [docs/PLAN.md lines 35-40](docs/PLAN.md)
- Track C (Rules, Alerts, Pipeline): `pipeline.ts`, class duplication, DDInter DDI with severity, 3-tier alerts, suppression list, alert budget (Interrupts per Rx <= 1), one-line reason + source chip; R2: Beers subset, CNS/ACB stacking; Finals: AWaRe — [docs/PLAN.md lines 42-48](docs/PLAN.md)
- Track D (PWA, Eval, Pitch): installable offline PWA with online/offline indicator, input form, patient prompts, Prescription X-ray view, tier colours, override log (IndexedDB), gold set (30 by 3 AM, 50-60 later), Python benchmark vs ChatGPT/Claude/Gemini, demo script, deck; Finals: Hindi leaflet, FHIR export stub — [docs/PLAN.md lines 50-55](docs/PLAN.md)
- Timeline: Hour 0-1 skeleton/contracts/fixtures/branches; by midnight resolver, sig, ledger, limits, class dup, banned FDC, 3-tier output, X-ray, offline shell; R1 (3 AM) end-to-end demo Rx, 20-30 Rx gold set, chatbot comparison on 10; R2 (11:30 AM) LASA, NSQ, paediatric, citations, Beers, Jan Aushadhi, 50-60 Rx benchmark; Finals (3 PM) AWaRe, FHIR stub, leaflet, pharmacist quote, deck — [docs/PLAN.md lines 66-73](docs/PLAN.md)
- "Not doing": OCR, WhatsApp/voice, generic DDI-only checker, NPPA price flag — [docs/PLAN.md line 86](docs/PLAN.md)

### Inferences
- The deck must not present any PLAN.md feature as working based on PLAN.md alone; the plan is aspirational and its status table records no progress.
- "Not doing" items (OCR, voice/WhatsApp, NPPA) can be stated as deliberate scope exclusions, which is a defensible pitch point (PS_ANALYSIS ranks them lowest, see [docs/PS_ANALYSIS.md lines 103-109](docs/PS_ANALYSIS.md)).

### Gaps
- The status table may be updated on a track branch not yet merged (see question 3); not verifiable locally.

## 2. Feature-by-feature verdict: BUILT / PARTIAL / PLANNED

### Takeaway
Zero features are BUILT. Two infrastructure items are PARTIAL (PWA build config; typed contracts incl. a declared-but-unimplemented pipeline signature). Every clinical, data, UI, evaluation and output feature is PLANNED: the folders that should hold them contain only `.gitkeep`.

### Cited Findings
Evidence of the empty tree (applies to every PLANNED row below):
- `git ls-files` on `main` lists 29 tracked files. Code/data folders contain only placeholders: `api/.gitkeep`, `data/.gitkeep`, `eval/.gitkeep`, `public/data/.gitkeep`, `src/engine/alerts/.gitkeep`, `src/engine/ledger/.gitkeep`, `src/engine/limits/.gitkeep`, `src/engine/resolver/.gitkeep`, `src/engine/rules/.gitkeep`, `src/engine/sig/.gitkeep` — [git ls-files at main@6ffc33e]
- `src/engine/pipeline.ts` does not exist (not in `git ls-files`, not on disk) — [src/engine/](src/engine/)
- The entire UI is `export default function App() { return <h1>Parchi</h1> }` — [src/ui/App.tsx](src/ui/App.tsx); mounted by [src/main.tsx](src/main.tsx)
- `contracts.ts` declares types only (`Flag`, `Tier`, `Ingredient`, `ResolvedBrand`, `Sig`, `Ledger`, `Alert`, `Patient`, and `CheckPrescription` as a *type* of the pipeline function); no implementation — [src/engine/contracts.ts](src/engine/contracts.ts)
- Only test: `tests/contracts.test.ts`, one case asserting the fixture has 7 expected resolver lines (`expect(demo.expected.resolver).toHaveLength(7)`); it tests the fixture file, not any engine code — [tests/contracts.test.ts](tests/contracts.test.ts)
- `.env.example` declares `ANTHROPIC_API_KEY=` but `api/` has no functions — [.env.example](.env.example), [api/](api/)

| # | Feature | Verdict | Evidence |
|---|---|---|---|
| 1 | Brand resolver: fuzzy (fuse.js / Levenshtein) | PLANNED | `src/engine/resolver/` has only `.gitkeep`. `fuse.js` 7.5.0 and `fastest-levenshtein` 1.0.16 are declared dependencies ([package.json](package.json)) but imported nowhere (no `.ts` files outside contracts/UI/test) |
| 2 | Phonetic matching (Double Metaphone) | PLANNED | `double-metaphone` 2.0.1 in [package.json](package.json), unused |
| 3 | Strength-aware resolution ("Dolo 650" vs 500) | PLANNED | No resolver code; no composition data |
| 4 | Confidence score + "needs pharmacist" route | PLANNED (type only) | `ResolvedBrand.confidence: number` and `brand: string \| null` exist in [contracts.ts](src/engine/contracts.ts); no producer |
| 5 | Canonical ingredient IDs + alias table | PLANNED | Convention documented in [contracts.ts](src/engine/contracts.ts) comment and fixture uses slugs (`paracetamol`, `aceclofenac`...), but no alias table in `data/` or `public/data/` |
| 6 | Banned FDC detector (156 of 2024 + 16 of Jun 2026) | PLANNED (type only) | `Flag` union includes `'banned_fdc'` ([contracts.ts](src/engine/contracts.ts)); no table, no detector |
| 7 | LASA detector | PLANNED (type only) | `'lasa'` in `Flag` union; no code |
| 8 | Discontinued-brand flag | PLANNED (type only) | `'discontinued'` in `Flag` union; no code/data |
| 9 | NSQ / spurious batch data | PLANNED | No data files |
| 10 | Jan Aushadhi substitution + savings | PLANNED | No data files |
| 11 | Indian sig parser (OD/BD/TDS/SOS, 1-0-1, x5d) | PLANNED (type only) | `Sig` interface in [contracts.ts](src/engine/contracts.ts); `src/engine/sig/` empty |
| 12 | Hinglish sig phrases | PLANNED | No code |
| 13 | LLM fallback for messy sigs (online, via `api/`) | PLANNED | `api/` empty; only `.env.example` key placeholder |
| 14 | SOS worst-case doses/day | PLANNED (type only) | `Sig.max_doses_per_day`, `Sig.sos` fields exist; no logic |
| 15 | Syrup mg/5 mL, drops | PLANNED (type only) | `Ingredient.per_volume_ml?` optional field; no logic |
| 16 | Topical exclusion from systemic load | PLANNED | `ResolvedBrand.form: string` exists; no logic |
| 17 | Ingredient ledger (cumulative mg/day) | PLANNED (type only) | `Ledger` type; `src/engine/ledger/` empty. Fixture states expected value 4,100 mg/day paracetamol ([tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)) but nothing computes it |
| 18 | Patient limits: age / weight / CrCl (Cockcroft-Gault) | PLANNED (type only) | `Patient` type has `age_years`, `weight_kg?`, `serum_creatinine?`, `sex?`; `src/engine/limits/` empty; no limits data file |
| 19 | Ask-only-when-needed prompts | PLANNED | No UI or engine code |
| 20 | Paediatric mL -> mg, mg/kg | PLANNED | No code |
| 21 | Therapeutic class duplication | PLANNED | `src/engine/rules/` empty; no class map |
| 22 | DDInter DDI with severity | PLANNED | No DDI JSON in `public/data/`; no rules code |
| 23 | 3-tier alerts (Interrupt/Inform/Silent) | PLANNED (type only) | `Tier = 'interrupt' \| 'inform' \| 'silent'` and `Alert` type; `src/engine/alerts/` empty |
| 24 | Pharmacist suppression list | PLANNED | No data file, no code |
| 25 | Alert budget (Interrupts per Rx <= 1) | PLANNED | No code, no measurement |
| 26 | One-line reason + source chip | PLANNED (type only) | `Alert.reason`, `Alert.source` fields; no producer, no UI |
| 27 | Beers 2023 subset | PLANNED | No data/code |
| 28 | CNS / ACB stacking | PLANNED | No data/code |
| 29 | WHO AWaRe antibiotic checks | PLANNED | No data/code |
| 30 | Pipeline entry point (`pipeline.ts`) | PLANNED (signature only) | `CheckPrescription` type in [contracts.ts](src/engine/contracts.ts); file `src/engine/pipeline.ts` absent |
| 31 | PWA, installable + offline | PARTIAL | `vite-plugin-pwa` configured with `registerType: 'autoUpdate'`, Workbox `globPatterns: ['**/*.{js,css,html,json,svg,png}']`, manifest name/short_name "Parchi", theme `#0f766e`, `display: 'standalone'`, but `icons: []` ([vite.config.ts](vite.config.ts)). Not built or verified in this audit (no `node_modules`); empty icons likely blocks installability; no online/offline indicator in UI |
| 32 | Prescription X-ray view | PLANNED | UI is a single `<h1>` ([src/ui/App.tsx](src/ui/App.tsx)) |
| 33 | Input form + patient prompts UI | PLANNED | Same |
| 34 | Override log (IndexedDB) | PLANNED | No code |
| 35 | Gold set (30 -> 50-60 Rx) | PLANNED | `eval/` empty; only one demo Rx exists, in the fixture |
| 36 | Benchmark vs ChatGPT / Claude / Gemini | PLANNED | `eval/` empty; no results files anywhere |
| 37 | Hindi patient leaflet | PLANNED | No code |
| 38 | FHIR MedicationRequest export stub | PLANNED | No code |
| 39 | Typed shared contracts between tracks | BUILT (as types, not a feature) | [src/engine/contracts.ts](src/engine/contracts.ts); typecheck status not verified (no `node_modules`) |
| 40 | Demo Rx fixture with expected outputs | BUILT (test data) | [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json) |

### Inferences
- Honest deck framing today: "architecture and contracts designed, demo case specified with expected outputs, implementation in progress." Any screenshot, alert count, accuracy number or "works offline" claim would currently be unsupported by the repo.
- The contracts do encode real design decisions worth showing as architecture (3 tiers, `banned_fdc`/`lasa`/`discontinued` flags, `per_volume_ml` for syrups, `max_doses_per_day` for SOS worst case, `confidence` + nullable `brand` for "needs pharmacist", CrCl inputs in `Patient`). These can be presented as "designed" not "built".
- Because the audit snapshot is from shortly after the skeleton (first commit 14:19 IST, last merge 15:41 IST on 24 Oct 2026), this inventory must be re-run right before the deck is finalised.

### Gaps
- Could not verify whether the build succeeds or the service worker actually precaches (no `node_modules`; did not install).
- Any work on unmerged branches (notably `dev/track-d`, see question 3) is not reflected here.

## 3. Git history and track branches

### Takeaway
`main` has 10 commits, all docs/skeleton (first at 14:19 IST, last at 15:41 IST, 24 Oct 2026). Remote branches `dev/track-a`, `dev/track-b`, `dev/track-c` point at commits already in `main`. Only `origin/dev/track-d` points at a commit (`469673f`) that is not present locally, so it may contain unmerged work that could not be inspected.

### Cited Findings
- Full `main` log (`git log --format='%h %ad %an %s'`): `350ef47` 14:19 "Add project skeleton: PWA scaffold, contracts, fixtures, docs" (Ved Jadhav); `55d5309` "Docs folder created and docs relocated"; `b4d8452` "Point root CLAUDE.md to docs, name track branches"; `9d22e92` "A: rename product to Parchi"; `1481f95` Merge PR #1 from dev/track-a; `8fde0b0` "Added business aspect into the ps_analysis file" (adityaaa08012006); `7ce391e` merge; `f999db7` "C: keep single root CLAUDE.md"; `7c69184` merge; `6ffc33e` 15:41 Merge PR #2 from dev/track-c — [git log on main]
- None of these commits add engine, data, UI, eval or api code; track-prefixed commits are a rename (A) and a CLAUDE.md cleanup (C) — [git log on main]
- `git branch -a` shows only local `main` and `remotes/origin/main`; no local copies of track branches — [git branch -a]
- `git ls-remote origin`: `dev/track-a` = `9d22e92` (in main), `dev/track-b` = `b4d8452` (in main, older than main), `dev/track-c` = `7c69184` (in main), `dev/track-d` = `469673f` (`git cat-file -t 469673f` returns "Not a valid object name", i.e. not in local history) — [git ls-remote origin]
- The GitHub API returns "Not Found" for the repo (private) and `gh` CLI is not installed, so track-d contents could not be read without a `git fetch`, which was out of scope (read-only) — [api.github.com compare request]

### Inferences
- Tracks A, B and C have no pushed feature work beyond what is on `main`. Track D (PWA / eval / docs owner) has pushed at least one commit not yet merged; its content is unknown.

### Gaps
- Contents of `origin/dev/track-d@469673f` are unknown. Running `git fetch origin` then `git log main..origin/dev/track-d --stat` would resolve this.
- Local, uncommitted work on teammates' machines is invisible to this audit.

## 4. `npm test` result

### Takeaway
Not run: `node_modules/` is absent, and installing was out of scope. There is no measured pass/fail count.

### Cited Findings
- `ls node_modules` -> "No such file or directory" at the repo root — [repo root]
- `npm test` maps to `vitest run`; test glob is `tests/**/*.test.ts` and `src/**/*.test.ts` — [package.json](package.json), [vite.config.ts](vite.config.ts)
- Only one test file and one test case exist: `tests/contracts.test.ts` ("demo fixture > has seven prescription lines") — [tests/contracts.test.ts](tests/contracts.test.ts)

### Inferences
- If run after `npm install`, the expected result is 1 test file / 1 test, very likely passing (the fixture does have 7 resolver entries). This is an inference, not a measurement.
- The CLAUDE.md rule "Every engine module has a Vitest test against tests/fixtures/demo_rx.json" is vacuously satisfied because no engine modules exist ([CLAUDE.md](CLAUDE.md)).

### Gaps
- No real pass/fail numbers; no `pytest` tests exist (no Python files).

## 5. Actual tech stack (package.json, package-lock.json, requirements.txt)

### Takeaway
React 19 + Vite 8 + TypeScript 7 + vite-plugin-pwa 2 + Vitest 5, with fuse.js, fastest-levenshtein and double-metaphone declared but not yet used. Python side is just `pandas` (unpinned). No LLM SDK is installed.

### Cited Findings
- Dependencies (resolved versions in package-lock.json): `react` 19.3.1, `react-dom` 19.3.1, `fuse.js` 7.5.0, `fastest-levenshtein` 1.0.16, `double-metaphone` 2.0.1 — [package.json](package.json), [package-lock.json](package-lock.json)
- devDependencies (resolved): `vite` 8.3.5, `vitest` 5.0.5, `typescript` 7.0.2, `vite-plugin-pwa` 2.0.0, `@vitejs/plugin-react` 6.1.2, `@types/react` ^19.3.0, `@types/react-dom` ^19.3.0; lockfile has 436 package entries — [package.json](package.json), [package-lock.json](package-lock.json)
- Scripts: `dev` = `vite`, `build` = `tsc --noEmit && vite build`, `preview`, `test` = `vitest run` — [package.json](package.json)
- `requirements.txt` contains only `pandas` (no version), with a comment that Python is only for `data/` cleaning and the `eval/` benchmark — [requirements.txt](requirements.txt)
- TS config: target ES2022, `strict: true`, `moduleResolution: bundler`, `jsx: react-jsx`, `resolveJsonModule: true` — [tsconfig.json](tsconfig.json)
- `.env.example` names `ANTHROPIC_API_KEY` as the only server secret, but no Anthropic/OpenAI/Gemini SDK is a dependency and `api/` is empty — [.env.example](.env.example), [package.json](package.json)
- PLAN.md says LLM extras run as Vercel serverless functions in `api/`; no `vercel.json` or `api/*` file exists — [docs/PLAN.md line 12](docs/PLAN.md), [git ls-files]

### Inferences
- Safe stack claims for the deck: "React + Vite + TypeScript PWA, deterministic in-browser engine design, fuse.js + Double Metaphone for fuzzy/phonetic matching (selected), Vitest". Claiming Vercel deployment or a specific LLM integration is not yet supported.

### Gaps
- No pinned Python versions; no Python 3.11 marker beyond PLAN.md text.

## 6. Data actually present and measured metrics

### Takeaway
No data is present: zero brands, zero ingredients with limits, zero banned-FDC rows, zero DDI rows, zero gold-set prescriptions beyond the single demo fixture, and no file anywhere carries a `source` or `pharmacist_approved` field. There are no measured metrics (accuracy, alerts per Rx, latency) in the repo.

### Cited Findings
- `data/` and `public/data/` contain only `.gitkeep`; `eval/` contains only `.gitkeep` — [data/](data/), [public/data/](public/data/), [eval/](eval/)
- `grep` for `pharmacist_approved` and `source` across all `.json`/`.csv` files (excluding node_modules and package-lock) returns no matches — [repo-wide grep]
- `.gitignore` excludes `data/raw/` and `eval/raw/`, so raw datasets would not be in git even if downloaded; neither directory exists on disk — [.gitignore](.gitignore)
- The only clinical data in the repo is the 7-line demo Rx composition table in the fixture (7 brands, 10 ingredient entries across 9 distinct ingredient IDs: paracetamol, caffeine, phenylephrine, aceclofenac, ibuprofen, aspirin, pantoprazole, domperidone, omeprazole) — [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)
- `reports/` exists on disk but is empty — [reports/](reports/)
- Target numbers that exist only as plan/research text (not measurements): "Interrupts per prescription (target <=1)"; precision/recall/F1 per alert type; brand top-1 accuracy; clean-Rx false-positive rate; time-to-check ms vs chatbot latency; run-to-run consistency — [docs/PS_ANALYSIS.md lines 226-231](docs/PS_ANALYSIS.md)
- Literature numbers in PS_ANALYSIS (e.g. ChatGPT-4 severity correct in 214/574 = 37.3%, Thapa et al. 2025; Sicard et al. 2025 fully-correct ChatGPT 66%, Claude 68%, Gemini 33%) are third-party published figures, not Parchi measurements — [docs/PS_ANALYSIS.md lines 9, 18](docs/PS_ANALYSIS.md)

### Inferences
- The deck must not show any Parchi benchmark number, alert count from a run, latency, or "pharmacist-approved limits" claim. Third-party literature numbers may be used only if attributed as such.
- The pharmacist session (PLAN.md Track D) shows no artefact in the repo (no suppression list, no approved limits, no gold labels).

### Gaps
- Whether a pharmacist session happened or any data was collected offline is unknown from the repo.

## 7. Does tests/fixtures/demo_rx.json contain the 68-year-old demo case, and what are the expected outputs?

### Takeaway
Yes. The fixture encodes the PS_ANALYSIS section 5 case (68 y, 55 kg, SCr 1.6, male) with the 7-brand typed Rx, expected resolver output for all 7 lines, expected paracetamol ledger 4,100 mg/day, and expected alerts of exactly 2 Interrupts and 3-4 Informs. Expected sig, per-alert detail and CrCl are not yet in the fixture.

### Cited Findings
- Patient: `{ "age_years": 68, "weight_kg": 55, "serum_creatinine": 1.6, "sex": "M" }` — [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)
- `rx_text`: "Dolo 650 1-1-1 x5d; Crocin cold n flu max TDS; Zerodol P BD; Brufan 400 SOS; Ecosprin 75 OD; Pan D OD; Omez 20 OD" — [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)
- Expected resolver: Dolo 650 -> paracetamol 650; "Crocin cold n flu max" -> Crocin Cold & Flu Max (paracetamol 500, caffeine 32, phenylephrine 10); "Zerodol P" -> Zerodol-P (aceclofenac 100, paracetamol 325); "Brufan 400" -> Brufen 400 (ibuprofen 400, i.e. misspelling correction); Ecosprin 75 -> aspirin 75; "Pan D" -> Pan-D (pantoprazole 40, domperidone 30); "Omez 20" -> Omez (omeprazole 20) — [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)
- `"ledger_paracetamol_mg_day": 4100` and `"alerts": { "interrupt_count": 2, "inform_min": 3, "inform_max": 4 }` — [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)
- The fixture's `_note` says "Fill in per-stage expected output as each track lands; additive only", i.e. it is incomplete by design — [tests/fixtures/demo_rx.json](tests/fixtures/demo_rx.json)
- Intended meaning of the alerts per PS_ANALYSIS: Interrupt 1 = paracetamol total 4,100 mg > 4 g limit (1,950 Dolo + 1,500 Crocin + 650 Zerodol-P); Interrupt 2 = NSAID + NSAID duplication / NSAIDs with CrCl ~34 mL/min in an elderly patient; Informs = ibuprofen-aspirin antiplatelet interaction, PPI + PPI duplication (Pan-D + Omez), domperidone in elderly; CrCl computed as (140-68)x55/(72x1.6) ~ 34 mL/min — [docs/PS_ANALYSIS.md lines 192-206](docs/PS_ANALYSIS.md)

### Inferences
- The fixture has no `confidence`, `form`, `flags` or `sig` expectations, and no expected per-alert `type`/`reason`/`source`, so even once the pipeline exists the fixture test would only check counts and the paracetamol total.
- The 4 g/day paracetamol limit used for the Interrupt is stated in research text, not in any data file with `source`/`pharmacist_approved`, contrary to the CLAUDE.md rule; a deck should cite it as "standard adult max, pending pharmacist sign-off" unless a data file is added.
- Note a nuance for the deck: the 4,100 mg figure counts Crocin "TDS" as 3 doses and treats Brufen as SOS; Dolo's "1-1-1" = 3 x 650 = 1,950. These are the plan's expected values, not computed output.

### Gaps
- Expected outputs for sig parsing (e.g. SOS max doses for Brufen), the exact alert list, and the silent log are not specified in the fixture.
