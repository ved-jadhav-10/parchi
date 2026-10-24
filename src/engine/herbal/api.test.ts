// api/check with the herbal check: single and history modes, on the real engine.
import { describe, it, expect } from 'vitest'
import { handle, type CheckDeps } from '../../../api/check'
import { createDoseDeps } from '../ledger'
import { testResolver } from '../resolver/testing'
import { alertRules, testDdi } from '../rules/testing'
import { createRealEngine } from '../wiring'

const resolver = testResolver()
const engine = createRealEngine({ resolver, ddi: testDdi(), rules: alertRules() })
const base = { check: engine.check, history: engine.checkHistory, dose: createDoseDeps(resolver).computeDose, apiKeys: ['k'] }
const withHerbal: CheckDeps = { ...base, herbal: { isKnownBrand: (b) => resolver.resolve(b).confidence >= 0.97, classesOf: (id) => resolver.ingredient(id)?.classes } }
const without: CheckDeps = base

const call = async (deps: CheckDeps, body: unknown) => {
  const res = await handle(new Request('http://x/api/check', { method: 'POST', headers: { 'x-api-key': 'k' }, body: JSON.stringify(body) }), deps)
  return { status: res.status, json: (await res.json()) as Record<string, any> }
}
const patient = { age_years: 68, weight_kg: 55, serum_creatinine: 1.0, sex: 'M' }

describe('single prescription with Ayurvedic items', () => {
  it('finds liquorice with a diuretic, names both, and cites the EMA monograph', async () => {
    const { status, json } = await call(withHerbal, { rx_text: 'Dolo 650 TDS; Mulethi powder TDS; Furosemide 40 OD', patient })
    expect(status).toBe(200)
    expect(json.lines).toHaveLength(2) // the herbal line is not an ordinary line
    expect(json.ledger.paracetamol.total_mg_day).toBe(1950)
    const f = json.herbal.findings[0]
    expect(f).toMatchObject({ rule: 'liquorice_potassium', tier: 'inform', evidence: 'established', pharmacist_approved: false })
    expect(f.partners).toEqual([{ brand: 'Furosemide 40', ingredient: 'furosemide' }])
    expect(f.items).toEqual(['Mulethi powder TDS'])
    expect(f.sources[0].label).toMatch(/EMA/)
    expect(json.herbal.note).toMatch(/not a safety clearance/)
  })

  it('no longer lets the ordinary resolver turn Ayurvedic names into drugs', async () => {
    // Before: "Triphala churna" -> Triohale (ciclesonide + formoterol) and "Haldi doodh" -> Palido-OD (paliperidone).
    const old = await call(without, { rx_text: 'Triphala churna HS; Haldi doodh BD; Dolo 650 TDS', patient })
    const oldBrands = old.json.lines.map((l: any) => l.resolved.brand)
    expect(oldBrands.some((b: string | null) => b && /Triohale|Palido/.test(b))).toBe(true)

    const now = await call(withHerbal, { rx_text: 'Triphala churna HS; Haldi doodh BD; Dolo 650 TDS', patient })
    expect(now.json.lines.map((l: any) => l.resolved.brand)).toEqual(['Dolo 650'])
    expect(Object.keys(now.json.ledger)).toEqual(['paracetamol'])
    expect(now.json.herbal.items.map((i: any) => i.names[0])).toEqual(['Triphala', 'Turmeric (haldi) (Curcuma longa)'])
    expect(now.json.alerts.map((a: any) => a.type)).not.toContain('low_confidence')
  })

  it('a prescription of only herbal items is answered, with nothing to check ordinarily', async () => {
    const { status, json } = await call(withHerbal, { rx_text: 'Giloy ghan vati BD', patient })
    expect(status).toBe(200)
    expect(json.lines).toEqual([])
    expect(json.alerts).toEqual([])
    expect(json.herbal.findings.map((f: any) => f.rule)).toEqual(['giloy_liver'])
  })

  it('reports an unknown Ayurvedic product as unrecognised and does not invent its contents', async () => {
    const { json } = await call(withHerbal, { rx_text: 'Dolo 650 TDS; Dashmularishta 15 ml BD', patient })
    expect(json.herbal.unrecognised).toHaveLength(1)
    expect(json.herbal.unrecognised[0].reason).toMatch(/Ask the patient/)
    expect(json.herbal.findings).toEqual([])
  })

  it('leaves the response unchanged when there are no herbal items', async () => {
    const { json } = await call(withHerbal, { rx_text: 'Dolo 650 TDS; Pan D OD', patient })
    expect('herbal' in json).toBe(false)
    expect(json.lines).toHaveLength(2)
  })

  it('behaves exactly as before when the herbal check is not configured', async () => {
    const { json } = await call(without, { rx_text: 'Dolo 650 TDS; Mulethi TDS; Furosemide 40 OD', patient })
    expect('herbal' in json).toBe(false)
  })
})

