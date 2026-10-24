import { describe, expect, it } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { createDdiIndex, type DdiJson } from '../../engine/resolver/ddi'
import { testResolver } from '../../engine/resolver/testing'
import { parseAlertRules } from '../../engine/rules'
import { createHistoryCheck } from './check'
import { demoOrders } from './demoOrders'
import { byQueueOrder, leadFinding, shortFinding, suggestionCounts, trimReason, waitedLabel } from './queue'
import type { HistoryAlert, HistoryResult, Order } from './types'

const run = createHistoryCheck({ resolver: testResolver(), ddi: createDdiIndex(JSON.parse(ddiRaw) as DdiJson), rules: parseAlertRules(JSON.parse(rulesRaw)) })
const results = () => Promise.all(demoOrders.map((o) => run(o)))
const bare = (over: Partial<HistoryResult>) => ({ alerts: [], unverified: [], status: 'clear', ...over }) as unknown as HistoryResult

describe('suggestionCounts', () => {
  it('splits the demo account so the three suggestions add up to the orders checked', async () => {
    const rs = await results()
    const { counts, total, unchecked } = suggestionCounts(rs)
    expect(unchecked).toBe(0)
    expect(total).toBe(demoOrders.length)
    expect(counts.hold_contact_doctor + counts.clear_with_note + counts.clear).toBe(demoOrders.length)
  })

  it('keeps orders that are still running or failed out of the three counts, and counts them apart', () => {
    const { total, unchecked, running, failed } = suggestionCounts([bare({ status: 'clear' }), undefined, 'failed', 'failed'])
    expect(total).toBe(1)
    expect(unchecked).toBe(3)
    expect({ running, failed }).toEqual({ running: 1, failed: 2 })
  })
})

describe('byQueueOrder', () => {
  const row = (id: string, placed: string, result: HistoryResult | 'failed' | undefined) => ({ order: { id, placed } as Order, result })
  it('puts orders that could not be checked first, then priority, oldest first on a tie, still-running last', () => {
    const rows = [
      row('running', '2026-10-01', undefined),
      row('low', '2026-10-01', bare({ priority: 1 } as Partial<HistoryResult>)),
      row('high-new', '2026-10-20', bare({ priority: 9 } as Partial<HistoryResult>)),
      row('high-old', '2026-10-10', bare({ priority: 9 } as Partial<HistoryResult>)),
      row('failed', '2026-10-22', 'failed'),
    ]
    expect(rows.sort(byQueueOrder).map((r) => r.order.id)).toEqual(['failed', 'high-old', 'high-new', 'low', 'running'])
  })
})

describe('waitedLabel', () => {
  it('says how long an order has waited', () => {
    expect(waitedLabel('2026-10-24', '2026-10-24')).toBe('placed today')
    expect(waitedLabel('2026-10-23', '2026-10-24')).toBe('waiting 1 day')
    expect(waitedLabel('2026-10-19', '2026-10-24')).toBe('waiting 5 days')
    expect(waitedLabel('2026-10-30', '2026-10-24')).toBe('placed 30 Oct')
  })
})

describe('short findings', () => {
  it('drops parentheses and the "Pharmacist to" sentence so the conclusion fits', () => {
    expect(
      trimReason('Paracetamol totals 4,100 mg/day across 3 brands (Dolo 650 x3/day (1,950 mg), Crocin), above the 3,000 mg/day limit (age 65+ cap). Pharmacist to review before dispensing.'),
    ).toBe('Paracetamol totals 4,100 mg/day across 3 brands, above the 3,000 mg/day limit')
  })

  it('leads a dose finding with the numbers, then brands and doctors', () => {
    const r = bare({ windows: [{ ledger: { paracetamol: { total_mg_day: 4100, limit_mg_day: 3000, sources: [] } } }] } as unknown as Partial<HistoryResult>)
    const a = {
      type: 'dose_excess', ingredients: ['paracetamol'], reason: 'long', brands: ['Dolo 650', 'Crocin', 'Sinarest'],
      prescribed: [{ doctor: 'Dr Mehta (GP)' }, { doctor: 'Dr Rao' }],
    } as unknown as HistoryAlert
    expect(shortFinding(a, r)).toBe('Paracetamol 4,100 mg/day, limit 3,000, 3 brands, 2 doctors')
  })
})

describe('leadFinding', () => {
  it('leads with an Interrupt before an Inform, and counts the other findings', async () => {
    for (const r of await results()) {
      const lead = leadFinding(r)
      const shown = r.alerts.filter((a) => a.tier !== 'silent')
      if (shown.length === 0) continue
      expect(lead.more).toBe(shown.length - 1)
      if (shown.some((a) => a.tier === 'interrupt')) expect(lead.tier).toBe('interrupt')
      expect(shown.map((a) => a.reason)).toContain(lead.full)
      expect(lead.text).not.toMatch(/Pharmacist to/)
    }
  })

  it('names unverified brands when there are no alerts, else says no alerts were found', () => {
    expect(leadFinding(bare({})).text).toBe('No alerts from the checks run')
    expect(leadFinding(bare({ unverified: [{}, {}] as HistoryResult['unverified'] })).text).toBe('2 unverified brands, left out of the totals')
  })

  it('prefers a cross-doctor alert over a single-prescription one of the same tier', () => {
    const r = bare({
      alerts: [
        { tier: 'inform', type: 'ddi', ingredients: [], reason: 'single', cross_doctor: false },
        { tier: 'inform', type: 'ddi', ingredients: [], reason: 'cross', cross_doctor: true },
      ] as unknown as HistoryResult['alerts'],
    })
    expect(leadFinding(r)).toMatchObject({ full: 'cross', more: 1 })
  })
})
