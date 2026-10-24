# DESIGN.md: UI design system (Track D)

The single reference for how the app looks, reads and behaves. Tokens live in `src/ui/styles/tokens.css`; this file explains them. Change the tokens there, not hex values in components.

Palette reference: `docs/design/palette-reference.jpg`. Pages and build order: `UI_PLAN.md`.

## Visual language
Flat page ground (`--color-bg`), opaque white cards (1 px `--color-border`, no shadow) on one flat panel tone (`--color-panel`), pill-shaped nav and buttons (`--radius-pill`), a tinted pill with an accent border for the active nav item, and big-number KPI tiles. No gradients, no blur, no shadow on buttons or nav. Tier colour appears only as a 4 px left bar plus icon and label.

## Principles
1. **Informs, never decides.** The pharmacist decides. Every screen and string says "review", "check", "consider", never "stop", "unsafe" or "approved".
2. **One glance, then detail.** The top of the result answers "do I need to act?" in under 3 s. Detail (X-ray, silent log) sits below.
3. **Alert budget is visible.** At most 1 Interrupt per Rx is the target, so an Interrupt must look rare and serious. Inform is calm, Silent is collapsed.
4. **Show uncertainty honestly.** Low-confidence brand matches, missing limits and unverified data are shown, never hidden or guessed.
5. **Offline is normal.** All checks run offline. Online-only extras hide themselves; nothing looks broken offline.

## Colour

### Brand (from palette reference)
| Token | Hex | Use |
|---|---|---|
| `--color-ink` | `#122056` | Body text, headings, icons |
| `--color-accent` | `#5B65DC` | Primary buttons, links, focus ring, selected state, 4 px left bar on clickable tiles |
| `--color-accent-strong` | `#4A53C7` | Hover/pressed accent; accent **text** on `--color-tint` |
| `--color-tint` | `#EEEFFD` | Secondary buttons, ordered/list rows, chips |
| `--color-bg` | `#FAFAFD` | Page background |
| `--color-surface` | `#FFFFFF` | Header/menu bar, cards, tiles |
| `--color-panel` | `#F3F4FD` | Workspace panel behind the cards, one tone step from the page |

Clickable tiles (e.g. a `BrandMatch` row that opens detail) get the accent left bar; static cards don't. Alert cards use their tier colour for that bar instead, never the accent.
| `--color-ink-muted` | `#5C6488` | Secondary text, captions, Silent tier |
| `--color-border` | `#DCDFF0` | Card borders, dividers (decorative only) |
| `--color-border-strong` | `#7F86A8` | Borders of inputs, selects, textareas and toggles: 3.4:1 or better on white, page and panel (WCAG 1.4.11) |

### Clinical status (separate from brand, never use accent for status)
| Tier / state | Text + icon | Background | Meaning |
|---|---|---|---|
| Interrupt | `#B42318` | `#FEF0EE` | Pharmacist should act before dispensing |
| Inform | `#9A4A00` | `#FFF4E5` | Worth knowing, no action required |
| Silent | `#5C6488` | `#F1F2F8` | Logged only, collapsed by default |
| Within limit | `#1E7A46` | `#EAF6EF` | Online dot only. The limit bar under 80% is a neutral fill (`--color-ink-muted`), because green would read as "fine to dispense" |

All text pairs above meet WCAG AA (>= 4.5:1, checked). Indigo `#5B65DC` on `#EEEFFD` is only 4.2:1, which is why `--color-accent-strong` exists.

**Never encode meaning in colour alone.** Every tier shows an icon and its label word ("Interrupt", "Inform", "Silent").

## Typography
- Family: **Plus Jakarta Sans** (variable), bundled through `@fontsource-variable/plus-jakarta-sans` so it works offline. Fallback: system UI stack.
- Numbers (mg, %, confidence) use `font-variant-numeric: tabular-nums` so columns line up.
- mg formatting: `toLocaleString('en-IN')` + unit with a thin space, e.g. `4,100 mg/day`. Never round a value that crosses a limit.

| Token | Size / line | Use |
|---|---|---|
| `--text-xs` | 12 / 16 | Source chips, captions |
| `--text-sm` | 14 / 20 | Table cells, secondary text |
| `--text-md` | 16 / 24 | Body, inputs (never smaller on inputs: avoids iOS zoom) |
| `--text-lg` | 20 / 28 | Card titles, alert headline |
| `--text-xl` | 28 / 36 | Page title |

