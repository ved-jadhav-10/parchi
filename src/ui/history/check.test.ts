import { describe, expect, it } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { createDdiIndex, type DdiJson } from '../../engine/resolver/ddi'
import { testResolver } from '../../engine/resolver/testing'
import { parseAlertRules } from '../../engine/rules'
import { addDays, createHistoryCheck, latestLab, touches } from './check'
import { demoOrders } from './demoOrders'
import { dayBefore, doctorName, rangeLabel, shortDate, STATUS_LABEL } from './labels'
import type { HistoryAlert, Order } from './types'

const resolver = testResolver()
const run = createHistoryCheck({ resolver, ddi: createDdiIndex(JSON.parse(ddiRaw) as DdiJson), rules: parseAlertRules(JSON.parse(rulesRaw)) })
const order = (id: string) => demoOrders.find((o) => o.id === id)!
const withLab = (o: Order): Order => ({ ...o, labs: [...o.labs, ...(o.incoming_labs ?? [])], incoming_labs: [] })
const find = (alerts: HistoryAlert[], type: string) => alerts.find((a) => a.type === type)

describe('dates and lines', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-10-30', 5)).toBe('2026-11-04')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('gives each line the days it is taken: the written duration, else the engine default window', async () => {
    const r = await run(order('ORD-1087'))
    const dolo = r.lines.find((l) => l.resolved.brand === 'Dolo 650')!
    expect(dolo.start).toBe('2026-10-19')
    expect(dolo.end).toBe('2026-10-24')
    expect(dolo.end_assumed).toBe(false)
    expect(dolo.text).toContain('Dolo 650')
    const crocin = r.lines.find((l) => l.resolved.brand === 'Crocin Cold & Flu Max')!
    expect(crocin.end_assumed).toBe(true)
  })

  it('cuts the timeline at every start and stop and keeps only stretches with something active', async () => {
    const r = await run(order('ORD-1087'))
    expect(r.windows[0].start).toBe('2026-10-19')
    expect(r.windows.every((w) => w.lines.length > 0)).toBe(true)
    expect(r.windows.every((w, i) => i === 0 || r.windows[i - 1].end <= w.start)).toBe(true)
    // Dolo stops on the 24th, so the set of active lines changes there.
    expect(r.windows.some((w) => w.start === '2026-10-24')).toBe(true)
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
    const after = await run(withLab(order('ORD-1087')), before)
    expect(after.crcl).toBeGreaterThan(30)
    expect(after.crcl).toBeLessThan(40)
    const changes = after.changes!
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

  it('shows an alert only in the stretches where what it is about is being taken', async () => {
    const r = await run(order('ORD-1087'))
    const dose = find(r.alerts, 'dose_excess')!
    const w = r.windows[r.peak]
    expect(w.alerts).toContainEqual(dose)
    // In every stretch the alert is shown exactly when the total there is over the limit.
    for (const win of r.windows) {
      const e = win.ledger.paracetamol
      const over = !!e && e.limit_mg_day !== undefined && e.total_mg_day > e.limit_mg_day
      expect(win.alerts.some((a) => a.type === 'dose_excess' && a.ingredients.includes('paracetamol'))).toBe(over)
    }
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

describe('labs and touches', () => {
  it('takes the most recent creatinine', () => {
    expect(latestLab([{ type: 'serum_creatinine', value: 1, date: '2026-10-01' }, { type: 'serum_creatinine', value: 2, date: '2026-10-20' }])?.value).toBe(2)
    expect(latestLab([])).toBeUndefined()
  })
  it('ties an alert to the lines it is about', async () => {
    const r = await run(order('ORD-1087'))
    const dose = find(r.alerts, 'dose_excess')!
    expect(r.lines.filter((l) => touches(dose, l)).length).toBeGreaterThanOrEqual(3)
  })
  it('keeps the engine result so a re-check can diff against it', async () => {
    const r = await run(order('ORD-1087'))
    expect(r.engine.alerts).toHaveLength(r.alerts.length)
    expect(r.changes).toBeUndefined()
  })
})

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

describe('confirming an unrecognised brand', () => {
  it('moves the line from unverified into the totals, and marks it as confirmed by the pharmacist', async () => {
    const o = demoOrders.find((x) => x.prescriptions.length > 0 && x.id === 'ORD-1089') ?? demoOrders[2]
    const before = await run(o)
    const unknown = before.unverified[0]
    expect(unknown, 'a sample order has an unverified brand').toBeDefined()
    expect(unknown.rx_line).toBeGreaterThanOrEqual(0)

    const pick = unknown.resolved.candidates![0].brand
    const after = await run({ ...o, confirmations: { [`${unknown.rx_id}#${unknown.rx_line}`]: pick } }, before)
    const line = after.lines.find((l) => l.rx_id === unknown.rx_id && l.rx_line === unknown.rx_line)!
    expect(line.unverified).toBe(false)
    expect(line.confirmed).toBe(pick)
    expect(line.resolved.ingredients.length).toBeGreaterThan(0)
    expect(after.unverified.length).toBe(before.unverified.length - 1)
    expect(after.changes).toBeDefined()
  })
})

describe('herbal items on an order', () => {
  const withHerbal: Order = {
    ...demoOrders[1],
    id: 'ORD-HERBAL',
    prescriptions: [{ id: 'rx-h', doctor: 'Dr Sharma (general physician)', date: '2026-10-23', text: 'Dolo 650 TDS x3d; Triphala churna 1 tsp HS x10d' }],
  }

  it('keeps the herbal line out of the ordinary check and reports it separately', async () => {
    const r = await run(withHerbal)
    expect(r.lines.map((l) => l.resolved.raw.toLowerCase()).join(' ')).not.toContain('triphala')
    expect(r.herbal?.items[0]?.raw.toLowerCase()).toContain('triphala')
    expect(r.herbal?.items[0]?.rx_id).toBe('rx-h')
  })

  it('keeps confirmations keyed to the ordinary lines, not shifted by a herbal line before them', async () => {
    const o: Order = { ...withHerbal, prescriptions: [{ id: 'rx-h', doctor: 'Dr Sharma', date: '2026-10-23', text: 'Triphala churna 1 tsp HS; Dolo 650 TDS x3d' }] }
    const r = await run(o)
    expect(r.lines[0].rx_line).toBe(0)
    expect(r.lines[0].resolved.brand).toBe('Dolo 650')
  })
})
