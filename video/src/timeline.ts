// The only place durations live. Everything else (wipes, captions, SFX, BGM) derives from SHOTS.
const order = [
  ['hero', 105],
  ['type', 135],
  ['result', 210],
  ['tiers', 75],
  ['history', 165],
  ['trust', 150],
  ['outro', 140],
] as const

export type ShotName = (typeof order)[number][0]
export const SHOTS = {} as Record<ShotName, { from: number; dur: number }>
let t = 0
for (const [name, dur] of order) {
  SHOTS[name] = { from: t, dur }
  t += dur
}
export const TOTAL = t

/** Frames at which a wipe covers a cut. Type to result is a dissolve inside the shot, not a wipe. */
export const WIPES = [SHOTS.type.from, SHOTS.tiers.from, SHOTS.history.from, SHOTS.trust.from, SHOTS.outro.from]
