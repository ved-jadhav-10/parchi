// HOLES H10: "does it scale?" Measured, not claimed. Runs the engine over the benchmark's 44 single prescriptions
// (repeated), then ranks a 1,000-order queue. Set SCALE_REPORT=1 to write eval/scale.json (machine and date recorded);
// the assertions are deliberately loose, so they catch an accident (an accidental O(n^2)), not a slow laptop.
import { writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { describe, expect, it } from 'vitest'
import gold from './gold.json'
import type { Patient } from '../src/engine/contracts'
import { rankQueue } from '../src/engine/history/queue'
import { realPipeline } from '../src/engine/rules/testing'

type Case = { kind: string; rx: string; patient: Patient }
const singles = (gold.cases as unknown as Case[]).filter((c) => c.kind === 'single')
const REPEATS = 5

describe('measured scale (docs/TEST_PLAN.md, H10)', () => {
  it('checks a prescription in milliseconds and ranks 1,000 orders instantly', async () => {
    const check = realPipeline()
    const times: number[] = []
    for (let r = 0; r < REPEATS; r++) {
      for (const c of singles) {
        const t0 = performance.now()
        await check(c.rx, c.patient)
        times.push(performance.now() - t0)
      }
    }
    times.sort((a, b) => a - b)
    const pct = (p: number) => times[Math.min(times.length - 1, Math.floor(p * times.length))]

    const items = Array.from({ length: 1000 }, (_, i) => ({ id: `ORD-${i}`, date: `2026-10-${String(1 + (i % 24)).padStart(2, '0')}`, priority: (i * 37) % 211, result: null }))
    const q0 = performance.now()
    const ranked = rankQueue(items)
    const rankMs = performance.now() - q0

    const report = {
      measured_on: new Date().toISOString().slice(0, 10),
      machine: `${cpus()[0]?.model.trim()} x${cpus().length}, Node ${process.version}`,
      prescriptions_checked: times.length,
      median_ms: +pct(0.5).toFixed(2),
      p95_ms: +pct(0.95).toFixed(2),
      max_ms: +times[times.length - 1].toFixed(2),
      rx_per_second_single_thread: Math.round(1000 / pct(0.5)),
      queue_orders: ranked.length,
      queue_rank_ms: +rankMs.toFixed(2),
      note: 'Engine only (brand match, sig, ledger, limits, rules) with data already loaded; excludes first data load and any network.',
    }
    if (process.env.SCALE_REPORT) writeFileSync(new URL('./scale.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')

    expect(ranked[0].priority).toBeGreaterThanOrEqual(ranked[999].priority)
    expect(report.p95_ms).toBeLessThan(500)
    expect(rankMs).toBeLessThan(500)
  })
})
