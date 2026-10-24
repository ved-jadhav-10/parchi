import { describe, it, expect } from 'vitest'
import { parseSig } from './parse'

// [text, doses_per_day, max_doses_per_day, sos, duration_days]
const cases: [string, number, number, boolean, number | undefined][] = [
  // the demo prescription
  ['1-1-1 x5d', 3, 3, false, 5],
  ['TDS', 3, 3, false, undefined],
  ['BD', 2, 2, false, undefined],
  ['OD', 1, 1, false, undefined],
  // abbreviations
  ['QID', 4, 4, false, undefined],
  ['tid', 3, 3, false, undefined],
  ['bid', 2, 2, false, undefined],
  ['HS', 1, 1, false, undefined],
  ['once daily', 1, 1, false, undefined],
  ['twice a day', 2, 2, false, undefined],
  ['thrice daily', 3, 3, false, undefined],
  ['3 times a day', 3, 3, false, undefined],
  ['3x/day', 3, 3, false, undefined],
  ['2/day', 2, 2, false, undefined],
  // slot patterns
  ['1-0-1', 2, 2, false, undefined],
  ['0-0-1', 1, 1, false, undefined],
  ['1-1-1-1', 4, 4, false, undefined],
  ['½-0-½', 1, 1, false, undefined],
  ['1/2-0-1/2', 1, 1, false, undefined],
  ['1-0-2', 3, 3, false, undefined],
  ['1+0+1', 2, 2, false, undefined],
  ['1-0-1 AC x 1 week', 2, 2, false, 7],
  // unit counts and ranges
  ['2 tab TDS', 6, 6, false, undefined],
  ['1 tab BD for 5 days', 2, 2, false, 5],
  ['2 caps OD x2w', 2, 2, false, 14],
  ['1-2 tab TDS', 6, 6, false, undefined],
  // every N hours
  ['q8h', 3, 3, false, undefined],
  ['every 6 hours', 4, 4, false, undefined],
  ['q12h x3d', 2, 2, false, 3],
  // duration
  ['BD x 10 days', 2, 2, false, 10],
  ['OD for 1 month', 1, 1, false, 30],
  ['TDS x5d after food', 3, 3, false, 5],
  // SOS
  ['SOS', 0, 0, true, undefined],
  ['sos max 3/day', 0, 3, true, undefined],
  ['SOS upto 4 times a day', 0, 4, true, undefined],
  ['SOS TDS', 0, 3, true, undefined],
  ['PRN', 0, 0, true, undefined],
  ['S.O.S. if fever', 0, 0, true, undefined],
  ['as needed max BD', 0, 2, true, undefined],
  // Hinglish
  ['subah shaam', 2, 2, false, undefined],
  ['subah-shaam khane ke baad', 2, 2, false, undefined],
  ['raat ko', 1, 1, false, undefined],
  ['subah dopahar shaam', 3, 3, false, undefined],
  ['din mein 2 baar', 2, 2, false, undefined],
  ['do baar', 2, 2, false, undefined],
  ['teen baar 5 din', 3, 3, false, 5],
  ['jab zaroorat ho', 0, 0, true, undefined],
  // weekly
  ['once weekly', 1 / 7, 1 / 7, false, undefined],
  ['twice a week', 2 / 7, 2 / 7, false, undefined],
  ['alternate days', 0.5, 0.5, false, undefined],
  ['once monthly', 1 / 30, 1 / 30, false, undefined],
  // "week" as a duration, not a schedule
  ['1 tab BD for a week', 2, 2, false, 7],
  ['TDS for one week', 3, 3, false, 7],
  ['OD for a month', 1, 1, false, 30],
  ['BD for a fortnight', 2, 2, false, 14],
  ['BD x 2 fortnights', 2, 2, false, 28],
  ['once a week', 1 / 7, 1 / 7, false, undefined],
  ['twice weekly', 2 / 7, 2 / 7, false, undefined],
  ['every week', 1 / 7, 1 / 7, false, undefined],
  // dotted Latin forms and extra abbreviations from published lists (Wikipedia 'List of abbreviations used in medical prescriptions', PW Pharma)
  ['b.i.d.', 2, 2, false, undefined],
  ['b.d.s.', 2, 2, false, undefined],
  ['t.d.s.', 3, 3, false, undefined],
  ['t.i.d.', 3, 3, false, undefined],
  ['q.i.d.', 4, 4, false, undefined],
  ['q.d.s.', 4, 4, false, undefined],
  ['o.d.', 1, 1, false, undefined],
  ['q.d.', 1, 1, false, undefined],
  ['q.1.d.', 1, 1, false, undefined],
  ['q.h.s.', 1, 1, false, undefined],
  ['p.r.n.', 0, 0, true, undefined],
  ['qod', 0.5, 0.5, false, undefined],
  ['q.o.d.', 0.5, 0.5, false, undefined],
  ['EOD', 0.5, 0.5, false, undefined],
  ['QWK', 1 / 7, 1 / 7, false, undefined],
  ['AM', 1, 1, false, undefined],
  ['AM and PM', 2, 2, false, undefined],
  ['QAM', 1, 1, false, undefined],
  ['Q4H', 6, 6, false, undefined],
  ['Q10H', 2.4, 2.4, false, undefined],
  ['1.5 tab BD', 3, 3, false, undefined],
  ['monthly', 1 / 30, 1 / 30, false, undefined],
  // STAT
  ['STAT', 1, 1, false, undefined],
]

