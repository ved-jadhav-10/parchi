// External check: our brand index against an independent 2025 list of Indian brands (Eka.Care, MIT).
// The typo tests only misspell brands that are in the index; real input also has brands the 2022 index lacks,
// and the nearest name in the index is then often a different medicine. This measures that open-set case.
import { describe, it, expect } from 'vitest'
import fixture from './fixtures/ekacare_brands.json'
import { testResolver } from './testing'

describe('independent 2025 brand list (Eka.Care)', () => {
  const r = testResolver()
  const rows = (fixture.brands as [string, string][]).flatMap(([brand, composition]) => {
    const ids = composition.split('+').map((p) => r.canonicalId(p.trim()))
    // Rows naming something we have no ingredient id for ("multivitamin", "ayurvedic medicine") cannot be compared.
    return ids.every((x): x is string => x !== null) ? [{ brand, want: new Set(ids) }] : []
  })
  const results = rows.map((x) => ({ ...x, got: r.resolve(x.brand) }))
  const named = results.filter((x) => x.got.ingredients.length > 0)
  const same = (x: (typeof results)[number]) => x.got.ingredients.length === x.want.size && x.got.ingredients.every((i) => x.want.has(i.id))
  const confidentMismatch = named.filter((x) => !same(x) && !x.got.needs_pharmacist)

  it('reports agreement, and almost never names a different composition without asking the pharmacist', () => {
    const agree = named.filter(same).length
    console.info(
      `eka.care: ${rows.length} comparable brands, ${named.length} named (${((named.length / rows.length) * 100).toFixed(0)}%), ` +
        `same composition ${agree} (${((agree / named.length) * 100).toFixed(0)}% of named), ` +
        `confident mismatch ${confidentMismatch.length} (${((confidentMismatch.length / named.length) * 100).toFixed(1)}%)` +
        `\n  ${confidentMismatch.map((x) => `${x.brand} -> ${x.got.brand}`).join('; ')}`,
    )
    expect(rows.length).toBeGreaterThan(800)
    // Before the open-set guard: 73 of 631 (11.6%). What is left is one-letter look-alikes (Aritep/Aricep) and
    // exact names whose listing differs; those need the strip, not the name.
    expect(confidentMismatch.length / named.length).toBeLessThanOrEqual(0.02)
  })

  it('leaves brands it does not know out of the totals instead of guessing', () => {
    for (const x of results.filter((y) => y.got.match === 'none')) expect(x.got.ingredients).toEqual([])
  })

  it('asks when the words after the brand differ ("Plus", "MD", "D" usually add an ingredient)', () => {
    for (const typed of ['Zoryl-MD 1/1000 Tablet', 'Fluskin Plus Ointment', 'Sildoo D Plus 4mg Capsules', 'Ketofast Forte Cream']) {
      const got = r.resolve(typed)
      expect(got.needs_pharmacist, typed).toBe(true)
      expect(got.notes?.[0], typed).toMatch(/different composition/)
    }
  })

  it('asks when the brand word differs in its first letter or by more than one typo', () => {
    for (const typed of ['Loranxit 0.5 Tablet', 'Trymosin Plus Tablet', 'Seralite D Tablet', 'Ferocan 200 Tablet', 'Mefcam P Syrup']) {
      expect(r.resolve(typed).needs_pharmacist, typed).toBe(true)
    }
  })
})
