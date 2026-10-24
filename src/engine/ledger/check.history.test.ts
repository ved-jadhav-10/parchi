// api/check history mode and the request validators, on Track C's demo_history and FHIR fixtures.
import { describe, it, expect } from 'vitest'
import { POST, handle, type CheckDeps } from '../../../api/check'
import hist from '../../../tests/fixtures/demo_history.json'
import fhir from '../../../tests/fixtures/fhir_prescriptions.json'
import { testResolver } from '../resolver/testing'
import { alertRules, testDdi } from '../rules/testing'
import { createRealEngine } from '../wiring'
import { createDoseDeps } from './index'
import { LIMITS_API, parseHistoryRequest, parsePatient } from './requests'

const resolver = testResolver()
const engine = createRealEngine({ resolver, ddi: testDdi(), rules: alertRules() })
const deps: CheckDeps = { check: engine.check, history: engine.checkHistory, dose: createDoseDeps(resolver).computeDose, apiKeys: ['k'] }
const post = (body: unknown, raw?: string) => new Request('http://x/api/check', { method: 'POST', headers: { 'x-api-key': 'k' }, body: raw ?? JSON.stringify(body) })
const call = async (body: unknown) => {
  const res = await handle(post(body), deps)
  return { status: res.status, json: (await res.json()) as Record<string, any> }
}
const types = (alerts: { tier: string; type: string }[], tier: string) => alerts.filter((a) => a.tier === tier).map((a) => a.type)

describe('api/check history mode (three doctors, Track C fixture)', () => {
  const base = { patient: hist.patient, prescriptions: hist.prescriptions }

  it('adds paracetamol up across doctors only where their courses overlap, and holds the order', async () => {
    const { status, json } = await call({ ...base, as_of: '2026-10-05' })
    expect(status).toBe(200)
    expect(json).toMatchObject({ schema: 1, mode: 'history' })
    expect(json.disclaimer).toMatch(/informs; it does not decide/)
    const over = json.alerts.find((a: any) => a.type === 'dose_excess' && a.ingredients.includes('paracetamol'))
    expect(over).toMatchObject({ tier: 'interrupt', cross_doctor: true, rx_ids: hist.expected.paracetamol_overlap.rx_ids, doctors: hist.expected.paracetamol_overlap.doctors })
    expect(json.status).toBe(hist.expected.without_lab['rx-2'].status)
    expect(types(json.alerts, 'interrupt')).toEqual(expect.arrayContaining(hist.expected.without_lab['rx-2'].interrupts))
  })

  it('a creatinine that arrives later re-checks the same order and says what changed', async () => {
    const before = await call({ ...base, as_of: '2026-10-05' })
    const after = await call({ ...base, labs: hist.labs, as_of: '2026-10-05' })
    expect(after.json.creatinine_used).toEqual(hist.expected.with_lab.creatinine)
    expect(types(after.json.alerts, 'interrupt')).toEqual(expect.arrayContaining(hist.expected['with_lab']['rx-2'].interrupts))
    // the diff against the previous result needs the previous result, which the API takes through the engine, not the body
    expect(before.json.needs?.map((n: any) => n.field) ?? []).toContain('serum_creatinine')
  })

  it('shows the unrecognised brand as unverified instead of guessing, and a confirmation resolves it', async () => {
    const open = await call({ ...base, as_of: '2026-10-08' })
    const unknown = open.json.alerts.find((a: any) => a.type === 'unresolved')
    expect(unknown).toMatchObject({ unverified: true })
    const confirmed = await call({ ...base, as_of: '2026-10-08', confirmations: { 'rx-3#1': 'Dolo 650' } })
    expect(confirmed.json.alerts.some((a: any) => a.type === 'unresolved')).toBe(false)
  })

  it('ranks an order higher when it is worse (priority) and returns windows and the worst-overlap ledger', async () => {
    const early = await call({ ...base, labs: hist.labs, as_of: '2026-10-01' })
    const late = await call({ ...base, labs: hist.labs, as_of: '2026-10-08' })
    expect(late.json.priority).toBeGreaterThan(early.json.priority)
    expect(late.json.windows.length).toBeGreaterThan(0)
    expect(late.json.ledger.paracetamol.total_mg_day).toBeGreaterThan(0)
  })

  it('answers the same request the same way every time', async () => {
    const a = await handle(post({ ...base, labs: hist.labs, as_of: '2026-10-08' }), deps)
    const b = await handle(post({ ...base, labs: hist.labs, as_of: '2026-10-08' }), deps)
    expect(await a.text()).toBe(await b.text())
  })
})

describe('api/check FHIR input', () => {
  it('imports ABDM bundles and passes the importer\'s warnings back', async () => {
    const { status, json } = await call({ patient: hist.patient, fhir: fhir.bundles })
    expect(status).toBe(200)
    expect(json.mode).toBe('history')
    expect(json.lines.map((l: any) => l.rx_id)).toEqual(expect.arrayContaining(['rx-1']))
    const bad = await call({ patient: hist.patient, fhir: [{ resourceType: 'Patient' }, ...fhir.bundles] })
    expect(bad.status).toBe(200)
    expect(bad.json.import_warnings?.[0]).toMatch(/not a FHIR Bundle/)
  })
  it('rejects fhir that yields nothing usable, and fhir mixed with prescriptions', async () => {
    expect((await call({ patient: hist.patient, fhir: [{ resourceType: 'Patient' }] })).status).toBe(400)
    expect((await call({ patient: hist.patient, fhir: fhir.bundles, prescriptions: hist.prescriptions })).status).toBe(400)
  })
})

