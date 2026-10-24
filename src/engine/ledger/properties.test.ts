// Property tests: rules that must hold for any input, checked on seeded random cases against a simple reference.
import { describe, it, expect } from 'vitest'
import type { Ingredient, Patient, ResolvedBrand } from '../contracts'
import { applyLimits } from '../limits'
import { parseSig } from '../sig'
import { computeDoseByWindow, computeLedger, cutSegments, fromDay, toDay, type DatedLine, type LedgerLine } from './index'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
const pick = <T>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)]

const INGS = ['paracetamol', 'ibuprofen', 'aceclofenac', 'cetirizine', 'omeprazole', 'caffeine', 'metformin']
const SIGS = ['OD', 'BD', 'TDS', 'QID', '1-0-1', '0-0-1', '1/2-0-1/2', '2 tab BD', 'q8h', 'SOS', 'SOS max 2', 'once weekly', '5 ml TDS']

function randomLine(r: () => number, i: number): LedgerLine {
  const n = 1 + Math.floor(r() * 3)
  const ingredients: Ingredient[] = Array.from({ length: n }, () => ({ id: pick(r, INGS), mg: pick(r, [5, 10, 20, 32, 100, 325, 400, 500, 650]) }))
  // an ingredient id may repeat inside one brand; merge so each brand lists an id once
  const merged = [...new Map(ingredients.map((x) => [x.id, x])).values()]
  const brand: ResolvedBrand = { raw: `b${i}`, brand: `Brand${i}`, confidence: 1, ingredients: merged, form: 'tablet', flags: [], systemic: true, route: 'oral' }
  return { resolved: brand, sig: parseSig(pick(r, SIGS)) }
}

const totals = (l: Record<string, { total_mg_day: number }>) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, Math.round(v.total_mg_day * 100) / 100]))

describe('ledger properties (500 random prescriptions)', () => {
  const r = rng(2026)
  const cases = Array.from({ length: 500 }, () => Array.from({ length: 1 + Math.floor(r() * 8) }, (_, i) => randomLine(r, i)))

  it('totals are finite, non-negative and equal scheduled + SOS', () => {
    for (const lines of cases) {
      for (const e of Object.values(computeLedger(lines).ledger)) {
        expect(Number.isFinite(e.total_mg_day) && e.total_mg_day >= 0).toBe(true)
        expect(e.total_mg_day).toBeCloseTo((e.scheduled_mg_day ?? 0) + (e.sos_mg_day ?? 0), 1)
      }
    }
  })

  it('does not depend on the order of the lines', () => {
    for (const lines of cases) {
      const shuffled = [...lines].sort(() => r() - 0.5)
      expect(totals(computeLedger(shuffled).ledger)).toEqual(totals(computeLedger(lines).ledger))
    }
  })

  it('is additive: repeating the whole prescription doubles every total', () => {
    for (const lines of cases.slice(0, 200)) {
      const one = totals(computeLedger(lines).ledger)
      const two = totals(computeLedger([...lines, ...lines]).ledger)
      for (const [id, v] of Object.entries(one)) expect(two[id]).toBeCloseTo(v * 2, 1)
    }
  })

  it('every source line is accounted for: an ingredient appears only if some line contains it', () => {
    for (const lines of cases) {
      const present = new Set(lines.flatMap((l) => l.resolved.ingredients.map((i) => i.id)))
      for (const id of Object.keys(computeLedger(lines).ledger)) expect(present.has(id)).toBe(true)
    }
  })

  it('splitting a daily dose across two lines of the same brand gives the same total (TDS = BD + OD)', () => {
    const brand = (mg: number): ResolvedBrand => ({ raw: 'x', brand: 'X', confidence: 1, ingredients: [{ id: 'paracetamol', mg }], form: 'tablet', flags: [], systemic: true, route: 'oral' })
    for (const mg of [125, 325, 500, 650]) {
      const a = computeLedger([{ resolved: brand(mg), sig: parseSig('TDS') }]).ledger.paracetamol.total_mg_day
      const b = computeLedger([{ resolved: brand(mg), sig: parseSig('BD') }, { resolved: brand(mg), sig: parseSig('OD') }]).ledger.paracetamol.total_mg_day
      expect(b).toBe(a)
    }
  })

  it('limits: over_limit finding if and only if total exceeds the applied limit, for every patient type', () => {
    const patients: Patient[] = [
      { age_years: 40 }, { age_years: 40, weight_kg: 70, serum_creatinine: 1, sex: 'M' }, { age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'M' },
      { age_years: 80, weight_kg: 50, serum_creatinine: 3, sex: 'F' }, { age_years: 6, weight_kg: 20 }, { age_years: 6 },
    ]
    for (const lines of cases.slice(0, 150)) {
      const base = computeLedger(lines).ledger
      for (const p of patients) {
        const r2 = applyLimits(base, p)
        for (const [id, e] of Object.entries(r2.ledger)) {
          const over = r2.findings.some((f) => f.kind === 'over_limit' && f.ingredient === id)
          expect(over).toBe(e.limit_mg_day !== undefined && e.total_mg_day > e.limit_mg_day + 1e-6)
          if (e.limit_mg_day !== undefined) expect(e.limit_mg_day).toBeGreaterThan(0)
        }
      }
    }
  })

  it('a stricter patient is never given a looser limit: kidney impairment and age only ever lower a limit', () => {
    for (const lines of cases.slice(0, 150)) {
      const base = computeLedger(lines).ledger
      const healthy = applyLimits(base, { age_years: 40, weight_kg: 70, serum_creatinine: 0.8, sex: 'M' }).ledger
      const frail = applyLimits(base, { age_years: 80, weight_kg: 70, serum_creatinine: 3, sex: 'M' }).ledger
      for (const id of Object.keys(base)) {
        if (healthy[id].limit_mg_day !== undefined && frail[id].limit_mg_day !== undefined) {
          expect(frail[id].limit_mg_day!).toBeLessThanOrEqual(healthy[id].limit_mg_day!)
        }
      }
    }
  })
})

