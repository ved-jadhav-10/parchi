import { describe, expect, it } from 'vitest'
import hist from '../../../tests/fixtures/demo_history.json'
import type { Alert, LabResult, Patient, Prescription } from '../contracts'
import { LIMITS } from '../limits'
import { alertRules, realHistory } from '../rules/testing'
import { alertKey, buildWindows, dayNumber, diffAlerts, isoDay, latestCreatinine, orderPriority, orderStatus, rankQueue } from './index'

const check = realHistory()
const patient = hist.patient as Patient
const rxs = hist.prescriptions as Prescription[]
const labs = hist.labs as LabResult[]
const ex = hist.expected
const types = (alerts: Alert[], tier: string) => alerts.filter((a) => a.tier === tier).map((a) => a.type)
const find = (alerts: Alert[], type: string) => alerts.find((a) => a.type === type)!

describe('dates', () => {
  it('counts calendar days and round-trips', () => {
    expect(dayNumber('2026-10-08') - dayNumber('2026-10-01')).toBe(7)
    expect(isoDay(dayNumber('2026-03-01') - 1)).toBe('2026-02-28')
    expect(dayNumber('2026-10-01T10:30:00+05:30')).toBe(dayNumber('2026-10-01'))
  })
  it('rejects a malformed or impossible date instead of guessing', () => {
    expect(() => dayNumber('01/10/2026')).toThrow('Invalid date')
    expect(() => dayNumber('2026-02-30')).toThrow('no such day')
  })
})

describe('overlap windows', () => {
  it('cuts the timeline where a medicine starts or stops', () => {
    const w = buildWindows([{ start: 0, end: 10 }, { start: 5, end: 8 }], 0)
    expect(w).toEqual([
      { start: 0, end: 5, members: [0] },
      { start: 5, end: 8, members: [0, 1] },
      { start: 8, end: 10, members: [0] },
    ])
  })
  it('does not overlap spans that only touch (end is the first day NOT taken)', () => {
    const w = buildWindows([{ start: 0, end: 5 }, { start: 5, end: 10 }], 0)
    expect(w.map((x) => x.members)).toEqual([[0], [1]])
  })
  it('starts at `from`, merges identical neighbours and skips gaps', () => {
    expect(buildWindows([{ start: 0, end: 10 }], 4)).toEqual([{ start: 4, end: 10, members: [0] }])
    expect(buildWindows([{ start: 0, end: 2 }, { start: 6, end: 9 }], 0).map((x) => [x.start, x.end])).toEqual([[0, 2], [6, 9]])
    expect(buildWindows([], 0)).toEqual([])
  })
})

describe('the demo history, order by order', () => {
  it('adds paracetamol up only while the two doctors\' prescriptions overlap', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-05' })
    const e = ex.paracetamol_overlap
    const a = find(r.alerts, 'dose_excess')
    expect(a.tier).toBe('interrupt')
    expect(a.window).toEqual({ start: e.start, end: e.end })
    expect(r.ledger.paracetamol.total_mg_day).toBe(e.mg_day)
    // After Crocin ends the total drops back under the 65+ cap, so that stretch is a separate, quieter window
    const later = r.windows.find((w) => w.start === e.end)!
    expect(later.ledger.paracetamol.total_mg_day).toBe(2600)
  })

  it('names both doctors and the dates on the cross-doctor alert', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-05' })
    const a = find(r.alerts, 'dose_excess')
    expect(a.cross_doctor).toBe(true)
    expect(a.doctors).toEqual(ex.paracetamol_overlap.doctors)
    expect(a.rx_ids).toEqual(ex.paracetamol_overlap.rx_ids)
    expect(a.reason).toContain('Dr Rao (GP), 1 Oct 2026')
    expect(a.reason).toContain('Dr Mehta (Orthopaedics), 5 Oct 2026')
  })

  it('flags NSAID and PPI duplicates across doctors, but not a same-doctor duplicate as cross-doctor', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-05' })
    // Two NSAIDs in a 68-year-old: the high-risk stack alert replaces the plain class duplicate (FIX_PLAN 1.4).
    const nsaid = r.alerts.find((a) => a.type === 'nsaid_double_high_risk' && a.ingredients.includes('ibuprofen'))!
    expect(nsaid.cross_doctor).toBe(true)
    const solo = await check(rxs, patient, [], { asOf: '2026-10-01' })
    expect(find(solo.alerts, 'duplicate_ingredient').cross_doctor).toBe(false)
  })

  it('finds the aspirin + ibuprofen interaction only for the days both are taken', async () => {
    const r = await check(rxs, patient, [], { asOf: ex.ddi_aspirin_ibuprofen.order === 'rx-3' ? '2026-10-08' : undefined })
    const d = find(r.alerts, 'ddi')
    expect(d.window).toEqual({ start: ex.ddi_aspirin_ibuprofen.start, end: ex.ddi_aspirin_ibuprofen.end })
    expect(d.source).toBe('DDInter20 / DDInter900')
    // The order before rx-3 has no aspirin yet, so no interaction
    expect((await check(rxs, patient, [], { asOf: '2026-10-05' })).alerts.some((a) => a.type === 'ddi')).toBe(false)
  })

  it('ignores prescriptions written after the order under review', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-01' })
    expect(new Set(r.lines.map((l) => l.rx_id))).toEqual(new Set(['rx-1']))
    expect(r.as_of).toBe('2026-10-01')
  })

  it('every line carries rx_id, doctor, start and end (contract 7)', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-05' })
    const dolo = r.lines.find((l) => l.resolved.brand === 'Dolo 650')!
    expect([dolo.rx_id, dolo.doctor, dolo.start, dolo.end]).toEqual(['rx-1', 'Dr Rao (GP)', '2026-10-01', '2026-10-11'])
  })

  it('is deterministic', async () => {
    expect(await check(rxs, patient, labs)).toEqual(await check(rxs, patient, labs))
  })
})

