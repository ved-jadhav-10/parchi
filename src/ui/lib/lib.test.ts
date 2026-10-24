import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { limitState, mg, pct } from './format'
import { toFhirBundle } from './fhir'
import { normalizeBenchmark, normalizeRows } from './dataFiles'
import { pickHiddenIngredient, splitRx } from './demo'
import type { ResolvedBrand, Sig } from '../../engine/contracts'

const resolved = (raw: string, brand: string | null): ResolvedBrand => ({ raw, brand, confidence: 1, ingredients: [], form: 'tablet', flags: [] })
const sig = (doses: number, sos = false): Sig => ({ doses_per_day: doses, max_doses_per_day: doses, sos })

describe('format', () => {
  it('formats mg with Indian grouping and percentages', () => {
    expect(mg(4100)).toBe('4,100')
    expect(mg(1234567)).toBe('12,34,567')
    expect(pct(0.826)).toBe('83%')
    expect(pct(undefined)).toBe('—')
  })

  it('classifies limit state at the 80% and 100% edges', () => {
    expect(limitState(3199, 4000)).toBe('ok')
    expect(limitState(3200, 4000)).toBe('inform')
    expect(limitState(4000, 4000)).toBe('inform')
    expect(limitState(4001, 4000)).toBe('interrupt')
  })
})

describe('csv', () => {
  it('quotes commas, quotes and newlines and joins arrays', () => {
    const out = toCsv(['a', 'b'], [{ a: 'x,y', b: ['p', 'q'] }, { a: 'say "hi"', b: 'l1\nl2' }])
    expect(out).toBe('a,b\r\n"x,y",p; q\r\n"say ""hi""","l1\nl2"')
  })
})

describe('fhir stub', () => {
  it('makes a draft MedicationRequest per resolved line and treats SOS as as-needed', () => {
    const b = toFhirBundle(
      [{ resolved: resolved('Dolo 650', 'Dolo 650'), sig: sig(3) }, { resolved: resolved('Brufan', 'Brufen 400'), sig: sig(0, true) }, { resolved: resolved('???', null), sig: sig(1) }],
      { age_years: 68, sex: 'M' },
    )
    const reqs = b.entry.filter((e) => e.resource.resourceType === 'MedicationRequest').map((e) => e.resource as any)
    expect(reqs).toHaveLength(2)
    expect(reqs[0].status).toBe('draft')
    expect(reqs[0].dosageInstruction[0].timing.repeat.frequency).toBe(3)
    expect(reqs[1].dosageInstruction[0].asNeededBoolean).toBe(true)
    expect(reqs[1].dosageInstruction[0].timing).toBeUndefined()
    expect((b.entry[0].resource as any).gender).toBe('male')
  })
})

describe('data files', () => {
  it('reads a bare array or a wrapped array, keeping approval unknown when absent', () => {
    const rows = normalizeRows({ limits: [{ ingredient: 'paracetamol', population: 'adult', max_mg_day: 4000, source: 'S', pharmacist_approved: false }, { id: 'x' }] })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ name: 'paracetamol', detail: 'adult', value: '4000', source: 'S', approved: false })
    expect(rows[1].approved).toBeUndefined()
    expect(normalizeRows([{ ingredients: ['ppi', 'domperidone'] }])[0].name).toBe('ppi + domperidone')
    expect(normalizeRows('<html>')).toEqual([])
  })

  it('rejects benchmark files without systems and drops non-numeric metrics', () => {
    expect(normalizeBenchmark({})).toBeNull()
    expect(normalizeBenchmark({ systems: [] })).toBeNull()
    const b = normalizeBenchmark({ n_rx: 30, systems: [{ name: 'engine', alerts_per_rx: 3.2, clean_fp_rate: 'n/a', by_type: { overdose: { precision: 1, recall: 'x' } } }] })!
    expect(b.systems[0].clean_fp_rate).toBeUndefined()
    expect(b.systems[0].by_type.overdose).toEqual({ precision: 1, recall: undefined })
  })
})

describe('demo helpers', () => {
  it('splits a typed Rx on ; and newlines', () => {
    expect(splitRx('Dolo 650 TDS; Pan D OD;\n  Omez 20 OD ;')).toEqual(['Dolo 650 TDS', 'Pan D OD', 'Omez 20 OD'])
  })

  it('picks the ingredient in the most distinct brands, else null', () => {
    const l = {
      paracetamol: { total_mg_day: 4100, sources: ['Dolo', 'Crocin', 'Zerodol-P', 'Dolo'], limit_mg_day: 4000 },
      ibuprofen: { total_mg_day: 1200, sources: ['Brufen'] },
      omeprazole: { total_mg_day: 40, sources: ['Omez', 'Omee'] },
    }
    const hit = pickHiddenIngredient(l)!
    expect(hit.id).toBe('paracetamol')
    expect(hit.sources).toEqual(['Dolo', 'Crocin', 'Zerodol-P'])
    expect(pickHiddenIngredient({ ibuprofen: l.ibuprofen })).toBeNull()
  })

  it('breaks a tie on the brand count by closeness to the limit', () => {
    const l = {
      a: { total_mg_day: 100, sources: ['x', 'y'], limit_mg_day: 1000 },
      b: { total_mg_day: 900, sources: ['x', 'z'], limit_mg_day: 1000 },
    }
    expect(pickHiddenIngredient(l)!.id).toBe('b')
  })
})
