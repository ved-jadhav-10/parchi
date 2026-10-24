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
      expect(got.flags).toEqual([])
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