describe('only overlapping supply is added up', () => {
  const dolo = (id: string, doctor: string, date: string, text: string): Prescription => ({ id, doctor, date, text })
  const adult: Patient = { age_years: 40, weight_kg: 70, sex: 'M', serum_creatinine: 0.9 }

  it('raises nothing when the same drug from two doctors does not overlap in time', async () => {
    const r = await check([dolo('a', 'Dr A', '2026-10-01', 'Dolo 650 TDS x5d'), dolo('b', 'Dr B', '2026-10-10', 'Dolo 650 TDS x5d')], adult, [], { from: '2026-10-01' })
    expect(r.alerts.filter((a) => a.tier !== 'silent')).toEqual([])
    expect(r.ledger.paracetamol.total_mg_day).toBe(1950)
  })

  it('raises a cross-doctor duplicate when they overlap', async () => {
    const r = await check([dolo('a', 'Dr A', '2026-10-01', 'Dolo 650 TDS x5d'), dolo('b', 'Dr B', '2026-10-03', 'Dolo 650 TDS x5d')], adult)
    const a = find(r.alerts, 'duplicate_ingredient')
    expect(a.cross_doctor).toBe(true)
    expect(a.window).toEqual({ start: '2026-10-03', end: '2026-10-06' })
    expect(r.ledger.paracetamol.total_mg_day).toBe(3900)
    expect(r.status).toBe('clear_with_note')
  })

  it('uses the default window (limits.json, Track B) when no duration is written, and says so', async () => {
    const r = await check([dolo('a', 'Dr A', '2026-10-01', 'Omez 20 OD')], adult)
    const days = LIMITS.windows.default_duration_days
    expect(r.lines[0].default_window).toBe(true)
    expect(r.lines[0].end).toBe(isoDay(dayNumber('2026-10-01') + days))
  })

  it('shows past overlaps too when asked for the whole history (from)', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-08', from: '2026-10-01' })
    expect(r.windows[0].start).toBe('2026-10-01')
    expect(r.windows.length).toBeGreaterThan(4)
  })

  it('rejects two prescriptions with the same id and handles an empty history', async () => {
    await expect(check([rxs[0], rxs[0]], patient)).rejects.toThrow('Duplicate prescription id')
    const empty = await check([], patient)
    expect([empty.status, empty.priority, empty.alerts, empty.lines]).toEqual(['clear', 0, [], []])
  })
})

