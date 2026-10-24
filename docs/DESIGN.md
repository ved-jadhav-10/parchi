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
- `< 960px`: one column: Input -> Patient -> Result.
- `>= 960px`: two columns: left (Rx input + patient, 400 px) and right (result, flexible). Max content width 1200 px, 16 px page gutter (24 px from 960 px).
- Header: white bar, app name left, online/offline pill right.

## Screens and components
Names are the component names to use in `src/ui/`.

| Component | Purpose | Key rules |
|---|---|---|
| `AppHeader` | Title + `ConnectionPill` | Pill at every width: "Offline: all checks still run" (muted) / "Online" (green dot). Below 1060 px it shrinks to a dot online and "Offline" when offline; screen readers get the full words. Nav order: Review queue, Check, Override log, Data & limits, Benchmark, Demo. The installed app opens on the queue. Escape closes the mobile menu. |
| `RxInput` | Textarea for typed Rx | Placeholder shows the demo format. `Ctrl+Enter` runs the check. Primary button "Check prescription". |
| `PatientForm` | Age (always), sex | Asks only what the engine needs; see `PatientPrompt`. |
| `PatientPrompt` | Ask-only-when-needed fields (weight, serum creatinine) | Appears inline with the reason: "Creatinine needed because NSAIDs are present." Skippable; skipping shows "limit not adjusted for renal function". |
| `ResultSummary` | Top line of results | Counts per tier, e.g. "1 Interrupt · 3 Inform · 4 logged". |
| `AlertCard` | One alert | Tier icon + label, one-line `reason`, `SourceChip`, confidence. Interrupt cards sit first and full width with an "Override with reason" action. A "Draft rule" chip when `approved` is false, one sentence when the alert was lowered by the budget or quieted by the suppression list, and a link to Patient on "input needed". |
| `SourceChip` | Citation | Tint chip, `--text-xs`: "DDInter #1234", "S.O. 3285(E)", "Beers 2023". |
| `XrayTable` | Prescription X-ray: brand -> ingredients -> daily total vs limit | One row per ingredient from the ledger, listing its source brands. `LimitBar` in the last column. A row is marked with its strongest shown alert (tier bar plus the tier word); brands an alert names are outlined. Under each bar: the as-needed share, the limit's basis ("Age 65+ cap, unverified", source on open) and Track B's caveats; "left out or assumed in the totals" below the table. |
| `LimitBar` | total_mg_day vs limit_mg_day | Fill colour: < 80% neutral, 80-100% Inform amber, > 100% Interrupt red with overflow past a 100% marker. No limit on file -> dashed muted outline + "No limit on file" (never invent one). |
| `BrandMatch` | Resolved brand per line | Shows `raw -> brand`. "Check match" when Track A's `needs_pharmacist` is set (confidence only as a fallback); a generic name or an unmatched line says so; a spelling-corrected match says "Corrected spelling". Expanded: ingredients (never "0 mg": unknown and non-mg strengths are worded), the incomplete-composition caveat, "Not counted" for non-systemic products, dosing, Track A's notes and alternatives, banned FDC (S.O. chip, date, list), failed NSQ batches (batch chip, month, test, manufacturer) and Jan Aushadhi generics. |
| `FlagBadge` | `banned_fdc`, `lasa`, `discontinued`, `nsq` | Banned FDC uses Interrupt colours; LASA, discontinued and NSQ use Inform colours. NSQ is batch-specific ("Check batch (NSQ)"), never Interrupt. |
| `SilentLog` | Silent alerts | Collapsed `<details>`: "4 logged (not shown)". |
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
- Alerts container is `aria-live="polite"`; an Interrupt uses `role="alert"`.
- Respect `prefers-reduced-motion`: no animation beyond 150 ms fades.

## Landing page
`#/home` (also the root with no hash). It has its own navigation and footer: `src/ui/pages/HomePage.tsx` and `styles/home.css`, every class prefixed `home-`. An indigo hero panel on a lilac ground (`--color-lilac`), a cream sample slip (`--color-slip`), then white, navy and tint panels. Landing-only tokens: `--color-lilac`, `--color-slip`, `--color-accent-soft`, `--color-on-ink-muted`. The slip shows the demo case and is labelled "Sample"; the page carries no results of its own. Smooth scrolling (Lenis, `src/ui/lib/smoothScroll.ts`) runs on this page only, off under reduced motion; the working screens keep native scrolling. Preview: `docs/design/parchi-landing-preview.html`.

## Review desk (Phase 2)
`#/queue`, `#/order/<id>`, `#/history`. The user is the buyer's verifying pharmacist, so the order page answers one question first: what does Parchi suggest, and what do you decide? The evidence column opens with a verdict (status, the lead finding, counts), then the ranked alerts, then the timeline, X-ray and brand matches. The decision sits in a sticky rail beside it from 960 px; on a phone it follows the evidence and a bottom bar ("Decide") reaches it until it is on screen. Kidney result, edit and FHIR export are one collapsed "tools" panel, open when a new lab result is waiting. Scroll areas (timeline, X-ray) are focusable regions. Status is icon + words + a tier colour (hold = Interrupt colours, clear with a note = Inform, no alerts = neutral grey, never green: it does not mean safe). The queue order is Parchi's priority (the engine's weight per finding, oldest first on a tie); any order can be opened. Each row shows the finding that weighs most, with "+N more"; the four counts (waiting, hold, note, clear) add up. Decided orders sit under a separate Decided view, not in the waiting list. Rows are ruled lines, not cards; on a phone a row is rank, customer, status and Review on line 1, the facts on line 2 and the finding on line 3, and the status badge uses a one-word label ("Hold", "Note", "Clear") with the full sentence kept for screen readers. The timeline is one lane per doctor, one row per medicine, one hue; a bar is outlined in its tier colour when an alert names it; a dotted end means no duration was written and the default window is assumed (unverified). Alerts name the doctors and days ("Prescribed by Dr Mehta (19 Oct) and Dr Rao (21 Oct)"). A suggested hold starts with no decision chosen, so agreeing is a choice, not a default. Keys 1 to 3 choose, Ctrl+Enter saves and opens the next waiting order (queue order); "Save and stay" keeps the page. Choosing a decision other than the suggestion needs a reason from its own list (`DECISION_REASONS`, a starting list for the pharmacist session); a line before saving states what Parchi suggested, what was chosen and why, and that it is logged. Per-alert overrides store the order id (`order_id`, optional on rows saved before it existed) and show it in the override log. Data: `src/ui/history/` (types mirror proposed contracts 5 to 7), demo account in `tests/fixtures/demo_orders.json`.

## Not doing
Dark mode, custom illustration, animation-heavy transitions, any colour outside `tokens.css`.
