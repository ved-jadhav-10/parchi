# Track C: rules, alerts and pipeline (how to use it)

Owner: Track C (`src/engine/rules/`, `src/engine/alerts/`, `src/engine/pipeline.ts`, `public/data/alert_rules.json`).

## Use it (Track D UI)

```ts
import { createPipeline } from './engine/pipeline'
import { loadAlertRules } from './engine/rules'
const check = createPipeline({ resolver, ddi, rules: await loadAlertRules(), parseSig, buildLedger }) // parseSig/buildLedger: Track B
const { lines, ledger, alerts } = await check(rxText, patient)   // alerts are sorted: interrupt, inform, silent
```

`neededInputs(ctx)` (from `./engine/rules`) says which patient fields to ask for (`serum_creatinine`, `weight_kg`), only when a drug on the Rx needs them.

## What B must provide (injected, so no import of B's internals)

- `parseSig(sigText, resolved) -> Sig` (contract 2)
- `buildLedger(lines, patient) -> Ledger` (contract 3). `limit_mg_day` must be set for this patient where a limit exists; with no limit the dose rule stays silent (unknown is not safe).

`src/engine/rules/testing.ts` has throwaway stand-ins for both, used only by tests.

## Alert types

| type | tier | from | source chip |
|---|---|---|---|
| `dose_excess` | interrupt | ledger total > `limit_mg_day` | limit table |
| `duplicate_ingredient` | inform | same ingredient in 2+ brands, under the limit | ledger |
| `class_duplication` | inform | 2+ ingredients of a class in different brands | class rule |
| `ddi` | inform (major), silent (moderate) | DDInter, tier from `alert_rules.json` | `DDInter20 / DDInter900` |
| `nsaid_renal`, `domperidone_elderly` | per rule | `patient_rules` (CrCl via Cockcroft-Gault, age) | rule source |
| `input_needed` | inform | a renal rule applies but weight/creatinine is missing | rule source |
| `banned_fdc` | interrupt (inform if `certain: false`) | resolver flag | `S.O. 3385(E) (02.08.2024)` |
| `nsq` | inform if spurious, else silent | resolver flag | `CDSCO NSQ/spurious list JUL-2026` |
| `lasa`, `low_confidence`, `unresolved` | inform | resolver | Brand resolver |
| `discontinued` | silent | resolver flag | Brand dataset |

Rules that do not fire: pairs or classmates that only meet inside one combination brand, non-systemic lines (gels, drops), DDInter `minor`/`unknown`. DDInter has gaps (`ddi.covers(id)`); "no alert" is not "no interaction" for aceclofenac, domperidone and others.

Alert confidence = the weakest brand-match confidence behind it. Optional `Alert` fields: `brands`, `approved` (false = draft rule), `suppressed` (suppression-list id), `budget_demoted`.

## Policy lives in `public/data/alert_rules.json`

Alert budget, DDI severity to tier map, duplicate classes, patient rules and the suppression list. Every entry has `source` and `pharmacist_approved`, all `false` today. The suppression list can quiet Inform/Silent noise but never an Interrupt. The budget (`max_interrupts_per_rx`, 2 because the demo Rx needs two) demotes the lowest-priority extra Interrupts to Inform with `budget_demoted: true`.

## Open pharmacist questions (PS_ANALYSIS section 4)

CrCl threshold for NSAIDs (draft 60), domperidone age (draft 65), which DDI pairs are Interrupt (Q6), the real suppression list (Q4), Interrupt budget.
