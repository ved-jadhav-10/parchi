// Gold-set checks and the engine runner for the benchmark.
// `npm test` validates eval/gold.json. `npm run eval:engine` (EVAL_RUN=1) also runs the engine over every case and
// writes eval/outputs/parchi.json for eval/score.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { LabResult, Patient, Prescription } from '../src/engine/contracts'
import { testResolver } from '../src/engine/resolver/testing'
import { alertRules, testDdi } from '../src/engine/rules/testing'
import { createRealEngine } from '../src/engine/wiring'

interface Expected {
  type: string
  ingredients: string[]
}
interface GoldCase {
  id: string
  kind: 'single' | 'history'
  why: string
  patient: Patient
  rx?: string
  prescriptions?: Prescription[]
  labs?: LabResult[]
  expected: Expected[]
}
interface Gold {
  meta: { alert_groups: Record<string, string[]> }
  cases: GoldCase[]
}
export interface SystemAlert {
  type: string
  tier: string
  ingredients: string[]
}

const gold = JSON.parse(readFileSync(new URL('./gold.json', import.meta.url), 'utf8')) as Gold
const resolver = testResolver()

describe('gold set', () => {
  it('has unique ids, known alert groups and canonical ingredient ids', () => {
    const ids = gold.cases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of gold.cases) {
      expect(c.kind === 'single' ? !!c.rx : !!c.prescriptions?.length, c.id).toBe(true)
      for (const x of c.expected) {
        expect(Object.keys(gold.meta.alert_groups), `${c.id} group ${x.type}`).toContain(x.type)
        for (const ing of x.ingredients) expect(resolver.ingredient(ing), `${c.id} ingredient ${ing}`).toBeDefined()
      }
    }
  })

  it('covers every group, clean prescriptions and multi-doctor histories', () => {
    const seen = new Set(gold.cases.flatMap((c) => c.expected.map((x) => x.type)))
    expect([...seen].sort()).toEqual(Object.keys(gold.meta.alert_groups).sort())
    expect(gold.cases.filter((c) => c.expected.length === 0).length).toBeGreaterThanOrEqual(8)
    expect(gold.cases.filter((c) => c.kind === 'history' && new Set(c.prescriptions!.map((p) => p.doctor)).size > 1).length).toBeGreaterThanOrEqual(6)
  })
})

describe.skipIf(!process.env.EVAL_RUN)('run the engine over the gold set', () => {
  it('writes eval/outputs/parchi.json', async () => {
    const { check, checkHistory } = createRealEngine({ resolver, ddi: testDdi(), rules: alertRules() })
    const out: Record<string, { alerts: SystemAlert[]; ms: number }> = {}
    for (const c of gold.cases) {
      const t0 = performance.now()
      const alerts =
        c.kind === 'single'
          ? (await check(c.rx!, c.patient)).alerts
          : (await checkHistory(c.prescriptions!, c.patient, c.labs ?? [], { from: c.prescriptions!.map((p) => p.date).sort()[0] })).alerts
      out[c.id] = { alerts: alerts.map((a) => ({ type: a.type, tier: a.tier, ingredients: a.ingredients })), ms: Math.round((performance.now() - t0) * 100) / 100 }
    }
    mkdirSync(new URL('./outputs/', import.meta.url), { recursive: true })
    writeFileSync(new URL('./outputs/parchi.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
    expect(Object.keys(out)).toHaveLength(gold.cases.length)
  })
})
