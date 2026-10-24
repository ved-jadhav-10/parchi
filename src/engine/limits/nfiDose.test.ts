// Independent check (tier T1, docs/TEST_PLAN.md): our adult daily maxima against the National Formulary of India,
// as quoted in Eka Care's NFI question set (MIT). We did not write these numbers and the engine does not read them.
// Only the drugs present in both lists can be compared, so this is a spot check (5 of 157 dose questions), not coverage.
import { describe, expect, it } from 'vitest'
import { LIMITS } from './index'
import fixture from './fixtures/nfi_doses.json'

type Check = { ingredient: string; nfi_max_mg_day: number; relation: 'equal' | 'at_most'; derived: boolean; row: number; question: string }

describe('adult maxima vs the National Formulary of India (Eka NFI MCQA)', () => {
  const checks = fixture.checks as Check[]

  it.each(checks.map((c) => [c.ingredient, c] as const))('%s', (_id, c) => {
    const ours = LIMITS.ingredients[c.ingredient]?.adult?.max_mg_day
    expect(ours, `${c.ingredient} has no adult maximum on file`).toBeDefined()
    if (c.relation === 'equal') expect(ours).toBe(c.nfi_max_mg_day)
    else expect(ours!).toBeLessThanOrEqual(c.nfi_max_mg_day)
  })

  it('records where each number came from, so a reviewer can look it up', () => {
    for (const c of checks) {
      expect(c.row).toBeGreaterThanOrEqual(0)
      expect(c.question.length).toBeGreaterThan(10)
    }
    expect(fixture._note).toContain('Eka_NFI_MCQA')
  })
})
