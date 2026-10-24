# UI_PLAN.md: pages and build order (Track D)

Look and tokens: `DESIGN.md`. Contracts: `src/engine/contracts.ts`. The UI calls only `checkPrescription()` (Track C) and reads data files; it never decides alerts.

## Pages
Hash routes (`#/check`), no router dependency, installable PWA. Nav = pill bar on desktop, menu button on mobile (`src/ui/route.ts`).

| Route | Page | Purpose | Built from | Status |
|---|---|---|---|---|
| `#/check` | Prescription check | Type Rx + patient, get alerts, X-ray, brand matches | `RxInput`, `PatientForm`, `PatientPrompt`, `KpiCard`, `AlertCard`, `XrayTable`, `LimitBar`, silent log | Built on mock data |
| `#/log` | Override log | Every override with reason and time, on this device | `OverrideDialog`, table, IndexedDB store | Planned |
| `#/benchmark` | Engine vs chatbots | Precision/recall per alert type, alerts per Rx, vs ChatGPT/Claude/Gemini | `KpiCard`, comparison table, bar chart from `eval/` JSON | Planned |
| `#/data` | Data and limits | Limits and suppression rules in use, with `source` and `pharmacist_approved` | Table of `public/data/*.json` | Planned |

## Check page layout
- Desktop (>= 960 px): left column 400 px sticky (Prescription, Patient), right column result.
- Mobile: one column, input first.
- Result order answers "do I need to act?" first: KPI row (Interrupt, Inform, Logged, Brands to check) -> Interrupt then Inform alerts -> X-ray -> Brand matches -> Silent log (collapsed).
- Before first check: empty state. Engine fast: no spinner under 300 ms.

## Reference: Meditec dashboard
Visual inspiration only (github.com/MandyTrl/meditec, no licence, so nothing copied; patterns rebuilt in our tokens).

| Meditec pattern | Our use |
|---|---|
| Frosted card, soft ring and shadow | `.card` |
| Pill nav with inset active state | `PillNav` |
| "Welcome," eyebrow + big title | page `.intro` |
| KPI tile with big number | `KpiCard`, tinted by tier |
| Translucent filter panel | `.workspace` panel around input and result |
| Expand-in-place card | Planned: expand a brand match to show its ingredients |
| Recharts bars, radar, pie | Not used. `LimitBar` is plain CSS; Benchmark page may add one chart |

## Build order
1. Done: tokens, shell, Check page on mock data (`src/ui/mock/demoResult.ts`).
2. Wire `checkPrescription()` when Track C lands the pipeline; delete the mock.
3. `OverrideDialog` + override log (IndexedDB) -> `#/log`.
4. Patient prompts driven by the engine (ask creatinine/weight only when needed).
5. `#/data` from the limits JSON (B) and suppression list (C).
6. `#/benchmark` from `eval/` output (D, after gold set exists).
7. Finals: demo-mode button, Hindi leaflet view, FHIR export stub.

## Open items
- Real app logo and PWA icons (`icons: []` in `vite.config.ts` today).
- Confidence threshold for "Check match" is a UI constant (0.9) until Track A defines it.
- `AlertCard` has no Acknowledge/Override action until `OverrideDialog` exists.