describe('api/check mode selection', () => {
  it('refuses a request that asks for both modes', async () => {
    expect((await call({ patient: hist.patient, rx_text: 'Dolo 650 TDS', prescriptions: hist.prescriptions })).status).toBe(400)
  })
  it('single mode still works and says so', async () => {
    const { json } = await call({ patient: hist.patient, rx_text: 'Dolo 650 TDS' })
    expect(json.mode).toBe('single')
  })
  it('real POST path serves history from the data on disk', async () => {
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env
    env.CHECK_API_KEYS = 'k'
    try {
      const res = await POST(post({ patient: hist.patient, prescriptions: hist.prescriptions, labs: hist.labs, as_of: '2026-10-05' }))
      expect(res.status).toBe(200)
      expect((await res.json()).mode).toBe('history')
    } finally {
      delete env.CHECK_API_KEYS
    }
  })
})

describe('history request validation', () => {
  const ok = { id: 'a', doctor: 'Dr A', date: '2026-10-01', text: 'Dolo 650 TDS' }
  const err = (b: Record<string, unknown>) => {
    const r = parseHistoryRequest(b)
    return 'error' in r ? r.error : null
  }
  it('accepts a minimal history and trims doctor names', () => {
    const r = parseHistoryRequest({ prescriptions: [{ ...ok, doctor: '  Dr A  ' }] })
    expect('request' in r && r.request.prescriptions[0].doctor).toBe('Dr A')
  })
  it.each([
    ['no prescriptions', {}, /non-empty array/],
    ['empty list', { prescriptions: [] }, /non-empty array/],
    ['not an array', { prescriptions: 'x' }, /non-empty array/],
    ['entry not an object', { prescriptions: ['x'] }, /must be an object/],
    ['missing id', { prescriptions: [{ ...ok, id: '' }] }, /id must be/],
    ['long id', { prescriptions: [{ ...ok, id: 'x'.repeat(65) }] }, /id must be/],
    ['duplicate ids', { prescriptions: [ok, ok] }, /used twice/],
    ['missing doctor', { prescriptions: [{ ...ok, doctor: ' ' }] }, /doctor must be/],
    ['impossible date', { prescriptions: [{ ...ok, date: '2026-02-30' }] }, /real date/],
    ['wrong date format', { prescriptions: [{ ...ok, date: '24/10/2026' }] }, /real date/],
    ['empty text', { prescriptions: [{ ...ok, text: '' }] }, /text must be/],
    ['text too long', { prescriptions: [{ ...ok, text: 'x'.repeat(LIMITS_API.maxRxChars + 1) }] }, /text must be/],
    ['too many lines', { prescriptions: [{ ...ok, text: Array(31).fill('Dolo 650 TDS').join('\n') }] }, /more than 30 lines/],
    ['too many prescriptions', { prescriptions: Array.from({ length: 26 }, (_, i) => ({ ...ok, id: `r${i}` })) }, /at most 25/],
    ['lab wrong type', { prescriptions: [ok], labs: [{ type: 'hba1c', value: 5, date: '2026-10-01' }] }, /serum_creatinine/],
    ['lab implausible value', { prescriptions: [ok], labs: [{ type: 'serum_creatinine', value: 99, date: '2026-10-01' }] }, /0\.1 to 20/],
    ['lab bad date', { prescriptions: [ok], labs: [{ type: 'serum_creatinine', value: 1, date: 'x' }] }, /real date/],
    ['labs not an array', { prescriptions: [ok], labs: 5 }, /array/],
    ['bad as_of', { prescriptions: [ok], as_of: 'soon' }, /as_of must be/],
    ['bad from', { prescriptions: [ok], from: 7 }, /from must be/],
    ['bad confirmations', { prescriptions: [ok], confirmations: { 'a#0': '' } }, /confirmations must be/],
    ['confirmations not an object', { prescriptions: [ok], confirmations: ['x'] }, /confirmations must be/],
  ])('rejects %s', (_n, body, re) => {
    expect(err(body as Record<string, unknown>)).toMatch(re as RegExp)
  })
  it('passes dates, confirmations and labs through', () => {
    const r = parseHistoryRequest({ prescriptions: [ok], labs: [{ type: 'serum_creatinine', value: 1.4, date: '2026-10-02' }], as_of: '2026-10-03', from: '2026-09-01', confirmations: { 'a#0': 'Dolo 650' } })
    expect('request' in r && r.request).toMatchObject({ labs: [{ value: 1.4 }], options: { asOf: '2026-10-03', from: '2026-09-01', confirmations: { 'a#0': 'Dolo 650' } } })
  })
  it('patient validation is shared with single mode', () => {
    expect('error' in parsePatient({ age_years: 200 })).toBe(true)
  })
})
