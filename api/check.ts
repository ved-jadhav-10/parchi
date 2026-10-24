// Vercel function: JSON check API for buyers (e-pharmacies, chains). The same deterministic engine as the browser app,
// run server-side. It informs a pharmacist; it never decides.
//   One prescription:  POST { rx_text, patient }
//   A customer's history (several doctors, dated):  POST { prescriptions: [{id, doctor, date, text}], patient, labs?, as_of?, from?, confirmations? }
//   ...or an ABDM FHIR R4 bundle:  POST { fhir: <Bundle | Bundle[]>, patient, labs?, as_of? }
// Auth: every request needs an `x-api-key` that is listed in CHECK_API_KEYS (comma separated). With no keys set the
// endpoint answers 503, so it can never be left open by accident. Deploy note: include public/data/** in the function
// bundle (vercel.json "functions": { "api/check.ts": { "includeFiles": "public/data/**" } }).
import type { CheckPrescription, HistoryResult, Patient } from '../src/engine/contracts'
import { checkByPatient, patientKey, type CheckHistory } from '../src/engine/history'
import { herbalHistory, herbalSingle, splitHistory, splitSingle, type HerbalDeps } from '../src/engine/herbal/orchestrate'
import { createDoseDeps, type DoseResult, type LedgerLine } from '../src/engine/ledger'
import { checkRxText, parseHistoryRequest, parsePatient, parsePatientMap } from '../src/engine/ledger/requests'
import { createResolver } from '../src/engine/resolver'
import { createDdiIndex, type DdiJson } from '../src/engine/resolver/ddi'
import { decodeData, type BannedJson, type BrandsJson, type IngredientsJson, type JanAushadhiJson, type NsqJson } from '../src/engine/resolver/data'
import { CLINICAL_DATA_VERSION, parseAlertRules } from '../src/engine/rules'
import { createRealEngine } from '../src/engine/wiring'
import { createLimiter, intFrom, tooMany } from './_rateLimit'

export { parsePatient }

declare const process: { env: Record<string, string | undefined>; cwd(): string }

const MAX_BODY_CHARS = 200_000
const DISCLAIMER = 'Decision support for a pharmacist. It informs; it does not decide. Limits marked pharmacist_approved=false are unverified.'

export interface CheckDeps {
  check: CheckPrescription
  history: CheckHistory
  dose: (lines: LedgerLine[], patient: Patient) => DoseResult
  /** Ayurvedic / herbal check. Absent = herbal lines are left to the ordinary resolver, as before. */
  herbal?: HerbalDeps
  apiKeys: string[]
}

const NO_DOSE: DoseResult = { ledger: {}, findings: [], needs: [], crcl: null, notes: [] }

