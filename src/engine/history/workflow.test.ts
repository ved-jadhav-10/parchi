// FIX_PLAN Phase 3: how Indian pharmacies really work. A shared family account, a doctor who replaces a medicine without
// writing "stop", an order with a quantity but no course length, a cart with no dosing, a failed batch. Real engine, real data.
import { describe, expect, it } from 'vitest'
import type { Alert, Patient, Prescription } from '../contracts'
import { extractLineMeta } from '../resolver/segment'
import { testResolver } from '../resolver/testing'
import { realHistory, realPipeline } from '../rules/testing'
import { checkByPatient, groupByPatient, patientKey } from './patients'

const check = realHistory()
const single = realPipeline()
const adult: Patient = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }
const rx = (id: string, doctor: string, date: string, text: string, patient?: string): Prescription => ({ id, doctor, date, text, ...(patient ? { patient } : {}) })
const types = (alerts: Alert[]) => alerts.map((a) => a.type)

describe('a shared account never adds different people together (3.1)', () => {
  const family = [
    rx('a', 'Dr Rao', '2026-10-01', 'Ecosprin 75 OD x30d; Telma 40 OD x30d', 'Ramesh K.'),
    rx('b', 'Dr Mehta', '2026-10-02', 'Dolo 650 TDS x3d', 'Priya'),
    rx('c', 'Dr Shah', '2026-10-02', 'Calpol 500 TDS x3d', 'Aarav'),
  ]
  const people: Record<string, Patient> = {
    ramesh_k: { age_years: 68, weight_kg: 55, sex: 'M' },
    priya: { age_years: 30, weight_kg: 58, sex: 'F' },
    aarav: { age_years: 6, weight_kg: 20, sex: 'M' },
  }
  const patientFor = (label: string) => people[patientKey(label).replace(/ /g, '_')]

  it('splits the account by the name written on each prescription', () => {
    expect(groupByPatient(family).groups.map((g) => g.label)).toEqual(['Ramesh K.', 'Priya', 'Aarav'])
    expect(patientKey('Ramesh K.')).toBe(patientKey('  ramesh k ')) // spelling of the same person
  })

  it('checks each person alone: two people on paracetamol are not one paracetamol total', async () => {
    const account = await checkByPatient(check, family, patientFor, adult)
    expect(account.patients.map((p) => p.label)).toEqual(['Ramesh K.', 'Priya', 'Aarav'])
    const para = account.patients.slice(1).map((p) => p.result.ledger.paracetamol.total_mg_day)
    expect(para).toEqual([1950, 1500])
    // Merged as one person it would add up and invent a duplicate
    const merged = await check(family.map((r) => ({ ...r, patient: undefined })), adult, [], { asOf: '2026-10-02' })
    expect(types(merged.alerts)).toContain('duplicate_ingredient')
    expect(account.patients.flatMap((p) => types(p.result.alerts))).not.toContain('duplicate_ingredient')
    expect(account.alerts).toEqual([])
  })

  it('asks whose prescription it is when one has no name, and leaves it out of every total', async () => {
    const account = await checkByPatient(check, [...family, rx('d', 'Dr Iyer', '2026-10-02', 'Dolo 650 TDS x3d')], patientFor, adult)
    expect(account.unassigned.map((p) => p.id)).toEqual(['d'])
    expect(account.alerts[0]).toMatchObject({ tier: 'inform', type: 'unassigned_prescription' })
    expect(account.alerts[0].reason).toContain('whose')
    expect(account.patients.flatMap((p) => p.result.lines.map((l) => l.rx_id))).not.toContain('d')
  })

  it('treats an account with no names exactly as before', async () => {
    const plain = [rx('a', 'Dr A', '2026-10-01', 'Dolo 650 TDS x5d'), rx('b', 'Dr B', '2026-10-03', 'Dolo 650 TDS x5d')]
    const account = await checkByPatient(check, plain, () => undefined, adult)
    expect(account.patients).toHaveLength(1)
    expect(account.patients[0].label).toBe('')
    expect(account.patients[0].result).toEqual(await check(plain, adult, [], {}))
  })
})

describe('a later doctor replacing a medicine is a question, not a duplicate (3.4)', () => {
  const older: Patient = { age_years: 45, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }

  it('two PPIs from two doctors become "possible switch": same tier, asks whether the first was stopped', async () => {
    const r = await check([rx('a', 'Dr A', '2026-10-01', 'Pan 40 OD x30d'), rx('b', 'Dr B', '2026-10-15', 'Razo-D OD x30d')], older)
    const sw = r.alerts.find((a) => a.type === 'possible_switch')!
    expect(sw.tier).toBe('inform')
    expect(sw.reason).toContain('replaced the earlier one')
    expect(types(r.alerts)).not.toContain('class_duplication')
    expect(sw.cross_doctor).toBe(true)
  })

  it('does not soften a dangerous pair: two NSAIDs from two doctors in an older patient still stop', async () => {
    const r = await check([rx('a', 'Dr A', '2026-10-01', 'Zerodol-P BD x10d'), rx('b', 'Dr B', '2026-10-04', 'Brufen 400 TDS x5d')], { ...older, age_years: 70 })
    expect(r.alerts.find((a) => a.type === 'nsaid_double_high_risk')?.tier).toBe('interrupt')
    expect(types(r.alerts)).not.toContain('possible_switch')
  })

  it('a class duplicate inside one doctor\'s prescription is unchanged', async () => {
    const r = await check([rx('a', 'Dr A', '2026-10-01', 'Pan 40 OD x10d; Omez 20 OD x10d')], older)
    expect(types(r.alerts)).toContain('class_duplication')
    expect(types(r.alerts)).not.toContain('possible_switch')
  })
})