describe('window cutting vs a day-by-day reference (400 random timelines)', () => {
  const r = rng(99)
  it('every day belongs to exactly the segment whose ids equal the lines active that day; empty days are in no segment', () => {
    const t0 = toDay('2026-10-01')!
    for (let c = 0; c < 400; c++) {
      const spans = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) => {
        const a = Math.floor(r() * 40)
        return { id: `L${i}`, start: fromDay(t0 + a), end: fromDay(t0 + a + Math.floor(r() * 15)) }
      })
      const segs = cutSegments(spans)
      for (let k = 0; k + 1 < segs.length; k++) expect(toDay(segs[k].end)!).toBeLessThan(toDay(segs[k + 1].start)!) // sorted, disjoint
      for (let day = t0 - 1; day <= t0 + 60; day++) {
        const active = spans.filter((s) => toDay(s.start)! <= day && day <= toDay(s.end)!).map((s) => s.id)
        const inSegs = segs.filter((s) => toDay(s.start)! <= day && day <= toDay(s.end)!)
        if (active.length === 0) expect(inSegs).toHaveLength(0)
        else {
          expect(inSegs).toHaveLength(1)
          expect(inSegs[0].ids).toEqual(active)
        }
      }
    }
  })

  it('per-window totals equal the brute-force sum of the lines active in that window', () => {
    const t0 = toDay('2026-10-01')!
    const patient: Patient = { age_years: 40 }
    for (let c = 0; c < 150; c++) {
      const items: DatedLine[] = Array.from({ length: 1 + Math.floor(r() * 5) }, (_, i) => {
        const line = randomLine(r, i)
        const sig = { ...line.sig, duration_days: 1 + Math.floor(r() * 10) }
        return { id: `L${i}`, start: fromDay(t0 + Math.floor(r() * 20)), line: { ...line, sig } }
      })
      const res = computeDoseByWindow(items, patient)
      for (const w of res.windows) {
        const active = items.filter((it) => w.ids.includes(it.id)).map((it) => it.line)
        expect(totals(w.dose.ledger)).toEqual(totals(computeLedger(active).ledger))
      }
    }
  })
})
