# Track B: sig parser, ledger and limits (how to use it)

Owner: Track B (`src/engine/sig/`, `ledger/`, `limits/`, `api/`). Deterministic and offline; only `api/parse-sig.ts` is online.

## Use it (Track C pipeline, Track D UI)

```ts
import { parseSig } from './engine/sig'
import { computeDose } from './engine/ledger'

const lines = resolver.resolveText(rxText, { age_years: patient.age_years })       // Track A
  .map((l) => ({ resolved: l.resolved, sig: parseSig(l.sig_text) }))
const dose = computeDose(lines, patient, { classesOf: (id) => resolver.ingredient(id)?.classes })
// dose.ledger    mg/day per ingredient (contract Ledger) with limit_mg_day for THIS patient
// dose.findings  facts for alerts: over_limit | renal_avoid | renal_caution (each with source + pharmacist_approved)
// dose.needs     patient fields still missing, asked only because a drug on this Rx needs them
// dose.crcl      Cockcroft-Gault mL/min or null
// dose.notes     what was left out or assumed (unresolved line, IU strength, topical, SOS cap assumed ...)
```

`parseSigSmart(text)` (online fallback) is async: rules first, and only if they are unsure (confidence below 0.7) and the browser is online does it call `/api/parse-sig`. Use it for the live input; `parseSig` for tests and offline. Quota protection: each distinct text is sent once (answers and failures are remembered), at most 20 calls per page session (`resetSigSmartState()` clears both). The server uses Gemini when `GEMINI_API_KEY` is set (model `GEMINI_MODEL`, default `gemini-3.5-flash-lite`; Google retires model names quickly, so change it if calls start returning 404), else Anthropic. Only the sig text is sent. The model returns a few numbers; `validateLlmFields` rejects anything implausible, a scheduled line with no frequency, or zero doses, and then the rules result stays (low confidence, flagged).

## Sig fields (contract `Sig` plus optional detail)

| Field | Meaning |
|---|---|
| `doses_per_day` | unit doses per day: `1-0-1` = 2, `2 tab TDS` = 6, `½-0-½` = 1. Weekly = 1/7. **SOS = 0** |
| `max_doses_per_day` | worst case. Equals `doses_per_day` for scheduled lines; for SOS it is the written maximum (`SOS max 3`, `SOS TDS`) |
| `sos`, `sos_cap_unspecified` | `SOS` with no written maximum: the ledger takes the cap from `limits.json` (ingredient, then class, then fallback) |
| `volume_ml_per_dose`, `dose_unit` | liquids: `5 ml`, `1 tsp` (5 mL), `1 tbsp` (15 mL). Drops and puffs are not converted to mg |
| `confidence`, `assumptions`, `unparsed` | below 0.7 means something was assumed or not understood; show `assumptions` to the pharmacist |

Rules worth knowing: dotted Latin forms (`b.i.d.`, `t.d.s.`, `q.i.d.`, `p.r.n.`), `qod`/`eod` (every other day) and `qwk` are read; "for a week" is a duration, not weekly dosing; course lengths can be ranges (`x 3-5 days` uses 5) or British shorthand (`x 5/7`, `2/52`, `1/12`), and "till finished", "then stop" and "and review" add no dose; a range (`1-2 tab TDS`) uses the upper end; several phases (`2 tab stat then 1 tab TDS`, tapers) use the highest daily phase; no dosing written = once daily at confidence 0.4; meal words (`AC`, `khane ke baad`, `breakfast`) are ignored; weekly and monthly sigs are 1/7 and 1/30 per day.

## Ledger rules

- Every ingredient is summed across all brands. `total_mg_day` = `scheduled_mg_day` + `sos_mg_day` (SOS at worst case). A finding with `sos_dependent: true` means only the SOS worst case crosses the limit.
- Left out of the total and reported in `notes`, never counted as 0: ingredients with no mg strength (IU, % w/w), oral liquids whose strength has no stated volume (`unquantified_volume`, e.g. Wikoryl and Sinarest Paediatric drops), dosing written in drops/puffs, topical/eye/ear/nasal products, unresolved lines.
- Liquids: mg = strength x mL per day / `per_volume_ml`. No volume written = one measure per dose assumed (note `assumed_measure`).
- `schedule_mismatch` note (Track A `schedule_hint`): a weekly or monthly drug (methotrexate, alendronate 70 mg, ibandronate 150 mg) whose sig reads daily, or has no sig. The total still counts what was written; Track C should raise it as an alert candidate.
- `per_volume_assumed` (Track A inferred the usual per-5-mL syrup strength) adds a caveat on the entry.
- `caveats` on an entry: incomplete composition, uncertain brand match, assumed dosing, assumed SOS cap. Show them next to the total.

## Limits (`src/engine/limits/limits.json`)

Clinical numbers are data, not code. **Every value is `pharmacist_approved: false`** (11 ingredients: adult, 65+, paediatric mg/kg, kidney bands, SOS caps) and its `source` says so. Show limits as unverified until the pharmacist session; then edit the file and set the flag. Kidney rules need CrCl, so creatinine, weight and sex are requested only when an ingredient with a kidney rule is on the prescription; weight only for a child on a weight-dosed drug. Children under 12 with no paediatric entry get no limit (the adult limit is not borrowed) and a caveat.

`LimitFinding.kind` is a fact, not a tier. Suggested mapping for Track C: `over_limit` (not `sos_dependent`) and `renal_avoid` = Interrupt candidates; `renal_caution` and `sos_dependent` = Inform.

