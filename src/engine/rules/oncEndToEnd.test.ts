// Tier T2 (docs/TEST_PLAN.md): cases generated from an external list. The ONC panel (Phansalkar et al., JAMIA 2012;
// 19:735) picked 15 drug pairs/classes that every system should alert on; `highPriorityDdi.test.ts` only checks the pair is
// on file. This checks the pair, prescribed as two real Indian brands from our brand table, reaches an Interrupt.
// The prescription is built by script (best-known single-ingredient oral brand per ingredient), not written by hand.
import { describe, expect, it } from 'vitest'
import type { Patient } from '../contracts'
import { rawData } from '../resolver/testing'
import { realPipeline } from './testing'

// [ONC rule, ingredient a, ingredient b]: the same pairs as highPriorityDdi.test.ts that have an oral Indian brand each.
const PAIRS: [string, string, string][] = [
  ['3 amphetamine-like + MAOI', 'methylphenidate', 'selegiline'],
  ['5 febuxostat + azathioprine', 'febuxostat', 'azathioprine'],
  ['8 SSRI + MAOI', 'fluoxetine', 'selegiline'],
  ['8 SSRI + MAOI', 'escitalopram', 'rasagiline'],
  ['16 opioid + MAOI', 'tramadol', 'selegiline'],
  ['20 tricyclic + MAOI', 'amitriptyline', 'selegiline'],
  ['21 QT + QT', 'amiodarone', 'sotalol'],
  ['21 QT + QT', 'azithromycin', 'hydroxychloroquine'],
  ['21 QT + QT', 'haloperidol', 'ondansetron'],
  ['21 QT + QT', 'domperidone', 'levofloxacin'],
  ['25 statin + CYP3A4 inhibitor', 'simvastatin', 'clarithromycin'],
  ['25 statin + CYP3A4 inhibitor', 'atorvastatin', 'clarithromycin'],
  ['27 CYP3A4 inhibitor + ergot', 'ergotamine', 'clarithromycin'],
  ['28 tizanidine + CYP1A2 inhibitor', 'tizanidine', 'ciprofloxacin'],
  ['30 tranylcypromine + procarbazine', 'tranylcypromine', 'procarbazine'],
  ['31 triptan + MAOI', 'sumatriptan', 'selegiline'],
]

/** Pairs where we deliberately raise less than ONC asks for. Each needs a reason and goes on the reviewer list. */
const DEVIATIONS: Record<string, { tier: 'inform' | 'silent'; reason: string }> = {
  'azithromycin+hydroxychloroquine': { tier: 'inform', reason: 'alert-fatigue policy: two QT drugs inform, three or an antiarrhythmic pair stop (FIX_PLAN 1.4)' },
  'haloperidol+ondansetron': { tier: 'inform', reason: 'alert-fatigue policy: two QT drugs inform, three or an antiarrhythmic pair stop (FIX_PLAN 1.4)' },
  'atorvastatin+clarithromycin': { tier: 'inform', reason: 'atorvastatin labelling allows it with a dose cap (20 mg) rather than forbidding it; to verify against the label' },
}

const patient: Patient = { age_years: 45, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }
const check = realPipeline()
const data = rawData.brands()

/** The most popular single-ingredient tablet or capsule brand for an ingredient. Brand rows are [display, composition, form, flags, popularity_tier]. */
function brandFor(ingredient: string): string | undefined {
  const idx = data.ingredients.indexOf(ingredient)
  return data.brands
    .filter(([, comp, form]) => data.compositions[comp].length === 1 && data.compositions[comp][0][0] === idx && ['tablet', 'capsule'].includes(data.forms[form]))
    .sort((x, y) => x[4] - y[4])[0]?.[0]
}

describe('ONC high-priority pairs, prescribed as Indian brands, reach an Interrupt', () => {
  const cases = PAIRS.map(([rule, a, b]) => ({ rule, a, b, brandA: brandFor(a), brandB: brandFor(b) })).filter(
    (c) => c.brandA && c.brandB,
  )

  it('has real brands for most of the list', () => {
    expect(cases.length).toBeGreaterThanOrEqual(14)
  })

  it('raises the tier ONC asks for, or the deviation is written down', async () => {
    const rows: string[] = []
    const failures: string[] = []
    for (const c of cases) {
      const rx = `${c.brandA} OD; ${c.brandB} OD`
      const { alerts } = await check(rx, patient)
      const hit = alerts.filter((x) => x.ingredients.includes(c.a) && x.ingredients.includes(c.b))
      const best = hit.map((x) => x.tier).sort((p, q) => ['interrupt', 'inform', 'silent'].indexOf(p) - ['interrupt', 'inform', 'silent'].indexOf(q))[0] ?? 'none'
      const key = `${c.a}+${c.b}`
      const dev = DEVIATIONS[key]
      rows.push(`${c.rule.padEnd(36)} ${rx.padEnd(44)} ${best}${dev ? `  (deviation: ${dev.reason})` : ''}`)
      if (dev ? best !== dev.tier : best !== 'interrupt') failures.push(`${key}: got ${best}, want ${dev ? dev.tier : 'interrupt'}`)
    }
    console.info(`ONC end-to-end (${cases.length} pairs):\n${rows.join('\n')}`)
    expect(failures).toEqual([])
  })
})
