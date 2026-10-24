// Small in-memory rate limiter for the serverless functions (fixed window per key). The leading underscore keeps
// Vercel from treating this file as an endpoint.
// Honest limit: each serverless instance counts on its own, so this stops bursts and casual abuse, not a distributed
// attacker. For a hard guarantee put a shared store (Vercel KV / Upstash) or the platform firewall in front.

export interface LimitDecision {
  allowed: boolean
  /** Seconds until the window resets; only meaningful when not allowed. */
  retryAfterSec: number
}

export interface Limiter {
  (key: string): LimitDecision
}

export function createLimiter(opts: { max: number; windowMs: number; now?: () => number; maxKeys?: number }): Limiter {
  const now = opts.now ?? Date.now
  const maxKeys = opts.maxKeys ?? 10_000
  const buckets = new Map<string, { start: number; count: number }>()
  return (key) => {
    const t = now()
    const b = buckets.get(key)
    if (!b || t - b.start >= opts.windowMs) {
      if (buckets.size >= maxKeys) {
        for (const [k, v] of buckets) if (t - v.start >= opts.windowMs) buckets.delete(k) // drop expired entries first
        if (buckets.size >= maxKeys) buckets.clear() // still full (a flood of new keys): reset rather than grow without bound
      }
      buckets.set(key, { start: t, count: 1 })
      return { allowed: true, retryAfterSec: 0 }
    }
    if (b.count >= opts.max) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.start + opts.windowMs - t) / 1000)) }
    b.count++
    return { allowed: true, retryAfterSec: 0 }
  }
}

/** Client address from the proxy header; the last hop is trusted least, so take the first entry. */
export function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')?.trim()) || 'unknown'
}

export function tooMany(retryAfterSec: number): Response {
  return new Response(JSON.stringify({ error: 'Too many requests', retry_after_seconds: retryAfterSec }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': String(retryAfterSec) },
  })
}

/** Positive integer from an environment value, else the default. */
export function intFrom(v: string | undefined, fallback: number): number {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : fallback
}
