import { describe, expect, it } from 'vitest'
import type { ResolvedBrand } from '../../engine/contracts'
import { testResolver } from '../../engine/resolver/testing'
import { demoPatient, demoRxText } from '../demoCase'
import { brandLabel, candidateLabel, countsTowardTotal, ingredientLabel, isoDate, needsReview, notesFor, nsqMonth, sentenceCase, strengthLabel, tidy } from './resolved'

const resolver = testResolver()
const demo = resolver.resolveText(demoRxText, { age_years: demoPatient.age_years }).map((l) => l.resolved)
const byRaw = (raw: string) => demo.find((r) => r.raw === raw)!

describe('strength and ingredient labels', () => {
  it('never prints 0 mg for a strength that is unknown or not in mg', () => {
    expect(strengthLabel({ id: 'cetirizine', mg: 0, strength_unknown: true })).toBe('strength not listed')
    expect(strengthLabel({ id: 'povidone_iodine', mg: 0, other_unit: { unit: 'percent_ww', amount: 10 } })).toBe('10 % w/w')
    expect(strengthLabel({ id: 'x', mg: 0, other_unit: { unit: 'iu', amount: 1000 } })).toBe('1,000 IU')
  })
  it('prints liquids per volume', () => {
    expect(ingredientLabel({ id: 'ambroxol', mg: 30, per_volume_ml: 5 })).toBe('Ambroxol 30 mg per 5 mL')
  })
  it('works on real resolver output', () => {
    expect(resolver.resolve('Cetirizine').ingredients.map(strengthLabel)).toEqual(['strength not listed'])
    expect(strengthLabel(resolver.resolve('Betadine ointment').ingredients[0])).toBe('10 % w/w')
  })
})

describe('daily total and review flags', () => {
  it('leaves non-systemic lines out of the daily total', () => {
    expect(countsTowardTotal(resolver.resolve('Betadine ointment'))).toBe(false)
    expect(countsTowardTotal(byRaw('Dolo 650'))).toBe(true)
    expect(countsTowardTotal({ raw: 'x', brand: 'x', confidence: 1, ingredients: [], form: 'tablet', flags: [] })).toBe(true)
  })
  it("follows Track A's needs_pharmacist, and falls back to confidence only when it is absent", () => {
    const base: ResolvedBrand = { raw: 'x', brand: 'X', confidence: 0.5, ingredients: [], form: 'tablet', flags: [] }
    expect(needsReview({ ...base, needs_pharmacist: false })).toBe(false)
    expect(needsReview({ ...base, needs_pharmacist: true, confidence: 1 })).toBe(true)
    expect(needsReview(base)).toBe(true)
    expect(needsReview({ ...base, confidence: 0.95 })).toBe(false)
    expect(needsReview({ ...base, brand: null, confidence: 1 })).toBe(true)
  })
  it('sends generic and unmatched text to the pharmacist', () => {
    expect(needsReview(resolver.resolve('Cetirizine'))).toBe(true)
    expect(needsReview(resolver.resolve('zzzzqx 500'))).toBe(true)
  })
})

describe('line names', () => {
  it('names a generic by its ingredients and an unmatched line as not found', () => {
    expect(brandLabel(resolver.resolve('Cetirizine'))).toBe('Cetirizine')
    expect(brandLabel(resolver.resolve('zzzzqx 500'))).toBe('No match found')
    expect(brandLabel(byRaw('Brufan 400'))).toBe('Brufen 400')
  })
})

describe('Track A detail on the demo prescription', () => {
  it('carries the Pan-D failed batch with a month and a test the UI can print', () => {
    const pan = byRaw('Pan D')
    expect(pan.flags).toContain('nsq')
    expect(pan.nsq?.length).toBeGreaterThan(0)
    const n = pan.nsq![0]
    expect(nsqMonth(n.month)).toBe('Jul 2026')
    expect(sentenceCase(n.result)).toMatch(/^Tests for assay/)
  })
  it('explains a fuzzy read and lists what else the text could mean', () => {
    const b = byRaw('Brufan 400')
    expect(b.match).toBe('fuzzy')
    expect(b.notes?.[0]).toMatch(/Brufen 400/)
    expect(b.candidates?.length).toBeGreaterThan(0)
    expect(candidateLabel(b.candidates![0])).toMatch(/: .+ \d+ mg/)
  })
  it('offers a Jan Aushadhi generic and keeps the release type to confirm', () => {
    expect(byRaw('Dolo 650').jan_aushadhi?.[0].name).toMatch(/Paracetamol/)
    expect(byRaw('Omez 20').jan_aushadhi?.[0].release).toBe('gastro-resistant')
  })
})

describe('notes and sentence ends', () => {
  it('drops Track A notes that only repeat the failed batches or the incomplete composition', () => {
    const pan = byRaw('Pan D')
    expect(pan.notes?.some((n) => /^CDSCO lists/.test(n))).toBe(true)
    expect(notesFor(pan)).toEqual([])
    const wik = resolver.resolve('Wikoryl')
    expect(wik.composition_complete).toBe(false)
    expect(notesFor(wik).some((n) => /^Source lists at most two/.test(n))).toBe(false)
    expect(notesFor(wik).length).toBeGreaterThan(0)
  })
  it('keeps notes that carry something new', () => {
    expect(notesFor(byRaw('Brufan 400')).join(' ')).toMatch(/Brufen 400/)
  })
  it('never doubles a full stop', () => {
    expect(tidy('Ipca Laboratories Ltd.')).toBe('Ipca Laboratories Ltd')
    expect(tidy('rough surface.. ')).toBe('rough surface')
  })
})

describe('date and text formatting', () => {
  it('formats ISO dates and CDSCO months, and leaves anything else alone', () => {
    expect(isoDate('2026-06-11')).toBe('11 Jun 2026')
    expect(isoDate('June 2026')).toBe('June 2026')
    expect(nsqMonth('APR-2026')).toBe('Apr 2026')
    expect(nsqMonth('2026')).toBe('2026')
    expect(sentenceCase('  FAILED ASSAY ')).toBe('Failed assay')
  })
})
