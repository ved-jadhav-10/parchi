# video/: the landing-page trailer (Track D)

A 32.7 s, 1080p, 30 fps film of the whole product, built with Remotion from real captures of the running app. The cut that ships is `public/trailer/parchi-trailer.mp4` (played by `src/ui/components/TrailerVideo.tsx` on the landing page). This folder is separate from the app: its own `package.json`, nothing in `src/` imports it.

## Rebuild
```
npm run dev -- --port 5174        # repo root: the app, which the capture reads
cd video && npm install
npm run capture                   # public/textures/*.png (git-ignored) and src/layout.json (element boxes)
npm run studio                    # preview and scrub
npx remotion render src/index.ts Trailer out/parchi-trailer.mp4 --crf=27 --pixel-format=yuv420p
npx remotion render src/index.ts Trailer out/parchi-trailer-nobgm.mp4 --crf=27 --pixel-format=yuv420p --props=props-nobgm.json
```
Copy the first render and a poster (`npx remotion still src/index.ts Trailer out/poster.jpg --frame=70`) into `public/trailer/`. Re-run `capture` after any UI change that shows in the film. The capture uses a local Chromium path in `scripts/capture.mjs`; edit `exe` for your machine.

## Design spec (short)
- **Look:** taken from `src/ui/styles/tokens.css` (copied into `src/tokens.ts`), Plus Jakarta Sans (the app's own font file). Indigo ground for the opening and the close, real screenshots of the app everywhere else. No new colours.
- **Motion voice:** calm care. Symmetric ease-in-out, 30 to 45 frame moves, no overshoot except the slip landing once. No handheld shake. Brand wipe (ink panel, soft-indigo edge) covers five cuts; the check-to-result cut is a dissolve.
- **Captions:** 56 px on a white pill (over 5% of frame height), so the film reads with the sound off. Words follow the product's own: it informs, the pharmacist decides. KPI counts in the first caption are read from the capture (`layout.json`), not typed.
- **Data:** the app's own demo case and sample account (fictional). The override in the log is one the capture made on a throwaway browser profile.

| Shot | Frames | What it shows |
|---|---|---|
| hero | 0-105 | The sample slip rises over the doctor's scribble; hold 1 s |
| type | 105-240 | Seven lines typed, age added, the click that runs the check |
| result | 240-450 | KPI row, first Interrupt, the paracetamol X-ray row (3 brands, 4,100 mg) |
| tiers | 450-525 | "It informs. The pharmacist decides." and the three tiers |
| history | 525-690 | Review queue, order calendar, timeline by doctor |
| trust | 690-840 | Override reason, the log, dose limits with sources |
| outro | 840-980 | "Put it on the counter.", wordmark lockup, hold 1.3 s |

Durations live in `src/timeline.ts`; SFX pins in `src/sfx.ts` are relative to it.

## Method and deviations
Built following the video-shotcraft autonomous pipeline (stages 0-7) with the Remotion best-practices skill. Motion grammar adapted from its cards `spotlight-hero-card` (one subject, one arc), `type-and-filter` (typing at human speed, two-ring click), `timeline-travel`, and `logo-shrink-wordmark-lockup`. The card demos were **not** copied or diffed line by line, and no clean-context reviewer was run; the frame review was done by the author against `aesthetic-rules.md`. The Motion Workbench manifest (`src/workbench.ts`) was not written.

Things a pharmacist or the team should know before reusing it:
- The film shows the engine as it was on 24-25 Oct 2026, including "Draft rule", "Not approved" and the 3,000 mg/day age 65+ cap beside the landing page's 4,000 mg sample. Re-capture once the limits are signed off. No caption states a limit.
- No benchmark shot: `public/data/benchmark.json` does not exist yet, so the page shows an empty state.
- Audio: `bgm.mp3` is the video-shotcraft "Tech House" track (Mixkit; the library notes say to recheck its licence before commercial use). SFX are Mixkit files from the same library. Remotion has its own licence terms for companies.
