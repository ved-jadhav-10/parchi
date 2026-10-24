import { describe, expect, it } from 'vitest'
import demo from '../../tests/fixtures/demo_rx.json'
import type { Alert, Patient } from './contracts'
import { testPipeline } from './rules/testing'

const check = testPipeline()
const patient = demo.patient as Patient
const byType = (alerts: Alert[], type: string) => alerts.filter((a) => a.type === type)

describe('pipeline on the demo Rx', () => {
  it('resolves every line and builds the hidden paracetamol total', async () => {
    const out = await check(demo.rx_text, patient)
    expect(out.lines.map((l) => l.resolved.brand)).toEqual(demo.expected.resolver.map((r) => r.brand))
    expect(out.ledger.paracetamol.total_mg_day).toBe(demo.expected.ledger_paracetamol_mg_day)
  })

  it('gives the expected 2 Interrupts and 3-4 Informs', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    const count = (t: string) => alerts.filter((a) => a.tier === t).length
    expect(count('interrupt')).toBe(demo.expected.alerts.interrupt_count)
    expect(count('inform')).toBeGreaterThanOrEqual(demo.expected.alerts.inform_min)
    expect(count('inform')).toBeLessThanOrEqual(demo.expected.alerts.inform_max)
  })

  it('interrupts for paracetamol over 4 g and NSAIDs with CrCl ~34', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    const stops = alerts.filter((a) => a.tier === 'interrupt')
    expect(stops.map((a) => a.type).sort()).toEqual(['dose_excess', 'nsaid_renal'])
    const dose = stops.find((a) => a.type === 'dose_excess')!
    expect(dose.reason).toContain('4,100 mg/day')
    expect(dose.brands).toEqual(['Dolo 650', 'Crocin Cold & Flu Max', 'Zerodol-P'])
    const renal = stops.find((a) => a.type === 'nsaid_renal')!
    expect(renal.reason).toContain('CrCl 34')
    expect(renal.ingredients).toEqual(['aceclofenac', 'ibuprofen'])
  })

  it('informs on NSAID + NSAID, PPI + PPI, ibuprofen + aspirin and domperidone in the elderly', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    const informs = alerts.filter((a) => a.tier === 'inform')
    expect(informs.map((a) => `${a.type}:${a.ingredients.join('+')}`).sort()).toEqual([
      'class_duplication:aceclofenac+ibuprofen',
      'class_duplication:omeprazole+pantoprazole',
      'ddi:aspirin+ibuprofen',
      'domperidone_elderly:domperidone',
    ])
  })

  it('logs the Pan-D NSQ batch silently with its source', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    const nsq = byType(alerts, 'nsq')
    expect(nsq).toHaveLength(1)
    expect(nsq[0].tier).toBe('silent')
    expect(nsq[0].source).toContain('JUL-2026')
  })

  it('cites DDInter ids on the interaction and S.O. or list names on the others', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    expect(byType(alerts, 'ddi')[0].source).toBe('DDInter20 / DDInter900')
    for (const a of alerts) expect(a.source.length).toBeGreaterThan(0)
  })

  it('orders interrupts first and never presents a draft rule as approved', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    const tiers = alerts.map((a) => a.tier)
    expect(tiers).toEqual([...tiers].sort((a, b) => ['interrupt', 'inform', 'silent'].indexOf(a) - ['interrupt', 'inform', 'silent'].indexOf(b)))
    expect(alerts.find((a) => a.type === 'nsaid_renal')!.approved).toBe(false)
    expect(alerts.find((a) => a.type === 'dose_excess')!.approved).toBe(false)
  })

  it('is deterministic', async () => {
    const a = await check(demo.rx_text, patient)
    const b = await check(demo.rx_text, patient)
    expect(b).toEqual(a)
  })
})

describe('pipeline edge cases', () => {
  it('asks for creatinine instead of skipping the NSAID kidney check', async () => {
    const { alerts } = await check('Brufen 400 BD', { age_years: 68 })
    expect(byType(alerts, 'nsaid_renal')).toHaveLength(0)
    const ask = byType(alerts, 'input_needed')
    expect(ask).toHaveLength(1)
    expect(ask[0].tier).toBe('inform')
  })

  it('does not run the kidney check for a young patient with good clearance', async () => {
    const { alerts } = await check('Brufen 400 BD', { age_years: 30, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' })
    expect(alerts.filter((a) => a.tier !== 'silent')).toEqual([])
  })

  it('does not ask for creatinine when no renal drug is on the Rx', async () => {
    const { alerts } = await check('Omez 20 OD', { age_years: 40 })
    expect(byType(alerts, 'input_needed')).toHaveLength(0)
  })

  it('flags the same ingredient in two brands below the limit as Inform, not Interrupt', async () => {
    const { alerts } = await check('Dolo 650 BD; Crocin Cold & Flu Max OD', { age_years: 30 })
    const dup = byType(alerts, 'duplicate_ingredient')
    expect(dup).toHaveLength(1)
    expect(dup[0].tier).toBe('inform')
    expect(byType(alerts, 'dose_excess')).toHaveLength(0)
  })

  it('stays quiet on a clean single-drug Rx', async () => {
    const { alerts } = await check('Omez 20 OD', { age_years: 40 })
    expect(alerts.filter((a) => a.tier !== 'silent')).toEqual([])
  })

  it('does not alert on two ingredients that only meet inside one combination brand', async () => {
    const { alerts } = await check('Zerodol P BD', { age_years: 30, weight_kg: 70, serum_creatinine: 0.9 })
    expect(alerts.filter((a) => a.tier !== 'silent')).toEqual([])
  })

  it('routes an unrecognised line to the pharmacist', async () => {
    const { alerts } = await check('Qzxwvk 500 OD', { age_years: 30 })
    expect(byType(alerts, 'unresolved')).toHaveLength(1)
  })

  it('raises the banned generic FDC from the resolver flag as Interrupt with the S.O. number', async () => {
    const { alerts } = await check('Cetirizine + Paracetamol + Phenylephrine OD', { age_years: 30 })
    const banned = byType(alerts, 'banned_fdc')
    expect(banned).toHaveLength(1)
    expect(banned[0].source).toMatch(/^S\.O\. /)
  })
})
