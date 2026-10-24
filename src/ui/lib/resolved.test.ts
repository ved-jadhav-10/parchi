import { describe, expect, it } from 'vitest'
import type { Alert, ResolvedBrand } from '../../engine/contracts'
import { testResolver } from '../../engine/resolver/testing'
import { parseSig } from '../../engine/sig'
import { demoPatient, demoRxText } from '../demoCase'
import { alertTypeLabel, brandLabel, movedBecause, candidateLabel, countsTowardTotal, ingredientLabel, isoDate, needsReview, notesFor, nsqMonth, scheduleLabel, sentenceCase, sigLabel, sigNotes, strengthLabel, tidy } from './resolved'

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
    const incomplete: ResolvedBrand = {
      raw: 'x', brand: 'X', confidence: 1, ingredients: [], form: 'tablet', flags: [], composition_complete: false,
      notes: ['Source lists at most two ingredients for this product; check the strip for more.', 'Also sold as X 325; confirm the strength.'],
    }
    expect(notesFor(incomplete)).toEqual(['Also sold as X 325; confirm the strength.'])
    expect(notesFor({ ...incomplete, composition_complete: true })).toHaveLength(2)
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

describe('sig wording from Track B', () => {
  it('says what a scheduled sig means in doses a day', () => {
    expect(sigLabel(parseSig('1-1-1 x5d'))).toBe('3 a day for 5 days')
    expect(sigLabel(parseSig('BD'))).toBe('2 a day')
  })
  it('words as-needed lines with their cap, or the assumption when none is written', () => {
    expect(sigLabel(parseSig('SOS max 3'))).toBe('As needed, up to 3 a day')
    expect(sigLabel(parseSig('SOS'))).toMatch(/As needed/)
  })
  it('words a weekly sig as days apart, not a fraction', () => {
    expect(sigLabel(parseSig('once weekly'))).toBe('about once every 7 days')
  })
  it('passes Track B assumptions on to the pharmacist', () => {
    expect(sigNotes(parseSig('')).join(' ')).toMatch(/once daily/i)
    expect(sigNotes(parseSig('1-0-1'))).toEqual([])
  })
})

describe('alert type names', () => {
  it('names the types Track C raises and falls back for unknown ones', () => {
    expect(alertTypeLabel('ddi')).toBe('Interaction')
    expect(alertTypeLabel('nsaid_renal')).toBe('Kidney function')
    expect(alertTypeLabel('some_new_rule')).toBe('Some new rule')
  })
})

describe('why an alert moved tier', () => {
  const a: Alert = { tier: 'inform', type: 'dose_excess', ingredients: ['x'], reason: 'r', source: 's', confidence: 1 }
  it('explains a budget demotion and a suppression, and says nothing otherwise', () => {
    expect(movedBecause({ ...a, budget_demoted: true })).toMatch(/alert budget lowers the extras/)
    expect(movedBecause({ ...a, tier: 'silent', suppressed: 'vitamin_duplicate' })).toBe('Quieted by the suppression list (vitamin duplicate).')
    expect(movedBecause(a)).toBeNull()
  })
})

describe('assumed volumes and usual schedules', () => {
  it('says when a per-volume strength was inferred', () => {
    expect(ingredientLabel({ id: 'x', mg: 100, per_volume_ml: 5, per_volume_assumed: true })).toBe('X 100 mg per 5 mL (volume assumed)')
  })
  it('says a drug is not taken daily', () => {
    const base: ResolvedBrand = { raw: 'x', brand: 'X', confidence: 1, ingredients: [], form: 'tablet', flags: [] }
    expect(scheduleLabel({ ...base, schedule_hint: 'weekly' })).toBe('Usually taken weekly, not daily.')
    expect(scheduleLabel(base)).toBeNull()
  })
})
