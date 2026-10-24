import type { Ledger, ResolvedBrand } from '../../engine/contracts'
import type { Resolver } from '../../engine/resolver'
import type { DdiIndex } from '../../engine/resolver/ddi'

/**
 * Names of the ingredients on a prescription that the interaction data has no entry for at all. For these, "no interaction alert"
 * means "nothing on file", not "no interaction". Non-systemic lines (gels, drops) are not interaction-checked and are left out.
 */
export function ddiGapNames(lines: { resolved: ResolvedBrand }[], ddi: DdiIndex, resolver: Resolver): string[] {
  const ids = new Set<string>()
  for (const { resolved } of lines) {
    if (resolved.systemic === false) continue
    for (const i of resolved.ingredients) ids.add(i.id)
  }
  return [...ids]
    .filter((id) => !ddi.covers(id))
    .map((id) => resolver.ingredient(id)?.name ?? id)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Names of the totalled ingredients that no daily limit was applied to. Their totals are shown but never compared with a
 * maximum, so "no dose alert" means "not checked" for these. Several ledgers (history windows) are merged.
 */
export function limitGapNames(ledgers: Ledger[], resolver: Resolver): string[] {
  const ids = new Set<string>()
  const limited = new Set<string>()
  for (const ledger of ledgers) {
    for (const [id, entry] of Object.entries(ledger)) {
      if (entry.total_mg_day <= 0) continue
      ids.add(id)
      if (entry.limit_mg_day !== undefined) limited.add(id)
    }
  }
  return [...ids]
    .filter((id) => !limited.has(id))
    .map((id) => resolver.ingredient(id)?.name ?? id)
    .sort((a, b) => a.localeCompare(b))
}
