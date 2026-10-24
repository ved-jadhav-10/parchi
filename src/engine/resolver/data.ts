// Decoders for public/data/*.json (written by data/build.py; format in docs/track-a-data.md).
import type { Ingredient, Route } from '../contracts'

type CompEntry = [number, number] | [number, number, number | null] | [number, number, null, string, number?]

export interface BrandsJson {
  schema: number
  forms: string[]
  form_route: Record<string, string>
  systemic_routes: string[]
  flag_bits: { discontinued: number; composition_incomplete: number; curated: number }
  ingredients: string[]
  compositions: CompEntry[][]
  brands: [string, number, number, number, number][]
  curated: Record<string, CuratedMeta>
}

export interface CuratedMeta {
  source: string
  checked_on: string
  pharmacist_approved: boolean
  aliases: string[]
  notes: string
}

export interface IngredientInfo {
  name: string
  curated: boolean
  atc?: string[]
  classes?: string[]
}

export interface IngredientsJson {
  schema: number
  ingredients: Record<string, IngredientInfo>
  aliases: Record<string, string>
  normalise: { salt_words: string[]; inorganic_bases: string[] }
  examples: [string, string | null][]
}

export interface BannedEntry {
  so: string
  date: string
  list: string
  text: string
  ingredients: string[]
  strengths_mg?: Record<string, number>
  form?: string
}

export interface BannedJson {
  schema: number
  excipient_like: string[]
  form_rules: Record<string, { routes?: string[]; forms?: string[] }>
  entries: BannedEntry[]
}

/** One product variant (a brand name in one dosage form). */
export interface BrandRecord {
  index: number
  display: string
  composition: number
  ingredients: Ingredient[]
  form: string
  route: Route
  discontinued: boolean
  complete: boolean
  curated?: CuratedMeta
  /** 0 = among the 50 most popular in its letter of the source listing ... 3 = long tail */
  tier: number
}

export interface ResolverData {
  brands: BrandRecord[]
  ingredients: IngredientsJson
  banned: BannedJson
  systemicRoutes: Set<string>
}

function decodeIngredient(entry: CompEntry, ids: string[]): Ingredient {
  const [i, mg, perMl, unit, amount] = entry as [number, number, number | null | undefined, string?, number?]
  const out: Ingredient = { id: ids[i], mg }
  if (perMl != null) out.per_volume_ml = perMl
  if (unit === '?') out.strength_unknown = true
  else if (unit) out.other_unit = { unit, amount: amount ?? 0 }
  return out
}

export function decodeData(brandsJson: BrandsJson, ingredientsJson: IngredientsJson, bannedJson: BannedJson): ResolverData {
  if (brandsJson.schema !== 1 || ingredientsJson.schema !== 1 || bannedJson.schema !== 1) {
    throw new Error('Unsupported data schema; rebuild public/data with data/build.py')
  }
  const comps = brandsJson.compositions.map((c) => c.map((e) => decodeIngredient(e, brandsJson.ingredients)))
  const bits = brandsJson.flag_bits
  const brands = brandsJson.brands.map(([display, ci, fi, flags, tier], index): BrandRecord => {
    const form = brandsJson.forms[fi]
    const rec: BrandRecord = {
      index,
      display,
      composition: ci,
      ingredients: comps[ci],
      form,
      route: (brandsJson.form_route[form] ?? 'other') as Route,
      discontinued: (flags & bits.discontinued) !== 0,
      complete: (flags & bits.composition_incomplete) === 0,
      tier,
    }
    if (flags & bits.curated) rec.curated = brandsJson.curated[String(index)]
    return rec
  })
  return { brands, ingredients: ingredientsJson, banned: bannedJson, systemicRoutes: new Set(brandsJson.systemic_routes) }
}

/** Browser loader: the three files are precached by the service worker, so this works offline. */
export async function fetchResolverData(baseUrl: string): Promise<ResolverData> {
  const get = async <T,>(name: string): Promise<T> => {
    const res = await fetch(`${baseUrl}${name}`)
    if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`)
    return (await res.json()) as T
  }
  const [b, i, f] = await Promise.all([
    get<BrandsJson>('brands.json'),
    get<IngredientsJson>('ingredients.json'),
    get<BannedJson>('banned_fdc.json'),
  ])
  return decodeData(b, i, f)
}
