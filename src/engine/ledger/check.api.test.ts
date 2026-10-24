import { describe, it, expect, vi } from 'vitest'
import { POST, handle, parsePatient, type CheckDeps } from '../../../api/check'
import demo from '../../../tests/fixtures/demo_rx.json'
import { createPipeline } from '../pipeline'
import { testResolver } from '../resolver/testing'
import { alertRules, testDdi } from '../rules/testing'
import { createDoseDeps } from './index'

const resolver = testResolver()
const d = createDoseDeps(resolver)
const real: Pick<CheckDeps, 'check' | 'dose'> = {
  check: createPipeline({ resolver, ddi: testDdi(), rules: alertRules(), parseSig: d.parseSig, buildLedger: d.buildLedger }),
  dose: d.computeDose,
}
const deps: CheckDeps = { ...real, apiKeys: ['good-key', 'second-key'] }
const post = (body: unknown, key: string | null = 'good-key', raw?: string) =>
  new Request('http://x/api/check', { method: 'POST', headers: key ? { 'x-api-key': key } : {}, body: raw ?? JSON.stringify(body) })

describe('api/check', () => {
  it('answers the demo prescription with alerts, ledger, kidney findings and questions', async () => {
    const res = await handle(post({ rx_text: demo.rx_text, patient: demo.patient }), deps)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.schema).toBe(1)
    expect(j.disclaimer).toMatch(/informs; it does not decide/)
    expect(j.ledger.paracetamol.total_mg_day).toBe(4100)
    expect(j.alerts.filter((a: { tier: string }) => a.tier === 'interrupt')).toHaveLength(demo.expected.alerts.interrupt_count)
    expect(j.findings.map((f: { kind: string; ingredient: string }) => `${f.kind}:${f.ingredient}`)).toContain('over_limit:paracetamol')
    expect(j.crcl_ml_min).toBe(34.4)
    expect(j.needs).toEqual([])
    expect(j.lines).toHaveLength(7)
  })

  it('asks for the missing patient details instead of guessing, and still answers', async () => {
    const j = await (await handle(post({ rx_text: 'Brufen 400 TDS', patient: { age_years: 68 } }), deps)).json()
    expect(j.crcl_ml_min).toBeNull()
    expect(j.needs.map((n: { field: string }) => n.field).sort()).toEqual(['serum_creatinine', 'sex', 'weight_kg'])
  })

  describe('access control', () => {
    it('is closed when no keys are configured', async () => {
      expect((await handle(post({}), { ...deps, apiKeys: [] })).status).toBe(503)
    })
    it('rejects a missing or wrong key without running the engine', async () => {
      const check = vi.fn()
      const spy = { ...deps, check: check as unknown as CheckDeps['check'] }
      expect((await handle(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }, null), spy)).status).toBe(401)
      expect((await handle(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }, 'good-keyX'), spy)).status).toBe(401)
      expect((await handle(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }, 'good'), spy)).status).toBe(401)
      expect(check).not.toHaveBeenCalled()
    })
    it('accepts any configured key, and only POST', async () => {
      expect((await handle(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }, 'second-key'), deps)).status).toBe(200)
      expect((await handle(new Request('http://x', { method: 'GET', headers: { 'x-api-key': 'good-key' } }), deps)).status).toBe(405)
    })
  })

  describe('input checks', () => {
    const status = async (body: unknown, raw?: string) => (await handle(post(body, 'good-key', raw), deps)).status
    it('rejects bad bodies', async () => {
      expect(await status(null, 'not json')).toBe(400)
      expect(await status({ patient: { age_years: 40 } })).toBe(400)
      expect(await status({ rx_text: '   ', patient: { age_years: 40 } })).toBe(400)
      expect(await status({ rx_text: 5, patient: { age_years: 40 } })).toBe(400)
      expect(await status({ rx_text: 'x'.repeat(2001), patient: { age_years: 40 } })).toBe(400)
      expect(await status({ rx_text: Array(31).fill('Dolo 650 TDS').join('\n'), patient: { age_years: 40 } })).toBe(400)
      expect(await status(null, 'x'.repeat(20_001))).toBe(413)
    })
    it('rejects implausible patients', () => {
      for (const p of [undefined, null, 'x', {}, { age_years: -1 }, { age_years: 121 }, { age_years: 'forty' }, { age_years: 40, weight_kg: 0 }, { age_years: 40, serum_creatinine: 50 }, { age_years: 40, sex: 'X' }, { age_years: NaN }]) {
        expect('error' in parsePatient(p)).toBe(true)
      }
      expect(parsePatient({ age_years: 40, weight_kg: 70, serum_creatinine: 1, sex: 'F', extra: 'ignored' })).toEqual({ patient: { age_years: 40, weight_kg: 70, serum_creatinine: 1, sex: 'F' } })
    })
    it('returns 500 with no internals when the engine throws', async () => {
      const boom = { ...deps, check: async () => { throw new Error('secret path /etc/x') } }
      const res = await handle(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }), boom)
      expect(res.status).toBe(500)
      expect(await res.text()).not.toMatch(/secret|etc/)
    })
  })
})

describe('api/check POST (real data loaded from public/data on disk)', () => {
  const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env
  it('is closed with 503 when CHECK_API_KEYS is not set', async () => {
    delete env.CHECK_API_KEYS
    expect((await POST(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }))).status).toBe(503)
  })
  it('loads the committed data and answers the demo prescription for a valid key', async () => {
    env.CHECK_API_KEYS = ' k1 , good-key '
    try {
      const res = await POST(post({ rx_text: demo.rx_text, patient: demo.patient }))
      expect(res.status).toBe(200)
      const j = await res.json()
      expect(j.ledger.paracetamol.total_mg_day).toBe(4100)
      expect(j.alerts.filter((a: { tier: string }) => a.tier === 'interrupt').length).toBe(demo.expected.alerts.interrupt_count)
      expect((await POST(post({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }, 'nope'))).status).toBe(401)
    } finally {
      delete env.CHECK_API_KEYS
    }
  })
})