describe('kidney re-check on a new creatinine', () => {
  it('asks for creatinine before the lab and uses it after', async () => {
    const before = await check(rxs, patient, [], { asOf: '2026-10-05' })
    expect(before.needs?.map((n) => n.field)).toEqual(['serum_creatinine'])
    expect(types(before.alerts, 'interrupt').sort()).toEqual([...ex.without_lab['rx-2'].interrupts].sort())
    const after = await check(rxs, patient, labs, { asOf: '2026-10-05' })
    expect(after.needs).toBeUndefined()
    expect(after.creatinine_used).toEqual(ex.with_lab.creatinine)
  })

  it('lists what changed: NSAID kidney caution added, the creatinine request cleared', async () => {
    const before = await check(rxs, patient, [], { asOf: '2026-10-05' })
    const after = await check(rxs, patient, labs, { asOf: '2026-10-05', previous: before })
    expect(after.changes!.added.map((a) => a.type)).toEqual(ex['recheck_rx-2'].added)
    expect(after.changes!.cleared.map((a) => a.type)).toEqual(ex['recheck_rx-2'].cleared)
    expect(after.changes!.changed).toEqual([])
    expect(before.changes).toBeUndefined()
  })

  it('reports an alert that only changed tier', async () => {
    const before = await check(rxs, patient, labs, { asOf: '2026-10-05' })
    const lowered = { ...before, alerts: before.alerts.map((a) => (a.type === 'nsaid_double_high_risk' ? { ...a, tier: 'inform' as const } : a)) }
    const after = await check(rxs, patient, labs, { asOf: '2026-10-05', previous: lowered })
    expect(after.changes!.changed.map((c) => [c.before.tier, c.after.tier])).toEqual([['inform', 'interrupt']])
  })

  it('takes the latest creatinine by date, not by position', () => {
    const v = (value: number, date: string): LabResult => ({ type: 'serum_creatinine', value, date })
    expect(latestCreatinine([v(2.0, '2026-10-20'), v(1.1, '2026-10-02')])!.value).toBe(2.0)
    expect(latestCreatinine([])).toBeUndefined()
  })

  it('a better creatinine clears the kidney caution', async () => {
    const good: LabResult[] = [{ type: 'serum_creatinine', value: 0.9, date: '2026-10-12' }]
    const bad = await check(rxs, patient, labs, { asOf: '2026-10-05' })
    const r = await check(rxs, { ...patient, age_years: 50 }, good, { asOf: '2026-10-05', previous: bad })
    expect(r.alerts.some((a) => a.type === 'nsaid_renal_caution')).toBe(false)
    expect(r.changes!.cleared.map((a) => a.type)).toContain('nsaid_renal_caution')
  })
})

describe('unknown brands', () => {
  it('proposes a composition, marks it unverified and keeps it out of the totals', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-08' })
    const a = find(r.alerts, 'unresolved')
    expect(a.unverified).toBe(true)
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain(ex.unknown_brand.proposed)
    expect(a.reason).toContain('unverified')
    expect(r.ledger.alfuzosin).toBeUndefined()
    const line = r.lines.find((l) => l.resolved.raw === ex.unknown_brand.raw)!
    expect(line.unverified).toBe(true)
  })

  it('counts the line once the pharmacist confirms a brand', async () => {
    const r = await check(rxs, patient, [], { asOf: '2026-10-08', confirmations: { 'rx-3#1': 'Dolo 650' } })
    expect(r.alerts.some((a) => a.type === 'unresolved')).toBe(false)
    expect(r.lines.find((l) => l.rx_id === 'rx-3' && l.resolved.brand === 'Dolo 650')!.unverified).toBeUndefined()
    expect(r.ledger.paracetamol.total_mg_day).toBeGreaterThan(4100)
  })

  it('has no proposal when nothing is close', async () => {
    const r = await check([{ id: 'x', doctor: 'Dr X', date: '2026-10-01', text: 'Qzxwvk 500 OD' }], { age_years: 30 })
    const a = find(r.alerts, 'unresolved')
    expect(a.unverified).toBeUndefined()
    expect(a.reason).not.toContain('Closest match')
  })
})

