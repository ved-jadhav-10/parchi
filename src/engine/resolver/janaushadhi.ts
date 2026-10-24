// Jan Aushadhi (PMBJP) generic equivalents for a resolved product: same active ingredients, same strengths,
// same dosage-form group. Informs the pharmacist; the substitution itself is theirs to confirm.
import type { Ingredient, JanAushadhiRef } from '../contracts'
import type { JanAushadhiJson } from './data'
import { parseName } from './normalize'

export interface JanAushadhiIndex {
  check(ingredients: Ingredient[], form: string, brand: string | null, compositionComplete: boolean): JanAushadhiRef[]
}

const LIQUID = new Set(['syrup', 'suspension', 'dry_syrup', 'oral_solution', 'oral_drops'])
/** Trailing release modifiers in brand names ("Glycomet SR"). Same mg of SR and plain is not the same product. */
const MODIFIED_RELEASE = new Set(['sr', 'er', 'xr', 'xl', 'cr', 'mr', 'pr', 'retard'])
const MAX_MATCHES = 3

const group = (form: string) => (LIQUID.has(form) ? 'liquid' : form)
const num = (x: number) => Math.round(x * 1e6) / 1e6
const signature = (parts: [string, number, number | null][]) =>
  parts.map(([id, mg, perMl]) => `${id}:${num(mg)}:${perMl ?? ''}`).sort().join('|')

export function createJanAushadhiIndex(json: JanAushadhiJson | undefined): JanAushadhiIndex {
  const bySignature = new Map<string, (JanAushadhiRef & { form: string; modified: boolean })[]>()
  for (const [code, name, unit, form, release, ings] of json?.items ?? []) {
    const sig = signature(ings.map(([i, mg, perMl]) => [json!.ingredients[i], mg, perMl ?? null]))
    const item = { code, name, unit, form, modified: !!release?.includes('modified-release'), ...(release ? { release } : {}) }
    const list = bySignature.get(sig)
    if (list) list.push(item)
    else bySignature.set(sig, [item])
  }
  return {
    check(ingredients, form, brand, compositionComplete) {
      // A source composition that may be truncated could equal a single-ingredient item by accident.
      if (!compositionComplete || !ingredients.length || ingredients.some((i) => i.strength_unknown || i.other_unit)) return []
      const sig = signature(ingredients.map((i) => [i.id, i.mg, i.per_volume_ml ?? null]))
      const modified = !!brand && parseName(brand).tokens.some((t) => MODIFIED_RELEASE.has(t))
      return (bySignature.get(sig) ?? [])
        .filter((it) => group(it.form) === group(form) && it.modified === modified)
        .slice(0, MAX_MATCHES)
        .map(({ form: _f, modified: _m, ...ref }) => ref)
    },
  }
}
