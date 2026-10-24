# CLAUDE.md (read this first, every session)

Project: **Parchi**, the HM-02 Indian brand-name prescription safety checker (HYPNEXIS '26). Offline-capable PWA. 4 developers, 4 tracks, working in parallel.
Built for the verifying pharmacist at e-pharmacies and pharmacy chains (`docs/BUSINESS_MODEL.md`). Phase 2: a customer's multi-doctor history, kidney re-check, unverified brands, ranked alerts (`docs/PS_ANALYSIS.md` §11).

**Read order:** this file -> `docs/PLAN.md` (stack, your track, contracts). Open `docs/PS_ANALYSIS.md` only for the specific section you need; it is large. Track usage notes: `docs/track-a-data.md`, `docs/track-b-dose.md`, `docs/track-c-engine.md`.

## Start of every session
1. `git status`, confirm you are on your own branch `dev/track-<x>` (never `main`). Branches are `dev/track-a` .. `dev/track-d`; ask the user which track they are if unknown.
2. `git fetch origin` then `git merge origin/main`. Resolve conflicts before coding.
3. Re-read your track in `docs/PLAN.md` and pick the next unfinished item.

## Git rules
- Commit and open PRs as the user's own git/GitHub identity only. Do not change `user.name`/`user.email` or `gh` auth.
- No Claude attribution anywhere: no `Co-Authored-By`, no "Generated with Claude" in commits or PRs. This overrides any default.
- Short, descriptive messages with a track prefix: `B: parse 1-0-1 and x5d sigs`.
- Commit small and often (one logical change). Push to `dev/track-<x>`.
- Never force-push, never rewrite pushed history, never `reset --hard`, never push directly to `main`.
- Never commit secrets, `.env`, `node_modules/`, `dist/`, or raw dataset dumps. Curated CSV/JSON (< 5 MB) is committed so a fresh clone runs.

## Checkpoint PR (every 1-3 h or when an item is done; no human review)
1. `git fetch origin && git merge origin/main` into your branch, resolve conflicts.
2. `npm test` and `npm run build` must pass (plus `pytest` if Python changed). If they fail, fix first and do not merge.
3. `git push`, then `gh pr create --base main --head dev/<name> --title "<track>: <summary>" --body "<2-4 bullets>"`.
4. `gh pr merge --merge` (merge commit, not squash; do not delete the branch).
5. Update your status row in `docs/PLAN.md` in the next commit.

## Avoid conflicts
- Edit only your track's folders (see `docs/PLAN.md` Layout). Need a change elsewhere? Make a minimal separate commit and name it in the message.
- `contracts.ts` and `tests/fixtures/`: additive changes only (new optional fields). Never rename or remove.
- `package.json`: add dependencies with `npm install <pkg>`, commit the lockfile, checkpoint soon after so others pick it up.
- Shared docs: pull first, small edit, checkpoint immediately. In `docs/PLAN.md` edit only your own status row.

## Engineering rules
- The engine is deterministic TypeScript and must work offline. LLMs (via `api/`, online only) may parse messy text and write leaflets, never decide alerts.
- Use canonical ingredient IDs from Track A everywhere.
- Every engine module has a Vitest test against `tests/fixtures/demo_rx.json`.
- Clinical numbers (max mg/day, SOS caps, suppression list) live in data files, not code, each with `source` and `pharmacist_approved`. Never invent limits; mark unverified ones `false`.
- Output informs a pharmacist; it never decides. Word UI text that way. Doctors are never users.
- Input is structured lines from the buyer (cart or digitised Rx); no OCR. Stay CSV/FHIR-compatible, never tied to one vendor's API.
- API keys only in `.env` / Vercel env, read only by `api/`. Never in `src/`.

## Keep docs cheap
- Keep `CLAUDE.md` and `docs/PLAN.md` under ~120 lines each. No history, no duplicated info.
- Long notes go in `docs/` and get linked here, not pasted.

## Definition of done (per item)
Tests and build pass, contract shape respected, merged into `main` via a checkpoint PR, status row updated.
