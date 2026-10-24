# UI review from the verifying pharmacist's seat (25 Oct 2026)

Scope: Queue, Order (all tabs), Check, New order (`#/history`), Home, nav shell. Demo, Data and Benchmark were only skimmed. Method: app run locally, screenshots at 1440 and 390 px, a few scripted clicks. Not tested: touch, screen readers, real data volume. Checked against `PRODUCT.md` and `docs/DESIGN.md`. Earlier queue-only notes: `docs/UI_CRITIQUE_QUEUE.md`.

Status 25 Oct 2026: implemented in `src/ui` except where listed here. Not done: the landing page vs app visual gap (needs a design direction, not a fix); an hours-level wait time in the queue (orders carry a date only, so "placed today" is as fine as it gets); a CSV drop on New order (paste-a-block and FHIR import are there). The Check page still has a per-alert override (it has no order decision); on an order the override is folded into the decision. Layout checked in headless Chrome at 1440 and 390 px; not re-checked with a screen reader or touch.

## What already works (keep)
- Queue: ranked rows, one finding line, filter tiles, one primary Review, j/k keys, skip link, no overflow at 390 px.
- Order: suggested status, decision radios with a "why differ" gate, evidence in tabs.
- "Informs, never decides" wording; tier = icon + word + colour.

## Bugs and broken flows (fix first)
| # | Problem | Where | Fix |
|---|---|---|---|
| 1 | "Add it under Patient" on the *Input needed* alert is `href="#patient"`. The hash router reads it as an unknown route, so on an order page it opens the Check page and the pharmacist loses the order. Verified by clicking. | `AlertCard.tsx:35` (shared with Check, where it works) | On the order page link to the Kidney card (scroll and focus), keep `#patient` behaviour on Check. |
| 2 | The same alert says to enter creatinine, but the Kidney card already holds a pending result (1.6 mg/dL) with "Re-check with this result". The alert does not mention it. | `OrderPage.tsx` KidneyCard, `AlertCard` | On the order page the alert action becomes "Re-check with 1.6 mg/dL". |
| 3 | After "Save decision" nothing moves: same page, a small "Saved" line, no "n of m done", no next order. Largest throughput cost per shift. | `DecisionPanel.tsx`, `OrderPage.tsx` | "Saved. Next order →" (next waiting in queue order) and "2 of 3 done". Already listed open in `UI_CRITIQUE_QUEUE.md`. |
| 4 | Timeline grid shows 19 Oct to about 3 Nov, but bars run to 21 Nov and are cut off. No scroll cue. Each row also has an empty second strip, so lanes look broken. | `Timeline.tsx`, `review.css` | Fit the grid to the full range (or show a scroll hint and sticky labels); remove the extra row strip. |

## Flow friction
- **Decision is far from the evidence.** Left column: Status, Decision, Kidney, Edit, FHIR. Alerts are right and below the fold. On mobile Decision comes before any alert. Put alerts first and a sticky decision bar: "Parchi suggests Hold · [Hold] [Release with note] [Release]".
- **Interrupt cards are heavy.** Four-line reason repeating brands, doctors and dates, then a "Prescribed by..." line saying the same again. Lead with structured data ("Paracetamol 4,100 / 4,000 mg/day · 3 brands · 2 doctors"), full sentence on demand.
- **Flat list of six alerts, two of them the same finding** (NSAID duplicate plus the kidney Input needed). Group: "Hold reasons" (Interrupts), "Worth a note" (Inform), related items nested.
- **Two decision layers.** Per-alert "Override with reason" and the order-level decision. Their relationship is not stated (does releasing the order override the alerts?). Merge into one flow or say so on screen.
- **"Draft rule" chip on every alert** becomes noise. Show it once in a banner; mark only exceptions.
- **One idea, three names:** "Attention" (queue tile), "Needs pharmacist attention" (badge), "Hold the order" (radio). Pick one noun and use it everywhere.
- **Queue:** "placed today" on every row hides wait time (the oldest-first tiebreak is invisible); "+5 more" is not clickable; three equal Review buttons on desktop; wide empty status column next to a cramped finding column.
- **New order is a long form** (FHIR import, Customer, Prescription 1, labs). Buyers digitise Rx, so manual entry is a demo path. Offer paste-a-block ("Dr Mehta, 19 Oct: Dolo 650 1-1-1 x5d; ...") or a CSV drop. "Order placed" and "Date written" both default to today.
- **Check page:**
  - Creatinine and weight prompts appear after the check, and the user must press "Check again". Auto re-run when the prompted field is filled.
  - Patient is below Prescription, but Check stays disabled until age is entered. Field order does not match the dependency.
  - Result is one very long column (KPIs, alerts, coverage, ask-the-customer, X-ray, matches, leaflet). Use the same tabs as the order page.
- **Nav:** Benchmark, Data & limits and Demo sit in the same pill row as the review queue, but they are pitch and admin pages. Primary: Review queue, Check, Log. Move the rest under "More" or the footer. The queue is the product but Check is first.
- **Home vs app:** the landing page is polished and the app shell is much plainer, so they read as two designs.

## Bland, weird or out of place
- Secondary buttons (Review, Check prescription, Add and re-check) are pale tint with indigo text and look disabled. "Check prescription" is secondary and genuinely disabled until age is entered, which is easy to misread.
- Three nested surfaces (lilac panel, white card, tint row) make everything look equally important. Prefer one flat surface for lists and tables.
- Calendar tab: a full month for a 7-day span, mostly empty days. The day detail under it is useful; fold it into the Timeline as click-a-day and drop the tab.
- X-ray: the bar colour (amber at Aceclofenac 200/200) disagrees with the Interrupt badge beside it. Explain, or colour the bar by the strongest alert. The window pills need a line saying why windows exist.
- The "limits are drafts" note repeats on every page plus the footer disclaimer. Show once.
- Brand matches shows "Check batch (NSQ)" on Pan-D in a collapsed tab, but no alert or count surfaces it. A flag that matters belongs in Alerts or on the row.
- Customer leaflet (language, free text, needs internet) sits mid-page. It is a downstream step; move it to after the decision.

## Better layouts for the same content
- **Order review (two-pane desk):** left narrow (patient, suggested status, sticky decision bar); right one stream where each Interrupt has a one-line headline expanding to reason, source and override; evidence (Timeline with day panel, X-ray, Prescriptions) as tabs below; "Next order →" after the decision.
- **Queue:** dense table (customer, wait, top finding, doctors, status) with the whole row clickable; filter chips on one line instead of tiles; a waited-time column; a Next action.
- **Check:** two panes, form left, result tabs (Alerts, X-ray, Brands) right, auto re-check when a prompted field is filled.

## Suggested order of work
1. Bugs 1 and 2 (link and alert action).
2. Next-order flow after a decision (3).
3. Move or stick the decision control, alerts first.
4. Timeline clipping (4).
5. Shorter Interrupt headlines and grouped alerts.
6. One status vocabulary; demote pitch pages in the nav.
