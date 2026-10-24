// What the catalogue screen shows, derived from the items alone, so a confirmation updates the counts and the review list the same way
// every time. The matching itself is the engine's (src/engine/resolver/catalogue.ts).
import type { CatalogueItem } from '../../engine/resolver/catalogue'
import { toCsv } from './csv'
import { ingredientLabel } from './resolved'

/** What is kept on this device: the items as matched (and as confirmed since), with where they came from. */
export interface CatalogueRecord {
  savedAt: string
  fileName: string
  /** Which CSV header was used for each field, so the buyer can check the mapping */
  columns: Record<string, string>
  warnings: string[]
  items: CatalogueItem[]
}

export interface CatalogueSummary {
  rows: number
  matched: number
  review: number
  unmatched: number
  /** Items needing a look, most urgent first */
  queue: CatalogueItem[]
}

export function summarise(items: CatalogueItem[]): CatalogueSummary {
  const queue = items.filter((i) => i.status !== 'confirmed').sort((a, b) => a.priority - b.priority || a.row - b.row)
  return {
    rows: items.length,
    matched: items.filter((i) => i.status === 'confirmed').length,
    review: items.filter((i) => i.status === 'review').length,
    unmatched: items.filter((i) => i.status === 'unmatched').length,
    queue,
  }
}

/** Replace one item (by its CSV row) after a pharmacist confirmed it; the others stay as they were. */
export const replaceItem = (items: CatalogueItem[], next: CatalogueItem): CatalogueItem[] => items.map((i) => (i.row === next.row ? next : i))

const STATUS_WORD = { confirmed: 'matched', review: 'to review', unmatched: 'not recognised' } as const

/** The catalogue as the buyer gets it back: every row with its status, composition, and whether a pharmacist confirmed it. */
export function catalogueCsv(items: CatalogueItem[]): string {
  return toCsv(
    ['row', 'sku', 'name', 'price', 'in_stock', 'status', 'confirmed_by_pharmacist', 'composition', 'to_check'],
    items.map((i) => ({
      row: i.row,
      sku: i.sku ?? '',
      name: i.name,
      price: i.price ?? '',
      in_stock: i.in_stock === undefined ? '' : i.in_stock ? 'yes' : 'no',
      status: STATUS_WORD[i.status],
      confirmed_by_pharmacist: i.pharmacist_confirmed ? 'yes' : '',
      composition: i.resolved.ingredients.map(ingredientLabel).join(' + '),
      to_check: i.reasons.join('; '),
    })),
  )
}
