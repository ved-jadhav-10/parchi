import { beforeEach, describe, it, expect, vi } from 'vitest'
import { handle } from '../../../api/parse-sig'
import { parseSig } from './parse'
import { parseSigSmart, resetSigSmartState, sigFromLlm, validateLlmFields, type LlmSigFields } from './llm'

const good: LlmSigFields = {
  administrations_per_day: 2,
  units_per_dose: 1,
  volume_ml_per_dose: null,
  total_units_per_day: null,
  sos: false,
  sos_max_doses_per_day: null,
  duration_days: 5,
}
const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('validateLlmFields', () => {
  it('accepts a well-formed answer', () => {
    expect(validateLlmFields(good)).toEqual(good)
    expect(validateLlmFields({ ...good, volume_ml_per_dose: undefined, duration_days: undefined })).toMatchObject({ volume_ml_per_dose: null, duration_days: null })
  })
  it.each([
    ['not an object', 'BD'],
    ['null', null],
    ['missing sos', { ...good, sos: undefined }],
    ['sos as string', { ...good, sos: 'true' }],
    ['administrations as string', { ...good, administrations_per_day: '2' }],
    ['no frequency and not SOS (model could not say how often)', { ...good, administrations_per_day: null }],
    ['zero doses and not SOS (prompt-injection shape)', { ...good, administrations_per_day: 0 }],
    ['zero units and no total', { ...good, units_per_dose: 0 }],
    ['total units implausible', { ...good, total_units_per_day: 400 }],
    ['administrations implausible', { ...good, administrations_per_day: 500 }],
    ['negative units', { ...good, units_per_dose: -1 }],
    ['NaN', { ...good, administrations_per_day: NaN }],
    ['volume implausible', { ...good, volume_ml_per_dose: 5000 }],
    ['duration wrong type', { ...good, duration_days: 'five' }],
  ])('rejects %s', (_name, input) => {
    expect(validateLlmFields(input)).toBeNull()
  })
})

describe('sigFromLlm', () => {
  it('builds a Sig the same way the rule parser does, with low confidence and a confirm-me note', () => {
    const s = sigFromLlm({ ...good, units_per_dose: 2 })
    expect(s).toMatchObject({ doses_per_day: 4, max_doses_per_day: 4, sos: false, duration_days: 5, confidence: 0.5 })
    expect(s.assumptions?.[0]).toMatch(/please confirm/)
  })
  it('uses the total for uneven doses ("2 morning, 1 evening" is 3 a day, not 2 x 3)', () => {
    const s = sigFromLlm({ ...good, administrations_per_day: 2, units_per_dose: 3, total_units_per_day: 3 })
    expect(s).toMatchObject({ doses_per_day: 3, max_doses_per_day: 3, administrations_per_day: 2 })
  })
  it('keeps an SOS line with a null frequency, and multiplies its maximum by tablets per dose', () => {
    expect(validateLlmFields({ ...good, sos: true, administrations_per_day: null, sos_max_doses_per_day: 3, units_per_dose: 2 })).not.toBeNull()
    expect(sigFromLlm({ ...good, sos: true, administrations_per_day: null, sos_max_doses_per_day: 3, units_per_dose: 2 })).toMatchObject({ doses_per_day: 0, max_doses_per_day: 6 })
  })
  it('handles SOS with and without a written maximum', () => {
    expect(sigFromLlm({ ...good, sos: true, sos_max_doses_per_day: 3 })).toMatchObject({ doses_per_day: 0, max_doses_per_day: 3, sos: true })
    expect(sigFromLlm({ ...good, sos: true })).toMatchObject({ sos_cap_unspecified: true })
  })
  it('keeps liquids as a volume per dose', () => {
    expect(sigFromLlm({ ...good, administrations_per_day: 3, volume_ml_per_dose: 5 })).toMatchObject({ doses_per_day: 3, volume_ml_per_dose: 5, dose_unit: 'ml' })
  })
})

describe('parseSigSmart', () => {
  beforeEach(() => resetSigSmartState())
  const messy = 'zzz qqq' // rules cannot read this: confidence 0.4
  it('rules came first and were sure: no network call', async () => {
    const fetchImpl = vi.fn()
    const s = await parseSigSmart('1-0-1 x5d', { online: true, fetchImpl })
    expect(s).toEqual(parseSig('1-0-1 x5d'))
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('offline: no network call, rules result returned', async () => {
    const fetchImpl = vi.fn()
    expect(await parseSigSmart(messy, { online: false, fetchImpl })).toEqual(parseSig(messy))
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('online and unsure: sends only the sig text and uses a valid answer', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ fields: good }))
    const s = await parseSigSmart(messy, { online: true, fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(s).toMatchObject({ doses_per_day: 2, duration_days: 5, confidence: 0.5 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/parse-sig')
    expect(JSON.parse(init.body as string)).toEqual({ sig_text: messy })
  })
  it.each([
    ['server error', async () => jsonRes({ error: 'x' }, 502)],
    ['invalid fields', async () => jsonRes({ fields: { ...good, administrations_per_day: 999 } })],
    ['no fields', async () => jsonRes({})],
    ['network failure', async () => { throw new TypeError('Failed to fetch') }],
  ])('falls back to the rules result on %s', async (_n, impl) => {
    expect(await parseSigSmart(messy, { online: true, fetchImpl: vi.fn(impl) as unknown as typeof fetch })).toEqual(parseSig(messy))
  })
  it('asks the server once per distinct text, then answers from memory (quota protection)', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ fields: good }))
    const f = fetchImpl as unknown as typeof fetch
    await parseSigSmart(messy, { online: true, fetchImpl: f })
    await parseSigSmart(`  ${messy.toUpperCase()}  `, { online: true, fetchImpl: f })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it('does not retry a text whose call failed', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ error: 'x' }, 502))
    const f = fetchImpl as unknown as typeof fetch
    await parseSigSmart(messy, { online: true, fetchImpl: f })
    await parseSigSmart(messy, { online: true, fetchImpl: f })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it('stops calling the server after the session budget is used up', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ fields: good }))
    const f = fetchImpl as unknown as typeof fetch
    for (const t of ['zzz a', 'zzz b', 'zzz c', 'zzz d']) await parseSigSmart(t, { online: true, fetchImpl: f, maxCalls: 2 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(await parseSigSmart('zzz e', { online: true, fetchImpl: f, maxCalls: 2 })).toEqual(parseSig('zzz e'))
  })
  it('gives up after the timeout instead of hanging', async () => {
    const fetchImpl = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_res, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted')))))
    const s = await parseSigSmart(messy, { online: true, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 })
    expect(s).toEqual(parseSig(messy))
  })
})

