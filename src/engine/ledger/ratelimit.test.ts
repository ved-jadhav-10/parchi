import { afterEach, describe, it, expect, vi } from 'vitest'
import { clientKey, createLimiter, intFrom } from '../../../api/_rateLimit'
import { POST as checkPOST } from '../../../api/check'
import { POST as sigPOST } from '../../../api/parse-sig'

type Env = Record<string, string | undefined>
const proc = (globalThis as unknown as { process: { env: Env } }).process

describe('createLimiter', () => {
  it('allows up to max per window per key, then says when to retry, and resets after the window', () => {
    let t = 1_000
    const lim = createLimiter({ max: 3, windowMs: 60_000, now: () => t })
    expect([1, 2, 3].map(() => lim('a').allowed)).toEqual([true, true, true])
    const blocked = lim('a')
    expect(blocked).toEqual({ allowed: false, retryAfterSec: 60 })
    t += 45_000
    expect(lim('a').retryAfterSec).toBe(15)
    expect(lim('b').allowed).toBe(true) // other keys are independent
    t += 15_000
    expect(lim('a').allowed).toBe(true) // window over
  })
  it('never grows without bound under a flood of new keys', () => {
    const lim = createLimiter({ max: 1, windowMs: 60_000, maxKeys: 100, now: () => 5 })
    for (let i = 0; i < 10_000; i++) expect(lim(`k${i}`).allowed).toBe(true)
  })
  it('reads the client from the proxy header, first hop, with a safe fallback', () => {
    const r = (h: Record<string, string>) => new Request('http://x', { headers: h })
    expect(clientKey(r({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(clientKey(r({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
    expect(clientKey(r({}))).toBe('unknown')
  })
  it('intFrom accepts only positive integers', () => {
    expect([intFrom('5', 1), intFrom('0', 7), intFrom('-3', 7), intFrom('2.5', 7), intFrom('abc', 7), intFrom(undefined, 7)]).toEqual([5, 7, 7, 7, 7, 7])
  })
})

describe('endpoint limits', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete proc.env.GEMINI_API_KEY
    delete proc.env.CHECK_API_KEYS
  })

  it('parse-sig: the 11th request from one client in a minute gets 429 with Retry-After, and the model is not called', async () => {
    proc.env.GEMINI_API_KEY = 'g'
    const upstream = vi.fn(async () => new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', upstream)
    const req = (ip: string) => new Request('http://x/api/parse-sig', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify({ sig_text: 'BD' }) })
    for (let i = 0; i < 10; i++) expect((await sigPOST(req('9.9.9.9'))).status).not.toBe(429)
    const calls = upstream.mock.calls.length
    const blocked = await sigPOST(req('9.9.9.9'))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(upstream.mock.calls.length).toBe(calls)
    expect((await sigPOST(req('8.8.8.8'))).status).not.toBe(429) // another client is unaffected
  })

  it('check: only valid keys are counted, so wrong guesses cannot lock a real customer out', async () => {
    proc.env.CHECK_API_KEYS = 'real'
    const req = (key: string) => new Request('http://x/api/check', { method: 'POST', headers: { 'x-api-key': key }, body: JSON.stringify({ rx_text: 'Dolo 650 TDS', patient: { age_years: 40 } }) })
    for (let i = 0; i < 200; i++) expect((await checkPOST(req('wrong'))).status).toBe(401)
    expect((await checkPOST(req('real'))).status).toBe(200)
  })
})
