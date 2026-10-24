import { describe, expect, it } from 'vitest'
import { confirmItem, importCatalogue } from '../../engine/resolver/catalogue'
import { testResolver } from '../../engine/resolver/testing'
import { catalogueCsv, replaceItem, summarise } from './catalogueState'

const resolver = testResolver()
const csv = ['name,sku,mrp,stock,composition', 'Dolo 650,A1,30,10,', 'Vexalto 10,B2,120,5,', 'Qzxjv Forte,C3,10,0,'].join('\n')

describe('catalogue summary', () => {
  it('counts matched, review and unrecognised, with the most urgent first', () => {
    const imp = importCatalogue(csv, resolver)
    const s = summarise(imp.items)
    expect(s.rows).toBe(3)
    expect(s.matched + s.review + s.unmatched).toBe(3)
    expect(s.queue.length).toBe(s.review + s.unmatched)
    for (let i = 1; i < s.queue.length; i++) expect(s.queue[i - 1].priority).toBeLessThanOrEqual(s.queue[i].priority)
  })

  it('moves an item out of the review list once a pharmacist confirms it, and leaves the rest', () => {
    const imp = importCatalogue(csv, resolver)
    const before = summarise(imp.items)
    const target = before.queue.find((i) => i.resolved.proposed_composition || i.resolved.ingredients.length > 0)
    expect(target, 'one item can be confirmed').toBeDefined()
    const after = summarise(replaceItem(imp.items, confirmItem(target!)))
    expect(after.queue.length).toBe(before.queue.length - 1)
    expect(after.matched).toBe(before.matched + 1)
    expect(after.rows).toBe(before.rows)
  })
})

describe('catalogueCsv', () => {
  it('gives back every row with its status and composition', () => {
    const imp = importCatalogue(csv, resolver)
    const out = catalogueCsv(imp.items).split('\r\n')
    expect(out[0]).toBe('row,sku,name,price,in_stock,status,confirmed_by_pharmacist,composition,to_check')
    expect(out).toHaveLength(4)
    expect(out[1]).toContain('Dolo 650')
    expect(out[1]).toMatch(/matched/)
  })
})
