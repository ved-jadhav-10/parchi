import { describe, expect, it } from 'vitest'
import { STACK_GAP, canStack, coverProgress, scaleAt, scaleTo, stackTop } from './stack'

describe('stacked cards', () => {
  it('sticks each later card a little lower than the one before', () => {
    expect(stackTop(1) - stackTop(0)).toBeGreaterThan(0)
    expect(stackTop(2) - stackTop(1)).toBe(stackTop(1) - stackTop(0))
  })

  it('shrinks earlier cards more than later ones, and never the last', () => {
    expect(scaleTo(0, 3)).toBeLessThan(scaleTo(1, 3))
    expect(scaleTo(1, 3)).toBeLessThan(1)
    expect(scaleTo(2, 3)).toBe(1)
    expect(scaleTo(0, 1)).toBe(1)
  })

  it('reports how far the next card has come over this one', () => {
    expect(coverProgress(700, 600, 40)).toBe(0) // still below this card
    expect(coverProgress(600, 600, 40)).toBe(0) // just touching
    expect(coverProgress(40, 600, 40)).toBe(1) // settled
    expect(coverProgress(0, 600, 40)).toBe(1) // never past 1
    expect(coverProgress(320, 600, 40)).toBeCloseTo(0.5)
    expect(coverProgress(10, 40, 40)).toBe(1) // degenerate range
  })

  it('goes from full size to the end scale as progress runs 0 to 1', () => {
    expect(scaleAt(0, 2, 0)).toBe(1)
    expect(scaleAt(0, 2, 1)).toBeCloseTo(scaleTo(0, 2))
    expect(scaleAt(0, 2, 0.5)).toBeGreaterThan(scaleTo(0, 2))
    expect(scaleAt(0, 2, 0.5)).toBeLessThan(1)
    expect(scaleAt(0, 2, 5)).toBeCloseTo(scaleTo(0, 2)) // clamped
  })

  it('only stacks when every card fits the window and motion is welcome', () => {
    expect(canStack([590, 616], 900, false)).toBe(true)
    expect(canStack([590, 616], 900, true)).toBe(false) // reduced motion
    expect(canStack([590, 1092], 844, false)).toBe(false) // phone: second card too tall
    expect(canStack([590], 900, false)).toBe(false) // nothing to stack
    const h = 600
    expect(canStack([h, h], h + stackTop(1) + STACK_GAP, false)).toBe(true) // exactly fits
    expect(canStack([h, h], h + stackTop(1) + STACK_GAP - 1, false)).toBe(false)
  })
})