Weights: 400 body, 600 labels and headings, 700 only for the Interrupt headline.

## Space, radius, elevation
- Spacing scale (4 px base): `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48.
- Radius: `--radius-sm` 6 (chips, inputs), `--radius-md` 12 (cards), `--radius-lg` 20 (page panels, like the reference).
- Shadow: `--shadow-card` only on what floats (the mobile menu, dialogs). Resting cards, rows and buttons are separated by a 1 px border or a tone step, never a shadow.
- Tap targets >= 44 px tall.

## Layout
- Mobile-first. Counter use = phone, tablet or desktop.
- `< 960px`: one column: Input -> Patient -> Result. On the order page the decision is a bottom sheet opened by a "Decide" bar.
- `>= 960px`: two columns: left (Rx input + patient, 400 px) and right (result, flexible). Max content width 1200 px, 16 px page gutter (24 px from 960 px).
- Header: white bar, app name left, online/offline pill right. Seven pills from 900 px; below that a menu button.

## Screens and components
Names are the component names to use in `src/ui/`.

| Component | Purpose | Key rules |
|---|---|---|
| `AppHeader` | Title + `ConnectionPill` | Pill at every width: "Offline: all checks still run" (muted) / "Online" (green dot). Below 1060 px it shrinks to a dot online and "Offline" when offline; screen readers get the full words. Nav order: Review queue, Check, Catalogue, Overrides, Data, Benchmark, Demo. The installed app opens on the queue. Escape closes the menu. |
| `RxInput` | Textarea for typed Rx | Placeholder shows the demo format. `Ctrl+Enter` runs the check. Primary button "Check prescription". |
| `PatientForm` | Age (always), sex | Asks only what the engine needs; see `PatientPrompt`. |
| `PatientPrompt` | Ask-only-when-needed fields (weight, serum creatinine) | Appears inline with the reason: "Creatinine needed because NSAIDs are present." Skippable; skipping shows "limit not adjusted for renal function". |
| `ResultSummary` | Top line of results | Counts per tier, e.g. "1 Interrupt · 3 Inform · 4 logged". |
| `AlertCard` | One alert | Tier icon + label, one-line `reason`, `SourceChip`, confidence. Alerts are grouped "Review before dispensing" (Interrupt) and "Worth a note"; the headline carries the conclusion, the engine's full sentence sits under "Full reason", and an `input_needed` alert is folded into the alert it belongs to. Interrupt cards on the Check page carry an "Override with reason" action; on an order, releasing with an Interrupt open takes its reason from the decision bar and logs it against each Interrupt. An "Approved rule" chip only when a pharmacist has signed the rule (everything else is a draft, said once in the footer), one sentence when the alert was lowered by the budget or quieted by the suppression list, and a link to Patient on "input needed". |
| `SourceChip` | Citation | Tint chip, `--text-xs`: "DDInter #1234", "S.O. 3285(E)", "Beers 2023". |
| `XrayTable` | Prescription X-ray: brand -> ingredients -> daily total vs limit | One row per ingredient from the ledger, listing its source brands. `LimitBar` in the last column. A row is marked with its strongest shown alert (tier bar plus the tier word); brands an alert names are outlined. Under each bar: the as-needed share, the limit's basis ("Age 65+ cap, unverified", source on open) and Track B's caveats; "left out or assumed in the totals" below the table. |
| `LimitBar` | total_mg_day vs limit_mg_day | Fill colour: < 80% neutral, 80-100% Inform amber, > 100% Interrupt red with overflow past a 100% marker. No limit on file -> dashed muted outline + "No limit on file" (never invent one). |
| `BrandMatch` | Resolved brand per line | Shows `raw -> brand`. "Check match" when Track A's `needs_pharmacist` is set (confidence only as a fallback); a generic name or an unmatched line says so; a spelling-corrected match says "Corrected spelling". Expanded: ingredients (never "0 mg": unknown and non-mg strengths are worded), the incomplete-composition caveat, "Not counted" for non-systemic products, dosing, Track A's notes and alternatives, banned FDC (S.O. chip, date, list), failed NSQ batches (batch chip, month, test, manufacturer) and Jan Aushadhi generics. "Dosing read by AI" when an online model read the dosing text; "Same composition in your catalogue" (a prompt, never a substitution) when a catalogue is loaded. |
| `FlagBadge` | `banned_fdc`, `lasa`, `discontinued`, `nsq` | Banned FDC uses Interrupt colours; LASA, discontinued and NSQ use Inform colours. NSQ is batch-specific ("Check batch (NSQ)"), never Interrupt. |
| `SilentLog` | Silent alerts | Collapsed `<details>`: "4 logged, not raised as alerts", on Check and on the order page. |
| `TierKey` | What the three tiers mean | A collapsed `<details>` under the verdict and the Check results. |
| `HerbalCard` | Ayurvedic and herbal items | Items recognised, findings with evidence grade, partner medicines, sources and "Draft rule"; "Not checked" for names it could not read. Informs; never changes the order's status. |
| `QueryDraftCard` | Query to the doctor (draft) | Polite text built from the findings, editable, Copy and Open in mail. Parchi sends nothing. |
| `DecisionSheet` | The decision form on a phone | Native modal dialog from the bottom edge; focus starts on the options. |
| `ScrollRegion` | A table or chart that scrolls sideways | Focusable and labelled. Used for every overflow table. |
| `ErrorBoundary`, `UpdateToast` | A page that cannot load; service worker messages | Reload button; "Ready to work offline" and "A new version is ready". |
| `OverrideDialog` | Override with reason | Reason required (preset list; "Other" also needs a note). Saved to IndexedDB with timestamp, listed on `#/log`. |

