# UI_PLAN.md: pages and status (Track D)

Look and tokens: `DESIGN.md`. Contracts: `src/engine/contracts.ts`. The UI calls only `runCheck()` in `src/ui/engine.ts` and reads data files; it never decides alerts.

## Pages
Hash routes (`#/check`), no router dependency, installable PWA. Pill nav on desktop, menu button on mobile (`src/ui/route.ts`).

| Route | Page | Status |
|---|---|---|
| (none) / `#/home` | Start screen: what Parchi is, Check a prescription, See a worked example (`#/demo`), how a prescription is checked. Not a nav pill (footer link "About Parchi"); the installed app opens on `#/check` (`start_url`). | Built |
| `#/check` | Prescription check: Rx + patient in, KPI row, alerts, X-ray, brand matches (expandable), silent log, FHIR draft export | Built on the real engine; look-alike picker, interaction-coverage note, customer leaflet |
| `#/demo` | Guided 5-step walkthrough of the 68-year-old case for the pitch. Runs through `runCheck`, so it turns real with the engine; every sentence is built from the result. Arrow keys work. | Built |
| `#/queue` | Review queue (Phase 2): the buyer's orders ranked by Parchi's priority, each with its suggested status, alert counts and the pharmacist's decision. Sample account until real orders are connected. | Built, on the engine's `checkHistory` |
| `#/order/<id>` | One order: a verdict (suggested status, lead finding), alerts that name the doctors and days, a timeline by doctor, X-ray by window, unverified brands, each prescription's brand matches; the decision (a different one needs a reason) in a sticky rail with kidney re-check and export in a collapsed tools panel. | Built |
| `#/history[/<id>]` | History input: customer, one prescription per doctor and date, lab results, optional FHIR import. Creates or edits an order on this device. | Built |
| `#/log` | Override log: IndexedDB, filter by tier and date, CSV export; plus the order decisions | Built, fully working |
| `#/data` | Dose limits and suppression list with `source` and approval status | Built, waits for B/C files |
| `#/benchmark` | Engine vs chatbots: alerts per Rx, precision/recall per alert type, draft-label notice | Built, reads `public/data/benchmark.json` from `npm run eval` |

Check page: desktop left column 400 px sticky (Prescription, Patient), result on the right; mobile one column. Result order: KPI row -> Interrupt then Inform alerts -> X-ray -> Brand matches -> Silent log (collapsed). Age is required; weight and creatinine appear only when the engine asks (`prompts`).

## Hooks for other tracks
| What | Who | Detail |
|---|---|---|
| Real engine | A, B, C | Done: `src/ui/engine.ts` calls `createPipeline` with Track A's resolver, B's `parseSig` and `computeDose`, C's rules and `alert_rules.json`. B's `needs` become the patient prompts, and its CrCl and notes ride along on the result. `createCheck(deps)` takes its data as arguments so tests run it without a network. When C wires B into the pipeline itself, swap the body for `checkPrescription`. |
| `prompts` | C | Proposed additive field on the check result: `{field: 'weight_kg' \| 'serum_creatinine', reason: string}[]`. The UI never decides when to ask. |
| Dose limits and SOS caps | B | `src/engine/limits/limits.json` (imported, not fetched): `{_meta, sos, ingredients}`, each value with `source` and `pharmacist_approved`. The Data page lists them via `src/ui/lib/policyRows.ts`; the X-ray shows the applied limit's basis and source from the ledger entry. |
| Alert rules and suppression list | C | `public/data/alert_rules.json`: budget, interaction tiers, duplicate classes, patient rules, suppression list. The Data page reads it; an unreadable file is said so and never shown as empty rules. |
| `public/data/benchmark.json` | D (`eval/`) | `{n_rx, kappa, systems: [{name, alerts_per_rx, interrupts_per_rx, clean_fp_rate, by_type: {<alert type>: {precision, recall}}}]}`. First system named engine/parchi is the headline. |
| Needs pharmacist | A | The "Check match" badge follows A's `needs_pharmacist`; confidence below 0.9 is only a fallback when the field is absent (`src/ui/lib/resolved.ts`). A spelling-corrected match shows "Corrected spelling" unless A flags it. |
| Override reasons | pharmacist | Starter list in `OverrideDialog.tsx`; replace after the session. |

Missing data files show an empty state naming the file and owner. Nothing is invented or sampled.

## Reference: Meditec dashboard
Visual inspiration only (github.com/MandyTrl/meditec, no licence, so nothing copied; patterns rebuilt in our tokens): frosted cards, pill nav with inset active state, "Welcome," eyebrow + big title, big-number KPI tiles, translucent panel, expand-in-place cards. Recharts is not used; `LimitBar` and `MetricBar` are plain CSS.

## Left to do
- Run the pharmacist session; put real reasons, limits and suppression rules into the files above, and have the gold-set labels reviewed.
- Save chatbot answers in `eval/outputs/` (see `eval/README.md`) so the benchmark page compares systems; add a second rater for kappa.
- Jan Aushadhi savings: the product list has no prices, so there is nothing to show yet.
- Recall banner: banned-FDC and failed-batch (NSQ) alerts already show as alert cards; a separate banner would repeat them.
- Finals: ABDM-profiled FHIR (the export is a plain collection that round-trips through our import, not validated against the NRCeS profile).
- Dark mode and per-language UI are out of scope.
