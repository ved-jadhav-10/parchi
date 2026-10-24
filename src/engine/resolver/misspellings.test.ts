// Brand-resolution accuracy on misspellings (PS_ANALYSIS section 7 metric).
import { describe, it, expect } from 'vitest'
import fixture from './fixtures/misspellings.json'
import { rawData, testResolver } from './testing'

const cases = fixture.cases as [string, string][]

describe('misspelling benchmark', () => {
  const r = testResolver()
  const displays = new Set(rawData.brands().brands.map((b) => b[0]))

  it('only uses brands that exist in the index (fixture integrity)', () => {
    expect(cases.map(([, want]) => want).filter((w) => !displays.has(w))).toEqual([])
  })

  const results = cases.map(([typed, want]) => ({ typed, want, got: r.resolve(typed) }))

  it('resolves at least 95% top-1 and never confidently names the wrong brand', () => {
    const wrong = results.filter((x) => x.got.brand !== x.want)
    const confidentWrong = wrong.filter((x) => x.got.brand && !x.got.needs_pharmacist)
    const accuracy = 1 - wrong.length / results.length
    const routed = results.filter((x) => x.got.needs_pharmacist).length / results.length
    console.info(
      `misspellings: top-1 ${(accuracy * 100).toFixed(1)}% of ${results.length}, ` +
        `routed to pharmacist ${(routed * 100).toFixed(1)}%` +
        (wrong.length ? `\n  misses: ${wrong.map((x) => `${x.typed} -> ${x.got.brand} (${x.got.confidence})`).join('; ')}` : ''),
    )
    expect(confidentWrong.map((x) => `${x.typed} -> ${x.got.brand}`)).toEqual([])
    expect(accuracy).toBeGreaterThanOrEqual(0.95)
  })
})
