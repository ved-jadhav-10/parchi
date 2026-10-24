# Review queue: UI critique (24 Oct 2026)

Target: `#/queue` (`src/ui/pages/QueuePage.tsx`, `src/ui/styles/review.css`, `components.css`, `src/ui/history/queue.ts`). Run with three skills: impeccable (`critique`, dual sub-agent), taste-skill (app-screen gate) and ui-ux-pro-max (Quick Reference pass only: Python is not installed, so its search script did not run). Product truth is in `PRODUCT.md`; the design system is `DESIGN.md`. Status 24 Oct 2026: priority items 1 to 5 and the app-shell items are fixed in code (short finding line, failed orders pinned first and counted apart, tiles as filters with one primary Review, one link per row, waiting time, j/k keys, one name per bucket, live-region announcements, skip link, focus on route change, 44 px nav pills). Tests pass; the layout has not been checked in a browser (headless Chrome would not produce screenshots here), so re-run `/impeccable critique queue` to re-score. Still open: "N of M done" after a decision and a route to the next order.

## State after the first pass (already in the working tree)
Compact mobile rows, Waiting/Decided toggle, four KPIs that add up (Waiting = Hold + Note + Clear), one-word status badge with the full sentence kept for screen readers, ruled rows instead of cards, flat 1 px card borders (shadow only on overlays), skeleton loading, storage error with retry, one finding line per row (`leadFinding` in `queue.ts`, tested in `queue.test.ts`). On a 390x844 phone the first order starts at about 52% of the screen (was 76%).

## Score: 26/40 (Good, low end)
Weakest: user control 2, error prevention 2, efficiency 2, help 2. Cognitive load: moderate (single focus, hierarchy and working memory fail).

## Priority issues
1. **[P1] The finding line hides the answer** (`queue.ts:24`, `QueuePage.tsx` finding span, `review.css` `.queue__why-text`). It shows the engine's full `reason`, which starts with brands and doctors and ends with the point ("above the 3,000 mg/day limit"). Desktop clamps it to 3 lines and phone to 1, so the conclusion is cut off. ui-ux-pro-max `truncation-strategy` flags the same thing.
   Fix: build a short summary from the structured alert, e.g. "Paracetamol 4,100 vs 3,000 mg/day, 3 brands, 2 doctors"; at least strip parentheticals and the "Pharmacist to review" boilerplate, and give the full text on demand.
2. **[P1] Failed or unchecked orders sort last** (`QueuePage.tsx:45-47`, priority -1). The order needing hand review is the least visible. The KPI hint "N still being checked" also counts failed checks (`queue.ts` `suggestionCounts`, `QueuePage.tsx:65`).
   Fix: pin failed rows to the top or a labelled group ("Not checked, review by hand"); word running and failed separately.
3. **[P2] Hierarchy is inverted.** The 36 px KPI numerals outweigh the 28 px title and every row. The tiles look like filters but do nothing. The only filled button is "New order", but staff digitise orders and the pharmacist's job is to open the next one (`PRODUCT.md`). Row 1's Review looks the same as the others.
   Fix: make the top row's Review the single primary and demote New order; make the tiles filters (`aria-pressed`) or compress them to one line; drop the "Split across the next three" hint.
4. **[P2] Scanning speed at shift volume.** Two tab stops per row to the same URL (name link and Review). Tab reaches Waiting, Decided and New order before the first order. No filter, no j/k keys, no "next waiting" after a decision. The row shows "placed 24 Oct", not how long it has waited, so the oldest-first tiebreak is invisible.
   Fix: one link per row (or the whole row); "2 h waiting"; a Hold filter; j/k + Enter.
5. **[P3] Vocabulary and small a11y.** One bucket has three names (No alerts / Clear / No alerts from the checks run); "Clear" can read as a go-ahead; "Note" is cryptic where the full label fits on desktop; "0 Interrupt · 0 Inform" is noise on clear rows; `aria-label="Position N"` on a plain span is unreliable; "+5 more" has no noun for a screen reader; the Waiting/Decided switch and "Checking…" to result are not announced (`role="status"` only on the notice).

## Other findings
- Specificity: content is Parchi's own; the form is generic admin. The multi-doctor history, the product's differentiator, shows only as "3 Rx, 3 doctors" in 14 px grey.
- After a decision there is no "2 of 3 done" or route to the next order.
- Three identical tint Review buttons stack; the desktop status column is wide and empty while the finding is cramped; panel > card > KPI card is three surfaces deep.
- App shell (not queue-specific): no skip link; focus does not move to the page on a hash route change; nav pills are 42 px tall (WCAG 2.2 AA 24 px passes, the 44 px house target does not).

## Detector and measurement evidence
- impeccable detect: 4 source and 8 live findings. `side-tab` x3 on the KPI cards is the 4 px tier bar that `DESIGN.md` mandates (tier also shown by number colour and word), accepted. `nested-cards` x5 is a false positive: no `.card .card` in the DOM. Other `side-tab` lines: `components.css:115, 251`, `review.css:121`, not mapped to the queue.
- taste-skill: inspector 0 FAIL, 0 WARN at 1440, 768 and 390. Lint: 8 shadow warnings in `components.css` (connection pill, X-ray rows, chips, mobile menu overlay), none on the queue.
- Browser: no console errors, no horizontal overflow, headings H1 then H2, all interactive elements named, focus ring visible on all tab stops. Contrast all pass AA, lowest 4.84:1 (primary button). Under 44 px at 1440: six nav pills (42) and three 24 px name links; none at 390.

## Decisions still open (asked 24 Oct, not answered: "just document it for now")
- Which findings to fix first (suggested: items 1 and 2).
- What the KPI tiles become: filters, one summary line, or unchanged.
- Whether fixes stay inside the queue or include the app-shell items above ("ask again later").

## Re-run
`/impeccable critique queue` re-scores against the saved snapshot in `.impeccable/critique/`. Install Python 3 to enable ui-ux-pro-max's search (`uipro`/`search.py`).
