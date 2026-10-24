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
    alert({ tier: 'interrupt', type: 'nsaid_renal', ingredients: ['a'], confidence: 0.8 }),
    alert({ tier: 'interrupt', type: 'dose_excess', ingredients: ['b'] }),
    alert({ tier: 'interrupt', type: 'duplicate_ingredient', ingredients: ['c'], confidence: 0.9 }),
  ]

  it('keeps the most serious routine interrupts and demotes the rest to inform', () => {
    const out = finalizeAlerts(stops, ctx(2))
    expect(out.filter((a) => a.tier === 'interrupt').map((a) => a.type)).toEqual(['dose_excess', 'duplicate_ingredient'])
    const demoted = out.find((a) => a.type === 'nsaid_renal')!
    expect(demoted.tier).toBe('inform')
    expect(demoted.budget_demoted).toBe(true)
  })

  it('never demotes a contraindication or kidney "avoid", and they do not use up the budget', () => {
    const protectedStops = [
      alert({ tier: 'interrupt', type: 'ddi', ingredients: ['p', 'q'] }),
      alert({ tier: 'interrupt', type: 'schedule_mismatch', ingredients: ['r'] }),
      alert({ tier: 'interrupt', type: 'banned_fdc', ingredients: ['s'] }),
    ]
    const out = finalizeAlerts([...protectedStops, ...stops], ctx(2))
    const kept = out.filter((a) => a.tier === 'interrupt').map((a) => a.type)
    expect(kept).toEqual(expect.arrayContaining(['ddi', 'schedule_mismatch', 'banned_fdc', 'dose_excess', 'duplicate_ingredient']))
    expect(kept).toHaveLength(5)
    expect(out.find((a) => a.type === 'nsaid_renal')!.budget_demoted).toBe(true)
  })

  it('lets a stacking alert replace the plain alert it covers', () => {
    const out = finalizeAlerts(
      [
        alert({ tier: 'inform', type: 'class_duplication', ingredients: ['aceclofenac', 'ibuprofen'] }),
        alert({ tier: 'interrupt', type: 'nsaid_double_high_risk', ingredients: ['aceclofenac', 'ibuprofen'] }),
        alert({ tier: 'inform', type: 'class_duplication', ingredients: ['omeprazole', 'pantoprazole'] }),
      ],
      ctx(),
    )
    expect(out.map((a) => `${a.type}:${a.ingredients.join('+')}`)).toEqual([
      'nsaid_double_high_risk:aceclofenac+ibuprofen',
      'class_duplication:omeprazole+pantoprazole',
    ])
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

describe('uncertain brand matches', () => {
  it('an Interrupt resting on a brand the resolver could not confirm becomes an Inform with a caveat', () => {
    const [a] = finalizeAlerts([alert({ tier: 'interrupt', type: 'dose_excess', ingredients: ['levocetirizine'], confidence: 0.6 })], ctx())
    expect(a.tier).toBe('inform')
    expect(a.uncertain_match).toBe(true)
    expect(a.caveats?.join(' ')).toMatch(/confirm the brand/)
  })

  it('a confident match keeps its Interrupt', () => {
    const [a] = finalizeAlerts([alert({ tier: 'interrupt', type: 'dose_excess', ingredients: ['paracetamol'], confidence: 0.97 })], ctx())
    expect(a.tier).toBe('interrupt')
    expect(a.uncertain_match).toBeUndefined()
  })
})
