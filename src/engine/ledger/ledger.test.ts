import { describe, it, expect } from 'vitest'
import type { Ingredient, ResolvedBrand } from '../contracts'
import { parseSig } from '../sig'
import { computeLedger, type LedgerLine } from './index'

function brand(name: string, ingredients: Ingredient[], extra: Partial<ResolvedBrand> = {}): ResolvedBrand {
  return { raw: name, brand: name, confidence: 1, ingredients, form: 'tablet', flags: [], systemic: true, route: 'oral', ...extra }
}
const line = (b: ResolvedBrand, sig: string): LedgerLine => ({ resolved: b, sig: parseSig(sig) })
const para = (mg: number): Ingredient[] => [{ id: 'paracetamol', mg }]

describe('computeLedger', () => {
  it('adds the same ingredient across different brands and keeps each source', () => {
    const { ledger } = computeLedger([
      line(brand('Dolo 650', para(650)), '1-1-1'),
      line(brand('Crocin Cold & Flu Max', [...para(500), { id: 'caffeine', mg: 32 }]), 'TDS'),
      line(brand('Zerodol-P', [{ id: 'aceclofenac', mg: 100 }, ...para(325)]), 'BD'),
    ])
    expect(ledger.paracetamol.total_mg_day).toBe(4100)
    expect(ledger.paracetamol.sources).toEqual(['Dolo 650: 3 x 650 mg', 'Crocin Cold & Flu Max: 3 x 500 mg', 'Zerodol-P: 2 x 325 mg'])
    expect(ledger.caffeine.total_mg_day).toBe(96)
    expect(ledger.aceclofenac.total_mg_day).toBe(200)
  })

  it('counts half tablets and uneven slots', () => {
    expect(computeLedger([line(brand('Dolo 650', para(650)), '1/2-0-1/2')]).ledger.paracetamol.total_mg_day).toBe(650)
    expect(computeLedger([line(brand('X', para(500)), '1-0-2')]).ledger.paracetamol.total_mg_day).toBe(1500)
  })

  it('counts weekly medicines as a fraction of a day', () => {
    const { ledger } = computeLedger([line(brand('Alendronate 70', [{ id: 'alendronic-acid', mg: 70 }]), 'once weekly')])
    expect(ledger['alendronic-acid'].total_mg_day).toBe(10)
  })

  describe('SOS (as needed) at its worst case', () => {
    it('uses a written maximum', () => {
      const { ledger, notes } = computeLedger([line(brand('Brufen 400', [{ id: 'ibuprofen', mg: 400 }]), 'SOS max 3/day')])
      expect(ledger.ibuprofen).toMatchObject({ total_mg_day: 1200, sos_mg_day: 1200, scheduled_mg_day: 0 })
      expect(ledger.ibuprofen.sources[0]).toBe('Brufen 400: SOS, up to 3 x 400 mg')
      expect(notes).toEqual([])
    })
    it('uses the pharmacist-set cap for the ingredient when no maximum is written, and says it was assumed', () => {
      const { ledger, notes } = computeLedger([line(brand('Dolo 650', para(650)), 'SOS')])
      expect(ledger.paracetamol.total_mg_day).toBe(2600) // 4 doses x 650 (limits.json, unverified)
      expect(notes[0]).toMatchObject({ kind: 'sos_cap_assumed', ingredient: 'paracetamol' })
      expect(notes[0].message).toMatch(/assumed 4 doses\/day.*unverified/)
      expect(ledger.paracetamol.caveats?.join(' ')).toMatch(/SOS counted at an assumed 4 doses\/day/)
    })
    it('falls back to the class cap through classesOf, then to the default', () => {
      const nsaid = computeLedger([line(brand('Brufen 400', [{ id: 'ibuprofen', mg: 400 }]), 'SOS')], { classesOf: () => ['nsaid'] })
      expect(nsaid.ledger.ibuprofen.total_mg_day).toBe(1200)
      const other = computeLedger([line(brand('Cetzine', [{ id: 'cetirizine', mg: 10 }]), 'SOS')])
      expect(other.ledger.cetirizine.total_mg_day).toBe(30)
    })
    it('adds SOS on top of the scheduled doses of the same ingredient', () => {
      const { ledger } = computeLedger([line(brand('Dolo 650', para(650)), 'TDS'), line(brand('Crocin 500', para(500)), 'SOS max 2')])
      expect(ledger.paracetamol).toMatchObject({ scheduled_mg_day: 1950, sos_mg_day: 1000, total_mg_day: 2950 })
    })
  })

  describe('liquids', () => {
    const ascoril = brand('Ascoril LS', [{ id: 'ambroxol', mg: 30, per_volume_ml: 5 }], { form: 'syrup' })
    it('converts mL to mg using the strength per mL', () => {
      expect(computeLedger([line(ascoril, '5 ml TDS')]).ledger.ambroxol.total_mg_day).toBe(90)
      expect(computeLedger([line(ascoril, '2 tsp BD')]).ledger.ambroxol.total_mg_day).toBe(120)
      expect(computeLedger([line(ascoril, '10 ml SOS max 3')]).ledger.ambroxol.total_mg_day).toBe(180)
    })
    it('assumes one measure per dose when no volume is written, and says so', () => {
      const { ledger, notes } = computeLedger([line(ascoril, 'TDS')])
      expect(ledger.ambroxol.total_mg_day).toBe(90)
      expect(notes[0]).toMatchObject({ kind: 'assumed_measure' })
    })
    it('adds a tablet and a syrup of the same ingredient together', () => {
      const tab = brand('Sinarest-CCF', [{ id: 'ambroxol', mg: 30 }])
      const { ledger } = computeLedger([line(tab, 'TDS'), line(ascoril, '5 ml TDS')])
      expect(ledger.ambroxol.total_mg_day).toBe(180)
    })
  })

  describe('things that must not be counted as 0 mg', () => {
    it('leaves out ingredients with no usable strength and says so', () => {
      const b = brand('Vit mix', [{ id: 'vitamin-d3', mg: 0, other_unit: { unit: 'IU', amount: 60000 } }, { id: 'calcium', mg: 0, strength_unknown: true }])
      const { ledger, notes } = computeLedger([line(b, 'OD')])
      expect(ledger).toEqual({})
      expect(notes.map((n) => n.kind)).toEqual(['unquantified_strength', 'unquantified_strength'])
      expect(notes[0].message).toMatch(/IU, not mg/)
    })
    it('leaves out topical and eye products from the systemic total', () => {
      const gel = brand('Volini gel', [{ id: 'diclofenac', mg: 11.6 }], { systemic: false, route: 'topical' })
      const { ledger, notes } = computeLedger([line(gel, 'BD')])
      expect(ledger).toEqual({})
      expect(notes[0].kind).toBe('not_systemic')
      const drops = brand('Eye drops', [{ id: 'x', mg: 1 }], { route: 'ophthalmic', systemic: undefined })
      expect(computeLedger([line(drops, 'TDS')]).ledger).toEqual({})
    })
    it('reports unrecognised lines instead of silently skipping them', () => {
      const { ledger, notes } = computeLedger([line(brand('Zzxq', [], { brand: null, match: 'none' }), 'OD')])
      expect(ledger).toEqual({})
      expect(notes[0].message).toMatch(/was not recognised/)
    })
    it('does not turn drops or puffs into mg', () => {
      const { ledger, notes } = computeLedger([line(brand('Nasal drops', [{ id: 'x', mg: 5 }]), '2 drops TDS')])
      expect(ledger).toEqual({})
      expect(notes[0].kind).toBe('unquantified_dose')
    })
  })

  describe('liquids with a missing or assumed volume (Track A data gaps)', () => {
    it('does not count a liquid whose strength has no stated volume, and says so', () => {
      const drops = brand('Wikoryl drops', [{ id: 'paracetamol', mg: 125 }], { form: 'oral_drops' })
      const { ledger, notes } = computeLedger([line(drops, '0.6 ml TDS')])
      expect(ledger).toEqual({})
      expect(notes[0]).toMatchObject({ kind: 'unquantified_volume', ingredient: 'paracetamol' })
      expect(notes[0].message).toMatch(/does not say what volume/)
    })
    it('counts drops stored as mg per 1 mL from the written mL dose (Calpol drops 100 mg/mL)', () => {
      const calpol = brand('Calpol drops', [{ id: 'paracetamol', mg: 100, per_volume_ml: 1 }], { form: 'oral_drops' })
      expect(computeLedger([line(calpol, '0.6 ml TDS')]).ledger.paracetamol.total_mg_day).toBe(180)
    })
    it('adds a caveat when the per-volume strength was assumed rather than stated', () => {
      const syrup = brand('Some syrup', [{ id: 'paracetamol', mg: 125, per_volume_ml: 5, per_volume_assumed: true }], { form: 'syrup' })
      const { ledger } = computeLedger([line(syrup, '5 ml TDS')])
      expect(ledger.paracetamol.total_mg_day).toBe(375)
      expect(ledger.paracetamol.caveats?.[0]).toMatch(/per 5 mL was not stated and is assumed/)
    })
    it('still counts non-oral-liquid forms such as injections per dose', () => {
      const inj = brand('Diclofenac inj', [{ id: 'diclofenac', mg: 75 }], { form: 'injection', route: 'parenteral' })
      expect(computeLedger([line(inj, 'BD')]).ledger.diclofenac.total_mg_day).toBe(150)
    })
  })

  describe('weekly and monthly drugs read as daily', () => {
    const mtx = (extra: Partial<ResolvedBrand> = {}) =>
      brand('Methotrexate 2.5', [{ id: 'methotrexate', mg: 2.5 }], { schedule_hint: 'weekly', schedule_source: 'NHS', ...extra })
    it('notes a daily sig on a weekly drug, still counting what was written', () => {
      const { ledger, notes } = computeLedger([line(mtx(), 'OD')])
      expect(notes[0]).toMatchObject({ kind: 'schedule_mismatch', brand: 'Methotrexate 2.5' })
      expect(notes[0].message).toMatch(/once a week.*NHS.*1 time a day/)
      expect(ledger.methotrexate.total_mg_day).toBe(2.5)
    })
    it('is quiet when the sig is weekly, and flags a missing sig', () => {
      expect(computeLedger([line(mtx(), 'once weekly')]).notes).toEqual([])
      // No dosing at all: not guessed as daily, but the note still says the drug is normally weekly.
      const missing = computeLedger([line(mtx(), '')]).notes
      expect(missing.map((n) => n.kind)).toEqual(['dosing_not_entered'])
      expect(missing[0].message).toContain('once a week')
      expect(computeLedger([line(mtx(), 'OD')]).notes[0].kind).toBe('schedule_mismatch')
    })
    it('handles monthly drugs', () => {
      const ibn = brand('Ibandronate 150', [{ id: 'ibandronic-acid', mg: 150 }], { schedule_hint: 'monthly' })
      expect(computeLedger([line(ibn, 'once monthly')]).notes).toEqual([])
      expect(computeLedger([line(ibn, 'OD')]).notes[0].kind).toBe('schedule_mismatch')
    })
    it('does nothing for brands without a schedule hint', () => {
      expect(computeLedger([line(brand('Dolo 650', para(650)), 'TDS')]).notes).toEqual([])
    })
  })

  describe('caveats the pharmacist should see next to the total', () => {
    it('warns when a brand composition may be incomplete, the match is uncertain, or dosing was assumed', () => {
      const incomplete = brand('Cold FDC', para(500), { composition_complete: false })
      const uncertain = brand('Brufen 400', [{ id: 'ibuprofen', mg: 400 }], { confidence: 0.7, needs_pharmacist: true })
      const noSig = brand('Crocin', para(500))
      const { ledger } = computeLedger([line(incomplete, 'BD'), line(uncertain, 'BD'), line(noSig, 'qqq')])
      const c = ledger.paracetamol.caveats!.join(' | ')
      expect(c).toMatch(/Cold FDC: the source may list only some/)
      expect(c).toMatch(/Crocin: dosing was assumed \(Could not find how often to take it; assumed once daily\)/)
      expect(ledger.ibuprofen.caveats![0]).toMatch(/brand match is uncertain \(70%\)/)
    })
    it('leaves a line with no dosing out of the totals instead of assuming a frequency', () => {
      const r = computeLedger([line(brand('Crocin', para(500)), ''), line(brand('Dolo 650', para(650)), 'TDS')])
      expect(r.ledger.paracetamol.total_mg_day).toBe(1950)
      expect(r.notes.map((n) => `${n.kind}:${n.brand}`)).toEqual(['dosing_not_entered:Crocin'])
    })
    it('has no caveats key when there is nothing to warn about', () => {
      expect(computeLedger([line(brand('Dolo 650', para(650)), 'TDS')]).ledger.paracetamol.caveats).toBeUndefined()
    })
  })

  it('handles an empty prescription', () => {
    expect(computeLedger([])).toEqual({ ledger: {}, notes: [] })
  })
})
