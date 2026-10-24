import { SHOTS, WIPES } from './timeline'

/** Declarative SFX pin table. `from` is always relative to SHOTS, never a bare frame number, so a timeline change carries it. */
export type Sfx = { from: number; src: string; volume: number; dur?: number; why: string }

export const SFX: Sfx[] = [
  { from: SHOTS.hero.from + 14, src: 'audio/whoosh-big.mp3', volume: 0.5, dur: 45, why: 'slip rises into frame' },
  ...WIPES.map((b) => ({ from: b - 14, src: 'audio/swoosh-quick.mp3', volume: 0.4, dur: 28, why: 'wipe across the cut' })),
  { from: SHOTS.type.from + 30, src: 'audio/keyboard.mp3', volume: 0.7, dur: 66, why: 'seven lines typed, 30f to 96f' },
  { from: SHOTS.type.from + 118, src: 'audio/click-camera.mp3', volume: 0.5, dur: 12, why: 'click on Check prescription' },
  { from: SHOTS.history.from + 44, src: 'audio/click-camera.mp3', volume: 0.4, dur: 12, why: 'click on Review in the queue' },
  { from: SHOTS.outro.from - 24, src: 'audio/riser-cine.mp3', volume: 0.28, dur: 44, why: 'riser into the close' },
  { from: SHOTS.outro.from + 84, src: 'audio/impact-transition.mp3', volume: 1.0, dur: 60, why: 'wordmark lands, the loudest hit' },
  { from: SHOTS.outro.from + 98, src: 'audio/sparkle.mp3', volume: 0.3, dur: 40, why: 'afterglow' },
]
