import { describe, expect, it } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import type { Alert } from '../../engine/contracts'
import { createDdiIndex, type DdiJson } from '../../engine/resolver/ddi'
import { testResolver } from '../../engine/resolver/testing'
import { parseAlertRules } from '../../engine/rules'
import { addDays, alertKey, buildLines, createHistoryCheck, diffAlerts, latestLab, statusOf, windowSpans } from './check'
import { demoOrders } from './demoOrders'
import type { HistoryAlert, Order } from './types'

const resolver = testResolver()
const run = createHistoryCheck({ resolver, ddi: createDdiIndex(JSON.parse(ddiRaw) as DdiJson), rules: parseAlertRules(JSON.parse(rulesRaw)) })
const order = (id: string) => demoOrders.find((o) => o.id === id)!
const withLab = (o: Order): Order => ({ ...o, labs: [...o.labs, ...(o.incoming_labs ?? [])], incoming_labs: [] })
const find = (alerts: HistoryAlert[], type: string) => alerts.find((a) => a.type === type)

describe('dates and windows', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-10-30', 5)).toBe('2026-11-04')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('gives each line the days it is taken: the written duration, else the default window', () => {
    const lines = buildLines(order('ORD-1087'), resolver)
    const dolo = lines.find((l) => l.resolved.brand === 'Dolo 650')!
    expect(dolo.start).toBe('2026-10-19')
    expect(dolo.end).toBe('2026-10-24')
    expect(dolo.end_assumed).toBe(false)
    const crocin = lines.find((l) => l.resolved.brand === 'Crocin Cold & Flu Max')!
    expect(crocin.end_assumed).toBe(true)
  })

  it('cuts the timeline at every start and stop and keeps only stretches with something active', () => {
    const lines = buildLines(order('ORD-1087'), resolver)
    const spans = windowSpans(lines)
    expect(spans[0].start).toBe('2026-10-19')
    expect(spans.every((s) => s.lines.length > 0)).toBe(true)
    expect(spans.every((s, i) => i === 0 || spans[i - 1].end <= s.start)).toBe(true)
    // Dolo stops on the 24th, so the set of active lines changes there.
    expect(spans.some((s) => s.start === '2026-10-24')).toBe(true)
  })
})

describe('order 1087: three doctors, no kidney result yet', () => {
  it('holds the order, names the doctors behind the paracetamol total and the interaction', async () => {
    const r = await run(order('ORD-1087'))
    expect(r.status).toBe('hold_contact_doctor')
    const dose = find(r.alerts, 'dose_excess')!
    expect(dose.tier).toBe('interrupt')
    expect(dose.cross_doctor).toBe(true)
    // The wording comes from the window where all three paracetamol brands overlap, not the first one.
    expect(dose.reason).toContain('4,100')
    expect(dose.reason).toContain('3 brands')
    expect(dose.prescribed.map((p) => p.doctor.split(' ')[1]).sort()).toEqual(['Mehta', 'Rao'])
    const ddi = find(r.alerts, 'ddi')!
    expect(ddi.cross_doctor).toBe(true)
    expect(ddi.prescribed.map((p) => p.doctor.split(' ')[1]).sort()).toEqual(['Iyer', 'Rao'])
  })

  it('asks for the kidney result and raises no kidney alert without it', async () => {
    const r = await run(order('ORD-1087'))
    expect(r.prompts.map((p) => p.field)).toContain('serum_creatinine')
    expect(find(r.alerts, 'nsaid_renal')).toBeUndefined()
    expect(r.crcl).toBeNull()
  })

  it('re-checks when the creatinine arrives and reports what changed', async () => {
    const before = await run(order('ORD-1087'))
    const after = await run(withLab(order('ORD-1087')))
    expect(after.crcl).toBeGreaterThan(30)
    expect(after.crcl).toBeLessThan(40)
    const changes = diffAlerts(before.alerts, after.alerts)
    expect(changes.find((c) => c.alert.type === 'nsaid_renal')?.kind).toBe('added')
    expect(after.prompts.map((p) => p.field)).not.toContain('serum_creatinine')
    expect(changes.every((c) => ['added', 'cleared', 'tier_changed'].includes(c.kind))).toBe(true)
  })

  it('peaks in the window where the three paracetamol brands overlap', async () => {
    const r = await run(order('ORD-1087'))
    const w = r.windows[r.peak]
    expect(w.ledger.paracetamol.total_mg_day).toBe(4100)
    expect(w.start <= '2026-10-23' && w.end > '2026-10-21').toBe(true)
  })
})

