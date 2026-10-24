# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
The verifying pharmacist at an e-pharmacy or pharmacy chain (central review desk or store counter). Primary device: a desktop review desk; tablet and phone at store counters are secondary but must work. The pharmacist reviews many orders per shift, so scanning speed and a trustworthy queue matter more than exploration. Independent chemists are a free-tier secondary audience, not the design target. Doctors and patients are never users: a doctor only receives a query the pharmacist chooses to send. (`docs/BUSINESS_MODEL.md` §1)

## Product Purpose
Checks Indian brand-name prescriptions for safety (HM-02, HYPNEXIS '26): brand to ingredients, sig to doses per day, mg/day against patient limits, duplicates, interactions, kidney-adjusted limits, unverified brands, banned combinations. Phase 2 merges a customer's prescriptions from several doctors into one timeline, re-checks on a new kidney value, and ranks both alerts and the review queue. Output informs the pharmacist, who decides; every decision and override is logged. Success in the next 24 hours: win the HYPNEXIS '26 evaluation. The product must also work on real data and real endpoints for any real scenario, not only the demo case, even where the data is sample data today.

## Positioning
It runs on data the buyer already holds (order history across doctors, cart, uploaded prescriptions, lab results), so no doctor or chemist has to share anything. The engine is deterministic and runs offline in the browser; LLMs may parse messy text or write leaflets but never decide alerts. Every alert carries a reason and a source. A general chatbot cannot give an auditable, offline, ranked-queue answer.

## Operating Context
Order placed (cart plus prescription upload), prescription digitised by the buyer's staff, Parchi check, pharmacist review queue, decision, dispatch or dispense. Input is structured lines (cart or digitised Rx), never OCR. Interop is CSV and FHIR R4 (ABDM `PrescriptionRecord`), never tied to one vendor's API. Store counters can have patchy internet, so the PWA works offline after first load. Online-only extras (LLM sig fallback, leaflet, check API under `api/`) hide themselves offline.

## Capabilities and Constraints
- Stack: React, Vite, TypeScript PWA; engine in TypeScript in the browser; JSON data in `public/data/`; serverless `api/` on Vercel; Python only for data cleaning and the benchmark.
- Clinical numbers (max mg/day, SOS caps, suppression list) live in data files, each with `source` and `pharmacist_approved`. Limits are never invented; unverified ones are marked `false`.
- Wording never says "safe" or "approved". Parchi suggests, the pharmacist decides. Suggested statuses: hold and contact the doctor, clear with a note, no alerts from the checks run (neutral, never green).
- Terminology: Interrupt, Inform, Silent tiers; order, Rx, sig, ledger, unverified brand, suggested status.
- API keys only in `.env` or Vercel env, read only by `api/`, never in `src/`.
- Open: which e-pharmacy or chain pilots first; real order and lab data sources are not connected yet.

## Brand Commitments
Name: Parchi. A logo mark and palette already exist in the app (`src/ui/components/LogoMark.tsx`, `docs/DESIGN.md`); the design system is documented there, not here.

## Evidence on Hand
- Curated brand data (1mg-derived, top OPD brands), banned FDC list, DDInter subset, benchmark gold set and results against chatbots (`eval/`).
- A sample e-pharmacy account of three orders from several doctors with a kidney value (`tests/fixtures/demo_orders.json`). It is synthetic. There are no real customers, pilots, testimonials or usage numbers, and none may be implied.
- Limits and suppression rules are drafts until a pharmacist signs them off.

## Product Principles
1. Inform, never decide: the pharmacist is the authority, and every screen and string reflects it.
2. Show uncertainty honestly: low-confidence matches, missing limits and unverified data are shown, never hidden or guessed.
3. Alert budget: Interrupts must stay rare and serious, so a pharmacist trusts the few that appear.
4. Answer first, evidence beside it: the top of every screen says whether to act, with the source one step away.
5. Works offline and on real inputs, not only the demo case.

## Accessibility & Inclusion
WCAG 2.2 AA: text contrast of at least 4.5:1, full keyboard flow, visible focus, meaning never carried by colour alone (tier = icon + word + colour), tap targets of at least 44 px. The patient leaflet is also produced in Hindi, following the same wording rules.
