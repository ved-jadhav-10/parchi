// CDSCO NSQ / spurious alerts, matched to a resolved brand by brand name (not by ingredient).
// A failed batch says nothing about other batches, so a hit only tells the pharmacist which strip to check.
import type { Ingredient, NsqRef } from '../contracts'
import type { NsqJson } from './data'
import { parseName } from './normalize'

export interface NsqIndex {
  /** Alerts for this brand name; ones naming a strength are kept only if it fits the resolved product. */
  check(brand: string, ingredients: Ingredient[]): NsqRef[]
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-6, 0.005 * Math.max(a, b))
}

/** Identity of a brand name without strengths or dosage-form words: "Alzomac-0.5 Tablets" -> "alzomac". */
function nameKey(name: string): string {
  return parseName(name).tokens.join(' ')
}

export function createNsqIndex(nsq: NsqJson | undefined): NsqIndex {
  const byBrand = new Map<string, { ref: NsqRef; numbers: number[] }[]>()
  if (nsq) {
    const col = Object.fromEntries(nsq.columns.map((c, i) => [c, i]))
    const text = (row: (string | number | null)[], c: string) => String(row[col[c]] ?? '')
    for (const row of nsq.entries) {
      const brand = text(row, 'brand')
      const key = brand && nameKey(brand)
      if (!key || key.replace(/ /g, '').length < 3) continue
      const ref: NsqRef = {
        batch: text(row, 'batch'),
        month: text(row, 'month'),
        result: text(row, 'result'),
        product: text(row, 'product'),
        manufacturer: text(row, 'manufacturer'),
        spurious: row[col.spurious] === 1,
      }
      const entry = { ref, numbers: parseName(brand).numbers }
      const list = byBrand.get(key)
      if (list) list.push(entry)
      else byBrand.set(key, [entry])
    }
  }
  return {
    check(brand, ingredients) {
      const p = parseName(brand)
      const mgs = ingredients.map((i) => i.mg).filter((x) => x > 0)
      const have = [...p.numbers, ...mgs, ...(mgs.length > 1 ? [mgs.reduce((a, b) => a + b, 0)] : [])]
      return (byBrand.get(p.tokens.join(' ')) ?? [])
        .filter((e) => !e.numbers.length || !have.length || e.numbers.some((n) => have.some((m) => near(n, m))))
        .map((e) => e.ref)
    },
  }
}
