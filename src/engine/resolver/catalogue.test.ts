import { describe, it, expect } from 'vitest'
import demoCsv from '../../../tests/fixtures/demo_catalogue.csv?raw'
import { testResolver } from './testing'
import { confirmItem, createCatalogue, importCatalogue, parseCsv } from './catalogue'

const r = testResolver()
const imp = importCatalogue(demoCsv, r)
const bySku = (sku: string) => imp.items.find((i) => i.sku === sku)!
const dolo = () => r.resolve('Dolo 650')
const caffeinePara = [{ id: 'paracetamol', mg: 500 }, { id: 'caffeine', mg: 65 }]

describe('parseCsv', () => {
  it('handles quotes, doubled quotes, embedded newlines, BOM and semicolons', () => {
    expect(parseCsv('﻿a,b\n"x, y","he said ""hi"""\n"line\nbreak",z\r\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"'], ['line\nbreak', 'z']])
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('importCatalogue on the demo catalogue', () => {
  it('maps headers and counts rows', () => {
    expect(imp.columns).toEqual({ name: 'Product Name', sku: 'SKU', composition: 'Composition', price: 'MRP', stock: 'Stock' })
    expect(imp.stats.rows).toBe(13)
    expect(imp.stats.confirmed + imp.stats.review + imp.stats.unmatched).toBe(13)
  })

  it('confirms a clean match and drops the pack size from the name', () => {
    const d = bySku('S001')
    expect(d.status).toBe('confirmed')
    expect(d.resolved.ingredients).toEqual([{ id: 'paracetamol', mg: 650 }])
    expect(d.price).toBe(30.91)
    expect(d.in_stock).toBe(true)
    expect(bySku('S003').in_stock).toBe(false)
  })

  it('proposes a composition from the catalogue text for an unknown brand, unverified', () => {
    const x = bySku('S007')
    expect(x.status).toBe('unmatched')
    expect(x.resolved.ingredients).toEqual([])
    const p = x.resolved.proposed_composition!
    expect(p.basis).toBe('buyer_composition_text')
    expect(p.unverified).toBe(true)
    expect(p.ingredients.map((i) => `${i.id}:${i.mg}`).sort()).toEqual(['caffeine:65', 'paracetamol:500'])
  })

  it('proposes from the closest name when no composition is given, with lower confidence', () => {
    const foo = bySku('S008')
    expect(foo.status).toBe('unmatched')
    const p = foo.resolved.proposed_composition
    expect(p?.basis).toBe('similar_brand_name')
    expect(p?.unverified).toBe(true)
    expect(p!.confidence).toBeLessThan(0.6)
  })

  it('sends a catalogue strength that disagrees with the database to review (Crocin Advance has no 650 mg)', () => {
    const c = bySku('S002')
    expect(c.status).toBe('review')
    expect(c.reasons.join(' ')).toContain('Catalogue strengths')
  })

  it('sends a catalogue composition that disagrees with the database to review', () => {
    const d = bySku('S009')
    expect(d.status).toBe('review')
    expect(d.priority).toBe(1)
    expect(d.reasons.join(' ')).toContain('differs from the database')
  })

  it('ranks the review list: banned FDC and disagreements before plain unknowns', () => {
    expect(imp.review.every((i) => i.status !== 'confirmed')).toBe(true)
    const pr = imp.review.map((i) => i.priority)
    expect(pr).toEqual([...pr].sort((a, b) => a - b))
    expect(bySku('S011').resolved.flags).toContain('banned_fdc')
    expect(bySku('S011').priority).toBe(0)
    expect(imp.review[0].sku).toBe('S011')
  })

  it('reports a missing name column instead of guessing', () => {
    const bad = importCatalogue('Foo,Bar\n1,2', r)
    expect(bad.items).toEqual([])
    expect(bad.warnings[0]).toContain('No product-name column')
  })

  it('reads a composition written in parentheses and a separate strength/form column', () => {
    const out = importCatalogue('Item;Strength;Form\nDolo;650;Tablet\nMystery 2 (Paracetamol 500 mg);;\n', r)
    expect(out.items[0].resolved.ingredients).toEqual([{ id: 'paracetamol', mg: 650 }])
    expect(out.items[1].resolved.proposed_composition?.ingredients).toEqual([{ id: 'paracetamol', mg: 500 }])
  })

  it('warns on duplicate SKUs and skips rows without a name', () => {
    const out = importCatalogue('SKU,Name\nA,Dolo 650\nA,Crocin 650\nB,\n', r)
    expect(out.warnings.join(' ')).toContain('SKU A appears more than once')
    expect(out.stats.skipped).toBe(1)
    expect(out.items).toHaveLength(2)
  })
})

describe('confirmItem', () => {
  it('turns a proposal into a confirmed composition and leaves the original untouched', () => {
    const x = bySku('S007')
    const c = confirmItem(x)
    expect(c.status).toBe('confirmed')
    expect(c.pharmacist_confirmed).toBe(true)
    expect(c.resolved.ingredients).toHaveLength(2)
    expect(c.resolved.proposed_composition).toBeUndefined()
    expect(x.status).toBe('unmatched')
  })

  it('refuses when there is no composition at all', () => {
    const none = importCatalogue('Name\nZzzzqx', r).items[0]
    expect(() => confirmItem(none)).toThrow(/no composition/)
  })
})

describe('alternatives from the buyer catalogue', () => {
  const cat = createCatalogue(imp.items)

  it('lists same-composition, in-stock entries cheapest first, never the product itself or out-of-stock ones', () => {
    const alts = cat.alternatives(dolo(), { referencePrice: 30.91 })
    expect(alts.map((a) => a.item.sku)).toEqual(['S013', 'S004'])
    expect(alts[0].price_diff).toBeCloseTo(-3.91, 2)
    expect(alts.some((a) => a.item.sku === 'S003')).toBe(false)
  })

  it('offers an unconfirmed composition only after a pharmacist confirmed it', () => {
    const query = { ...dolo(), brand: 'Other', ingredients: caffeinePara }
    expect(cat.alternatives(query)).toEqual([])
    const confirmed = createCatalogue(imp.items.map((i) => (i.sku === 'S007' ? confirmItem(i) : i)))
    expect(confirmed.alternatives(query).map((a) => a.item.sku)).toEqual(['S007'])
  })

  it('looks up a catalogue entry by the typed name', () => {
    expect(cat.lookup("Dolo 650mg tablet 15's")?.sku).toBe('S001')
    expect(cat.lookup('Nonexistent 5')).toBeUndefined()
  })
})

describe('proposed_composition on the resolver', () => {
  it('is set for an unknown brand and absent for a recognised one', () => {
    const foo = r.resolve('Tab Foo 250')
    expect(foo.match).toBe('none')
    expect(foo.proposed_composition?.brand).toBe('Alfoo 10mg')
    expect(foo.proposed_composition?.unverified).toBe(true)
    expect(foo.ingredients).toEqual([])
    expect(dolo().proposed_composition).toBeUndefined()
  })

  it('proposeFromComposition rejects text with an unknown part and caps confidence without a strength', () => {
    expect(r.proposeFromComposition('Paracetamol 500 + Notadrug 5')).toBeNull()
    expect(r.proposeFromComposition('Paracetamol')?.confidence).toBeLessThanOrEqual(0.5)
  })
})