States every result view needs: empty (before first check), loading (engine is fast; show nothing if < 300 ms), result, engine error ("Could not check this line" per line, never fail the whole Rx silently).

## UI copy
| Do | Don't |
|---|---|
| "Paracetamol 4,100 mg/day is above the 4,000 mg/day limit. Review." | "Overdose! Dangerous." |
| "No alerts from the checks run." | "Safe" / "All clear" |
| "Matched 'Brufan 400' to Brufen 400 (82%). Check match." | Silently show "Brufen 400" |
| "Consider", "Review", "Check" | "Stop", "Do not dispense", "Approved" |

Footer on every result: "Decision support for a pharmacist. Not a substitute for professional judgement."

Hindi copy (Finals leaflet) follows the same rules.

## Accessibility checklist
- Text contrast >= 4.5:1 (tokens already comply). Control borders >= 3:1 (`--color-border-strong`). Focus ring: 2 px `--color-accent` + 2 px offset, never removed.
- Tier = icon + word + colour. Limit bar has a text value next to it (`4,100 / 4,000 mg`). On the timeline an Interrupt is a solid outline and an Inform a dashed one, with the tier word in the bar's title and the screen-reader table.
- Every route sets `document.title` ("Review queue - Parchi") and, after a navigation, scrolls to the top and focuses the page (`main`, or the heading on the landing page). Both pages have a skip link. The landing page has no single `<main>`: its hero sits in a framed block with the navigation, so each section is a labelled region instead.
- Scrolling regions (timeline, X-ray) are focusable with a label.
- Full keyboard flow: input -> patient -> check -> alerts -> override.
- No `aria-live` on whole result blocks: each page has one `role="status"` line (screen readers only) that says the counts and the suggestion. `role="alert"` is for save errors only.
- Single-character keys (1 to 3 on the decision form, j and k in the queue) act only inside their own area and can be switched off; Ctrl or Cmd + Enter is exempt. Nothing typed in the override dialog reaches the decision form.
- Respect `prefers-reduced-motion`: no animation beyond 150 ms fades.

## Landing page
`#/home` (also the root with no hash). It has its own navigation and footer: `src/ui/pages/HomePage.tsx` and `styles/home.css`, every class prefixed `home-`. An indigo hero panel on a lilac ground (`--color-lilac`), a cream sample slip (`--color-slip`), then white, navy and tint panels. Landing-only tokens: `--color-lilac`, `--color-slip`, `--color-accent-soft`, `--color-on-ink-muted`. The slip shows the demo case and is labelled "Sample"; the page carries no results of its own. Smooth scrolling (Lenis, `src/ui/lib/smoothScroll.ts`) runs on this page only, off under reduced motion; the working screens keep native scrolling. Preview: `docs/design/parchi-landing-preview.html`.

## Review desk (Phase 2)
`#/queue`, `#/order/<id>`, `#/history`, `#/catalogue`. The user is the buyer's verifying pharmacist, so the order page answers one question first: what does Parchi suggest, and what do you decide?

