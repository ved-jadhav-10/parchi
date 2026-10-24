// Curated interactions that say how a pair interacts: one drug weakening another (clopidogrel + omeprazole,
// ibuprofen + low-dose aspirin, antibiotics with calcium) and timolol eye drops, which count although they are not
// systemic. Every rule quotes its US FDA label; data/tests/test_ddi_evidence.py checks the quotes word for word.
import { describe, expect, it } from 'vitest'
import type { Alert } from '../contracts'
import { realPipeline } from './testing'

const check = realPipeline()
const adult = { age_years: 45, weight_kg: 70, serum_creatinine: 0.9, sex: 'F' as const }
const ddiOf = async (rx: string) => (await check(rx, adult)).alerts.filter((a) => a.type === 'ddi')
const pair = (alerts: Alert[], a: string, b: string) => alerts.find((x) => x.ingredients.includes(a) && x.ingredients.includes(b))

describe('interactions where one drug weakens another', () => {
  it('clopidogrel + omeprazole says clopidogrel is the one weakened (Inform: the label says avoid, not contraindicated)', async () => {
    const a = pair(await ddiOf('Clopitab OD; Omez OD'), 'clopidogrel', 'omeprazole')!
    expect(a.tier).toBe('inform')
    expect(a.interaction_effect).toBe('reduces_effect')
    expect(a.reduces).toEqual(['clopidogrel'])
    expect(a.mechanism).toBe('activation_blocked')
    expect(a.reason).toMatch(/^Omeprazole may reduce the effect of Clopidogrel/)
    // DDInter lists the pair at the same level, so its id stays the source chip and the label rides along.
    expect(a.source).toMatch(/^DDInter\d+ \/ DDInter\d+$/)
    expect(a.label_source).toContain('0078fb3d-3595-4ae1-a059-1d5e81c879cf')
    expect(a.approved).toBe(false)
  })

  it('ibuprofen + low-dose aspirin names aspirin as the drug losing effect, as an Inform', async () => {
    const a = pair(await ddiOf('Brufen 400 TDS; Ecosprin 75 OD'), 'ibuprofen', 'aspirin')!
    expect(a.tier).toBe('inform')
    expect(a.reduces).toEqual(['aspirin'])
    expect(a.reason).toContain('may reduce the effect of Aspirin')
  })

  it('calcium with ciprofloxacin is shown (Inform), not left in the silent log', async () => {
    const a = pair(await ddiOf('Ciplox 500 BD; Gemcal-DS OD'), 'ciprofloxacin', 'calcium_carbonate')!
    expect(a.tier).toBe('inform')
    expect(a.mechanism).toBe('absorption_blocked')
    expect(a.reduces).toEqual(['ciprofloxacin'])
  })

  it('carbamazepine lowers paracetamol (label: decreased levels of acetaminophen)', async () => {
    const a = pair(await ddiOf('Tegretol 100mg BD; Dolo 650 TDS'), 'carbamazepine', 'paracetamol')!
    expect(a.reduces).toEqual(['paracetamol'])
    expect(a.mechanism).toBe('faster_breakdown')
  })
})

describe('timolol eye drops', () => {
  it('count against a reliever inhaler although eye drops are not systemic', async () => {
    const a = pair(await ddiOf('Timolet Eye 1 drop BD; Asthalin 2 puffs SOS'), 'timolol', 'salbutamol')
    expect(a).toBeDefined()
    expect(a!.reduces).toEqual(['salbutamol'])
  })

  it('add to an oral beta-blocker', async () => {
    const a = pair(await ddiOf('Timolet Eye 1 drop BD; Metolar 25 OD'), 'timolol', 'metoprolol')
    expect(a?.interaction_effect).toBe('adds_effect')
  })

  it('do not join DDInter pairs that no rule allows for eye drops', async () => {
    expect(await ddiOf('Timolet Eye 1 drop BD; Dolo 650 TDS')).toEqual([])
  })
})
