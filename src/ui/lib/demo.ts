import type { Ledger } from '../../engine/contracts'

export const splitRx = (rx: string) =>
  rx
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

/** The ingredient found in the most distinct brands (ties: closest to its limit). Null when nothing repeats. */
export function pickHiddenIngredient(ledger: Ledger) {
  const ratio = (r: Ledger[string]) => (r.limit_mg_day ? r.total_mg_day / r.limit_mg_day : 0)
  const best = Object.entries(ledger)
    .map(([id, r]) => ({ id, ...r, sources: [...new Set(r.sources)] }))
    .filter((r) => r.sources.length >= 2)
    .sort((a, b) => b.sources.length - a.sources.length || ratio(b) - ratio(a))[0]
  return best ?? null
}