describe('how long a line runs, and where that number came from (3.3)', () => {
  const run = async (lines: Prescription[], asOf?: string) => check(lines, adult, [], asOf ? { asOf, from: lines[0].date } : {})

  it('uses the ordered quantity: 10 tablets twice a day is 5 days, so no overlap with a later course', async () => {
    const r = await run([rx('a', 'Dr A', '2026-09-01', 'Augmentin 625 Duo BD qty 10'), rx('b', 'Dr B', '2026-09-25', 'Taxim-O 200 BD x5d')], '2026-09-25')
    const aug = r.lines.find((l) => l.rx_id === 'a')!
    expect(aug.duration_source).toBe('quantity')
    expect([aug.start, aug.end]).toEqual(['2026-09-01', '2026-09-06'])
    expect(aug.default_window).toBeUndefined()
    expect(r.windows.some((w) => w.rx_ids.includes('a') && w.rx_ids.includes('b'))).toBe(false)
    expect(types(r.alerts)).not.toContain('class_duplication')
  })

  it('a written course beats the quantity', async () => {
    const r = await run([rx('a', 'Dr A', '2026-09-01', 'Augmentin 625 Duo BD x7d qty 10')])
    expect(r.lines[0].duration_source).toBe('written')
    expect(r.lines[0].end).toBe('2026-09-08')
  })

  it('an antibiotic with neither runs a week, flagged as assumed; a chronic medicine keeps the 30-day default', async () => {
    const r = await run([rx('a', 'Dr A', '2026-09-01', 'Augmentin 625 Duo BD; Telma 40 OD')])
    const aug = r.lines.find((l) => l.resolved.brand?.startsWith('Augmentin'))!
    const telma = r.lines.find((l) => l.resolved.brand === 'Telma 40')!
    expect([aug.duration_source, aug.default_window]).toEqual(['class_default', true])
    expect(aug.end).toBe('2026-09-08')
    expect([telma.duration_source, telma.default_window, telma.end]).toEqual(['default', true, '2026-10-01'])
  })

  it('no quantity is used for an as-needed or dosing-less line', async () => {
    const r = await run([rx('a', 'Dr A', '2026-09-01', 'Dolo 650 SOS qty 10; Crocin qty 15')])
    expect(r.lines.map((l) => l.duration_source)).toEqual(['default', 'default'])
  })
})

describe('a cart line with no dosing is not guessed (3.2)', () => {
  it('keeps the duplicate warning, leaves both lines out of the dose totals, and says why', async () => {
    const { alerts, ledger } = await single('Dolo 650; Calpol 500', adult)
    const missing = alerts.filter((a) => a.type === 'dosing_not_entered')
    expect(missing).toHaveLength(1)
    expect(missing[0].brands).toEqual(['Dolo 650', 'Calpol 500mg'])
    expect(missing[0].tier).toBe('inform')
    expect(types(alerts)).toContain('duplicate_ingredient')
    expect(types(alerts)).not.toContain('dose_excess')
    expect(ledger.paracetamol).toBeUndefined()
  })

  it('adding the dosing brings the total back', async () => {
    const { alerts, ledger } = await single('Dolo 650 QID; Calpol 500 TDS', adult)
    expect(ledger.paracetamol.total_mg_day).toBe(4100)
    expect(types(alerts)).toContain('dose_excess')
  })
})

describe('a failed batch (3.5)', () => {
  const resolver = testResolver()
  const failed = resolver.resolve('Pan D').nsq![0]

  it('is a quiet log line while the batch is unknown', async () => {
    const { alerts } = await single('Pan D OD', adult)
    expect(alerts.find((a) => a.type === 'nsq')?.tier).toBe('silent')
    expect(types(alerts)).not.toContain('nsq_batch_match')
  })

  it('becomes a note only when the batch on the order is the failed one', async () => {
    const hit = await single(`Pan D OD batch ${failed.batch}`, adult)
    const a = hit.alerts.find((x) => x.type === 'nsq_batch_match')!
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain(failed.batch)
    const other = await single('Pan D OD batch ZZ9999X', adult)
    expect(types(other.alerts)).not.toContain('nsq_batch_match')
  })

  it('reads batch and quantity out of the line without confusing them with dosing', () => {
    expect(extractLineMeta('Pan D OD batch AR5112 qty 10')).toEqual({ line: 'Pan D OD', batch: 'AR5112', quantity: 10 })
    expect(extractLineMeta('Augmentin 625 Duo BD, Qty: 10')).toMatchObject({ line: 'Augmentin 625 Duo BD', quantity: 10 })
    expect(extractLineMeta('Dolo 650 TDS')).toEqual({ line: 'Dolo 650 TDS' })
  })
})
