import { describe, it, expect } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import demo from '../../../tests/fixtures/demo_rx.json'
import { createDdiIndex, type DdiJson } from './ddi'

const ddi = createDdiIndex(JSON.parse(ddiRaw) as DdiJson)

describe('DDInter lookup', () => {
  it('finds the demo ibuprofen + aspirin interaction with a source chip', () => {
    const hit = ddi.lookup('ibuprofen', 'aspirin')
    expect(hit?.level).toBe('major')
    expect(hit?.source).toMatch(/^DDInter\d+ \/ DDInter\d+$/)
    expect(ddi.lookup('aspirin', 'ibuprofen')).toEqual(hit) // order-independent
  })

  it('lists interactions among the demo prescription ingredients, most severe first', () => {
    const ids = demo.expected.resolver.flatMap((l) => l.ingredients.map((i) => i.id))
    const hits = ddi.among(ids)
    expect(hits.some((h) => h.a === 'aspirin' && h.b === 'ibuprofen')).toBe(true)
    expect(hits[0].level).toBe('major')
  })

  it('knows classic OPD interactions', () => {
    expect(ddi.lookup('clopidogrel', 'omeprazole')?.level).toBe('major')
    expect(ddi.lookup('warfarin', 'metronidazole')?.level).toBe('major')
  })

  it('reports coverage gaps instead of implying safety', () => {
    expect(ddi.covers('ibuprofen')).toBe(true)
    expect(ddi.covers('domperidone')).toBe(false) // not in DDInter: "no hit" means "unknown", not "safe"
    expect(ddi.gaps).toMatch(/domperidone/)
  })
})