describe('history with Ayurvedic items (doctor and dates)', () => {
  const rx = (id: string, doctor: string, date: string, text: string) => ({ id, doctor, date, text })

  it('matches only courses that overlap, and names the doctor who prescribed the herb', async () => {
    const overlapping = await call(withHerbal, {
      patient,
      prescriptions: [rx('rx-1', 'Dr Rao', '2026-10-01', 'Furosemide 40 OD x10d'), rx('rx-2', 'Vaid Sharma', '2026-10-05', 'Mulethi TDS x5d')],
      as_of: '2026-10-05',
    })
    expect(overlapping.status).toBe(200)
    expect(overlapping.json.herbal.findings.map((f: any) => f.rule)).toEqual(['liquorice_potassium'])
    expect(overlapping.json.herbal.items[0]).toMatchObject({ rx_id: 'rx-2', doctor: 'Vaid Sharma', start: '2026-10-05', end: '2026-10-09', window_assumed: false })

    const apart = await call(withHerbal, {
      patient,
      prescriptions: [rx('rx-1', 'Dr Rao', '2026-10-01', 'Furosemide 40 OD x10d'), rx('rx-2', 'Vaid Sharma', '2026-10-20', 'Mulethi TDS x5d')],
      as_of: '2026-10-20',
    })
    expect(apart.json.herbal.findings).toEqual([])
  })

  it('says when a herbal course used the unverified default length', async () => {
    const { json } = await call(withHerbal, { patient, prescriptions: [rx('rx-1', 'Dr Rao', '2026-10-01', 'Furosemide 40 OD x30d'), rx('rx-2', 'Vaid', '2026-10-05', 'Mulethi TDS')] })
    expect(json.herbal.items[0].window_assumed).toBe(true)
    expect(json.herbal.findings.map((f: any) => f.rule)).toContain('liquorice_potassium')
  })

  it('a prescription that is only herbal is kept out of the ordinary history, not lost', async () => {
    const { status, json } = await call(withHerbal, {
      patient,
      prescriptions: [rx('rx-1', 'Dr Rao', '2026-10-01', 'Dolo 650 TDS x5d'), rx('rx-2', 'Vaid', '2026-10-02', 'Giloy BD x10d')],
      as_of: '2026-10-02',
    })
    expect(status).toBe(200)
    expect(json.mode).toBe('history')
    expect(json.lines.every((l: any) => l.rx_id === 'rx-1')).toBe(true)
    expect(json.herbal.findings.map((f: any) => f.rule)).toEqual(['giloy_liver'])
  })

  it('a history with only herbal prescriptions is not called "clear"', async () => {
    const { status, json } = await call(withHerbal, { patient, prescriptions: [rx('rx-1', 'Vaid', '2026-10-01', 'Giloy BD x10d')] })
    expect(status).toBe(200)
    expect(json.status).toBe('clear_with_note')
    expect(json.alerts).toEqual([])
    expect(json.herbal.items).toHaveLength(1)
  })
})