describe('api/parse-sig handler', () => {
  const req = (body: unknown, method = 'POST') => new Request('http://x/api/parse-sig', { method, body: method === 'POST' ? JSON.stringify(body) : undefined })
  const upstream = (text: string) => vi.fn(async () => jsonRes({ content: [{ type: 'text', text }] }))

  it('rejects non-POST, bad bodies and over-long text', async () => {
    const deps = { fetchImpl: vi.fn() as unknown as typeof fetch, anthropicKey: 'k' }
    expect((await handle(req({}, 'GET'), deps)).status).toBe(405)
    expect((await handle(new Request('http://x', { method: 'POST', body: 'not json' }), deps)).status).toBe(400)
    expect((await handle(req({ sig_text: '' }), deps)).status).toBe(400)
    expect((await handle(req({ sig_text: 5 }), deps)).status).toBe(400)
    expect((await handle(req({ sig_text: 'x'.repeat(201) }), deps)).status).toBe(400)
    expect(deps.fetchImpl).not.toHaveBeenCalled()
  })
  it('reports not configured when there is no API key, without calling out', async () => {
    const fetchImpl = vi.fn()
    expect((await handle(req({ sig_text: 'BD' }), { fetchImpl: fetchImpl as unknown as typeof fetch })).status).toBe(503)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('sends only the sig text and the key to the model, and returns validated fields', async () => {
    const f = upstream(`Sure! ${JSON.stringify(good)}`)
    const res = await handle(req({ sig_text: 'subah shaam 5 din', patient: 'Asha, 34', brand: 'Dolo' }), { fetchImpl: f as unknown as typeof fetch, anthropicKey: 'secret' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ fields: good })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const body = JSON.parse(init.body as string)
    expect(body.messages).toEqual([{ role: 'user', content: 'subah shaam 5 din' }])
    expect(JSON.stringify(body)).not.toMatch(/Asha|Dolo/)
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('secret')
    expect(body.temperature).toBe(0)
  })
  it('uses Gemini when its key is set: key in the header (not the URL), JSON mode, only the sig text sent', async () => {
    const f = vi.fn(async () => jsonRes({ candidates: [{ content: { parts: [{ text: JSON.stringify(good) }] } }] }))
    const res = await handle(req({ sig_text: 'subah shaam 5 din', brand: 'Dolo' }), { fetchImpl: f as unknown as typeof fetch, geminiKey: 'gk', anthropicKey: 'ak' })
    expect(await res.json()).toEqual({ fields: good })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent')
    expect(url).not.toContain('gk')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('gk')
    const body = JSON.parse(init.body as string)
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'subah shaam 5 din' }] }])
    expect(body.generationConfig).toMatchObject({ temperature: 0, responseMimeType: 'application/json' })
    expect(JSON.stringify(body)).not.toMatch(/Dolo/)
  })
  it('lets GEMINI_MODEL override the default model', async () => {
    const f = vi.fn(async () => jsonRes({ candidates: [{ content: { parts: [{ text: JSON.stringify(good) }] } }] }))
    await handle(req({ sig_text: 'BD' }), { fetchImpl: f as unknown as typeof fetch, geminiKey: 'gk', geminiModel: 'gemini-x' })
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain('/models/gemini-x:generateContent')
  })
  it('returns 502 for unusable Gemini answers (empty, blocked, out of range) and upstream errors', async () => {
    const answers: unknown[] = [{}, { candidates: [] }, { candidates: [{ content: { parts: [{ text: '{"administrations_per_day": 999}' }] } }] }]
    for (const a of answers) {
      const res = await handle(req({ sig_text: 'BD' }), { fetchImpl: vi.fn(async () => jsonRes(a)) as unknown as typeof fetch, geminiKey: 'gk' })
      expect(res.status).toBe(502)
    }
    expect((await handle(req({ sig_text: 'BD' }), { fetchImpl: vi.fn(async () => jsonRes({}, 429)) as unknown as typeof fetch, geminiKey: 'gk' })).status).toBe(502)
  })
  it('returns 502 when the model answer is not valid, never passing it on', async () => {
    for (const text of ['I cannot help', '{"administrations_per_day": 999}', '{not json}']) {
      const res = await handle(req({ sig_text: 'BD' }), { fetchImpl: upstream(text) as unknown as typeof fetch, anthropicKey: 'k' })
      expect(res.status).toBe(502)
    }
    const failing = vi.fn(async () => jsonRes({}, 500))
    expect((await handle(req({ sig_text: 'BD' }), { fetchImpl: failing as unknown as typeof fetch, anthropicKey: 'k' })).status).toBe(502)
    const throwing = vi.fn(async () => { throw new Error('down') })
    expect((await handle(req({ sig_text: 'BD' }), { fetchImpl: throwing as unknown as typeof fetch, anthropicKey: 'k' })).status).toBe(502)
  })
})