describe('the other orders and the queue', () => {
  it('marks the unrecognised brand unverified and leaves it out of the totals', async () => {
    const r = await run(order('ORD-1089'))
    expect(r.unverified.map((l) => l.resolved.raw)).toEqual(['Xylocort DX 400'])
    expect(r.status).toBe('clear_with_note')
    expect(find(r.alerts, 'ddi')?.cross_doctor).toBe(true)
    expect(find(r.alerts, 'unresolved')).toBeDefined()
  })

  it('clears an order with no alerts, in words that do not say safe', async () => {
    const r = await run(order('ORD-1088'))
    expect(r.status).toBe('clear')
    expect(r.alerts.filter((a) => a.tier !== 'silent')).toEqual([])
  })

  it('ranks the riskiest order first', async () => {
    const ranked = (await Promise.all(demoOrders.map(async (o) => [o.id, (await run(o)).priority] as const))).sort((a, b) => b[1] - a[1]).map(([id]) => id)
    expect(ranked).toEqual(['ORD-1087', 'ORD-1089', 'ORD-1088'])
  })

  it('refuses an order with no medicines', async () => {
    await expect(run({ ...order('ORD-1088'), prescriptions: [{ id: 'x', doctor: 'Dr X', date: '2026-10-23', text: '   ' }] })).rejects.toThrow()
  })
})

describe('status, keys and labs', () => {
  const a = (tier: Alert['tier']): Alert => ({ tier, type: 't', ingredients: ['x'], reason: 'r', source: 's', confidence: 1 })
  it('derives the suggested status from the tiers', () => {
    expect(statusOf([a('interrupt')], 0, 0)).toBe('hold_contact_doctor')
    expect(statusOf([a('inform')], 0, 0)).toBe('clear_with_note')
    expect(statusOf([a('silent')], 0, 0)).toBe('clear')
    expect(statusOf([], 1, 0)).toBe('clear_with_note')
    expect(statusOf([], 0, 1)).toBe('clear_with_note')
  })
  it('keys an alert by type and ingredients, whatever their order', () => {
    expect(alertKey({ ...a('inform'), ingredients: ['b', 'a'] })).toBe(alertKey({ ...a('interrupt'), ingredients: ['a', 'b'] }))
  })
  it('takes the most recent creatinine', () => {
    expect(latestLab([{ type: 'serum_creatinine', value: 1, date: '2026-10-01' }, { type: 'serum_creatinine', value: 2, date: '2026-10-20' }])?.value).toBe(2)
    expect(latestLab([])).toBeUndefined()
  })
})

import { dayBefore, doctorName, rangeLabel, shortDate, STATUS_LABEL } from './labels'

describe('review wording and dates', () => {
  it('words dates and ranges for the screen', () => {
    expect(shortDate('2026-10-19')).toBe('19 Oct')
    expect(dayBefore('2026-11-01')).toBe('2026-10-31')
    expect(rangeLabel('2026-10-21', '2026-10-24')).toBe('21 Oct to 23 Oct')
    expect(rangeLabel('2026-10-23', '2026-10-24')).toBe('23 Oct')
    expect(doctorName('Dr Rao (orthopaedics)')).toBe('Dr Rao')
  })
  it('never calls an order safe or approved', () => {
    expect(Object.values(STATUS_LABEL).join(' ')).not.toMatch(/safe|approved/i)
  })
})
