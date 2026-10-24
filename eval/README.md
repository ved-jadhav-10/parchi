# eval/: the benchmark

Measures the engine and, when their answers are saved here, general chatbots on the same prescriptions.

| File | What |
|---|---|
| `gold.json` | 54 cases (44 single prescriptions, 10 multi-doctor histories, 13 clean). Built by `build_gold.mjs`; each case has a `why` |
| `engine.test.ts` | `npm test` checks the gold file; `npm run eval` also runs the engine over it |
| `outputs/<system>.json` | One system's alerts per case: `{"S01": {"alerts": [{"type", "tier", "ingredients"}], "ms": 12}}` |
| `score.py` | Scores every file in `outputs/` and writes `public/data/benchmark.json` and `report.md` (misses and extras per system) |
| `chatbots.py` | Writes the prompts for a chatbot, or asks Claude through the API |
| `test_eval.py` | pytest for the scripts |

## Run it

```
npm run eval                   # engine over the gold set, then score.py -> public/data/benchmark.json, eval/report.md
py -m venv .venv && .venv/Scripts/python.exe -m pip install pytest   # once; .venv is git-ignored
.venv/Scripts/python.exe -m pytest eval -q
```

## Add a chatbot

1. `py eval/chatbots.py prompts` writes `eval/prompts/S01.txt` ... (git-ignored). Each tells the chatbot to answer with JSON only.
2. Paste each prompt into a **fresh** chat of ChatGPT, Gemini or Claude, and collect the replies into `eval/outputs/chatgpt.json` (or `gemini.json`, `claude.json`) in the form above. `type` may be one of the gold groups; `tier` is `interrupt` or `inform`.
   Or, for Claude: `ANTHROPIC_API_KEY=... py eval/chatbots.py claude` (model from `EVAL_MODEL`, default `claude-sonnet-5-5`) writes `outputs/claude.json`.
3. `npm run eval`. A system appears in the benchmark only if its file exists; nothing is estimated.

## How scoring works

- Only alerts a pharmacist would see (tier `interrupt` or `inform`) count; `silent` is a log.
- An alert is right when it is in the same group as an expected alert and shares an ingredient with it. Raw engine types map to groups through `meta.alert_groups` in `gold.json`. Ingredient names are mapped to canonical ids with the Track A alias tables, so "chlorpheniramine" and "acetaminophen" match.
- A second alert for something already caught is noise (it raises alerts per Rx) but is not counted as a wrong alert.
- False alarms on clean Rx = share of the clean cases where the system showed any alert.
- Kappa is computed only if `eval/second_rater.json` exists (a second person's labels in the same form as `outputs/`); otherwise it is left empty.

## Limits to say out loud

- The gold labels are a **draft**: written by the developer from drug labels and guidelines, not yet reviewed by a pharmacist. A pharmacist review (and a second rater for kappa) is what turns this into a validation.
- The cases were written with the engine's scope in mind, so a high engine score shows it does what it claims, not that it catches everything a pharmacist would.
- Where the engine misses a case, `report.md` says which. At the time of writing: ACE inhibitor + spironolactone and ARB + ACE inhibitor, because DDInter's bulk files do not cover cardiovascular drug groups.
