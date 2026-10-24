// The herbal and Ayurvedic check around the ordinary pipeline (src/engine/herbal/orchestrate.ts): herbal lines are taken out of
// the text first, so the ordinary resolver never guesses a drug for them ("Triphala churna" is not an inhaler).
import type { HerbalDeps } from '../../engine/herbal/orchestrate'
import type { Resolver } from '../../engine/resolver'

/** The same two facts the check API gives it: is this exactly a known brand, and which classes does an ingredient belong to. */
export const herbalDepsFor = (resolver: Resolver): HerbalDeps => ({
  isKnownBrand: (brand) => resolver.resolve(brand).confidence >= 0.97,
  classesOf: (id) => resolver.ingredient(id)?.classes,
})
