// FIX_PLAN Phase 5: realistic multi-drug scenarios (eval/scenarios.json), run through the real engine with exact tier
// expectations. Tier T3 (docs/TEST_PLAN.md): the cases and expected answers are ours, reviewed by nobody yet, so a pass
// means "the engine does what we wrote down", not that what we wrote down is right. Set SCENARIO_REPORT=1 to write
// eval/scenarios_report.md.
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Alert, Patient, Prescription } from '../src/engine/contracts'
import { checkByPatient } from '../src/engine/history'
import { realHistory, realPipeline } from '../src/engine/rules/testing'
import data from './scenarios.json'

interface Expect { type: string; tier: string; ingredients?: string[] }
interface Scenario {
  id: string
  title: string
  realism: string
  kind: 'single' | 'history' | 'account'
  patient?: Patient
  rx?: string
  prescriptions?: Prescription[]
  asOf?: string
  patients?: Record<string, Patient>
  fallback?: Patient
  pregnancy?: 'yes' | 'no' | 'unknown'
  expect: Expect[]
  interrupts: string[]
  forbid: string[]
  clean?: boolean
  question?: boolean
}
const scenarios = data.scenarios as unknown as Scenario[]
const single = realPipeline()
const history = realHistory()

async function alertsFor(s: Scenario): Promise<Alert[]> {
  const patient = { ...s.patient, ...(s.pregnancy ? { pregnancy: s.pregnancy } : {}) } as Patient
  if (s.kind === 'single') return (await single(s.rx!, patient)).alerts
  if (s.kind === 'history') return (await history(s.prescriptions!, patient, [], { asOf: s.asOf, from: s.prescriptions![0].date })).alerts
  const key = (l: string) => l.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim()
  const byName = new Map(Object.entries(s.patients!).map(([n, p]) => [key(n), p]))
  const account = await checkByPatient(history, s.prescriptions!, (l) => byName.get(key(l)), s.fallback!, [], {})
  return [...account.alerts, ...account.patients.flatMap((p) => p.result.alerts)]
}

const sharesIngredient = (a: Alert, want?: string[]) => !want || want.some((id) => a.ingredients.includes(id))

describe('realistic scenarios (T3: ours, unreviewed)', () => {
  it('has the 28 planned scenarios plus the later workflow cases', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(30)
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length)
    for (const s of scenarios) expect(s.realism.length, s.id).toBeGreaterThan(20)
  })

  it.each(scenarios.map((s) => [`${s.id} ${s.title}`, s] as const))('%s', async (_name, s) => {
    const alerts = await alertsFor(s)
    for (const e of s.expect) {
      const hit = alerts.find((a) => a.type === e.type && a.tier === e.tier && sharesIngredient(a, e.ingredients))
      expect(hit, `${s.id}: expected ${e.tier} ${e.type}${e.ingredients ? ` on ${e.ingredients.join('+')}` : ''}; got ${alerts.map((a) => `${a.tier}:${a.type}:${a.ingredients.join('+')}`).join(', ') || 'nothing'}`).toBeDefined()
    }
    const stops = [...new Set(alerts.filter((a) => a.tier === 'interrupt').map((a) => a.type))].sort()
    expect(stops, `${s.id}: the exact set of Interrupts`).toEqual([...s.interrupts].sort())
    for (const type of s.forbid) expect(alerts.map((a) => a.type), `${s.id}: must not raise ${type}`).not.toContain(type)
    if (s.clean) expect(alerts.filter((a) => a.tier !== 'silent').map((a) => `${a.tier}:${a.type}`), `${s.id}: a clean prescription raised something`).toEqual([])
  })

  it('writes a report when asked', async () => {
    if (!process.env.SCENARIO_REPORT) return
    const rows: string[] = []
    let stops = 0
    for (const s of scenarios) {
      const alerts = await alertsFor(s)
      const shown = alerts.filter((a) => a.tier !== 'silent')
      stops += alerts.filter((a) => a.tier === 'interrupt').length
      rows.push(`| ${s.id} | ${s.title}${s.question ? ' (judgement call)' : ''} | ${shown.map((a) => `${a.tier === 'interrupt' ? '**STOP**' : 'note'} ${a.type}`).join('; ') || 'nothing'} |`)
    }
    writeFileSync(
      new URL('./scenarios_report.md', import.meta.url),
      `# Realistic scenarios: what the engine raises\n\nTier T3 (written by the team, not reviewed by anyone). ${scenarios.length} scenarios, ${stops} Interrupts in total, ${scenarios.filter((s) => s.clean).length} busy-but-clean cases.\nRows marked "judgement call" are listed in \`reviewer_list.md\` section H.\n\n| # | Scenario | Raised above Silent |\n|---|---|---|\n${rows.join('\n')}\n`,
    )
    expect(rows.length).toBe(scenarios.length)
  })
})
