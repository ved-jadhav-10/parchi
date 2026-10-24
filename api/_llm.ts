// One call to a language model, for the serverless functions that use one. The leading underscore keeps Vercel from
// treating this file as an endpoint. Keys are read by the endpoint and passed in; nothing here reads the environment.
// Provider: Gemini when a Gemini key is given (model from GEMINI_MODEL), else Anthropic when an Anthropic key is given.

export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite'
export const ANTHROPIC_MODEL = 'claude-haiku-5-5'

export interface LlmDeps {
  fetchImpl: typeof fetch
  geminiKey?: string
  geminiModel?: string
  anthropicKey?: string
}

export type Upstream = { ok: true; text: string } | { ok: false }

export interface LlmRequest {
  system: string
  user: string
  maxTokens: number
  /** Ask the model for JSON only (Gemini honours this directly; for Anthropic the prompt must say it). */
  json?: boolean
  temperature?: number
}

export const llmConfigured = (deps: LlmDeps) => Boolean(deps.geminiKey || deps.anthropicKey)

export async function askLlm(req: LlmRequest, deps: LlmDeps): Promise<Upstream> {
  const temperature = req.temperature ?? 0
  if (deps.geminiKey) {
    const model = deps.geminiModel || GEMINI_DEFAULT_MODEL
    const res = await deps.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': deps.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: { temperature, maxOutputTokens: req.maxTokens, ...(req.json && { responseMimeType: 'application/json' }) },
      }),
    })
    if (!res.ok) return { ok: false }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    return { ok: true, text: data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '' }
  }
  if (deps.anthropicKey) {
    const res = await deps.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': deps.anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: req.maxTokens, temperature, system: req.system, messages: [{ role: 'user', content: req.user }] }),
    })
    if (!res.ok) return { ok: false }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    return { ok: true, text: data.content?.find((c) => c.type === 'text')?.text ?? '' }
  }
  return { ok: false }
}
