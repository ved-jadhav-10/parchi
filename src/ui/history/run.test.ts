import { describe, expect, it } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { createDdiIndex, type DdiJson } from '../../engine/resolver/ddi'
import { testResolver } from '../../engine/resolver/testing'
import { parseAlertRules } from '../../engine/rules'
import { createHistoryCheck } from './check'
import { demoOrders } from './demoOrders'
import { createRunner } from './run'

const make = () => {
  let loads = 0
  const runner = createRunner(async () => {
    loads++
    return createHistoryCheck({ resolver: testResolver(), ddi: createDdiIndex(JSON.parse(ddiRaw) as DdiJson), rules: parseAlertRules(JSON.parse(rulesRaw)) })
  })
  return { ...runner, loads: () => loads }
}

describe('createRunner', () => {
  it('loads the engine once and returns the same result for the same order content', async () => {
    const { runHistory, loads } = make()
    const o = demoOrders[1]
    const a = await runHistory(o)
    const b = await runHistory({ ...o })
    expect(b).toBe(a)
    expect(loads()).toBe(1)
  })

  it('treats an edit or a confirmed brand as a different order', async () => {
    const { runHistory } = make()
    const o = demoOrders[1]
    const a = await runHistory(o)
    const c = await runHistory({ ...o, customer: { ...o.customer, age_years: o.customer.age_years + 1 } })
    expect(c).not.toBe(a)
  })

  it('does not share a result that was computed against an earlier one (the diff)', async () => {
    const { runHistory } = make()
    const o = demoOrders[0]
    const first = await runHistory(o)
    const second = await runHistory({ ...o, labs: [...o.labs, ...(o.incoming_labs ?? [])] }, first)
    expect(second.changes).toBeDefined()
  })

  it('checks every order, and reports one that cannot be checked as failed', async () => {
    const { runAll } = make()
    const broken = { ...demoOrders[0], id: 'ORD-BROKEN', prescriptions: [{ id: 'x', doctor: 'Dr X', date: '2026-10-20', text: '' }] }
    const out = await runAll([...demoOrders, broken])
    expect(Object.keys(out)).toEqual([...demoOrders.map((o) => o.id), 'ORD-BROKEN'])
    expect(out['ORD-BROKEN']).toBe('failed')
    expect(typeof out[demoOrders[0].id]).toBe('object')
  })

  it('stops when told the page is gone', async () => {
    const { runAll } = make()
    let calls = 0
    const out = await runAll(demoOrders, () => ++calls <= 1)
    expect(Object.keys(out)).toHaveLength(1)
  })
})
