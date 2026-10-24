// Track B: optional online fallback for sig text the rules could not read. Rules always run first and offline.
// The LLM only extracts a few numbers from the text; this file checks them and builds the Sig itself, so the model
// never decides an alert. Only the sig text is sent (no brand, no patient details).
import type { Sig } from '../contracts'
import { parseSig } from './parse'

/** What the server asks the model for. Everything else in Sig is derived from these. */
export interface LlmSigFields {
  administrations_per_day: number
  units_per_dose: number
  volume_ml_per_dose: number | null
  sos: boolean
  sos_max_doses_per_day: number | null
  duration_days: number | null
}

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null

/** Strict check of the model's answer. Returns null for anything missing, mistyped or implausible. */
export function validateLlmFields(x: unknown): LlmSigFields | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  const admin = num(o.administrations_per_day, 0, 24)
  const units = num(o.units_per_dose, 0, 10)
  if (admin === null || units === null || typeof o.sos !== 'boolean') return null
  const optional = (v: unknown, max: number): number | null | undefined =>
    v === null || v === undefined ? null : (num(v, 0, max) ?? undefined)
  const volume = optional(o.volume_ml_per_dose, 100)
  const cap = optional(o.sos_max_doses_per_day, 24)
  const days = optional(o.duration_days, 365)
  if (volume === undefined || cap === undefined || days === undefined) return null
  return { administrations_per_day: admin, units_per_dose: units, volume_ml_per_dose: volume, sos: o.sos, sos_max_doses_per_day: cap, duration_days: days }
}

/** Build the contract Sig from validated model fields. Confidence stays low: a person should confirm. */
export function sigFromLlm(f: LlmSigFields): Sig {
  const perDay = f.volume_ml_per_dose !== null ? f.administrations_per_day : f.administrations_per_day * f.units_per_dose
  const sig: Sig = {
    doses_per_day: f.sos ? 0 : perDay,
    max_doses_per_day: f.sos ? (f.sos_max_doses_per_day ?? 0) : perDay,
    sos: f.sos,
    administrations_per_day: f.sos ? 0 : f.administrations_per_day,
    confidence: 0.5,
    assumptions: ['Read by an AI model because the rules could not understand this text; please confirm'],
  }
  if (f.sos && f.sos_max_doses_per_day === null) {
    sig.sos_cap_unspecified = true
    sig.assumptions!.push('SOS with no daily maximum written; the worst-case cap comes from the limits data')
  }
  if (f.volume_ml_per_dose !== null) {
    sig.volume_ml_per_dose = f.volume_ml_per_dose
    sig.dose_unit = 'ml'
  } else sig.dose_unit = 'unit'
  if (f.duration_days !== null) sig.duration_days = f.duration_days
  return sig
}

export interface SmartSigOptions {
  /** Defaults to navigator.onLine where available, otherwise false. */
  online?: boolean
  endpoint?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /** Rules below this confidence trigger the fallback. */
  below?: number
}

/**
 * Parse with the rules; if they are unsure and we are online, ask the server to read it. Offline, on any error, or if the
 * answer fails validation, the rules result is returned unchanged.
 */
export async function parseSigSmart(text: string, opts: SmartSigOptions = {}): Promise<Sig> {
  const rules = parseSig(text)
  if ((rules.confidence ?? 1) >= (opts.below ?? 0.7) || text.trim() === '') return rules
  const online = opts.online ?? (typeof navigator !== 'undefined' ? navigator.onLine : false)
  if (!online) return rules
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined)
  if (!doFetch) return rules
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 4000)
  try {
    const res = await doFetch(opts.endpoint ?? '/api/parse-sig', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sig_text: text }),
      signal: ctl.signal,
    })
    if (!res.ok) return rules
    const fields = validateLlmFields(((await res.json()) as { fields?: unknown }).fields)
    return fields ? sigFromLlm(fields) : rules
  } catch {
    return rules
  } finally {
    clearTimeout(timer)
  }
}
