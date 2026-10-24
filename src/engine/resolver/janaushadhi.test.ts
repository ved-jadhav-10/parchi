import { describe, expect, it } from 'vitest'
import { createResolver, decodeData } from './index'
import { createJanAushadhiIndex } from './janaushadhi'
import { rawData, testResolver } from './testing'
import type { JanAushadhiJson } from './data'

const doc: JanAushadhiJson = {
  schema: 1,
  ingredients: ['metformin', 'paracetamol'],
  items: [
    [1, 'Metformin Tablets IP 500mg', "10's", 'tablet', null, [[0, 500]]],
    [2, 'Metformin Prolonged release Tablets IP 500mg', "10's", 'tablet', 'modified-release', [[0, 500]]],
    [3, 'Paracetamol Syrup 125mg per 5ml', '60 ml', 'syrup', null, [[1, 125, 5]]],
  ],
}
const idx = createJanAushadhiIndex(doc)
const ing = (id: string, mg: number, per_volume_ml?: number) => ({ id, mg, ...(per_volume_ml ? { per_volume_ml } : {}) })

describe('jan aushadhi index', () => {
  it('matches identical ingredients and strengths in the same form group', () => {
    expect(idx.check([ing('metformin', 500)], 'tablet', 'Glycomet', true).map((r) => r.code)).toEqual([1])
    expect(idx.check([ing('paracetamol', 125, 5)], 'suspension', 'Calpol', true).map((r) => r.code)).toEqual([3])
  })

  it('does not match a different strength, per-volume or form', () => {
    expect(idx.check([ing('metformin', 850)], 'tablet', 'X', true)).toEqual([])
    expect(idx.check([ing('paracetamol', 125)], 'syrup', 'X', true)).toEqual([])
    expect(idx.check([ing('metformin', 500)], 'capsule', 'X', true)).toEqual([])
  })

  it('keeps modified-release and plain products apart', () => {
    expect(idx.check([ing('metformin', 500)], 'tablet', 'Glycomet SR', true).map((r) => r.code)).toEqual([2])
  })

  it('refuses incomplete compositions and unknown strengths', () => {
    expect(idx.check([ing('metformin', 500)], 'tablet', 'X', false)).toEqual([])
    expect(idx.check([{ id: 'metformin', mg: 0, strength_unknown: true }], 'tablet', 'X', true)).toEqual([])
  })

  it('is empty when the list was not loaded', () => {
    expect(createJanAushadhiIndex(undefined).check([ing('metformin', 500)], 'tablet', 'X', true)).toEqual([])
  })
})

describe('resolver jan_aushadhi', () => {
  it('lists the PMBJP generic for Dolo 650', () => {
    const res = testResolver().resolve('Dolo 650')
    expect(res.jan_aushadhi?.[0]).toMatchObject({ code: 511, name: expect.stringContaining('Paracetamol') })
  })

  it('lists the generic for a typed generic name and carries the release type', () => {
    const res = testResolver().resolve('Pantoprazole 40')
    expect(res.jan_aushadhi?.[0].release).toBe('gastro-resistant')
  })

  it('does not offer a single-ingredient generic for a combination', () => {
    const res = testResolver().resolve('Dolo 650')
    expect(res.jan_aushadhi?.every((j) => !/ and /i.test(j.name))).toBe(true)
  })

  it('works without the file', () => {
    const res = createResolver(decodeData(rawData.brands(), rawData.ingredients(), rawData.banned())).resolve('Dolo 650')
    expect(res.jan_aushadhi).toBeUndefined()
  })
})