/** Constant-time string comparison, so a wrong key does not leak how much of it matched. */
function sameKey(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export async function handle(request: Request, deps: CheckDeps): Promise<Response> {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (deps.apiKeys.length === 0) return json({ error: 'Not configured' }, 503)
  const key = request.headers.get('x-api-key') ?? ''
  if (!deps.apiKeys.some((k) => sameKey(k, key))) return json({ error: 'Invalid or missing x-api-key' }, 401)

  let body: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_CHARS) return json({ error: 'Body too large' }, 413)
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return json({ error: 'Body must be a JSON object' }, 400)
    body = parsed as Record<string, unknown>
  } catch {
    return json({ error: 'Body must be JSON' }, 400)
  }
  const p = parsePatient(body.patient)
  if ('error' in p) return json({ error: p.error }, 400)

  if (body.prescriptions !== undefined || body.fhir !== undefined) {
    if (body.rx_text !== undefined) return json({ error: 'send rx_text for one prescription, or prescriptions/fhir for a history, not both' }, 400)
    const h = parseHistoryRequest(body)
    if ('error' in h) return json({ error: h.error }, 400)
    try {
      const split = deps.herbal ? splitHistory(h.request.prescriptions, deps.herbal) : undefined
      const engineRx = split ? split.engine : h.request.prescriptions
      const named = engineRx.some((rx) => rx.patient)
      if (named && engineRx.length) {
        // An account that orders for several people: each person is checked on their own, never added up together.
        const map = parsePatientMap(body.patients)
        if ('error' in map) return json({ error: map.error }, 400)
        const byKey = new Map(Object.entries(map.patients).map(([name, pat]) => [patientKey(name), pat]))
        const account = await checkByPatient(deps.history, engineRx, (label) => byKey.get(patientKey(label)), p.patient, h.request.labs, h.request.options)
        return json({
          schema: 1,
          mode: 'history_by_patient',
          disclaimer: DISCLAIMER, data_version: CLINICAL_DATA_VERSION,
          patients: account.patients.map((x) => ({ label: x.label, ...x.result })),
          alerts: account.alerts,
          unassigned: account.unassigned.map((rx) => ({ id: rx.id, doctor: rx.doctor, date: rx.date })),
          ...(h.request.warnings.length ? { import_warnings: h.request.warnings } : {}),
        })
      }
      const result: HistoryResult | undefined = engineRx.length ? await deps.history(engineRx, p.patient, h.request.labs, h.request.options) : undefined
      const herbal = split && deps.herbal ? herbalHistory(split.herbal, result?.lines ?? [], deps.herbal) : undefined
      if (!result) {
        // Only herbal items were sent: there is no ordinary medicine to check, and that is not a "clear".
        return json({ schema: 1, mode: 'history', disclaimer: DISCLAIMER, data_version: CLINICAL_DATA_VERSION, alerts: [], lines: [], windows: [], ledger: {}, status: 'clear_with_note', priority: 0, ...(herbal && { herbal }), ...(h.request.warnings.length ? { import_warnings: h.request.warnings } : {}) })
      }
      return json({ schema: 1, mode: 'history', disclaimer: DISCLAIMER, data_version: CLINICAL_DATA_VERSION, ...result, ...(herbal && { herbal }), ...(h.request.warnings.length ? { import_warnings: h.request.warnings } : {}) })
    } catch {
      return json({ error: 'Check failed' }, 500)
    }
  }

  const bad = checkRxText(body.rx_text)
  if (bad) return json({ error: bad }, 400)
  try {
    const split = deps.herbal ? splitSingle(body.rx_text as string, deps.herbal) : undefined
    const rxText = split ? split.restText : (body.rx_text as string)
    const result = rxText.trim() ? await deps.check(rxText, p.patient) : { lines: [], ledger: {}, alerts: [] }
    const dose = result.lines.length ? deps.dose(result.lines, p.patient) : NO_DOSE
    const herbal = split && deps.herbal ? herbalSingle(split.herbal, result.lines, deps.herbal) : undefined
    return json({
      schema: 1,
      mode: 'single',
      disclaimer: DISCLAIMER, data_version: CLINICAL_DATA_VERSION,
      alerts: result.alerts,
      lines: result.lines,
      ledger: dose.ledger,
      findings: dose.findings,
      needs: dose.needs,
      crcl_ml_min: dose.crcl,
      notes: dose.notes,
      ...(herbal && { herbal }),
    })
  } catch {
    return json({ error: 'Check failed' }, 500)
  }
}

let cached: Promise<Pick<CheckDeps, 'check' | 'history' | 'dose' | 'herbal'>> | undefined

/** Read the committed JSON data from disk once per server instance. */
function load(): Promise<Pick<CheckDeps, 'check' | 'history' | 'dose' | 'herbal'>> {
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
    const engine = createRealEngine({
      resolver,
      ddi: createDdiIndex((await read<DdiJson>('ddi.json'))!),
      rules: parseAlertRules(await read('alert_rules.json')),
    })
    return {
      check: engine.check,
      history: engine.checkHistory,
      dose: createDoseDeps(resolver).computeDose,
      herbal: { isKnownBrand: (b) => resolver.resolve(b).confidence >= 0.97, classesOf: (id) => resolver.ingredient(id)?.classes },
    }
  })()
  cached.catch(() => (cached = undefined)) // a failed load is retried on the next request
  return cached
}

// Per API key, per instance: CHECK_RATE_PER_MIN requests a minute (default 120).
const perKey = createLimiter({ max: intFrom(process.env.CHECK_RATE_PER_MIN, 120), windowMs: 60_000 })

export async function POST(request: Request): Promise<Response> {
  const keys = (process.env.CHECK_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
  if (keys.length === 0) return handle(request, { check: async () => ({ lines: [], ledger: {}, alerts: [] }), history: async () => { throw new Error('unused') }, dose: () => { throw new Error('unused') }, apiKeys: [] })
  const sent = request.headers.get('x-api-key') ?? ''
  if (keys.some((k) => sameKey(k, sent))) {
    const d = perKey(sent) // counted only for valid keys, so wrong guesses cannot lock a real customer out
    if (!d.allowed) return tooMany(d.retryAfterSec)
  }
  const data = await load().catch(() => undefined)
  if (!data) return new Response(JSON.stringify({ error: 'Data not available' }), { status: 503, headers: { 'content-type': 'application/json' } })
  return handle(request, { ...data, apiKeys: keys })
}
