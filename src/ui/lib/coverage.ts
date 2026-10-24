import type { ResolvedBrand } from '../../engine/contracts'
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
