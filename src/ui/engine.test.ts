import { describe, expect, it } from 'vitest'
import ddiRaw from '../../public/data/ddi.json?raw'
import rulesRaw from '../../public/data/alert_rules.json?raw'
import { createDdiIndex, type DdiJson } from '../engine/resolver/ddi'
import { testResolver } from '../engine/resolver/testing'
import { parseAlertRules } from '../engine/rules'
import { demoPatient, demoRxText } from './demoCase'
import { createCheck } from './engine'

const check = createCheck({ resolver: testResolver(), ddi: createDdiIndex(JSON.parse(ddiRaw) as DdiJson), rules: parseAlertRules(JSON.parse(rulesRaw)) })

describe('the real engine behind the UI', () => {
  it('adds up the demo prescription and raises the paracetamol Interrupt', async () => {
    const r = await check(demoRxText, demoPatient)
    expect(r.lines).toHaveLength(7)
    const para = r.ledger.paracetamol
    expect(para.total_mg_day).toBe(4100)
    expect(para.sources).toHaveLength(3)
    // Age alone no longer lowers the paracetamol limit (FIX_PLAN 2.4): the 68-year-old gets the adult maximum, the limit is signed off (Dr. Sanjay Dhanushkar); the rest of the paracetamol cap data is not.
    expect(para.limit_mg_day).toBe(4000)
    expect(para.limit_basis).toBe('Adult maximum')
    expect(para.limit_pharmacist_approved).toBe(true)
    const dose = r.alerts.find((a) => a.type === 'dose_excess')
    expect(dose?.tier).toBe('interrupt')
    expect(dose?.ingredients).toContain('paracetamol')
  })

  it('raises the two Interrupts the demo case expects and logs the Pan-D failed batch quietly', async () => {
    const r = await check(demoRxText, demoPatient)
    expect(r.alerts.filter((a) => a.tier === 'interrupt').map((a) => a.type).sort()).toEqual(['dose_excess', 'nsaid_double_high_risk'])
    expect(r.alerts.find((a) => a.type === 'nsq')?.tier).toBe('silent')
    expect(r.alerts.every((a) => a.approved !== true || ['nsq', 'banned_fdc', 'dose_excess'].includes(a.type))).toBe(true)
  })

  it('sorts alerts interrupt, then inform, then silent', async () => {
    const order = { interrupt: 0, inform: 1, silent: 2 }
    const tiers = (await check(demoRxText, demoPatient)).alerts.map((a) => order[a.tier])
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b))
  })

  it('estimates kidney function for the demo patient and does not ask for what it has', async () => {
    const r = await check(demoRxText, demoPatient)
    expect(r.crcl).toBeGreaterThan(30)
    expect(r.crcl).toBeLessThan(40)
    expect(r.prompts).toEqual([])
  })

  it('asks for weight and creatinine only when a drug on the prescription needs them', async () => {
    const r = await check(demoRxText, { age_years: 68 })
    expect(r.prompts.map((p) => p.field).sort()).toEqual(['serum_creatinine', 'weight_kg'])
    expect(r.prompts.every((p) => p.reason.length > 0)).toBe(true)
    const plain = await check('Omeprazole 20 OD', { age_years: 30 })
    expect(plain.prompts).toEqual([])
  })

  it('works for any typed prescription, not only the demo', async () => {
    const r = await check('Zerodol SP BD; Pan D OD; zzzzqx 500', { age_years: 40 })
    expect(r.lines).toHaveLength(3)
    expect(r.alerts.some((a) => a.type === 'unresolved')).toBe(true)
    expect(r.alerts.some((a) => a.type === 'nsq')).toBe(true)
    expect(r.ledger.paracetamol).toBeDefined()
  })

  it('refuses text with no medicines instead of returning an empty result', async () => {
    await expect(check('   ', { age_years: 40 })).rejects.toThrow()
  })
})
