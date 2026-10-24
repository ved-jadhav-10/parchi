// Track C with Track B's real sig parser, ledger and limits (no stand-ins).
import { describe, expect, it } from 'vitest'
import demo from '../../tests/fixtures/demo_rx.json'
import type { Alert, Patient } from './contracts'
import { realPipeline } from './rules/testing'

const check = realPipeline()
const patient = demo.patient as Patient
const byType = (alerts: Alert[], type: string) => alerts.filter((a) => a.type === type)
const adult = (extra: Partial<Patient> = {}): Patient => ({ age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M', ...extra })

describe('demo Rx through the real engine', () => {
  it('matches the fixture: 4,100 mg paracetamol, 2 Interrupts, 4 Informs, NSQ logged silently', async () => {
    const out = await check(demo.rx_text, patient)
    expect(out.lines.map((l) => l.resolved.brand)).toEqual(demo.expected.resolver.map((r) => r.brand))
    expect(out.ledger.paracetamol.total_mg_day).toBe(demo.expected.ledger_paracetamol_mg_day)
    const n = (t: string) => out.alerts.filter((a) => a.tier === t).length
    expect(n('interrupt')).toBe(demo.expected.alerts.interrupt_count)
    expect(n('inform')).toBe(4)
    expect(out.alerts.filter((a) => a.tier === 'interrupt').map((a) => a.type).sort()).toEqual(['dose_excess', 'nsaid_double_high_risk'])
    expect(byType(out.alerts, 'nsq')[0].tier).toBe('silent')
  })

  it('takes the paracetamol limit and its basis from the limits data (age alone no longer lowers it), shown as unverified', async () => {
    const { alerts, ledger } = await check(demo.rx_text, patient)
    expect(ledger.paracetamol.limit_mg_day).toBe(4000)
    const a = byType(alerts, 'dose_excess')[0]
    expect(a.reason).toContain('4,000 mg/day limit (adult maximum)')
    expect(a.approved).toBe(false)
  })

  it('uses Track B CrCl (34.4) and asks for nothing more', async () => {
    const out = await check(demo.rx_text, patient)
    expect(out.crcl).toBeCloseTo(34.4, 1)
    expect(out.needs).toEqual([])
  })

  it('does not raise the same kidney risk twice (nsaid_renal covers B\'s NSAID bands)', async () => {
    const { alerts } = await check(demo.rx_text, patient)
    expect(alerts.filter((a) => a.type === 'renal_caution' || a.type === 'renal_avoid')).toHaveLength(0)
  })

  it('is deterministic', async () => {
    expect(await check(demo.rx_text, patient)).toEqual(await check(demo.rx_text, patient))
  })
})

describe('alerts from Track B dose facts', () => {
  it('raises a kidney Interrupt for metformin at CrCl < 30, which no patient rule covers', async () => {
    const { alerts } = await check('Glycomet 500 BD', adult({ age_years: 80, weight_kg: 50, serum_creatinine: 2.2 }))
    const a = byType(alerts, 'renal_avoid')
    expect(a).toHaveLength(1)
    expect(a[0].tier).toBe('interrupt')
    expect(a[0].ingredients).toEqual(['metformin'])
    expect(a[0].source).toContain('contraindicated')
    expect(a[0].approved).toBe(false)
  })

  it('applies the kidney dose cap (metformin 1,000 mg at CrCl 30-45) through the ledger limit', async () => {
    const { alerts, ledger } = await check('Glycomet 500 TDS', adult({ age_years: 70, weight_kg: 60, serum_creatinine: 1.4 }))
    expect(ledger.metformin.limit_mg_day).toBe(1000)
    const a = byType(alerts, 'dose_excess')
    expect(a).toHaveLength(1)
    expect(a[0].reason).toContain('1,500 mg/day')
  })

  it('asks for weight, creatinine and sex once for a drug the patient rules do not cover', async () => {
    const out = await check('Glycomet 500 BD', { age_years: 70 })
    const ask = byType(out.alerts, 'input_needed')
    expect(ask).toHaveLength(1)
    expect(ask[0].ingredients).toEqual(['metformin'])
    expect(ask[0].reason).toContain('weight, serum creatinine and sex')
    expect(out.needs.map((n) => n.field).sort()).toEqual(['serum_creatinine', 'sex', 'weight_kg'])
  })

  it('does not ask a child for kidney inputs: the adult formula is not used', async () => {
    const { alerts } = await check('Brufen 100 syrup BD', { age_years: 6, weight_kg: 20 })
    expect(byType(alerts, 'input_needed')).toHaveLength(0)
  })

  it('reports an SOS-only excess as Inform, not a stop', async () => {
    const { alerts } = await check('Dolo 650 QID; Dolo 650 SOS max 3', adult())
    const a = alerts.find((x) => x.type === 'dose_excess_sos')!
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain('only if the SOS dose is used at its maximum')
    expect(byType(alerts, 'dose_excess')).toHaveLength(0)
  })

  it('stops a weekly drug written as daily (methotrexate)', async () => {
    const { alerts } = await check('Folitrax 7.5 OD', adult())
    const a = byType(alerts, 'schedule_mismatch')
    expect(a).toHaveLength(1)
    expect(a[0].tier).toBe('interrupt')
    expect(a[0].reason).toContain('once a week')
  })

  it('does not stop a weekly drug written weekly', async () => {
    const { alerts } = await check('Folitrax 7.5 weekly', adult())
    expect(byType(alerts, 'schedule_mismatch')).toHaveLength(0)
  })

  it('says dosing was not entered instead of guessing a frequency, and leaves the line out of the totals', async () => {
    const { alerts, ledger } = await check('Omez 20', adult())
    const a = byType(alerts, 'dosing_not_entered')
    expect(a).toHaveLength(1)
    expect(a[0].tier).toBe('inform')
    expect(a[0].reason).toContain('dosing not entered')
    expect(a[0].brands).toEqual(['Omez'])
    expect(ledger.omeprazole).toBeUndefined()
    expect(byType(alerts, 'sig_unclear')).toHaveLength(0)
  })

  it('does not flag a clearly written sig', async () => {
    const { alerts } = await check('Omez 20 OD', adult())
    expect(byType(alerts, 'sig_unclear')).toHaveLength(0)
  })
})
