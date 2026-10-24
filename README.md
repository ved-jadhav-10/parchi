# Parchi

Indian brand-name prescription safety checker (HYPNEXIS HM-02) for the verifying pharmacist at e-pharmacies and pharmacy chains. Offline-capable PWA plus a check API.

Read `CLAUDE.md` then `docs/PLAN.md`.

```
npm install
npm run dev      # local app
npm test         # vitest
npm run build    # typecheck + production build
npm run eval     # benchmark: engine over eval/gold.json, then score into public/data/benchmark.json (see eval/README.md)
```

## Setup

Needs Node 20+ (Python 3.11+ only to rebuild data or score the benchmark: `py -m venv .venv`, then `.venv/Scripts/python.exe -m pip install -r requirements.txt`; tests with `python -m pytest data/tests eval`). After pulling, run `npm install` (or `npm ci` on a fresh clone): dependencies change between merges (the review desk added `lenis`).

`npm test` and `npm run build` need no keys or network. The three serverless functions need environment variables, set in a local `.env` (gitignored, copy `.env.example`) or in Vercel:

| Variable | Used by | Effect |
|---|---|---|
| `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`), `GEMINI_MODEL` | `api/parse-sig`, `api/leaflet` | online reading of messy sigs and the customer leaflet; no key = the function answers 503 and the app uses its offline rules (the leaflet button says it is not set up) |
| `CHECK_API_KEYS` | `api/check` | buyer JSON API; no key = closed (503) |
| `SIG_RATE_PER_MIN`, `SIG_RATE_PER_HOUR`, `LEAFLET_RATE_PER_MIN`, `LEAFLET_RATE_PER_HOUR`, `CHECK_RATE_PER_MIN` | each function | optional rate limits |

`api/check` needs `public/data/**` bundled when deployed (see the header of `api/check.ts`). The service worker precaches about 3 MB, so the first load needs a connection; after that the app works offline.

