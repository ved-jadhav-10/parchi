// HOLES H7: Parchi informs the pharmacist and never recommends a dose or an action beyond "pharmacist to review"
// (the CDSCO "inform" position). Scans every piece of policy text that can reach the screen, and the alerts of the demo
// prescription. A phrase on the blocklist fails the build, so new wording cannot slip past review.
import { describe, expect, it } from 'vitest'
import demo from '../../../tests/fixtures/demo_rx.json'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import supplementRaw from '../../../public/data/ddi_supplement.json?raw'
import type { Patient } from '../contracts'
import { realPipeline } from './testing'

const DOSE_ADVICE =
  /\b(halv\w*|doubl\w*|reduc\w+ the dose|lower the dose|increas\w+ the dose|titrat\w+|start (at|with)|leave \d+ hours|space (the )?doses|give |should (be )?(take|giv|use|start|stop)|do not exceed|stop (when|taking|using)|usually needs|dose (to|of) \d|lowest dose|take (it|them) (with|after|before))\b/i

const rules = JSON.parse(rulesRaw)
const supplement = JSON.parse(supplementRaw)

const policyTexts: [string, string][] = [
  ...(['patient_rules', 'stack_rules', 'burden_scales', 'suppression', 'pregnancy_rules'] as const).flatMap((sec) =>
    (rules[sec] as { id: string; reason?: string }[]).filter((r) => r.reason).map((r): [string, string] => [`${sec}:${r.id}`, r.reason!]),
  ),
  ...(Object.entries(rules.allergy_groups) as [string, { cross?: { note: string } }][]).flatMap(([k, g]): [string, string][] => (g.cross ? [[`allergy cross-reaction:${k}`, g.cross.note]] : [])),
  ...(supplement.rules as { id: string; note: string }[]).map((r): [string, string] => [`curated interaction:${r.id}`, r.note]),
]

describe('alert wording never recommends a dose', () => {
  it.each(policyTexts)('%s', (_where, text) => {
    expect(text).not.toMatch(DOSE_ADVICE)
  })

  it('every patient, stacking and pregnancy rule hands the decision to the pharmacist', () => {
    for (const r of [...rules.patient_rules, ...rules.stack_rules, ...rules.pregnancy_rules] as { id: string; reason: string }[]) {
      expect(r.reason, r.id).toMatch(/pharmacist to review/i)
    }
  })

  it('the demo prescription raises no alert that recommends a dose', async () => {
    const { alerts } = await realPipeline()(demo.rx_text, demo.patient as Patient)
    expect(alerts.length).toBeGreaterThan(3)
    for (const a of alerts) expect(a.reason, a.type).not.toMatch(DOSE_ADVICE)
  })
})

describe('nothing internal reaches the screen', () => {
  const INTERNAL = /FIX_PLAN|limits\.json|alert_rules|ddi_supplement|TODO|n\/a mL/i

  it.each(policyTexts)('%s', (_where, text) => {
    expect(text).not.toMatch(INTERNAL)
  })

  it('source lines in the policy file carry no plan or file names', () => {
    const sources: string[] = []
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk)
      else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) (k === 'source' && typeof v === 'string' ? sources.push(v) : walk(v))
    }
    walk(rules)
    expect(sources.length).toBeGreaterThan(40)
    for (const s of sources) expect(s, s).not.toMatch(INTERNAL)
  })

  it('a two-NSAID alert without a creatinine does not print "CrCl n/a"', async () => {
    const { alerts } = await realPipeline()('Zerodol-P BD; Brufen 400 TDS', { age_years: 68 })
    const a = alerts.find((x) => x.type === 'nsaid_double_high_risk')!
    expect(a.reason).toContain('(age 68)')
    expect(a.reason).not.toMatch(/n\/a|CrCl/)
  })
})
