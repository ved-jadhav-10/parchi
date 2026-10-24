# Parchi business model: built for e-pharmacies and pharmacy chains

Decided 24 Oct 2026, after Phase 2 of HM-02 was released. Where this file and `PS_ANALYSIS.md` §9 differ, this file wins. Sources are numbered in `PS_ANALYSIS.md` (Sources, [98] onwards).

## 1. Who we build for

| Role | Who | Why them |
|---|---|---|
| **Buyer (first)** | E-pharmacies: Tata 1mg, PharmEasy, Apollo 24/7, Netmeds, Truemeds | A pharmacist team already validates every prescription order before dispatch [98]; we make that step faster, safer and documented |
| **Buyer (second)** | Pharmacy chains: Apollo (~7,000 stores [101]), MedPlus (~5,200-5,500 [102]), Wellness Forever (350+ stores, 3rd largest [99]), Frank Ross, Davaindia | Same safety standard at every counter; customer history already tied to a phone number or loyalty account |
| **User** | The buyer's verifying pharmacist (central review desk or store counter) | Registered pharmacists must dispense (Pharmacy Act s.42 [84]) |
| **Free tier** | Independent chemists | Offline app; protects their licence (banned FDC, NSQ). Secondary, not the design target |
| **Not users** | Doctors, patients | Doctors only receive a polite query the pharmacist chooses to send |

**Why this answers "nobody sees the whole picture":** we do not rely on doctors or chemists to share anything. The buyer already holds the customer's order history across doctors, the cart, the uploaded prescriptions and, for platforms with a diagnostics arm, lab results. Parchi runs on data the buyer already has.

## 2. Where Parchi sits in their workflow

```
Order placed (cart + Rx upload) -> Rx digitised by their staff -> [Parchi check] -> pharmacist review queue -> decision -> dispatch / dispense
                                                     ^                                   |
                    customer history + new lab result (re-check)                    audit log
```

Parchi returns, per order: ranked alerts with reason and source, a **suggested status** (`clear` / `clear_with_note` / `hold_contact_doctor`), and the **queue priority** so the riskiest orders reach a pharmacist first. The pharmacist decides; every decision and override is logged.

## 3. Compatibility with what they run

| Their system | What we know | How Parchi connects |
|---|---|---|
| Product catalogue / SKU master | Each buyer has its own | **Catalogue import:** CSV (name, pack, composition) mapped to canonical ingredient ids by the Track A resolver; low-confidence rows go to a review list |
| Billing / ERP | Marg ERP claims >50% (pharma >70%), self-reported, desktop-first [103][104]; GoFrugal targets chains [105]; no public APIs found. Wellness Forever's ERP/POS vendor is not public (only a Blue Yonder supply-chain deal [99]) | **CSV in/out first** (every ERP exports bills and stock); REST API later via vendor partnerships. No dependency on a vendor API |
| Order / verification system | Rx upload -> pharmacist validation (registered doctor, validity by visit date and duration) [98] | **JSON check API** (`api/` on Vercel) + **embeddable review console** (our PWA) |
| Health records | ABDM prescription standard: NRCeS FHIR R4 `PrescriptionRecord` (Composition + MedicationRequest) [106]; pharmacies may integrate with ABDM [107]; no confirmed pharmacy dispense flow | Import `PrescriptionRecord` bundles as history; export the review result as FHIR. Moved from "Finals stub" to core |
| Prescription images | No commercial Indian Rx-reading API found; Google's handwriting reader is a research prototype [108] | We take **structured lines** (cart or their digitised Rx), which is also the PS's "typed" input. OCR stays out of scope |
| Store counters with patchy internet | Chains | Same engine runs **offline in the browser** |

## 4. Why they pay

1. **Throughput:** a ranked queue and an alert budget (few Interrupts) mean more orders reviewed per pharmacist-hour.
2. **Liability and compliance:** an audit log proves a registered pharmacist reviewed each order. E-pharmacy rules are still a 2018 draft [86], so documented review is the defence.
3. **Regulatory risk:** never ship a banned FDC or a flagged NSQ batch.
4. **Margin, not loss:** "same composition, cheaper" suggestions point to **the buyer's own catalogue and own-label generics**. Jan Aushadhi mode only for government and Kendra deployments.

**Pricing (proposed):** per-check API fee for e-pharmacies; per-store licence for chains; free offline app for independent chemists. Market: Ken Research estimate, India pharmacy retail USD 30.1B (2025) -> 52.8B (2031) [70].

## 5. HM-02 requirements, all kept

| Requirement | How the B2B product covers it |
|---|---|
| Phase 1: brand -> ingredients, sigs, mg/day vs patient limits, duplicates, DDI, 3 tiers, alert fatigue | Unchanged core engine (Tracks A, B, C) |
| Phase 2: merge 3 doctors' Rx into one timeline; flag overlaps and cross-doctor duplicates | Customer order history = the timeline. Lines carry doctor, date and duration; doses add up only where dates overlap |
| Phase 2: re-check doses when a new kidney value arrives | New creatinine (from their lab arm or an upload) triggers a re-check of active medicines and a "what changed" list |
| Phase 2: unknown brands unverified, or a likely composition with confidence | Best candidate shown with confidence, marked unverified, kept out of dose totals until the pharmacist confirms |
| Phase 2: rank alerts by severity | Alerts ranked within an order (done) and orders ranked within the review queue |

## 6. Demo story

> A customer's third order this month lands in the review queue: prescriptions from three doctors over two weeks, and a creatinine result from the platform's own lab yesterday. Parchi puts the order at the top of the queue, shows 2 Interrupts with sources (paracetamol across brands from two doctors; NSAIDs with CrCl ~34), marks one unknown brand "unverified", and suggests *Hold, contact doctor*. The pharmacist confirms; the audit log is saved.

## 7. Unverified, check before quoting

- Wellness Forever's ERP/POS vendor; Marg/GoFrugal APIs; internal e-pharmacy tooling (not public).
- ABDM pharmacy dispense flow; headline ABHA counts are disputed [109].
- Chain store counts vary by source and date.
- Whether specific e-pharmacies run their own diagnostics arm and expose lab results internally: say "platforms with a diagnostics arm", not a named company.