describe('order status, priority and the review queue', () => {
  it('derives the status from the worst tier, with or without the lab', async () => {
    for (const [withLab, expected] of [[false, ex.without_lab], [true, ex.with_lab]] as const) {
      for (const [id, date] of [['rx-1', '2026-10-01'], ['rx-2', '2026-10-05'], ['rx-3', '2026-10-08']] as const) {
        const r = await check(rxs, patient, withLab ? labs : [], { asOf: date })
        const want = expected[id]
        expect(r.status, `${id} ${withLab ? 'with' : 'without'} lab`).toBe(want.status)
        expect(types(r.alerts, 'interrupt').sort()).toEqual([...want.interrupts].sort())
      }
    }
  })

  it('ranks the three orders: the most alerts first, with the kidney re-check lifting the earlier orders', async () => {
    const items = []
    for (const [id, date] of [['rx-1', '2026-10-01'], ['rx-2', '2026-10-05'], ['rx-3', '2026-10-08']] as const) {
      const result = await check(rxs, patient, labs, { asOf: date })
      items.push({ id, date, priority: result.priority, result })
    }
    expect(rankQueue(items).map((i) => [i.rank, i.id])).toEqual(ex.with_lab.queue.map((id, i) => [i + 1, id]))
  })

  it('without the lab the order of review changes, because rx-1 has nothing to stop on', async () => {
    const p1 = (await check(rxs, patient, [], { asOf: '2026-10-01' })).priority
    const p2 = (await check(rxs, patient, [], { asOf: '2026-10-05' })).priority
    expect(p2).toBeGreaterThan(p1)
  })

  it('breaks priority ties by the oldest order, then id', () => {
    const q = rankQueue([
      { id: 'b', date: '2026-10-02', priority: 10, result: 0 },
      { id: 'a', date: '2026-10-02', priority: 10, result: 0 },
      { id: 'c', date: '2026-10-01', priority: 10, result: 0 },
      { id: 'd', date: '2026-10-09', priority: 99, result: 0 },
    ])
    expect(q.map((i) => i.id)).toEqual(['d', 'c', 'a', 'b'])
  })

  it('counts an Interrupt demoted by the alert budget as a hold and at full weight', () => {
    const policy = alertRules().history
    const demoted: Alert = { tier: 'inform', type: 'nsaid_renal', ingredients: ['x'], reason: 'r', source: 's', confidence: 1, budget_demoted: true }
    expect(orderStatus([demoted], policy)).toBe('hold_contact_doctor')
    expect(orderPriority([demoted], policy)).toBe(policy.queue.tier_weight.interrupt + (policy.queue.type_bonus.nsaid_renal ?? 0))
  })

  it('silent alerts add nothing, and no alerts is clear', () => {
    const policy = alertRules().history
    const silent: Alert = { tier: 'silent', type: 'nsq', ingredients: ['x'], reason: 'r', source: 's', confidence: 1 }
    expect(orderPriority([silent], policy)).toBe(0)
    expect(orderStatus([silent], policy)).toBe('clear')
    expect(orderStatus([], policy)).toBe('clear')
  })
})

describe('diffAlerts', () => {
  const a = (type: string, tier: Alert['tier'], ing = 'x'): Alert => ({ tier, type, ingredients: [ing], reason: '', source: '', confidence: 1 })
  it('keys on type and ingredients, ignores quiet alerts, and sees tier moves', () => {
    expect(alertKey(a('ddi', 'inform', 'y'))).toBe('ddi|y')
    const d = diffAlerts([a('p', 'inform'), a('q', 'silent'), a('r', 'inform')], [a('p', 'interrupt'), a('s', 'silent'), a('t', 'inform')])
    expect(d.added.map((x) => x.type)).toEqual(['t'])
    expect(d.cleared.map((x) => x.type)).toEqual(['r'])
    expect(d.changed.map((c) => c.after.type)).toEqual(['p'])
  })
})

describe('refill smoothing', () => {
  const adult: Patient = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }
  const refill = (doctorB: string, secondDate: string): Prescription[] => [
    { id: 'a', doctor: 'Dr Rao', date: '2026-10-01', text: 'Dolo 650 TDS x10d' },
    { id: 'b', doctor: doctorB, date: secondDate, text: 'Dolo 650 TDS x10d' },
  ]
  const dups = (r: { alerts: Alert[] }) => r.alerts.filter((a) => a.type === 'duplicate_ingredient')

  it('reads a same-doctor repeat a few days early as a continuation, not a double', async () => {
    const r = await check(refill('Dr Rao', '2026-10-08'), adult, [], { from: '2026-10-01' })
    expect(dups(r)).toEqual([])
    const first = r.lines.find((l) => l.rx_id === 'a')!
    expect(first.end).toBe('2026-10-08')
    expect(first.refill_overlap_days).toBe(3)
    expect(r.lines.find((l) => l.rx_id === 'b')!.refill_overlap_days).toBeUndefined()
  })

  it('still flags a different doctor repeating it: that is the cross-doctor case', async () => {
    const r = await check(refill('Dr Mehta', '2026-10-08'), adult, [], { from: '2026-10-01' })
    expect(dups(r)).toHaveLength(1)
    expect(r.lines.find((l) => l.rx_id === 'a')!.refill_overlap_days).toBeUndefined()
  })

  it('still flags a repeat that starts well before the supply ends', async () => {
    const r = await check(refill('Dr Rao', '2026-10-02'), adult, [], { from: '2026-10-01' })
    expect(dups(r)).toHaveLength(1)
  })

  it('is off when the policy has no refill setting', async () => {
    const rules = alertRules()
    const off = realHistory({ ...rules, history: { ...rules.history, refill: undefined } })
    const r = await off(refill('Dr Rao', '2026-10-08'), adult, [], { from: '2026-10-01' })
    expect(dups(r)).toHaveLength(1)
  })
})
