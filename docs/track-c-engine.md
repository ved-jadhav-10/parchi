# Track C: rules, alerts, pipeline and history check (how to use it)

Owner: Track C (`src/engine/rules/`, `alerts/`, `history/`, `pipeline.ts`, `wiring.ts`, `public/data/alert_rules.json`).

## Use it (Track D UI)

```ts
import { createRealEngine } from './engine/wiring'
import { loadAlertRules } from './engine/rules'
const { check, checkHistory } = createRealEngine({ resolver, ddi, rules: await loadAlertRules() }) // resolver, ddi: Track A
```

**One prescription:** `const { lines, ledger, alerts, needs, crcl, notes } = await check(rxText, patient)`. Alerts are sorted interrupt, inform, silent. `needs` = patient fields still to ask for (`weight_kg`, `serum_creatinine`, `sex`), only because a drug on the Rx needs them. `notes` = what Track B left out of the totals.

**A customer's history (Phase 2):**

```ts
const result = await checkHistory(prescriptions, patient, labs, { asOf: '2026-10-08', previous })
// result.alerts (with .window, .doctors, .rx_ids, .cross_doctor), .windows, .ledger (worst overlap), .lines (rx_id, doctor, start, end)
// result.status: clear | clear_with_note | hold_contact_doctor      result.priority: higher = review first
// result.changes: {added, cleared, changed} against `previous` (e.g. after a new creatinine)   result.needs, result.creatinine_used
import { rankQueue, fhirToHistory } from './engine/history'
rankQueue(orders.map((o) => ({ id: o.id, date: o.date, priority: o.result.priority, result: o.result })))  // adds .rank
const { prescriptions, labs, warnings } = fhirToHistory(bundlesOrOneBundle)                                 // ABDM FHIR R4
```

`prescriptions` / `labs` are contracts 5 and 6 (`{id, doctor, date, text}`, `{type:'serum_creatinine', value, date}`). Fixtures: `tests/fixtures/demo_history.json` (3 doctors, 3 orders, creatinine arriving later, with expected statuses and queue order) and `fhir_prescriptions.json` (hand-written, not an official NRCeS sample).

How it works:
- Each line runs from its Rx date for its sig duration (`x10d`); no duration = `history.default_window_days` (30, unverified; the line says `default_window: true`). End is exclusive.
- The order under review is `asOf` (default: latest Rx). Later prescriptions are ignored; the timeline runs from `asOf` (`from` can start earlier to show past overlaps). It is cut at every start and end; B's `computeDose` and all rules run per window, so doses add up only for medicines taken together. An alert seen in several windows is reported once, from its worst window, with `window` = the whole span it holds.
- Cross-doctor: reasons name each brand with doctor and date; `cross_doctor`, `doctors`, `rx_ids` are set. A same-ingredient "in 2 brands" alert is dropped where a dose-excess alert already names the brands.
- Creatinine: the latest `serum_creatinine` lab (by date, even if after `asOf`, so a late result re-checks an open order) overrides the patient's value. Pass the old result as `previous` for the "what changed" diff. Patient rules (e.g. `nsaid_renal`) are keyed by rule, so one NSAID ending does not split the alert.
- Unknown brand: `unresolved` alert shows the closest candidate composition and its score, `unverified: true`; it is left out of totals. `confirmations: {'rx-3#1': 'Dolo 650'}` re-resolves a line once the pharmacist confirms.
- Status comes from the worst tier (an Interrupt demoted by the budget still counts as a hold). Priority = tier weight + type bonus + cross-doctor bonus, from `alert_rules.json` (`history.queue`). Ties: oldest order first.

## Track B wiring

`wiring.ts` injects B's `parseSig` and `computeDose`; `pipeline.ts` itself still takes them as deps (`rules/testing.ts` has stand-ins for fast unit tests). B's facts become alerts via `dose_policy` in `alert_rules.json`: `over_limit` = `dose_excess` Interrupt from the ledger limit (SOS-only excess = `dose_excess_sos`, Inform); `renal_avoid` / `renal_caution` for drugs the patient rules do not already cover (so `nsaid_renal` is not raised twice); notes `schedule_mismatch` (weekly drug read as daily, Interrupt), `unquantified_volume` / `unquantified_dose` (Inform, `total_incomplete` risk); `sig_unclear` (sig confidence < 0.7). One CrCl for the engine: B's (adults only; needs weight, creatinine and sex).

## Alert types

| type | tier | from |
|---|---|---|
| `dose_excess` / `dose_excess_sos` | interrupt / inform | ledger total > `limit_mg_day` (limit basis and approval come from B) |
| `duplicate_ingredient`, `class_duplication` | inform | same ingredient or class in 2+ brands (not inside one FDC) |
| `ddi` | inform (major), silent (moderate) | DDInter, tier from `alert_rules.json` |
| `nsaid_renal`, `domperidone_elderly`, `beers_*` | per rule | `patient_rules` (CrCl, age, class) |
| `anticholinergic_burden`, `cns_stacking` | inform | `burden_scales`: summed scores across ingredients, 65+ |
| `renal_avoid`, `renal_caution`, `schedule_mismatch`, `sig_unclear` | per `dose_policy` | Track B findings and notes |
| `input_needed` | inform | a kidney rule applies but weight, creatinine or sex is missing (one alert) |
| `banned_fdc` | interrupt (inform if `certain: false`) | resolver flag, S.O. number as source |
| `nsq` | inform if spurious, else silent | resolver flag |
| `lasa`, `low_confidence`, `unresolved` | inform | resolver |
| `discontinued` | silent | resolver flag |

Pairs or classmates that only meet inside one combination brand do not alert. Non-systemic lines (gels, drops) are ignored. DDInter has gaps (`ddi.covers(id)`): "no alert" is not "no interaction". Alert confidence = weakest brand match behind it. Optional `Alert` fields: `brands`, `approved` (false = draft), `suppressed`, `budget_demoted`, `caveats`, `doctors`, `rx_ids`, `cross_doctor`, `window`, `unverified`.

## Policy lives in `public/data/alert_rules.json`

Alert budget (2 Interrupts per check), DDI map, duplicate classes, patient rules (incl. Beers 65+: sedating antihistamines, benzodiazepines, Z-drugs), burden scales (ACB subset, CNS stacking), dose policy, history/queue policy, suppression list. Every entry has `source` and `pharmacist_approved: false`. The suppression list quiets Inform/Silent only, never an Interrupt. The ACB scores are a starter subset and the CNS class list is ours: both need the pharmacist's check against the published tables.

## Not built

AWaRe antibiotic checks (Finals), FHIR export (D, Finals), history in `api/check` (B), refill-overlap smoothing (a refill collected a few days early reads as a duplicate), paediatric kidney checks (B has no formula), Beers criteria beyond the three classes and the CNS/ACB stacking, duration words the sig parser misses (default window applies).

## Open pharmacist questions (PS_ANALYSIS section 4)

CrCl threshold for NSAIDs (draft 60), domperidone age (65), which DDI pairs are Interrupt (Q6), the real suppression list (Q4), Interrupt budget, default window for a line with no duration (30), whether `schedule_mismatch` is an Interrupt, queue weights, ACB scores and CNS class list.
