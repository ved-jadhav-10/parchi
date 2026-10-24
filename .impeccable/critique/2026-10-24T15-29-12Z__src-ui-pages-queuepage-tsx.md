---
target: queue
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\vedam\\Desktop\\Coding\\projects\\parchi\\src\\ui\\pages\\QueuePage.tsx"
target_fingerprint: "sha256:33bf8a7e0c5639737afb135d31540124c3f954fd210d775b9f322bb72cd9b705"
target_path: "C:\\Users\\vedam\\Desktop\\Coding\\projects\\parchi\\src\\ui\\pages\\QueuePage.tsx"
timestamp: 2026-10-24T15-29-12Z
slug: src-ui-pages-queuepage-tsx
---
Method: dual-agent (design review sub-agent, detector sub-agent), plus taste-skill gate and ui-ux-pro-max quick-reference pass.

# Critique: Review queue (#/queue) - 26/40

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | "N still being checked" also counts failed checks |
| 2 | Real-world match | 3 | One bucket has three names (No alerts / Clear / No alerts from the checks run) |
| 3 | User control | 2 | No filter, no peek at a finding |
| 4 | Consistency | 3 | Suggestion labels differ from decision labels; two links per row |
| 5 | Error prevention | 2 | Failed check sorts last (priority -1) |
| 6 | Recognition | 3 | Finding clamped, conclusion cut off |
| 7 | Efficiency | 2 | No filter, no j/k, toolbar before first row in tab order |
| 8 | Minimalism | 3 | KPI strip repeats the rows |
| 9 | Error recovery | 3 | Retry exists; failed rows have no distinct treatment |
| 10 | Help | 2 | "+N more" and ranking not explained |

Cognitive load: moderate (single focus, hierarchy, working memory fail).
Detectors: impeccable side-tab x3 (accepted, DESIGN.md tier bar), nested-cards x5 false positive; taste inspector 0 FAIL 0 WARN; contrast all AA (min 4.84); first row at 52% on 390x844.

## Priority issues
- [P1] Finding line hides the answer (clarify): show a short structured summary, not the clamped engine reason.
- [P1] Failed/unchecked orders sort last (harden): pin or group them, separate hint wording.
- [P2] Hierarchy inverted (layout): KPI tiles and filled New order outweigh the list; make top row Review the primary.
- [P2] Scanning speed (adapt): one link per row, waiting age, Hold filter, j/k + Enter.
- [P3] Vocabulary and small a11y (clarify): zero counts, "Note" label, aria-label on rank span, "+N more" noun.

## Personas
Alex: tab order, two stops per row, no shortcuts. Sam: unannounced async changes, "+5 more". Priya (verifying pharmacist): no waiting age, reason not visible, failed checks hidden.
