// The TS resolver must agree with the Python data pipeline that built public/data.
import { describe, it, expect } from 'vitest'
import reportCsv from '../../../data/reports/banned_fdc_matches.csv?raw'
import { createBannedIndex } from './banned'
import { decodeData } from './data'
import { canonicalize } from './normalize'
import { rawData } from './testing'

describe('ingredient canonicalisation matches data/rxdata/ingredients.py', () => {
  const ing = rawData.ingredients()
  const tables = {
    aliases: ing.aliases,
    saltWords: new Set(ing.normalise.salt_words),
    inorganicBases: new Set(ing.normalise.inorganic_bases),
  }
  it.each(ing.examples)('%s -> %s', (raw, id) => {
    expect(canonicalize(raw, tables)).toBe(id)
  })
})

describe('banned FDC detector matches the Python build report', () => {
  const data = decodeData(rawData.brands(), rawData.ingredients(), rawData.banned())
  const banned = createBannedIndex(data.banned)
  const rows = reportCsv.trim().split(/\r?\n/).slice(1).map((l) => l.split(','))
  // columns: so_number, list, brand, form, discontinued, composition_complete, popularity_tier, in_app_index
  const expected = new Set(rows.filter((r) => r[7] === 'True').map((r) => `${r[0]}|${r[2]}|${r[3]}`))

  const actual = new Set<string>()
  for (const b of data.brands) {
    if (b.curated) continue // the report covers dataset rows; curated rows replace them
    for (const hit of banned.check(b.ingredients, b.form, b.route, b.complete)) actual.add(`${hit.so}|${b.display}|${b.form}`)
  }

  it('flags every in-index product the build flagged', () => {
    expect([...expected].filter((k) => !actual.has(k))).toEqual([])
  })

  it('flags nothing the build did not', () => {
    expect([...actual].filter((k) => !expected.has(k))).toEqual([])
  })

  it('actually finds banned products in the index', () => {
    expect(expected.size).toBeGreaterThan(50)
  })
})
