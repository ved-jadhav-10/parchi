import { describe, expect, it } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { createDdiIndex, type DdiJson } from '../../engine/resolver/ddi'
import { testResolver } from '../../engine/resolver/testing'
import { parseAlertRules } from '../../engine/rules'
import { createHistoryCheck } from './check'
import { demoOrders } from './demoOrders'
import { mailtoFor, queryDraft } from './query'

const run = createHistoryCheck({ resolver: testResolver(), ddi: createDdiIndex(JSON.parse(ddiRaw) as DdiJson), rules: parseAlertRules(JSON.parse(rulesRaw)) })
const order = (id: string) => demoOrders.find((o) => o.id === id)!

describe('queryDraft', () => {
  it('addresses the prescribers the findings name and states the finding with its source', async () => {
    const o = order('ORD-1087')
    const d = queryDraft(o, await run(o))
    expect(d.doctors).toEqual(expect.arrayContaining(['Dr Mehta', 'Dr Rao']))
    expect(d.body).toMatch(/^Dear Dr Mehta/)
    expect(d.body).toContain('Paracetamol')
    expect(d.body).toContain('Prescribed by Dr Mehta')
    expect(d.body).toContain('Source:')
    expect(d.subject).toContain('ORD-1087')
  })

  it('asks politely and never calls a prescription unsafe or wrong', async () => {
    for (const o of demoOrders) {
      const d = queryDraft(o, await run(o))
      expect(d.body).not.toMatch(/unsafe|dangerous|overdose|wrong|mistake|error/i)
      expect(d.body).toMatch(/Could you please confirm/)
      expect(d.body).not.toMatch(/Pharmacist to review/)
    }
  })

  it('lists at most three findings and numbers them', async () => {
    const o = order('ORD-1087')
    const r = await run(o)
    const d = queryDraft(o, r)
    const numbered = d.body.split('\n').filter((l) => /^\d\. /.test(l))
    expect(numbered.length).toBeGreaterThan(0)
    expect(numbered.length).toBeLessThanOrEqual(3)
  })

  it('builds a mailto link with the subject and body encoded', async () => {
    const o = order('ORD-1087')
    const d = queryDraft(o, await run(o))
    const href = mailtoFor(d)
    expect(href.startsWith('mailto:?subject=')).toBe(true)
    expect(decodeURIComponent(href.split('&body=')[1])).toBe(d.body)
  })
})
