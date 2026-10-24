// Sweep: thousands of real brands from Track A's index x several sigs x several patients. Nothing may throw or produce
// NaN/negative/impossible numbers, and every unquantifiable line must say why instead of silently counting as 0.
import { describe, it, expect } from 'vitest'
import { testResolver, rawData } from '../resolver/testing'
import { parseSig } from '../sig'
import { computeDose, type LedgerLine } from './index'

const resolver = testResolver()
const classesOf = (id: string) => resolver.ingredient(id)?.classes
const names = rawData.brands().brands.map((b) => b[0])
const SAMPLE = names.filter((_, i) => i % 7 === 0) // every 7th brand, deterministic (about 4,600)
const SIGS = ['TDS', '1-0-1', 'SOS', '5 ml BD', 'once weekly', '2 tab OD x5d', '']
const PATIENTS = [
  { age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'M' as const },
  { age_years: 6, weight_kg: 20 },
  { age_years: 30 },
]

describe(`sweep over ${SAMPLE.length} real brands`, () => {
  const stats = { lines: 0, counted: 0, unquantified: 0, notes: new Map<string, number>(), unresolved: 0 }

  it('never throws and never produces NaN, negative or impossible numbers', () => {
    for (const name of SAMPLE) {
      const resolved = resolver.resolve(name)
      if (resolved.ingredients.length === 0) stats.unresolved++
      for (const sigText of SIGS) {
        const line: LedgerLine = { resolved, sig: parseSig(sigText) }
        for (const patient of PATIENTS) {
          const d = computeDose([line], patient, { classesOf })
          stats.lines++
          for (const [id, e] of Object.entries(d.ledger)) {
            expect(Number.isFinite(e.total_mg_day) && e.total_mg_day >= 0, `${name} | ${sigText} | ${id}`).toBe(true)
            if (e.limit_mg_day !== undefined) expect(e.limit_mg_day > 0).toBe(true)
            if (e.total_mg_day > 0) stats.counted++
          }
          for (const n of d.notes) stats.notes.set(n.kind, (stats.notes.get(n.kind) ?? 0) + 1)
          for (const f of d.findings) expect(Number.isFinite(f.total_mg_day) && f.message.length > 0).toBe(true)
        }
      }
    }
    expect(stats.lines).toBe(SAMPLE.length * SIGS.length * PATIENTS.length)
    expect(stats.counted).toBeGreaterThan(10_000)
  }, 120_000)

  it('every ingredient of every resolved brand either lands in the ledger or is explained in the notes', () => {
    let checked = 0
    for (const name of SAMPLE) {
      const resolved = resolver.resolve(name)
      if (resolved.ingredients.length === 0 || resolved.systemic === false) continue
      const sig = parseSig('TDS')
      const d = computeDose([{ resolved, sig }], { age_years: 30 }, { classesOf })
      for (const ing of resolved.ingredients) {
        const inLedger = ing.id in d.ledger
        const explained = d.notes.some((n) => n.ingredient === ing.id)
        expect(inLedger || explained, `${name}: ${ing.id} vanished silently`).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(3000)
  }, 120_000)

  it('reports what it found (for the test log)', () => {
    console.log(`sweep: ${stats.lines} dose calculations on ${SAMPLE.length} brands; ${stats.unresolved} unresolved; notes:`, Object.fromEntries(stats.notes))
    expect(true).toBe(true)
  })
})
