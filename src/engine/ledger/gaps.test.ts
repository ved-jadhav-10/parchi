// Paths that the feature tests did not reach: exports, default environment detection, real POST wiring, data-file failures.
import { afterEach, describe, it, expect, vi } from 'vitest'
import { POST as checkPOST } from '../../../api/check'
import { POST as sigPOST } from '../../../api/parse-sig'
import type { Ingredient, ResolvedBrand } from '../contracts'
import { LIMITS, applyLimits, type LimitsData } from '../limits'
import { parseSig, parseSigSmart, resetSigSmartState } from '../sig'
import { buildLedger, computeLedger } from './index'

type Env = Record<string, string | undefined>
const proc = (globalThis as unknown as { process: { env: Env; cwd(): string } }).process
const brand = (ing: Ingredient[], extra: Partial<ResolvedBrand> = {}): ResolvedBrand => ({ raw: 'X', brand: 'X', confidence: 1, ingredients: ing, form: 'tablet', flags: [], systemic: true, route: 'oral', ...extra })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete proc.env.GEMINI_API_KEY
  delete proc.env.ANTHROPIC_API_KEY
  delete proc.env.CHECK_API_KEYS
  resetSigSmartState()
})

describe('ledger', () => {
  it('buildLedger is computeLedger without the notes', () => {
    const lines = [{ resolved: brand([{ id: 'paracetamol', mg: 500 }]), sig: parseSig('TDS') }]
    expect(buildLedger(lines)).toEqual(computeLedger(lines).ledger)
  })
  it('a dose written in mL on a solid form is counted by the number of doses, with a note', () => {
    const { ledger, notes } = computeLedger([{ resolved: brand([{ id: 'paracetamol', mg: 500 }]), sig: parseSig('5 ml TDS') }])
    expect(ledger.paracetamol.total_mg_day).toBe(1500)
    expect(notes.map((n) => n.kind)).toEqual(['volume_on_solid'])
  })
})

describe('limits with a weight-only paediatric rule', () => {
  it('uses mg/kg alone when the data has no adult maximum to cap it', () => {
    const data = structuredClone(LIMITS) as LimitsData
    data.ingredients.testdrug = { paediatric: { max_mg_per_kg_day: 10, source: 'test', pharmacist_approved: false } }
    const r = applyLimits({ testdrug: { total_mg_day: 250, sources: ['x'] } }, { age_years: 5, weight_kg: 20 }, data)
    expect(r.ledger.testdrug.limit_mg_day).toBe(200)
    expect(r.findings[0]).toMatchObject({ kind: 'over_limit', limit_mg_day: 200 })
  })
})

describe('parseSigSmart environment detection', () => {
  const messy = 'zzz qqq'
  it('stays offline when navigator says so, and uses the network when navigator says online', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ fields: { administrations_per_day: 2, units_per_dose: 1, volume_ml_per_dose: null, total_units_per_day: null, sos: false, sos_max_doses_per_day: null, duration_days: null } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubGlobal('navigator', { onLine: false })
    expect(await parseSigSmart(messy)).toEqual(parseSig(messy))
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.stubGlobal('navigator', { onLine: true })
    expect((await parseSigSmart(messy)).doses_per_day).toBe(2)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
  it('is offline when there is no navigator at all (server or test)', async () => {
    vi.stubGlobal('navigator', undefined)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await parseSigSmart(messy)).toEqual(parseSig(messy))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
  it('returns the rules result when there is no fetch to call', async () => {
    vi.stubGlobal('fetch', undefined)
    expect(await parseSigSmart(messy, { online: true })).toEqual(parseSig(messy))
  })
})

describe('api/parse-sig POST (real wiring from environment variables)', () => {
  const req = () => new Request('http://x/api/parse-sig', { method: 'POST', body: JSON.stringify({ sig_text: 'BD' }) })
  const fields = { administrations_per_day: 2, units_per_dose: 1, volume_ml_per_dose: null, total_units_per_day: null, sos: false, sos_max_doses_per_day: null, duration_days: null }
  it('is closed (503) with no key configured', async () => {
    expect((await sigPOST(req())).status).toBe(503)
  })
  it('prefers Gemini when both keys are set, reading the model from GEMINI_MODEL', async () => {
    proc.env.GEMINI_API_KEY = 'g'
    proc.env.ANTHROPIC_API_KEY = 'a'
    proc.env.GEMINI_MODEL = 'gemini-test'
    const f = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(fields) }] } }] }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    try {
      const res = await sigPOST(req())
      expect(res.status).toBe(200)
      expect((f.mock.calls[0] as unknown as [string])[0]).toContain('generativelanguage.googleapis.com/v1beta/models/gemini-test:')
    } finally {
      delete proc.env.GEMINI_MODEL
    }
  })
  it('falls back to Anthropic when only that key is set', async () => {
    proc.env.ANTHROPIC_API_KEY = 'a'
    const f = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(fields) }] }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    expect((await sigPOST(req())).status).toBe(200)
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('https://api.anthropic.com/v1/messages')
  })
})

describe('api/check data loading from disk', () => {
  const REQUIRED = ['brands.json', 'ingredients.json', 'banned_fdc.json', 'ddi.json', 'alert_rules.json']
  const post = () => new Request('http://x/api/check', { method: 'POST', headers: { 'x-api-key': 'k' }, body: JSON.stringify({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }) })

  it('answers 503 (not a crash) when the data files are missing, then recovers once they exist; optional files may be absent', async () => {
    const fs = (await import('node:fs/promises' as string)) as { mkdtemp(p: string): Promise<string>; mkdir(p: string, o: object): Promise<void>; copyFile(a: string, b: string): Promise<void>; rm(p: string, o: object): Promise<void> }
    const os = (await import('node:os' as string)) as { tmpdir(): string }
    const root = await fs.mkdtemp(`${os.tmpdir()}/parchi-check-`)
    const real = proc.cwd()
    proc.env.CHECK_API_KEYS = 'k'
    try {
      const cwd = vi.spyOn(proc, 'cwd').mockReturnValue(root)
      const missing = await checkPOST(post())
      expect(missing.status).toBe(503)
      expect(await missing.text()).not.toContain(root) // no path leaked
      await fs.mkdir(`${root}/public/data`, { recursive: true })
      for (const f of REQUIRED) await fs.copyFile(`${real}/public/data/${f}`, `${root}/public/data/${f}`) // no nsq.json, no janaushadhi.json
      const ok = await checkPOST(post())
      expect(ok.status).toBe(200)
      expect((await ok.json()).ledger.paracetamol.total_mg_day).toBe(1950)
      cwd.mockRestore()
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
