// Held-out robustness check: seeded single-edit typos of every top-tier oral brand.
// Complements the hand-written misspellings fixture, which the matcher was tuned on.
import { describe, it, expect } from 'vitest'
import { parseName } from './normalize'
import { rawData, testResolver } from './testing'

function seeded(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

describe('held-out synthetic typos', () => {
  it('stays accurate and almost never confidently names a different medicine', () => {
    const r = testResolver()
    const b = rawData.brands()
    const idsOf = (ci: number) => b.compositions[ci].map((c) => b.ingredients[c[0]]).sort().join('|')
    const realCompacts = new Set(b.brands.map((x) => parseName(x[0]).compact))
    const popularSolids = b.brands.filter((x) => x[4] === 0 && ['tablet', 'capsule'].includes(b.forms[x[2]]) && !(x[3] & 1))
    const rand = seeded(42)
    let n = 0, top1 = 0, routed = 0, confidentWrong = 0
    const t0 = performance.now()
    for (const [display, ci] of popularSolids) {
      const w = parseName(display).tokens[0]
      if (!w || w.length < 5) continue
      const i = 1 + Math.floor(rand() * (w.length - 2))
      const typo = [
        w.slice(0, i) + w.slice(i + 1), // deletion
        w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2), // transposition
        w.slice(0, i) + w[i] + w.slice(i), // doubled letter
      ][Math.floor(rand() * 3)]
      const typed = display.toLowerCase().replace(w, typo)
      if (typo === w || realCompacts.has(parseName(typed).compact)) continue // spells another real brand
      n++
      const got = r.resolve(typed)
      if (got.needs_pharmacist) routed++
      if (got.brand === display) top1++
      else if (got.brand && !got.needs_pharmacist && got.ingredients.map((x) => x.id).sort().join('|') !== idsOf(ci)) confidentWrong++
    }
    const ms = (performance.now() - t0) / n
    console.info(`held-out typos: n=${n} top-1 ${((top1 / n) * 100).toFixed(1)}%, routed ${((routed / n) * 100).toFixed(1)}%, ` +
      `confident-wrong ${((confidentWrong / n) * 100).toFixed(2)}%, ${ms.toFixed(2)} ms/resolve`)
    expect(n).toBeGreaterThan(500)
    expect(top1 / n).toBeGreaterThanOrEqual(0.95)
    expect(confidentWrong / n).toBeLessThanOrEqual(0.005)
  })
})
