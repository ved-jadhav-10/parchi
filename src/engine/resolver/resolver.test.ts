import { describe, it, expect } from 'vitest'
import demo from '../../../tests/fixtures/demo_rx.json'
import { testResolver } from './testing'

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
const strip = (ings: { id: string; mg: number }[]) => ings.map(({ id, mg }) => ({ id, mg })).sort(byId)

describe('resolver on the demo prescription', () => {
  const r = testResolver()
  const lines = r.resolveText(demo.rx_text, { age_years: demo.patient.age_years })

  it('splits seven lines and keeps the sig text for Track B', () => {
    expect(lines).toHaveLength(7)
    expect(lines.map((l) => l.sig_text)).toEqual(['1-1-1 x5d', 'TDS', 'BD', 'SOS', 'OD', 'OD', 'OD'])
  })

  demo.expected.resolver.forEach((exp, i) => {
    it(`resolves "${exp.raw}" to ${exp.brand}`, () => {
      const got = lines[i].resolved
      expect(got.raw).toBe(exp.raw)
      expect(got.brand).toBe(exp.brand)
      expect(strip(got.ingredients)).toEqual(strip(exp.ingredients))
      expect(got.confidence).toBeGreaterThanOrEqual(0.75)
      // nsq is real-world batch data (Pan-D has a failed batch in the Jul 2026 CDSCO list); covered in nsq.test.ts
      expect(got.flags.filter((f) => f !== 'nsq')).toEqual([])
      expect(got.systemic).toBe(true)
    })
  })

  it('finds the hidden paracetamol: 4,100 mg/day at the fixture doses', () => {
    const perDose = lines.map((l) => l.resolved.ingredients.find((x) => x.id === 'paracetamol')?.mg ?? 0)
    const dosesPerDay = [3, 3, 2, 0, 0, 0, 0] // 1-1-1, TDS, BD (Track B owns real sig parsing)
    expect(perDose.reduce((sum, mg, i) => sum + mg * dosesPerDay[i], 0)).toBe(demo.expected.ledger_paracetamol_mg_day)
  })

  it('shows the misspelling correction with a confidence below exact', () => {
    const brufan = lines[3].resolved
    expect(brufan.match).toBe('fuzzy')
    expect(brufan.confidence).toBeLessThan(0.97)
    expect(brufan.notes?.[0]).toContain('Brufen 400')
  })

  it('keeps Zerodol-P (325 mg) but tells the pharmacist about the 500 mg variant', () => {
    const z = lines[2].resolved
    expect(z.candidates?.some((c) => c.ingredients.some((x) => x.id === 'paracetamol' && x.mg === 500))).toBe(true)
    expect(z.needs_pharmacist).toBeUndefined()
  })

  it('marks curated exact matches as such', () => {
    expect(lines[0].resolved.match).toBe('curated')
    expect(lines[0].resolved.confidence).toBe(1)
  })
})

describe('resolver behaviour', () => {
  const r = testResolver()

  it('assumes the highest strength and asks when no strength or base product exists', () => {
    const res = r.resolve('Dolo')
    expect(res.brand).toBe('Dolo 1000mg')
    expect(res.needs_pharmacist).toBe(true)
    expect(res.notes?.join(' ')).toMatch(/assumed the highest/)
  })

  it('reads typed strength to pick the variant', () => {
    expect(r.resolve('Dolo 500').ingredients).toEqual([{ id: 'paracetamol', mg: 500 }])
    expect(r.resolve('Augmentin 625').brand).toBe('Augmentin 625 Duo')
  })

  it('resolves generic names to canonical ingredients', () => {
    const res = r.resolve('Acetaminophen 500')
    expect(res.match).toBe('generic')
    expect(res.brand).toBeNull()
    expect(res.ingredients).toEqual([{ id: 'paracetamol', mg: 500 }])
  })

  it('flags a banned FDC typed as a generic combination', () => {
    const res = r.resolve('Cetirizine + Paracetamol + Phenylephrine')
    expect(res.flags).toContain('banned_fdc')
    expect(res.banned_fdc?.[0].so).toBe('S.O. 3385(E)')
    expect(res.banned_fdc?.[0].certain).toBe(true)
  })

  it('uses the verified composition for truncated dataset rows', () => {
    const res = r.resolve('Sinarest CCF')
    expect(res.ingredients.map((i) => i.id).sort()).toEqual(
      ['ambroxol', 'chlorphenamine', 'guaifenesin', 'paracetamol', 'phenylephrine'],
    )
    expect(res.composition_complete).toBe(true)
  })

  it('keeps syrup strengths per volume and honours a typed form', () => {
    const res = r.resolve('Ascoril LS syp')
    expect(res.form).toBe('syrup')
    expect(res.ingredients).toContainEqual({ id: 'ambroxol', mg: 30, per_volume_ml: 5 })
  })

  it('prefers liquid forms for children when the form is not written', () => {
    expect(r.resolve('Combiflam', { age_years: 6 }).form).not.toBe('tablet')
    expect(r.resolve('Combiflam', { age_years: 40 }).form).toBe('tablet')
  })

  it('reads Devanagari brand names', () => {
    const res = r.resolve('डोलो 650')
    expect(res.brand).toBe('Dolo 650')
  })

  it('does not name a brand for unrelated text', () => {
    const res = r.resolve('qwxz kplm')
    expect(res.brand).toBeNull()
    expect(res.needs_pharmacist).toBe(true)
  })

  it('marks topicals as non-systemic so they stay out of the dose ledger', () => {
    const res = r.resolve('Betnovate cream')
    expect(res.route).toBe('topical')
    expect(res.systemic).toBe(false)
    expect(res.ingredients[0]).toMatchObject({ id: 'betamethasone', mg: 0, other_unit: { unit: 'percent_ww', amount: 0.1 } })
  })

  it('asks instead of silently counting a tablet when the typed form does not exist', () => {
    const res = r.resolve('Volini gel')
    expect(res.needs_pharmacist).toBe(true)
    expect(res.notes?.join(' ')).toMatch(/No topical form found/)
  })

  it('maps any spelling to the canonical id', () => {
    expect(r.canonicalId('Chlorpheniramine Maleate')).toBe('chlorphenamine')
    expect(r.canonicalId('Acetaminophen')).toBe('paracetamol')
    expect(r.canonicalId('not a drug at all')).toBeNull()
  })
})

