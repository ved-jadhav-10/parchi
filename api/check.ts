// Vercel function: JSON check API for buyers (e-pharmacies, chains). POST { rx_text, patient } -> alerts, ledger, dose findings.
// The same deterministic engine as the browser app, run server-side. It informs a pharmacist; it never decides.
// Auth: every request needs an `x-api-key` that is listed in CHECK_API_KEYS (comma separated). With no keys set the
// endpoint answers 503, so it can never be left open by accident. Deploy note: include public/data/** in the function
// bundle (vercel.json "functions": { "api/check.ts": { "includeFiles": "public/data/**" } }).
import type { CheckPrescription, Patient } from '../src/engine/contracts'
import { createDoseDeps, type DoseResult, type LedgerLine } from '../src/engine/ledger'
import { createPipeline } from '../src/engine/pipeline'
import { createResolver } from '../src/engine/resolver'
import { createDdiIndex, type DdiJson } from '../src/engine/resolver/ddi'
import { decodeData, type BannedJson, type BrandsJson, type IngredientsJson, type JanAushadhiJson, type NsqJson } from '../src/engine/resolver/data'
import { parseAlertRules } from '../src/engine/rules'

declare const process: { env: Record<string, string | undefined>; cwd(): string }

const MAX_BODY_CHARS = 20_000
const MAX_RX_CHARS = 2_000
const MAX_LINES = 30

export interface CheckDeps {
  check: CheckPrescription
  dose: (lines: LedgerLine[], patient: Patient) => DoseResult
  apiKeys: string[]
}

/** Constant-time string comparison, so a wrong key does not leak how much of it matched. */
function sameKey(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

const inRange = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

/** Strict patient check. Returns the patient or a plain-language problem. */
export function parsePatient(x: unknown): { patient: Patient } | { error: string } {
  if (typeof x !== 'object' || x === null) return { error: 'patient is required' }
  const o = x as Record<string, unknown>
  if (!inRange(o.age_years, 0, 120)) return { error: 'patient.age_years must be a number from 0 to 120' }
  const patient: Patient = { age_years: o.age_years }
  if (o.weight_kg !== undefined) {
    if (!inRange(o.weight_kg, 0.5, 400)) return { error: 'patient.weight_kg must be a number from 0.5 to 400' }
    patient.weight_kg = o.weight_kg
  }
  if (o.serum_creatinine !== undefined) {
    if (!inRange(o.serum_creatinine, 0.1, 20)) return { error: 'patient.serum_creatinine must be a number from 0.1 to 20 (mg/dL)' }
    patient.serum_creatinine = o.serum_creatinine
  }
  if (o.sex !== undefined) {
    if (o.sex !== 'M' && o.sex !== 'F') return { error: 'patient.sex must be "M" or "F"' }
    patient.sex = o.sex
  }
  return { patient }
}

export async function handle(request: Request, deps: CheckDeps): Promise<Response> {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (deps.apiKeys.length === 0) return json({ error: 'Not configured' }, 503)
  const key = request.headers.get('x-api-key') ?? ''
  if (!deps.apiKeys.some((k) => sameKey(k, key))) return json({ error: 'Invalid or missing x-api-key' }, 401)

  let body: { rx_text?: unknown; patient?: unknown }
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_CHARS) return json({ error: 'Body too large' }, 413)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Body must be JSON' }, 400)
  }
  if (typeof body.rx_text !== 'string' || body.rx_text.trim() === '' || body.rx_text.length > MAX_RX_CHARS) {
    return json({ error: `rx_text must be 1-${MAX_RX_CHARS} characters` }, 400)
  }
  if (body.rx_text.split(/\r?\n|;/).filter((l) => l.trim()).length > MAX_LINES) return json({ error: `rx_text has more than ${MAX_LINES} lines` }, 400)
  const p = parsePatient(body.patient)
  if ('error' in p) return json({ error: p.error }, 400)

  try {
    const result = await deps.check(body.rx_text, p.patient)
    const dose = deps.dose(result.lines, p.patient)
    return json({
      schema: 1,
      disclaimer: 'Decision support for a pharmacist. It informs; it does not decide. Limits marked pharmacist_approved=false are unverified.',
      alerts: result.alerts,
      lines: result.lines,
      ledger: dose.ledger,
      findings: dose.findings,
      needs: dose.needs,
      crcl_ml_min: dose.crcl,
      notes: dose.notes,
    })
  } catch {
    return json({ error: 'Check failed' }, 500)
  }
}

let cached: Promise<Pick<CheckDeps, 'check' | 'dose'>> | undefined

/** Read the committed JSON data from disk once per server instance. */
function load(): Promise<Pick<CheckDeps, 'check' | 'dose'>> {
  cached ??= (async () => {
    const mod = 'node:fs/promises' // variable specifier: this file is typechecked without Node typings
    const fs = (await import(mod)) as { readFile(path: string, encoding: string): Promise<string> }
    const dir = `${process.cwd()}/public/data/`
    const read = async <T>(name: string, optional = false): Promise<T | undefined> => {
      try {
        return JSON.parse(await fs.readFile(dir + name, 'utf8')) as T
      } catch (e) {
        if (optional) return undefined
        throw e
      }
    }
    const resolver = createResolver(
      decodeData(
        (await read<BrandsJson>('brands.json'))!,
        (await read<IngredientsJson>('ingredients.json'))!,
        (await read<BannedJson>('banned_fdc.json'))!,
        await read<NsqJson>('nsq.json', true),
        await read<JanAushadhiJson>('janaushadhi.json', true),
      ),
    )
    const doseDeps = createDoseDeps(resolver)
    const check = createPipeline({
      resolver,
      ddi: createDdiIndex((await read<DdiJson>('ddi.json'))!),
      rules: parseAlertRules(await read('alert_rules.json')),
      parseSig: doseDeps.parseSig,
      buildLedger: doseDeps.buildLedger,
    })
    return { check, dose: doseDeps.computeDose }
  })()
  cached.catch(() => (cached = undefined)) // a failed load is retried on the next request
  return cached
}

export async function POST(request: Request): Promise<Response> {
  const keys = (process.env.CHECK_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
  if (keys.length === 0) return handle(request, { check: async () => ({ lines: [], ledger: {}, alerts: [] }), dose: () => { throw new Error('unused') }, apiKeys: [] })
  const data = await load().catch(() => undefined)
  if (!data) return new Response(JSON.stringify({ error: 'Data not available' }), { status: 503, headers: { 'content-type': 'application/json' } })
  return handle(request, { ...data, apiKeys: keys })
}
