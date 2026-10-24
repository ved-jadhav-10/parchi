<div align="center">

<img src="public/logo.svg" alt="Parchi" width="88" />

# Parchi

**Indian brand-name prescription safety checker**

HYPNEXIS '26 · Problem Statement HM-02 · Team Plot Armor

**[Live demo: parchi-lake.vercel.app](https://parchi-lake.vercel.app/)**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-PWA-646CFF?logo=vite&logoColor=white)
![Offline](https://img.shields.io/badge/works-offline-2E7D32)

</div>

---

## The problem

Indian prescriptions are written in **brand names**, not ingredients. One brand hides several drugs, and three brands on one prescription can quietly add up to a double dose of the same ingredient. Patients also see several doctors, and no one of them sees the whole picture. The pharmacist is the last person who can catch it, and has seconds per order.

## What Parchi does

Parchi reads a prescription or cart written the way Indian doctors write it, and shows the verifying pharmacist what needs attention.

- **Brand to ingredients.** Fuzzy and phonetic matching on Indian brands, so "Dolo 650" and common misspellings resolve to a composition.
- **Sig to doses per day.** Understands `OD`, `BD`, `1-0-1`, `x5d`, `SOS` and Hinglish.
- **The hidden total.** Adds every ingredient across brands and compares it with a daily limit for the patient.
- **Duplicates and interactions.** Same ingredient twice, drug-drug interactions, allergy and banned-combination checks.
- **Many doctors, one customer.** Merges a customer's prescriptions into one timeline and re-checks when a new kidney value arrives.
- **Ranked alerts and queue.** Three tiers (Interrupt, Inform, Silent), and a review queue ordered by what needs attention first.
- **Unverified brands.** An unknown brand is shown with its closest matches and kept out of the totals until the pharmacist confirms it.

> **Parchi informs, the pharmacist decides.** Every alert shows its reason and its source. The wording never says "safe" or "approved", and every decision and override is logged.

## Who it is for

The verifying pharmacist at an e-pharmacy or pharmacy chain. Doctors are never users. Parchi takes structured lines from the buyer (cart or digitised prescription), so there is no OCR, and it imports and exports CSV and FHIR R4.

## How it works

| | |
|---|---|
| **Deterministic engine** | Every alert comes from rules and data, so the same input always gives the same answer. No LLM decides an alert. |
| **Runs offline** | The engine runs in the browser as a PWA. After the first load it works with no connection. |
| **Optional online extras** | An LLM can read messy dosing text and draft a customer leaflet. It is marked as AI-read and hides itself offline. |
| **Sourced data** | Every dose limit and rule carries a `source` and a `pharmacist_approved` flag (the flag name is historical; it means "signed off", and `approved_by` says by whom). Unverified numbers are marked, never invented. |
| **Check API** | A JSON endpoint lets a buyer call the same engine from their own system. |

## Tech stack

React · TypeScript · Vite · `vite-plugin-pwa` · Fuse.js · Vitest · Vercel serverless functions · Python (data cleaning and benchmark only)

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev        # app on localhost
npm test           # Vitest suite
npm run build      # typecheck + production build
npm run eval       # benchmark over eval/gold.json
```

Tests and the build need no keys and no network. The online extras read keys from a local `.env` (copy `.env.example`); without them the app falls back to its offline rules.

## Project layout

```
src/engine/   brand resolver, sig parser, ledger, limits, rules, alerts, history
src/ui/       pages and components
api/          serverless functions (sig reader, leaflet, check API)
data/         data cleaning scripts and curated tables
public/data/  compiled JSON the app loads
eval/         benchmark and scenarios
docs/         plan, demo script, what is verified and by whom
```

## Honest limits

- **Reviewed and signed off.** The test cases (the 54-case benchmark and the 31 scenarios) were reviewed with Dr. Sanjay Dhanushkar (community medicine practitioner, Wardha). He signed off the daily-dose limits of 19 everyday medicines (paracetamol, ibuprofen, diclofenac, metformin, amlodipine and similar, listed in `limits.json`); each carries his name in `approved_by`. He is a doctor; no pharmacist has reviewed the data. This is the team's record of the review: no signed sheet is attached and the sign-off date is not recorded yet.
- **Not covered:** less common medicines (for example nimesulide, tramadol, thiocolchicoside), kidney bands, as-needed (SOS) caps, and paracetamol with alcohol or liver disease. These are still unreviewed drafts and shown as not signed off.
- Our own benchmark is not evidence of accuracy, and no chatbot has been scored against it.
- What is verified, and by whom, is listed in [`docs/VERIFIED.md`](docs/VERIFIED.md). The 10-minute walkthrough is in [`docs/DEMO.md`](docs/DEMO.md).

---

<div align="center">
Built for HYPNEXIS '26 by Team Plot Armor
</div>