describe('liquid strengths for the mL -> mg ledger', () => {
  const r = testResolver()

  it('flags a per-5-mL volume inferred for a syrup or suspension that did not state one', () => {
    const res = r.resolve('Combiflam suspension')
    expect(res.form).toBe('suspension')
    for (const ing of res.ingredients) {
      expect(ing.per_volume_ml).toBe(5)
      expect(ing.per_volume_assumed).toBe(true)
    }
  })

  it('keeps stated volumes unflagged (oral drops per 1 mL)', () => {
    const res = r.resolve('Calpol Paediatric drops')
    expect(res.ingredients).toEqual([{ id: 'paracetamol', mg: 100, per_volume_ml: 1 }])
  })
})

describe('verified cold and analgesic combinations (hidden paracetamol)', () => {
  const r = testResolver()
  const paracetamolMg = (q: string) => r.resolve(q).ingredients.find((i) => i.id === 'paracetamol')?.mg

  it.each([
    ['Vicks Action 500 Advanced', 500],
    ['Cheston Cold Total', 325],
    ['D Cold Total', 500],
    ['Wikoryl 10', 500],
    ['Coldact Plus', 500],
    ['Voveran Plus', 325],
    ['Ultracet', 325],
    ['Hifenac P', 325],
    ['Zerodol SP', 325],
  ])('%s carries %i mg paracetamol and a complete composition', (q, mg) => {
    expect(paracetamolMg(q)).toBe(mg)
    expect(r.resolve(q).composition_complete).toBe(true)
  })

  it('flags Sinarest LP New under the right notification (levocetirizine + phenylephrine + paracetamol)', () => {
    const res = r.resolve('Sinarest LP New')
    expect(res.flags).toContain('banned_fdc')
    expect(res.banned_fdc?.map((b) => b.so)).toEqual(['S.O. 3388(E)'])
    expect(res.banned_fdc?.[0].certain).toBe(true)
  })

  it('keeps the Hifenac P 650 mg variant reachable by strength', () => {
    expect(r.resolve('Hifenac P 650').ingredients.find((i) => i.id === 'paracetamol')?.mg).toBe(650)
  })
})

describe('schedule hints (weekly / monthly drugs)', () => {
  const r = testResolver()

  it('flags methotrexate tablets as weekly, with a source, for brands and generics', () => {
    for (const q of ['Folitrax 15', 'Methotrexate 7.5 tab']) {
      const res = r.resolve(q)
      expect(res.schedule_hint).toBe('weekly')
      expect(res.schedule_source).toMatch(/^https:\/\/www\.nhs\.uk\/medicines\/methotrexate/)
      expect(res.notes?.join(' ')).toMatch(/weekly, not daily/)
    }
  })

  it('is strength-specific: alendronate 70 mg is weekly, the 10 mg daily tablet is not', () => {
    expect(r.resolve('Osteofos 70').schedule_hint).toBe('weekly')
    expect(r.resolve('Osteofos 10').schedule_hint).toBeUndefined()
  })

  it('flags ibandronate 150 mg tablets as monthly', () => {
    expect(r.resolve('Idrofos 150').schedule_hint).toBe('monthly')
  })

  it('leaves ordinary daily drugs alone, including methotrexate injection vials', () => {
    expect(r.resolve('Dolo 650').schedule_hint).toBeUndefined()
    expect(r.resolve('Folitrax 50 injection').schedule_hint).toBeUndefined()
  })
})

describe('systemic is always set explicitly', () => {
  const r = testResolver()
  const inputs = [
    'Dolo 650', 'Brufan 400', 'Dolo', 'Paracetamol 500', 'Cetirizine + Paracetamol + Phenylephrine', 'Betnovate cream',
    'Volini gel', 'Ascoril LS syp', 'डोलो 650', 'qwxz kplm', 'Calpol drops', 'Sinarest LP New', '', '   ', '650', 'tab',
    'Nise', 'Combiflem', 'Zerodol P', 'Methotrexate 7.5',
  ]
  it.each(inputs)('%j', (q) => {
    const res = r.resolve(q)
    expect(typeof res.systemic).toBe('boolean')
    expect(res.route).toBeDefined()
    if (res.ingredients.length === 0) expect(res.systemic).toBe(false)
  })
})
