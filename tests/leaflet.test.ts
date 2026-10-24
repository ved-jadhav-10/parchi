import { describe, expect, it, vi } from 'vitest'
import { handle, leafletNamesAll, parseLeafletRequest } from '../api/leaflet'

const body = { language: 'hi', medicines: [{ brand: 'Dolo 650', how: '1 tablet three times a day for 5 days' }, { brand: 'Pan 40', how: '1 tablet once a day' }], points: ['Take Pan 40 before food'] }
const post = (b: unknown, method = 'POST') => new Request('http://x/api/leaflet', { method, body: method === 'POST' ? JSON.stringify(b) : undefined })
const reply = (text: string) => ({ ok: true, json: async () => ({ content: [{ type: 'text', text }] }) }) as unknown as Response
const geminiReply = (text: string) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) }) as unknown as Response

describe('parseLeafletRequest', () => {
  it('accepts a well-formed request and defaults points to none', () => {
    expect(parseLeafletRequest(body)).toEqual(body)
    expect(parseLeafletRequest({ ...body, points: undefined })).toMatchObject({ points: [] })
  })
  it.each([
    ['unknown language', { ...body, language: 'fr' }],
    ['no medicines', { ...body, medicines: [] }],
    ['too many medicines', { ...body, medicines: Array(16).fill(body.medicines[0]) }],
    ['medicine without how', { ...body, medicines: [{ brand: 'Dolo 650' }] }],
    ['brand too long', { ...body, medicines: [{ brand: 'x'.repeat(81), how: 'daily' }] }],
    ['points not a list', { ...body, points: 'be careful' }],
    ['point too long', { ...body, points: ['x'.repeat(301)] }],
    ['not an object', 'hi'],
  ])('rejects %s', (_n, input) => {
    expect('error' in (parseLeafletRequest(input) as object)).toBe(true)
  })
})

describe('leafletNamesAll', () => {
  it('needs every medicine named, ignoring case', () => {
    expect(leafletNamesAll('- DOLO 650: दिन में तीन बार\n- pan 40: ...', body.medicines)).toBe(true)
    expect(leafletNamesAll('- Dolo 650: ...', body.medicines)).toBe(false)
  })
})

describe('POST /api/leaflet', () => {
  const text = '- Dolo 650: दिन में तीन बार 1 गोली, 5 दिन\n- Pan 40: दिन में एक बार\nफार्मासिस्ट से: खाने से पहले\nयदि संदेह हो तो अपने फार्मासिस्ट से पूछें।'

  it('returns the model text marked as a draft, using Anthropic when only that key is set', async () => {
    const fetchImpl = vi.fn(async () => reply(text))
    const res = await handle(post(body), { fetchImpl: fetchImpl as unknown as typeof fetch, anthropicKey: 'k' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ leaflet: text, language: 'hi', draft: true })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('api.anthropic.com')
    const sent = JSON.parse(init.body as string)
    expect(sent.system).toContain('Hindi')
    expect(sent.system).toContain('Do not add')
    // Only the medicines and the typed points go upstream: nothing else about the customer exists in the request.
    expect(JSON.parse(sent.messages[0].content)).toEqual({ medicines: body.medicines, points_from_pharmacist: body.points })
  })

  it('prefers Gemini when its key is set', async () => {
    const fetchImpl = vi.fn(async () => geminiReply(text))
    const res = await handle(post(body), { fetchImpl: fetchImpl as unknown as typeof fetch, geminiKey: 'g', anthropicKey: 'k' })
    expect(res.status).toBe(200)
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toContain('generativelanguage')
  })

  it('refuses a leaflet that drops a medicine, and an empty or oversized one', async () => {
    for (const bad of ['- Dolo 650 only', '', 'x Dolo 650 Pan 40 '.repeat(400)]) {
      const res = await handle(post(body), { fetchImpl: vi.fn(async () => reply(bad)) as unknown as typeof fetch, anthropicKey: 'k' })
      expect(res.status).toBe(502)
    }
  })

  it('answers 405, 400, 503 and 502 without leaking detail', async () => {
    const deps = { fetchImpl: vi.fn() as unknown as typeof fetch, anthropicKey: 'k' }
    expect((await handle(post({}, 'GET'), deps)).status).toBe(405)
    expect((await handle(new Request('http://x', { method: 'POST', body: 'nope' }), deps)).status).toBe(400)
    expect((await handle(post({ ...body, language: 'xx' }), deps)).status).toBe(400)
    expect((await handle(post(body), { fetchImpl: deps.fetchImpl })).status).toBe(503)
    const down = vi.fn(async () => ({ ok: false }) as Response)
    expect((await handle(post(body), { fetchImpl: down as unknown as typeof fetch, anthropicKey: 'k' })).status).toBe(502)
    const boom = vi.fn(async () => {
      throw new Error('secret detail')
    })
    const res = await handle(post(body), { fetchImpl: boom as unknown as typeof fetch, anthropicKey: 'k' })
    expect(res.status).toBe(502)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})
