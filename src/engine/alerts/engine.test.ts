import { describe, expect, it } from 'vitest'
import type { Alert } from '../contracts'
import { alertRules } from '../rules/testing'
import { finalizeAlerts } from './engine'

const classes: Record<string, string[]> = { ascorbic_acid: ['vitamin'], cyanocobalamin: ['vitamin_b12'], paracetamol: ['analgesic_antipyretic'] }
const ctx = (max?: number) => {
  const config = alertRules()
  if (max !== undefined) config.alert_budget.max_interrupts_per_rx = max
  return { config, classesOf: (id: string) => classes[id] ?? [] }
}
const alert = (over: Partial<Alert>): Alert => ({ tier: 'inform', type: 'ddi', ingredients: ['x'], reason: 'r', source: 's', confidence: 1, ...over })

describe('suppression list', () => {
  it('moves a repeated vitamin to silent and records which entry did it', () => {
    const [a] = finalizeAlerts([alert({ type: 'duplicate_ingredient', ingredients: ['ascorbic_acid'] })], ctx())
    expect(a.tier).toBe('silent')
    expect(a.suppressed).toBe('vitamin_duplicate')
  })

  it('leaves a repeated non-vitamin alone', () => {
    const [a] = finalizeAlerts([alert({ type: 'duplicate_ingredient', ingredients: ['paracetamol'] })], ctx())
    expect(a.tier).toBe('inform')
    expect(a.suppressed).toBeUndefined()
  })

  it('never suppresses an Interrupt', () => {
    const [a] = finalizeAlerts([alert({ tier: 'interrupt', type: 'duplicate_ingredient', ingredients: ['ascorbic_acid'] })], ctx())
    expect(a.tier).toBe('interrupt')
  })
})

describe('alert budget', () => {
  const stops = [
    alert({ tier: 'interrupt', type: 'nsaid_renal', ingredients: ['a'] }),
    alert({ tier: 'interrupt', type: 'dose_excess', ingredients: ['b'] }),
    alert({ tier: 'interrupt', type: 'banned_fdc', ingredients: ['c'] }),
  ]

  it('keeps the most serious interrupts and demotes the rest to inform', () => {
    const out = finalizeAlerts(stops, ctx(2))
    expect(out.filter((a) => a.tier === 'interrupt').map((a) => a.type)).toEqual(['banned_fdc', 'dose_excess'])
    const demoted = out.find((a) => a.type === 'nsaid_renal')!
    expect(demoted.tier).toBe('inform')
    expect(demoted.budget_demoted).toBe(true)
  })

  it('does nothing when within budget', () => {
    expect(finalizeAlerts(stops, ctx(3)).every((a) => a.tier === 'interrupt' && !a.budget_demoted)).toBe(true)
  })
})

describe('ordering and duplicates', () => {
  it('sorts interrupt, inform, silent, then by confidence', () => {
    const out = finalizeAlerts(
      [
        alert({ tier: 'silent', ingredients: ['s'] }),
        alert({ tier: 'inform', ingredients: ['i1'], confidence: 0.6 }),
        alert({ tier: 'inform', ingredients: ['i2'], confidence: 0.9 }),
        alert({ tier: 'interrupt', type: 'dose_excess', ingredients: ['d'] }),
      ],
      ctx(),
    )
    expect(out.map((a) => a.ingredients[0])).toEqual(['d', 'i2', 'i1', 's'])
  })

  it('drops an identical alert raised twice', () => {
    expect(finalizeAlerts([alert({ ingredients: ['a', 'b'] }), alert({ ingredients: ['b', 'a'] })], ctx())).toHaveLength(1)
  })
})
