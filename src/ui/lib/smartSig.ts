// The online reading of dosing text the rules cannot understand. The engine's pipeline reads a sig synchronously, so the
// unclear ones are read first and remembered here; the pipeline then asks `parseSigWithReadings`, which gives a remembered
// reading when there is one and the rules' own otherwise. Offline, on any failure, or when the rules are sure, nothing changes.
// The model only returns a few validated numbers (src/engine/sig/llm.ts); it never decides an alert, and a line read this way
// carries "Read by an AI model" in its assumptions, which the screens show.
import type { Sig } from '../../engine/contracts'
import type { Resolver } from '../../engine/resolver'
import { parseSig } from '../../engine/sig'
import { parseSigSmart, type SmartSigOptions } from '../../engine/sig/llm'

const readings = new Map<string, Sig>()

/** Tests and a fresh start. */
export const clearReadings = () => readings.clear()

export const READ_BY_AI = 'Read by an AI model'

/** True for a sig that came from the online reading. */
export const readByAi = (sig: Sig | null | undefined) => sig?.assumptions?.some((a) => a.startsWith(READ_BY_AI)) === true

/** The sig the pipeline should use for this text. */
export const parseSigWithReadings = (text: string): Sig => readings.get(text) ?? parseSig(text)

/** Read every unclear sig in these prescription texts, one at a time (the module caps the calls per session). Never throws. */
export async function readUnclearSigs(resolver: Resolver, rxTexts: string[], ageYears: number, opts?: SmartSigOptions): Promise<void> {
  for (const text of rxTexts) {
    for (const { sig_text } of resolver.resolveText(text, { age_years: ageYears })) {
      if (readings.has(sig_text) || sig_text.trim() === '') continue
      try {
        const sig = await parseSigSmart(sig_text, opts)
        if (readByAi(sig)) readings.set(sig_text, sig)
      } catch {
        /* the rules' reading stands */
      }
    }
  }
}
