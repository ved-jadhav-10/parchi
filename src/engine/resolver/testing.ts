// Test helper: builds a resolver from the committed public/data files without fetch.
// `?raw` keeps tsc from type-inferring a 1 MB JSON literal.
import brandsRaw from '../../../public/data/brands.json?raw'
import ingredientsRaw from '../../../public/data/ingredients.json?raw'
import bannedRaw from '../../../public/data/banned_fdc.json?raw'
import nsqRaw from '../../../public/data/nsq.json?raw'
import { createResolver, type Resolver } from './index'
import { decodeData, type BannedJson, type BrandsJson, type IngredientsJson, type NsqJson } from './data'

let resolver: Resolver | null = null

export const rawData = {
  brands: () => JSON.parse(brandsRaw) as BrandsJson,
  ingredients: () => JSON.parse(ingredientsRaw) as IngredientsJson,
  banned: () => JSON.parse(bannedRaw) as BannedJson,
  nsq: () => JSON.parse(nsqRaw) as NsqJson,
}

export function testResolver(): Resolver {
  resolver ??= createResolver(decodeData(rawData.brands(), rawData.ingredients(), rawData.banned(), rawData.nsq()))
  return resolver
}