## Phase 2

**Wire me into the pipeline (Track C).** `createDoseDeps(resolver)` returns exactly what `createPipeline` injects, plus `computeDose` for the findings and questions the interface cannot carry:

```ts
const d = createDoseDeps(resolver)
const check = createPipeline({ resolver, ddi, rules, parseSig: d.parseSig, buildLedger: d.buildLedger })
```
`src/engine/ledger/pipeline.test.ts` runs C's pipeline on this and reproduces the fixture (4,100 mg, 2 Interrupts, 3-4 Informs).

**Dated lines and overlap windows** (`windows.ts`, pure functions, shapes match PLAN contracts 5-6 without needing them frozen):
- `lineWindow(rxDate, sig)`: start = Rx date, end = start + `duration_days` - 1 (inclusive); no duration = `limits.json` `windows.default_duration_days` (30, unverified) with `duration_assumed: true`.
- `cutSegments(spans)`: cuts the timeline at every start/end; each segment has one fixed set of active lines.
- `patientAsOf(patient, labs, date)`: latest `serum_creatinine` on or before the date.
- `computeDoseByWindow(items, patient, labs)`: runs `computeDose` per window (a lab date inside an overlap starts a new window, so a kidney re-check applies from that day), returns `windows[]` (each with its `dose` and `assumed_duration_ids`), `worst` (most over-limit findings, then highest total/limit) and `skipped` ids (bad date). Windows are also what C needs for "what changed" after a re-check: run it with and without the new lab and diff the findings.

**Kidney bands:** 34 ingredients now have limit data (23 added: 6 more NSAIDs, nitrofurantoin, spironolactone, fluoroquinolones, gabapentin, pregabalin, allopurinol, tramadol, cefixime, sitagliptin, famotidine, metoclopramide, baclofen, colchicine, sulfamethoxazole, digoxin). All `pharmacist_approved: false`; sources say "usual labelled adjustment, not yet checked against the Indian label". More drugs on a prescription now trigger the creatinine/weight/sex question.

**`api/check`** (header `x-api-key`; keys in `CHECK_API_KEYS`, none set = 503) has two modes over the same engine:
- one prescription: `{ rx_text, patient }` returns `alerts`, `lines`, `ledger`, `findings`, `needs`, `crcl_ml_min`, `notes`;
- a customer's history (Track C's `checkHistory`): `{ prescriptions: [{id, doctor, date, text}], patient, labs?, as_of?, from?, confirmations? }`, or `{ fhir: <ABDM Bundle | Bundle[]>, patient, ... }`, returns C's `HistoryResult` (alerts with doctors/dates/window, `windows`, worst-overlap `ledger`, `status`, `priority`, `creatinine_used`, `needs`) plus `import_warnings` for FHIR resources it could not use. `confirmations` (`{"rx-3#1": "Dolo 650"}`) resolves an unrecognised brand once the pharmacist confirms it. Validation lives in `ledger/requests.ts` (25 prescriptions, 50 labs, 2,000 characters and 30 lines per Rx, real ISO dates, unique ids, 200 KB body); errors never leak internals. Not built: the review-queue endpoint (`rankQueue` is for the UI), usage metering.

**Rate limits** (`api/_rateLimit.ts`, in memory per serverless instance, so they stop bursts and casual abuse, not a distributed attacker; put Vercel KV or the platform firewall in front for a hard guarantee): `parse-sig` has no login, so it is capped per client (`SIG_RATE_PER_MIN`, default 10) and overall (`SIG_RATE_PER_HOUR`, default 300) to protect the model quota; `check` is capped per valid key (`CHECK_RATE_PER_MIN`, default 120; wrong keys are not counted). Over the limit = 429 with `Retry-After`.

## How it is tested (`npm test`)

Track B files: 100% line and 96% branch coverage. Beyond unit tests: 20,000 random sigs plus unicode noise and regex-blow-up inputs (`sig/fuzz.test.ts`); property tests against a day-by-day reference (order independence, additivity, TDS = BD + OD, "over-limit iff total > limit", a frailer patient never gets a looser limit, window cutting) in `ledger/properties.test.ts`; a sweep of ~96,000 dose calculations over 4,569 real brands where nothing may throw, go NaN or vanish without a note (`ledger/sweep.test.ts`); Track C's pipeline on B's real functions (`ledger/pipeline.test.ts`); `api/check` and `api/parse-sig` over a real HTTP server and the live Gemini API (run by hand, not in CI). Mutation checks: breaking the CrCl factor, SOS maths, window edges, summing, or limit choice makes tests fail.

## Not built

Paediatric kidney function (needs a `height_cm` on Patient, labels in C's `INPUT_LABEL` records, a height field in D's UI and pharmacist-set paediatric bands), ideal-body-weight CrCl, Devanagari sigs, `x5` with no unit, "after meals 1 then 2" style meal-specific doses, drops/puffs to mg, rate limiting on `api/parse-sig`. The LLM fallback was checked live on 14 texts with `gemini-3.5-flash-lite` (correct on the readable ones; it refused "as per doctor's advice" and a prompt-injection text after the schema fix); it has no server-side rate limiting, so protect the deployed endpoint before sharing the URL. Speed: sig + ledger + limits take about 0.09 ms for the 7-line demo prescription (Track A's resolver about 2.5 ms).
