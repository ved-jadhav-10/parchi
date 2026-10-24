import { describe, expect, it } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import ingredientsRaw from '../../../public/data/ingredients.json?raw'
import supplementRaw from '../../../public/data/ddi_supplement.json?raw'
import { realPipeline } from '../rules/testing'
import { createDdiIndex, type DdiJson, type DdiSupplementJson } from './ddi'

const base = JSON.parse(ddiRaw) as DdiJson
const supplement = JSON.parse(supplementRaw) as DdiSupplementJson
const plain = createDdiIndex(base)
const ddi = createDdiIndex(base, supplement)

describe('curated interaction supplement', () => {
  it('only names canonical ingredient ids and unverified rules with a source', () => {
    const known = (JSON.parse(ingredientsRaw) as { ingredients: Record<string, unknown> }).ingredients
    for (const r of supplement.rules) {
      for (const id of [...r.a, ...r.b]) expect(known[id], `${r.id}: ${id}`).toBeDefined()
      expect(r.pharmacist_approved, r.id).toBe(false)
      expect(r.source.length, r.id).toBeGreaterThan(10)
      expect(base.levels, r.id).toContain(r.level)
    }
  })

  it('adds the pairs DDInter lacks, in either order, with a note and a Curated source chip', () => {
    expect(plain.lookup('ramipril', 'spironolactone')).toBeNull()
    const hit = ddi.lookup('spironolactone', 'ramipril')!
    expect(hit.level).toBe('major')
    expect(hit.curated).toBe(true)
    expect(hit.source).toMatch(/^Curated: /)
    expect(hit.note).toContain('potassium')
    expect(ddi.lookup('telmisartan', 'ramipril')?.note).toContain('dual blockade')
  })

  it('never softens a pair DDInter already lists', () => {
    const before = plain.lookup('clopidogrel', 'omeprazole')
    expect(ddi.lookup('clopidogrel', 'omeprazole')).toEqual(before)
    for (const r of supplement.rules) {
      for (const a of r.a) {
        for (const b of r.b) {
          const p = plain.lookup(a, b)
          const q = ddi.lookup(a, b)!
          if (p) expect(base.levels.indexOf(q.level), `${a}+${b}`).toBeGreaterThanOrEqual(base.levels.indexOf(p.level))
        }
      }
    }
  })

  it('works without the supplement', () => {
    expect(createDdiIndex(base, undefined).lookup('ramipril', 'spironolactone')).toBeNull()
  })
})

describe('curated pairs in the pipeline', () => {
  const check = realPipeline()
  const adult = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' as const }

  it('raises an Inform that says why, marked as a draft', async () => {
    const { alerts } = await check('Cardace 5 OD; Aldactone 25 OD', adult)
    const a = alerts.find((x) => x.type === 'ddi')!
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain('both raise potassium')
    expect(a.source).toMatch(/^Curated/)
    expect(a.approved).toBe(false)
  })
})
