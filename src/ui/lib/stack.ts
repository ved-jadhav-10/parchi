/** Maths for stacked cards: each card sticks near the top and shrinks a little as the next card slides over it. */

export const STACK_TOP = 24 // px from the window top where the first card sticks
export const STACK_STEP = 16 // px each later card sticks lower, so the edge of the card beneath still shows
export const STACK_GAP = 12 // px between cards in normal flow (the page grid gap)
const SHRINK = 0.03 // scale lost per card still to come

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export const stackTop = (index: number) => STACK_TOP + index * STACK_STEP

/** The scale a card ends at once the next card has fully covered it. The last card never shrinks. */
export const scaleTo = (index: number, total: number) => (index >= total - 1 ? 1 : 1 - (total - index) * SHRINK)

/**
 * How far the next card has come over this one, 0 to 1. It starts when the next card's top reaches the bottom of this
 * card (`start`) and ends when it has settled at its own sticky position (`end`).
 */
export const coverProgress = (nextTop: number, start: number, end: number) => (start === end ? 1 : clamp01((start - nextTop) / (start - end)))

export const scaleAt = (index: number, total: number, progress: number) => 1 - clamp01(progress) * (1 - scaleTo(index, total))

/** Stacking needs every card to fit in the window with its sticky offset; otherwise (phones) sections just flow. */
export const canStack = (heights: number[], viewportH: number, reducedMotion: boolean) =>
  !reducedMotion && heights.length > 1 && heights.every((h, i) => h + stackTop(i) + STACK_GAP <= viewportH)