describe('parseSig', () => {
  cases.forEach(([text, doses, max, sos, days]) => {
    it(`"${text}"`, () => {
      const s = parseSig(text)
      expect(s.doses_per_day).toBeCloseTo(doses, 5)
      expect(s.max_doses_per_day).toBeCloseTo(max, 5)
      expect(s.sos).toBe(sos)
      expect(s.duration_days).toBe(days)
      expect(s.unparsed).toBeUndefined()
    })
  })

  it('flags SOS without a written maximum so the limits data can supply a worst case', () => {
    expect(parseSig('SOS').sos_cap_unspecified).toBe(true)
    expect(parseSig('SOS').assumptions?.[0]).toMatch(/worst-case cap/)
    expect(parseSig('SOS max 3').sos_cap_unspecified).toBeUndefined()
  })

  it('keeps liquids as a volume per dose', () => {
    const a = parseSig('5 ml TDS')
    expect(a).toMatchObject({ doses_per_day: 3, volume_ml_per_dose: 5, dose_unit: 'ml', administrations_per_day: 3 })
    const b = parseSig('2 tsp BD')
    expect(b).toMatchObject({ doses_per_day: 2, volume_ml_per_dose: 10, dose_unit: 'ml' })
    expect(parseSig('1 tsp TDS x5d').volume_ml_per_dose).toBe(5)
    expect(parseSig('10 ml SOS max 3').max_doses_per_day).toBe(3)
  })

  it('does not let a mL volume or a mg strength look like a tablet count or duration', () => {
    const s = parseSig('5 ml BD x3d')
    expect(s.duration_days).toBe(3)
    expect(s.volume_ml_per_dose).toBe(5)
    expect(s.doses_per_day).toBe(2)
  })

  it('marks drops and puffs as not convertible to mg', () => {
    const s = parseSig('2 drops TDS')
    expect(s.dose_unit).toBe('drop')
    expect(s.confidence).toBeLessThan(0.7)
    expect(s.assumptions?.join(' ')).toMatch(/cannot be turned into mg/)
  })

  it('uses the upper end of a dose range as the worst case and says so', () => {
    const s = parseSig('1-2 tab BD')
    expect(s.doses_per_day).toBe(4)
    expect(s.assumptions?.[0]).toMatch(/upper end/)
  })

  it('assumes once daily with low confidence when no dosing is written', () => {
    for (const text of ['', '   ']) {
      const s = parseSig(text)
      expect(s.doses_per_day).toBe(1)
      expect(s.confidence).toBeLessThan(0.5)
      expect(s.assumptions?.[0]).toMatch(/No dosing written/)
    }
  })

  it('reports words it does not understand and lowers confidence', () => {
    const s = parseSig('BD zigzag')
    expect(s.doses_per_day).toBe(2)
    expect(s.unparsed).toEqual(['zigzag'])
    expect(s.confidence).toBeLessThan(0.7) // below the online-fallback threshold
  })

  it('uses the highest phase when a loading, tapering or step-down dose is written', () => {
    const loading = parseSig('2 tab stat then 1 tab TDS')
    expect(loading.doses_per_day).toBe(3)
    expect(loading.confidence).toBeLessThanOrEqual(0.7)
    expect(loading.assumptions?.join(' ')).toMatch(/highest daily amount/)
    const taper = parseSig('1-0-1 x5d then 1-0-0 x5d')
    expect(taper).toMatchObject({ doses_per_day: 2, duration_days: 5 })
  })

  it('ignores meal words such as breakfast without losing confidence', () => {
    const s = parseSig('1-0-0 before breakfast')
    expect(s.doses_per_day).toBe(1)
    expect(s.confidence).toBe(1)
    expect(s.unparsed).toBeUndefined()
  })

  it('does not silently drop a dose it cannot place: "one at night" with no unit stays visibly uncertain', () => {
    const s = parseSig('ut dict')
    expect(s.confidence).toBeLessThan(0.7)
    expect(s.unparsed).toEqual(['ut', 'dict'])
  })

  it('never throws on odd input', () => {
    for (const text of ['???', '1-', '--', 'x', 'x5', '0-0-0', '99999999999', '½', 'BD BD TDS']) {
      expect(() => parseSig(text)).not.toThrow()
    }
  })
})
