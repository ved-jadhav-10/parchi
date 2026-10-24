// Track C's pipeline running on Track B's real sig parser and ledger (not C's stand-ins), on the demo prescription.
import { describe, it, expect } from 'vitest'
import demo from '../../../tests/fixtures/demo_rx.json'
import type { Patient } from '../contracts'
import { createPipeline } from '../pipeline'
import { testResolver } from '../resolver/testing'
import { alertRules, testDdi } from '../rules/testing'
import { createDoseDeps } from './index'

const resolver = testResolver()
const deps = createDoseDeps(resolver)
const check = createPipeline({ resolver, ddi: testDdi(), rules: alertRules(), parseSig: deps.parseSig, buildLedger: deps.buildLedger })

describe('createPipeline with Track B injected', () => {
  it('produces the fixture ledger and alert counts on the demo prescription', async () => {
    const r = await check(demo.rx_text, demo.patient as Patient)
    expect(r.ledger.paracetamol.total_mg_day).toBe(demo.expected.ledger_paracetamol_mg_day)
    const tiers = (t: string) => r.alerts.filter((a) => a.tier === t).length
    expect(tiers('interrupt')).toBe(demo.expected.alerts.interrupt_count)
    expect(tiers('inform')).toBeGreaterThanOrEqual(demo.expected.alerts.inform_min)
    expect(tiers('inform')).toBeLessThanOrEqual(demo.expected.alerts.inform_max)
  })

  it('raises the hidden-paracetamol overdose as an Interrupt that names the brands, from B\'s limit', async () => {
    const r = await check(demo.rx_text, demo.patient as Patient)
    const over = r.alerts.find((a) => a.type === 'dose_excess' && a.ingredients.includes('paracetamol'))!
    expect(over.tier).toBe('interrupt')
    expect(r.ledger.paracetamol.limit_mg_day).toBe(4000)
    expect(r.ledger.paracetamol.limit_pharmacist_approved).toBe(false)
  })

  it('stays quiet about dose for a clean prescription', async () => {
    const r = await check('Dolo 650 TDS; Pan D OD', { age_years: 40 })
    expect(r.alerts.filter((a) => a.type === 'dose_excess')).toEqual([])
  })
})

describe('createDoseDeps', () => {
  it('computeDose gives findings and questions the pipeline interface cannot carry', () => {
    const lines = resolver.resolveText(demo.rx_text, { age_years: 68 }).map((l) => ({ resolved: l.resolved, sig: deps.parseSig(l.sig_text, l.resolved) }))
    const d = deps.computeDose(lines, demo.patient as Patient)
    expect(d.findings.map((f) => f.kind)).toContain('over_limit')
    expect(d.ledger).toEqual(deps.buildLedger(lines, demo.patient as Patient))
  })
})
