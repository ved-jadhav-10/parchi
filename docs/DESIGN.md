# DESIGN.md: UI design system (Track D)

The single reference for how the app looks, reads and behaves. Tokens live in `src/ui/styles/tokens.css`; this file explains them. Change the tokens there, not hex values in components.

Palette reference: `docs/design/palette-reference.jpg`. Pages and build order: `UI_PLAN.md`.

## Visual language
Soft indigo gradient page, frosted white cards (`--glass`, `--ring`, `--shadow-card`) on a translucent panel (`--glass-panel`), pill-shaped nav and buttons (`--radius-pill`), an inset "pressed" state for the active nav item (`--shadow-inset`), and big-number KPI tiles. Tier colour appears only as a 4 px left bar plus icon and label.

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

Clickable tiles (e.g. a `BrandMatch` row that opens detail) get the accent left bar; static cards don't. Alert cards use their tier colour for that bar instead, never the accent.
| `--color-ink-muted` | `#5C6488` | Secondary text, captions, Silent tier |
| `--color-border` | `#DCDFF0` | Card borders, dividers (non-text) |

### Clinical status (separate from brand, never use accent for status)
| Tier / state | Text + icon | Background | Meaning |
|---|---|---|---|
| Interrupt | `#B42318` | `#FEF0EE` | Pharmacist should act before dispensing |
| Inform | `#9A4A00` | `#FFF4E5` | Worth knowing, no action required |
| Silent | `#5C6488` | `#F1F2F8` | Logged only, collapsed by default |
| Within limit | `#1E7A46` | `#EAF6EF` | Limit bar under 80% |

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
- Shadow: `--shadow-card` only on cards and the Interrupt banner. Keep it flat otherwise.
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
| `AppHeader` | Title + `ConnectionPill` | Pill: "Offline: all checks still run" (muted) / "Online" (green dot). |
| `RxInput` | Textarea for typed Rx | Placeholder shows the demo format. `Ctrl+Enter` runs the check. Primary button "Check prescription". |
| `PatientForm` | Age (always), sex | Asks only what the engine needs; see `PatientPrompt`. |
| `PatientPrompt` | Ask-only-when-needed fields (weight, serum creatinine) | Appears inline with the reason: "Creatinine needed because NSAIDs are present." Skippable; skipping shows "limit not adjusted for renal function". |
| `ResultSummary` | Top line of results | Counts per tier, e.g. "1 Interrupt · 3 Inform · 4 logged". |
| `AlertCard` | One alert | Tier icon + label, one-line `reason`, `SourceChip`, confidence. Interrupt cards sit first and full width with an "Acknowledge / Override" action. |
| `SourceChip` | Citation | Tint chip, `--text-xs`: "DDInter #1234", "S.O. 3285(E)", "Beers 2023". |
| `XrayTable` | Prescription X-ray: brand -> ingredients -> daily total vs limit | One row per ingredient from the ledger, listing its source brands. `LimitBar` in the last column. |
| `LimitBar` | total_mg_day vs limit_mg_day | Fill colour: < 80% within-limit green, 80-100% Inform amber, > 100% Interrupt red with overflow past a 100% marker. No limit on file -> dashed muted outline + "No limit on file" (never invent one). |
| `BrandMatch` | Resolved brand per line | Shows `raw -> brand`. Confidence < threshold -> "Check match" badge + "needs pharmacist" route. |
| `FlagBadge` | `banned_fdc`, `lasa`, `discontinued` | Banned FDC uses Interrupt colours; LASA and discontinued use Inform colours. |
| `SilentLog` | Silent alerts | Collapsed `<details>`: "4 logged (not shown)". |
| `OverrideDialog` | Override with reason | Reason required (preset list + free text). Saved to IndexedDB with timestamp. |

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
- Text contrast >= 4.5:1 (tokens already comply). Focus ring: 2 px `--color-accent` + 2 px offset, never removed.
- Tier = icon + word + colour. Limit bar has a text value next to it (`4,100 / 4,000 mg`).
- Full keyboard flow: input -> patient -> check -> alerts -> override.
- Alerts container is `aria-live="polite"`; an Interrupt uses `role="alert"`.
- Respect `prefers-reduced-motion`: no animation beyond 150 ms fades.

## Not doing
Dark mode, custom illustration, animation-heavy transitions, any colour outside `tokens.css`.
