// Track B: optional online fallback for sig text the rules could not read. Rules always run first and offline.
// The LLM only extracts a few numbers from the text; this file checks them and builds the Sig itself, so the model
// never decides an alert. Only the sig text is sent (no brand, no patient details).
import type { Sig } from '../contracts'
import { parseSig } from './parse'

/** What the server asks the model for. Everything else in Sig is derived from these. */
export interface LlmSigFields {
  /** Times taken per day; null when the text does not say (the answer is then rejected, never guessed). */
  administrations_per_day: number | null
  units_per_dose: number
  volume_ml_per_dose: number | null
  /** Only when different amounts are taken at different times ("2 morning, 1 evening" = 3). */
  total_units_per_day: number | null
  sos: boolean
  sos_max_doses_per_day: number | null
  duration_days: number | null
}

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null

/**
 * Strict check of the model's answer. Returns null for anything missing, mistyped, implausible or unusable:
 * a scheduled line with no frequency or zero doses is rejected rather than counted as 0 mg.
 */
export function validateLlmFields(x: unknown): LlmSigFields | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  if (typeof o.sos !== 'boolean') return null
  const units = num(o.units_per_dose, 0, 10)
  if (units === null) return null
  const optional = (v: unknown, max: number): number | null | undefined =>
    v === null || v === undefined ? null : (num(v, 0, max) ?? undefined)
  const admin = optional(o.administrations_per_day, 24)
  const volume = optional(o.volume_ml_per_dose, 100)
  const total = optional(o.total_units_per_day, 40)
  const cap = optional(o.sos_max_doses_per_day, 24)
  const days = optional(o.duration_days, 365)
  if ([admin, volume, total, cap, days].some((v) => v === undefined)) return null
  if (!o.sos && !((admin ?? 0) > 0 || (total ?? 0) > 0)) return null
  if (units === 0 && total === null) return null
  return {
    administrations_per_day: admin as number | null,
    units_per_dose: units,
    volume_ml_per_dose: volume as number | null,
    total_units_per_day: total as number | null,
    sos: o.sos,
    sos_max_doses_per_day: cap as number | null,
    duration_days: days as number | null,
  }
}

/** Build the contract Sig from validated model fields. Confidence stays low: a person should confirm. */
export function sigFromLlm(f: LlmSigFields): Sig {
  const liquid = f.volume_ml_per_dose !== null
  const admin = f.administrations_per_day ?? 0
  const perDay = f.total_units_per_day !== null && !liquid ? f.total_units_per_day : liquid ? admin : admin * f.units_per_dose
  const perDoseUnits = liquid ? 1 : f.units_per_dose
  const sig: Sig = {
    doses_per_day: f.sos ? 0 : perDay,
    max_doses_per_day: f.sos ? (f.sos_max_doses_per_day ?? 0) * perDoseUnits : perDay,
    sos: f.sos,
    administrations_per_day: f.sos ? 0 : admin,
    confidence: 0.5,
    assumptions: ['Read by an AI model because the rules could not understand this text; please confirm'],
  }
  if (f.sos && f.sos_max_doses_per_day === null) {
    sig.sos_cap_unspecified = true
    sig.assumptions!.push('SOS with no daily maximum written; the worst-case cap comes from the limits data')
  }
  if (liquid) {
    sig.volume_ml_per_dose = f.volume_ml_per_dose!
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
  /** Most server calls per page session (the model quota is small). Default 20. */
  maxCalls?: number
}

// Quota protection: the same text is only ever sent once, and a session makes at most `maxCalls` calls.
const answered = new Map<string, Sig>()
let callsMade = 0
export const SIG_LLM_CALL_BUDGET = 20
/** Tests and "new prescription" resets. */
export function resetSigSmartState(): void {
  answered.clear()
  callsMade = 0
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
  const key = text.trim().toLowerCase().replace(/\s+/g, ' ')
  const seen = answered.get(key)
  if (seen) return seen
  if (callsMade >= (opts.maxCalls ?? SIG_LLM_CALL_BUDGET)) return rules
  callsMade++
  const result = await askServer(text, rules, doFetch, opts)
  answered.set(key, result) // failures are remembered too, so a failing text is not retried in a loop
  return result
}

async function askServer(text: string, rules: Sig, doFetch: typeof fetch, opts: SmartSigOptions): Promise<Sig> {
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
