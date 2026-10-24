# UI_PLAN.md: pages and status (Track D)

Look and tokens: `DESIGN.md`. Contracts: `src/engine/contracts.ts`. The UI calls only `runCheck()` in `src/ui/engine.ts` and reads data files; it never decides alerts.

## Pages
Hash routes (`#/check`), no router dependency, installable PWA. Pill nav on desktop, menu button on mobile (`src/ui/route.ts`).

| Route | Page | Status |
|---|---|---|
| (none) / `#/home` | Start screen: what Parchi is, Check a prescription, See a worked example (`#/demo`), how a prescription is checked. Not a nav pill (footer link "About Parchi"); the installed app opens on `#/check` (`start_url`). | Built |
| `#/check` | Prescription check: Rx + patient in, KPI row, alerts, X-ray, brand matches (expandable), silent log, FHIR draft export | Built, runs on mock engine output |
| `#/demo` | Guided 5-step walkthrough of the 68-year-old case for the pitch. Runs through `runCheck`, so it turns real with the engine; every sentence is built from the result. Arrow keys work. | Built |
| `#/log` | Override log: IndexedDB, filter by tier and date, CSV export | Built, fully working |
| `#/data` | Dose limits and suppression list with `source` and approval status | Built, waits for B/C files |
| `#/benchmark` | Engine vs chatbots: alerts per Rx, precision/recall per alert type | Built, waits for `eval/` output |

Check page: desktop left column 400 px sticky (Prescription, Patient), result on the right; mobile one column. Result order: KPI row -> Interrupt then Inform alerts -> X-ray -> Brand matches -> Silent log (collapsed). Age is required; weight and creatinine appear only when the engine asks (`prompts`).

## Hooks for other tracks
| What | Who | Detail |
|---|---|---|
| Real engine | C | Brand matching is already real (Track A's resolver, loaded in `src/ui/engine.ts`). Dosing, totals and alerts are mock for the demo case only; any other prescription shows its brand matches and "totals and alerts not available yet". In `src/ui/engine.ts`, replace the body of `runCheck` with `checkPrescription(rxText, patient)`; delete `src/ui/mock/` and set `isMock = false`. The demo case itself (`src/ui/demoCase.ts`) stays. |
| `prompts` | C | Proposed additive field on the check result: `{field: 'weight_kg' \| 'serum_creatinine', reason: string}[]`. The UI never decides when to ask. |
| `public/data/limits.json` | B | Array (or object wrapping one) of `{ingredient, population?, max_mg_day, source, pharmacist_approved}`. Reader is tolerant of field names (`src/ui/lib/dataFiles.ts`). |
| `public/data/suppression.json` | C | Array of `{ingredients \| rule, reason?, source, pharmacist_approved}`. |
| `public/data/benchmark.json` | D (`eval/`) | `{n_rx, kappa, systems: [{name, alerts_per_rx, interrupts_per_rx, clean_fp_rate, by_type: {<alert type>: {precision, recall}}}]}`. First system named engine/parchi is the headline. |
| Needs pharmacist | A | The "Check match" badge follows A's `needs_pharmacist`; confidence below 0.9 is only a fallback when the field is absent (`src/ui/lib/resolved.ts`). A spelling-corrected match shows "Corrected spelling" unless A flags it. |
| Override reasons | pharmacist | Starter list in `OverrideDialog.tsx`; replace after the session. |

Missing data files show an empty state naming the file and owner. Nothing is invented or sampled.

## Reference: Meditec dashboard
Visual inspiration only (github.com/MandyTrl/meditec, no licence, so nothing copied; patterns rebuilt in our tokens): frosted cards, pill nav with inset active state, "Welcome," eyebrow + big title, big-number KPI tiles, translucent panel, expand-in-place cards. Recharts is not used; `LimitBar` and `MetricBar` are plain CSS.

## Left to do
- Swap mock for the real engine (needs C's `pipeline.ts`).
- Show B's sig `assumptions` and `confidence`, ledger `caveats` and `needs` once `dev/track-b` is on main.
- Interaction coverage: once C's alerts exist, list the ingredients the interaction data does not cover ("no hit" is not "safe").
- Run the pharmacist session; put real reasons, limits and suppression rules into the files above.
- Produce `benchmark.json` from `eval/` (needs the gold set).
- Optional: Jan Aushadhi savings, look-alike picker, recall banner (each needs Track A data).
- Finals: Hindi leaflet (online only, via B's `api/`), ABDM-profiled FHIR (current export is a draft stub).
- Dark mode and per-language UI are out of scope.