- **Order page.** The evidence column opens with the verdict: status, the lead finding in full (with its source, the prescribers and the override), counts, and the tier key. Then the other Interrupts, the first two Informs, and one fold for the rest; silent alerts; unverified brands; herbal items; the interaction and limit coverage note; and a collapsed "Workings" section (timeline, X-ray by window, what was written), open on wide screens. Alerts name the doctors and days ("Prescribed by Dr Mehta (19 Oct) and Dr Rao (21 Oct)").
- **Unverified brands** are actionable: "Use this brand" on a close match re-checks the order, moves the line into the totals and lists what changed; "Undo" takes it back. The primary button is used only for a match of 85% or more. Confirmations are saved on the order (`confirmations`).
- **Decision.** A sticky rail beside the evidence from 960 px; a bottom sheet on a phone. A suggested hold starts with no decision chosen, so agreeing is a choice, not a default. Keys 1 to 3 choose, Ctrl+Enter saves and opens the next waiting order (queue order); "Save and stay" keeps the page. A decision other than the suggestion needs a reason from its own radio list (`DECISION_REASONS`, a starting list for the pharmacist session). A line states what Parchi suggested, what was chosen and why, and that it is logged. The form also says how many Interrupts have an override reason saved.
- **Overrides** store the order id, are shown again after a reload, and appear in the override log with a link to the order. Focus returns to the "Overridden" line after saving.
- **Query to the doctor** is a collapsed card in the rail (editable draft, copy, open in mail). **Tools:** kidney result (open and badged when a new result is waiting), edit, FHIR export, customer leaflet.
- **Status** is icon + words + a tier colour (hold = Interrupt colours, clear with a note = Inform, no alerts = neutral grey, never green: it does not mean safe).
- **Queue.** One strip of choices with counts (Waiting, Hold, With note, No alerts, Decided), an "N of M orders decided" line, and a search box once there are more than 12 orders. Order is Parchi's priority (the engine's weight per finding, oldest first on a tie); any order can be opened. Each row shows the finding that weighs most, with "+N more". Rows are ruled lines; on a phone a row is rank, customer, status and Review on line 1, the facts on line 2 and the finding on line 3, with a one-word status label and the full sentence kept for screen readers.
- **Timeline.** One lane per doctor, one row per medicine, one hue; a bar is outlined in its tier colour when an alert names it (solid for Interrupt, dashed for Inform); a dotted end means no duration was written and the default window is assumed (unverified).
- **Catalogue.** Import a CSV; each row is matched on this device; the rows needing a pharmacist are listed most urgent first, with "Confirm this composition" (never for a banned combination). The catalogue is kept in its own IndexedDB database and feeds "Same composition in your catalogue" prompts.

Data: `src/ui/history/` (types mirror proposed contracts 5 to 7), demo account in `tests/fixtures/demo_orders.json`. Checks are kept by order content and run one order at a time (`src/ui/history/run.ts`).

## Review desk updates (25 Oct 2026, from `docs/UI_REVIEW_PHARMACIST.md`)
- **Nav:** Review queue, Check and Override log in the bar; Demo, Benchmark and Data & limits under "More". The brand link opens the queue.
- **Order page:** status line under the title, then the tabs (Alerts, Timeline, X-ray, Prescriptions, Leaflet) with the kidney card beside them (below on a phone). The decision is a bar fixed to the foot of the page: Parchi's suggestion, Hold / Release, with note / Release, Save. After saving it shows "n of m orders decided" and a "Next order" button (the queue's own ranking). The Calendar tab is gone: the Timeline has clickable days and a "That day" panel.
- **Queue:** filters are one line of chips (Waiting, Needs attention, Note to check, No alerts, Decided) and add up to Waiting; only the first row's Review is filled.
- **Check:** Patient comes before Prescription; the result has KPI counts and tabs (Alerts, X-ray, Brand matches, Leaflet); filling in a weight or creatinine the engine asked for re-runs the check on its own.
- **Names:** status = Needs pharmacist attention / Note to check / No alerts from the checks run; decision = Hold the order / Release, with a note / Release.
- **Brand flags** (banned, failed batch, look-alike, discontinued) show in the Alerts tab as "Check before dispensing".
- **New order:** paste one block ("Dr Mehta, 19 Oct: ...") to fill the prescription cards; the order date is under "Order date".

## Not doing
Dark mode, custom illustration, animation-heavy transitions, any colour outside `tokens.css`.
