// Regression: the UI must raise the same alerts as the real engine wiring (src/engine/wiring.ts). It once built the
// pipeline without Track B's computeDose, so weekly-drug, kidney and unclear-sig alerts never reached the screen.
import { describe, it, expect } from 'vitest'
import demo from '../../tests/fixtures/demo_rx.json'
import type { Patient } from '../engine/contracts'
import { testResolver } from '../engine/resolver/testing'
import { alertRules, testDdi } from '../engine/rules/testing'
import { createRealEngine } from '../engine/wiring'
import { createCheck } from './engine'

const resolver = testResolver()
const ddi = testDdi()
const rules = alertRules()
const ui = createCheck({ resolver, ddi, rules })
const real = createRealEngine({ resolver, ddi, rules })

const keys = (alerts: { tier: string; type: string; ingredients: string[] }[]) => alerts.map((a) => `${a.tier}:${a.type}:${[...a.ingredients].sort().join('+')}`).sort()
const kidney: Patient = { age_years: 70, weight_kg: 60, serum_creatinine: 2.5, sex: 'M' }

describe('the UI engine raises Track B findings as alerts', () => {
  it('a weekly drug written as daily is an Interrupt (methotrexate OD)', async () => {
    const r = await ui('Methotrexate 2.5 OD', { age_years: 50 })
    expect(r.alerts.map((a) => `${a.tier}:${a.type}`)).toContain('interrupt:schedule_mismatch')
  })
  it('a drug to avoid at this kidney function is an Interrupt (nitrofurantoin, CrCl about 23)', async () => {
    const r = await ui('Nitrofurantoin 100 BD', kidney)
    expect(r.alerts.map((a) => `${a.tier}:${a.type}`)).toContain('interrupt:renal_avoid')
  })
  it('a sig the rules cannot read is shown to the pharmacist', async () => {
    const r = await ui('Dolo 650 zzz qqq', { age_years: 40 })
    expect(r.alerts.map((a) => a.type)).toContain('dosing_not_entered')
  })
  it('a liquid with no known volume is called out instead of silently missing from the totals', async () => {
    const r = await ui('Wikoryl drops 1 ml BD', { age_years: 2, weight_kg: 12 })
    expect(r.alerts.map((a) => a.type)).toContain('unquantified_volume')
  })
})

describe('the UI and the real wiring agree', () => {
  const cases: [string, Patient][] = [
    [demo.rx_text, demo.patient as Patient],
    ['Methotrexate 2.5 OD', { age_years: 50 }],
    ['Gabapentin 300 TDS; Brufen 400 BD', kidney],
    ['Brufen 400 SOS; Dolo 650 TDS', demo.patient as Patient],
    ['Dolo 650 TDS; Pan D OD', { age_years: 40 }],
    ['Calpol drops 0.6 ml TDS', { age_years: 1, weight_kg: 10 }],
  ]
  it.each(cases)('same alerts for %s', async (rx, patient) => {
    expect(keys((await ui(rx, patient)).alerts)).toEqual(keys((await real.check(rx, patient)).alerts))
  })
  it('still produces the fixture result for the demo prescription', async () => {
    const r = await ui(demo.rx_text, demo.patient as Patient)
    expect(r.ledger.paracetamol.total_mg_day).toBe(demo.expected.ledger_paracetamol_mg_day)
    expect(r.alerts.filter((a) => a.tier === 'interrupt')).toHaveLength(demo.expected.alerts.interrupt_count)
    expect(r.crcl).toBe(34.4)
    expect(r.prompts).toEqual([])
  })
  it('keeps asking only for what is missing', async () => {
    const r = await ui('Brufen 400 TDS', { age_years: 68 })
    expect(r.prompts.map((p) => p.field).sort()).toEqual(['serum_creatinine', 'weight_kg'])
  })
})

describe('herbal and Ayurvedic lines are taken out before the ordinary resolver sees them', () => {
  it('does not turn Triphala churna into a medicine, and reports it as a herbal item', async () => {
    const r = await ui('Triphala churna 1 tsp HS; Dolo 650 TDS', { age_years: 40 })
    expect(r.lines.map((l) => l.resolved.raw.toLowerCase()).join(' ')).not.toContain('triphala')
    expect(r.lines.some((l) => /dolo/i.test(l.resolved.raw))).toBe(true)
    expect(r.herbal?.items.map((i) => i.raw.toLowerCase()).join(' ')).toContain('triphala')
    expect(r.herbal?.note).toBeTruthy()
  })

  it('checks a prescription that is only herbal instead of failing it', async () => {
    const r = await ui('Ashwagandha churna BD', { age_years: 40 })
    expect(r.lines).toHaveLength(0)
    expect(r.herbal?.items.length).toBeGreaterThan(0)
  })

  it('leaves a prescription with no herbal line unchanged', async () => {
    const r = await ui('Dolo 650 TDS', { age_years: 40 })
    expect(r.herbal).toBeUndefined()
    expect(r.lines).toHaveLength(1)
  })
})
