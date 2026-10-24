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

Rules worth knowing: dotted Latin forms (`b.i.d.`, `t.d.s.`, `q.i.d.`, `p.r.n.`), `qod`/`eod` (every other day) and `qwk` are read; "for a week" is a duration, not weekly dosing; a range (`1-2 tab TDS`) uses the upper end; several phases (`2 tab stat then 1 tab TDS`, tapers) use the highest daily phase; no dosing written = once daily at confidence 0.4; meal words (`AC`, `khane ke baad`, `breakfast`) are ignored; weekly and monthly sigs are 1/7 and 1/30 per day.

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

## Not built

Paediatric kidney function (Schwartz), ideal-body-weight CrCl, Devanagari sigs, `x5` with no unit, "after meals 1 then 2" style meal-specific doses, drops/puffs to mg, rate limiting on `api/parse-sig`. The LLM fallback was checked live on 14 texts with `gemini-3.5-flash-lite` (correct on the readable ones; it refused "as per doctor's advice" and a prompt-injection text after the schema fix); it has no server-side rate limiting, so protect the deployed endpoint before sharing the URL. Speed: sig + ledger + limits take about 0.09 ms for the 7-line demo prescription (Track A's resolver about 2.5 ms).
