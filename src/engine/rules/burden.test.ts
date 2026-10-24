import { describe, expect, it } from 'vitest'
import type { Alert, Patient } from '../contracts'
import { realPipeline } from './testing'

const check = realPipeline()
const elder = (extra: Partial<Patient> = {}): Patient => ({ age_years: 72, weight_kg: 60, serum_creatinine: 0.9, sex: 'F', ...extra })
const types = (alerts: Alert[]) => alerts.map((a) => a.type).sort()

describe('Beers rules (65+)', () => {
  it('flags a first-generation antihistamine, a benzodiazepine and a Z-drug in an older adult as Inform', async () => {
    for (const [rx, type] of [
      ['Atarax 25 HS', 'beers_sedating_antihistamine'],
      ['Alprazolam 0.5 HS', 'beers_benzodiazepine'],
      ['Zolpidem 10 HS', 'beers_z_drug'],
    ] as const) {
      const { alerts } = await check(rx, elder())
      const a = alerts.find((x) => x.type === type)!
      expect(a, rx).toBeDefined()
      expect(a.tier).toBe('inform')
      expect(a.source).toContain('Beers')
      expect(a.approved).toBe(false)
    }
  })

  it('stays quiet below 65 and for a non-sedating antihistamine', async () => {
    expect(types((await check('Atarax 25 HS', elder({ age_years: 64 }))).alerts)).toEqual([])
    expect(types((await check('Cetzine OD', elder())).alerts)).toEqual([])
  })
})

describe('anticholinergic burden', () => {
  it('adds the scores of different drugs and alerts from 3', async () => {
    const { alerts } = await check('Atarax 25 HS; Amitriptyline 10 HS', elder())
    const a = alerts.find((x) => x.type === 'anticholinergic_burden')!
    expect(a.ingredients).toEqual(['amitriptyline', 'hydroxyzine'])
    expect(a.reason).toContain('add up to 6')
    expect(a.source).toContain('Anticholinergic Cognitive Burden')
  })

  it('needs more than one contributing drug: a single score-3 drug is left to the Beers rule', async () => {
    const { alerts } = await check('Atarax 25 HS', elder())
    expect(alerts.some((x) => x.type === 'anticholinergic_burden')).toBe(false)
  })

  it('stays quiet under the threshold and below the age cut-off', async () => {
    expect(types((await check('Alprazolam 0.5 HS; Cetzine OD', elder())).alerts)).not.toContain('anticholinergic_burden')
    const young = await check('Atarax 25 HS; Amitriptyline 10 HS', elder({ age_years: 50 }))
    expect(young.alerts.some((x) => x.type === 'anticholinergic_burden')).toBe(false)
  })
})

describe('CNS-active stacking', () => {
  it('alerts on three CNS-active drugs of different classes in an older adult', async () => {
    const { alerts } = await check('Alprazolam 0.5 HS; Zolpidem 10 HS; Tramadol 50 BD', elder())
    const a = alerts.find((x) => x.type === 'cns_stacking')!
    expect(a.ingredients).toEqual(['alprazolam', 'tramadol', 'zolpidem'])
    expect(a.tier).toBe('inform')
  })

  it('does not alert on two, or in a younger adult', async () => {
    expect(types((await check('Alprazolam 0.5 HS; Zolpidem 10 HS', elder())).alerts)).not.toContain('cns_stacking')
    expect(types((await check('Alprazolam 0.5 HS; Zolpidem 10 HS; Tramadol 50 BD', elder({ age_years: 40 }))).alerts)).not.toContain('cns_stacking')
  })
})
