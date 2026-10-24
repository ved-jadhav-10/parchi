# Parchi

Indian brand-name prescription safety checker (HYPNEXIS HM-02) for the verifying pharmacist at e-pharmacies and pharmacy chains. Offline-capable PWA plus a check API.

Read `CLAUDE.md` then `docs/PLAN.md`.

```
npm install
npm run dev      # local app
npm test         # vitest
npm run build    # typecheck + production build
```

## Setup

Needs Node 20+ (Python 3.11 only to rebuild data or run the benchmark). After pulling, run `npm install` (or `npm ci` on a fresh clone): dependencies change between merges (the review desk added `lenis`).

`npm test` and `npm run build` need no keys or network. The two serverless functions need environment variables, set in a local `.env` (gitignored, copy `.env.example`) or in Vercel:

| Variable | Used by | Effect |
|---|---|---|
| `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`), `GEMINI_MODEL` | `api/parse-sig` | online reading of messy sigs; no key = the function answers 503 and the app uses its offline rules |
| `CHECK_API_KEYS` | `api/check` | buyer JSON API; no key = closed (503) |
| `SIG_RATE_PER_MIN`, `SIG_RATE_PER_HOUR`, `CHECK_RATE_PER_MIN` | both | optional rate limits |

`api/check` needs `public/data/**` bundled when deployed (see the header of `api/check.ts`). The service worker precaches about 3 MB, so the first load needs a connection; after that the app works offline.

