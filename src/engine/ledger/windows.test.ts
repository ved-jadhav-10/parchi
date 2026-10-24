import { describe, it, expect } from 'vitest'
import type { Ingredient, Patient, ResolvedBrand } from '../contracts'
import { LIMITS } from '../limits'
import { parseSig } from '../sig'
import { computeDoseByWindow, cutSegments, fromDay, lineWindow, patientAsOf, toDay, type DatedLine } from './index'

describe('dates', () => {
  it('accepts real ISO dates only', () => {
    expect(toDay('2026-10-24')).not.toBeNull()
    for (const bad of ['2026-02-30', '2026-13-01', '24/10/2026', 'tomorrow', '', '2026-1-5', '2026-10-24T10:00']) expect(toDay(bad)).toBeNull()
    expect(fromDay(toDay('2026-02-28')! + 1)).toBe('2026-03-01')
    expect(fromDay(toDay('2028-02-28')! + 1)).toBe('2028-02-29') // leap year
  })
})

describe('lineWindow', () => {
  it('runs from the Rx date for duration_days, both ends inclusive', () => {
    expect(lineWindow('2026-10-01', { duration_days: 5 })).toEqual({ start: '2026-10-01', end: '2026-10-05', days: 5, duration_assumed: false })
    expect(lineWindow('2026-12-30', { duration_days: 3 })?.end).toBe('2027-01-01')
    expect(lineWindow('2026-10-01', { duration_days: 1 })?.end).toBe('2026-10-01')
  })
  it('uses the unverified default window when no usable duration is written', () => {
    const w = lineWindow('2026-10-01', {})
    expect(w).toMatchObject({ days: LIMITS.windows.default_duration_days, duration_assumed: true, end: '2026-10-30' })
    for (const d of [0, -3, NaN]) expect(lineWindow('2026-10-01', { duration_days: d })?.duration_assumed).toBe(true)
    expect(LIMITS.windows.pharmacist_approved).toBe(false)
  })
  it('never throws or returns a malformed date for absurd durations or dates at the edge of the calendar', () => {
    for (const d of [1e9, 99999999999, Infinity, 3651]) {
      const w = lineWindow('2026-10-01', { duration_days: d })
      expect(w).toMatchObject({ duration_assumed: true, days: 30 })
      expect(w!.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(lineWindow('2026-10-01', { duration_days: 3650 })).toMatchObject({ duration_assumed: false, days: 3650 })
    const edge = lineWindow('9999-12-31', { duration_days: 30 })
    expect(edge?.end).toBe('9999-12-31') // clamped, still a valid date
    expect(fromDay(-1e12)).toMatch(/^1000-/)
  })
  it('rounds a fractional duration up and rejects a bad start date', () => {
    expect(lineWindow('2026-10-01', { duration_days: 2.2 })?.days).toBe(3)
    expect(lineWindow('2026-02-30', { duration_days: 5 })).toBeNull()
  })
})

describe('cutSegments', () => {
  it('cuts at every start and end so each segment has one set of active lines', () => {
    const segs = cutSegments([
      { id: 'A', start: '2026-10-01', end: '2026-10-05' },
      { id: 'B', start: '2026-10-04', end: '2026-10-10' },
      { id: 'C', start: '2026-10-05', end: '2026-10-07' },
    ])
    expect(segs).toEqual([
      { start: '2026-10-01', end: '2026-10-03', ids: ['A'] },
      { start: '2026-10-04', end: '2026-10-04', ids: ['A', 'B'] },
      { start: '2026-10-05', end: '2026-10-05', ids: ['A', 'B', 'C'] },
      { start: '2026-10-06', end: '2026-10-07', ids: ['B', 'C'] },
      { start: '2026-10-08', end: '2026-10-10', ids: ['B'] },
    ])
  })
  it('keeps courses that never meet apart, and merges equal neighbours', () => {
    expect(cutSegments([{ id: 'A', start: '2026-10-01', end: '2026-10-05' }, { id: 'B', start: '2026-10-06', end: '2026-10-08' }]).map((s) => s.ids)).toEqual([['A'], ['B']])
    // sharing one day counts as overlapping that day
    expect(cutSegments([{ id: 'A', start: '2026-10-01', end: '2026-10-05' }, { id: 'A2', start: '2026-10-05', end: '2026-10-06' }]).map((s) => s.ids)).toEqual([['A'], ['A', 'A2'], ['A2']])
    // identical neighbours merge
    expect(cutSegments([{ id: 'A', start: '2026-10-01', end: '2026-10-03' }, { id: 'A', start: '2026-10-04', end: '2026-10-06' }])).toEqual([{ start: '2026-10-01', end: '2026-10-06', ids: ['A'] }])
  })
  it('skips invalid or reversed spans and handles empty input', () => {
    expect(cutSegments([])).toEqual([])
    expect(cutSegments([{ id: 'x', start: 'nope', end: '2026-10-05' }, { id: 'y', start: '2026-10-09', end: '2026-10-01' }])).toEqual([])
  })
})

describe('patientAsOf', () => {
  const p: Patient = { age_years: 68, weight_kg: 55, serum_creatinine: 0.8, sex: 'M' }
  const labs = [
    { type: 'serum_creatinine' as const, value: 1.2, date: '2026-09-01' },
    { type: 'serum_creatinine' as const, value: 1.6, date: '2026-10-06' },
  ]
  it('uses the latest creatinine on or before the date, else the baseline', () => {
    expect(patientAsOf(p, labs, '2026-08-31').serum_creatinine).toBe(0.8)
    expect(patientAsOf(p, labs, '2026-09-01').serum_creatinine).toBe(1.2)
    expect(patientAsOf(p, labs, '2026-10-05').serum_creatinine).toBe(1.2)
    expect(patientAsOf(p, labs, '2026-10-06').serum_creatinine).toBe(1.6)
  })
  it('ignores bad labs and bad dates', () => {
    expect(patientAsOf(p, [{ type: 'serum_creatinine', value: -1, date: '2026-09-01' }, { type: 'serum_creatinine', value: 2, date: 'x' }], '2026-10-01')).toEqual(p)
    expect(patientAsOf(p, labs, 'bad')).toEqual(p)
  })
})

describe('computeDoseByWindow: three doctors, overlapping courses', () => {
  const brand = (name: string, ing: Ingredient[]): ResolvedBrand => ({ raw: name, brand: name, confidence: 1, ingredients: ing, form: 'tablet', flags: [], systemic: true, route: 'oral' })
  const item = (id: string, start: string, b: ResolvedBrand, sig: string): DatedLine => ({ id, start, line: { resolved: b, sig: parseSig(sig) } })
  const items: DatedLine[] = [
    item('A', '2026-10-01', brand('Dolo 650', [{ id: 'paracetamol', mg: 650 }]), 'TDS x5d'),
    item('B', '2026-10-04', brand('Zerodol-P', [{ id: 'aceclofenac', mg: 100 }, { id: 'paracetamol', mg: 325 }]), 'BD x7d'),
    item('C', '2026-10-05', brand('Crocin Cold & Flu Max', [{ id: 'paracetamol', mg: 500 }, { id: 'caffeine', mg: 32 }]), 'TDS x3d'),
  ]
  const patient: Patient = { age_years: 68, weight_kg: 55, serum_creatinine: 0.8, sex: 'M' }

  it('adds doses only where the courses overlap, and finds the worst window', () => {
    const r = computeDoseByWindow(items, patient)
    expect(r.windows.map((w) => [w.start, w.end, w.dose.ledger.paracetamol?.total_mg_day])).toEqual([
      ['2026-10-01', '2026-10-03', 1950],
      ['2026-10-04', '2026-10-04', 2600],
      ['2026-10-05', '2026-10-05', 4100],
      ['2026-10-06', '2026-10-07', 2150],
      ['2026-10-08', '2026-10-10', 650],
    ])
    expect(r.worst).toBe(2)
    expect(r.windows[2].dose.findings.map((f) => `${f.kind}:${f.ingredient}`)).toContain('over_limit:paracetamol')
    expect(r.windows.filter((w) => w.dose.findings.some((f) => f.kind === 'over_limit'))).toHaveLength(1)
    expect(r.skipped).toEqual([])
  })
  it('applies a new creatinine from its own date, even in the middle of an overlap', () => {
    const labs = [{ type: 'serum_creatinine' as const, value: 1.6, date: '2026-10-06' }]
    const r = computeDoseByWindow(items, patient, labs)
    expect(r.windows.find((w) => w.start === '2026-10-05')?.dose.crcl).toBe(68.8)
    const after = r.windows.find((w) => w.start === '2026-10-06')!
    expect(after.dose.crcl).toBe(34.4)
    expect(after.dose.findings.some((f) => f.kind === 'renal_caution' && f.ingredient === 'aceclofenac')).toBe(true)
    // a lab date inside one segment splits it
    const mid = computeDoseByWindow(items, patient, [{ type: 'serum_creatinine', value: 1.6, date: '2026-10-09' }])
    expect(mid.windows.map((w) => w.start)).toEqual(['2026-10-01', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09'])
  })
  it('says which windows rest on the assumed default duration, and skips lines with a bad date', () => {
    const noDuration = item('D', '2026-10-02', brand('Omez', [{ id: 'omeprazole', mg: 20 }]), 'OD')
    const bad = item('E', 'not-a-date', brand('X', [{ id: 'paracetamol', mg: 500 }]), 'TDS')
    const r = computeDoseByWindow([...items, noDuration, bad], patient)
    expect(r.skipped).toEqual(['E'])
    expect(r.windows.every((w) => (w.ids.includes('D') ? w.assumed_duration_ids.includes('D') : w.assumed_duration_ids.length === 0))).toBe(true)
    expect(r.windows.at(-1)?.ids).toContain('D') // runs the default 30 days past the others
  })
  it('handles no lines', () => {
    expect(computeDoseByWindow([], patient)).toEqual({ windows: [], worst: -1, skipped: [] })
  })
})
