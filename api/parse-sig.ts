// Vercel function: read a messy dosing instruction with an LLM. Online only; the rules in src/engine/sig run first.
// The API key is read here and nowhere else. Only the sig text arrives (no brand, no patient details) and the model
// only returns a few numbers, which src/engine/sig/llm.ts validates before use. It never decides an alert.
import { validateLlmFields } from '../src/engine/sig/llm'

declare const process: { env: Record<string, string | undefined> }

const MODEL = 'claude-haiku-5-5'
const MAX_TEXT = 200

const SYSTEM = `You read Indian prescription dosing instructions (English, Hinglish, abbreviations like OD, BD, TDS, QID, HS, SOS, 1-0-1, x5d).
Reply with ONLY one JSON object, no other text, with exactly these keys:
administrations_per_day (number of times taken per day; 0 if only as needed),
units_per_dose (tablets or capsules per time; 1 if not written),
volume_ml_per_dose (millilitres per time for liquids, else null),
sos (true if only as needed / SOS / PRN),
sos_max_doses_per_day (written daily maximum for as-needed use, else null),
duration_days (course length in days, else null).
Do not guess numbers that are not written: use null, or 1 for units_per_dose.
Never include medical advice.`

export interface Deps {
  fetchImpl: typeof fetch
  apiKey: string | undefined
}

export async function handle(request: Request, deps: Deps): Promise<Response> {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)
  let text: unknown
  try {
    text = ((await request.json()) as { sig_text?: unknown }).sig_text
  } catch {
    return json({ error: 'Body must be JSON' }, 400)
  }
  if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_TEXT) return json({ error: `sig_text must be 1-${MAX_TEXT} characters` }, 400)
  if (!deps.apiKey) return json({ error: 'Not configured' }, 503)
  try {
    const upstream = await deps.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': deps.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 200, temperature: 0, system: SYSTEM, messages: [{ role: 'user', content: text }] }),
    })
    if (!upstream.ok) return json({ error: 'Upstream error' }, 502)
    const data = (await upstream.json()) as { content?: { type: string; text?: string }[] }
    const raw = data.content?.find((c) => c.type === 'text')?.text ?? ''
    const match = /\{[\s\S]*\}/.exec(raw)
    const fields = match ? validateLlmFields(JSON.parse(match[0])) : null
    if (!fields) return json({ error: 'Unreadable answer' }, 502)
    return json({ fields })
  } catch {
    return json({ error: 'Upstream error' }, 502)
  }
}

export function POST(request: Request): Promise<Response> {
  return handle(request, { fetchImpl: fetch, apiKey: process.env.ANTHROPIC_API_KEY })
}
