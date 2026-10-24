// FIX_PLAN Phase 1 on realistic prescriptions: the danger comes from different compositions prescribed together
// (often hidden inside a combination brand), not from one molecule under two names. Real engine, real data.
import { describe, expect, it } from 'vitest'
import type { Alert, Patient } from '../contracts'
import { realPipeline } from './testing'

const check = realPipeline()
const run = async (rx: string, patient: Patient) => (await check(rx, patient)).alerts
const tierOf = (alerts: Alert[], type: string) => alerts.find((a) => a.type === type)?.tier
const stops = (alerts: Alert[]) => alerts.filter((a) => a.tier === 'interrupt').map((a) => a.type).sort()

const adult: Patient = { age_years: 45, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }

describe('contraindicated pairs interrupt (FIX_PLAN 1.1)', () => {
  it('nitrate + sildenafil (Sorbitrate + Manforce) stops the pharmacist', async () => {
    const alerts = await run('Sorbitrate 5 SOS; Manforce 50mg SOS', { ...adult, age_years: 58 })
    const ddi = alerts.find((a) => a.type === 'ddi')!
    expect(ddi.tier).toBe('interrupt')
    expect(ddi.ingredients.sort()).toEqual(['isosorbide_dinitrate', 'sildenafil'])
  })

  it('colchicine + the clarithromycin hidden in an H. pylori kit (Zycolchin + Pylokit) stops the pharmacist', async () => {
    const alerts = await run('Zycolchin BD; Pylokit BD x14d', { ...adult, age_years: 60 })
    const ddi = alerts.find((a) => a.type === 'ddi' && a.ingredients.includes('colchicine'))!
    expect(ddi.tier).toBe('interrupt')
    expect(ddi.ingredients).toContain('clarithromycin')
  })

  it('weekly methotrexate + co-trimoxazole (Folitrax + Septran DS) stops the pharmacist', async () => {
    const alerts = await run('Folitrax 7.5 once weekly; Septran DS BD x7d', { ...adult, age_years: 52, sex: 'F' })
    expect(alerts.some((a) => a.type === 'ddi' && a.tier === 'interrupt' && a.ingredients.includes('methotrexate'))).toBe(true)
  })

  it('a DDInter "major" that is not a contraindication stays a note (clopidogrel + omeprazole)', async () => {
    const alerts = await run('Clopikind 75 OD; Omez 20 OD', { ...adult, age_years: 62 })
    expect(tierOf(alerts, 'ddi')).toBe('inform')
  })
})

describe('the budget never hides a contraindication (FIX_PLAN 1.2)', () => {
  it('keeps every stop on a slip with several serious problems', async () => {
    const alerts = await run('Sorbitrate 5 SOS; Manforce 50mg SOS; Folitrax 7.5 OD; Septran DS BD x7d; Dolo 650 QID; Calpol 500 TDS', adult)
    const s = stops(alerts)
    expect(s.filter((t) => t === 'ddi').length).toBeGreaterThanOrEqual(2)
    expect(s).toContain('schedule_mismatch')
    expect(alerts.filter((a) => a.tier === 'interrupt').every((a) => !a.budget_demoted)).toBe(true)
  })
})

describe('kidney bands match the limits file (FIX_PLAN 1.3)', () => {
  it('one NSAID in a 70-year-old with a normal creatinine (CrCl ~53) is a caution, not a stop', async () => {
    const alerts = await run('Brufen 400 TDS x5d', { age_years: 70, weight_kg: 55, serum_creatinine: 1.0, sex: 'M' })
    expect(tierOf(alerts, 'nsaid_renal_caution')).toBe('inform')
    expect(stops(alerts)).toEqual([])
  })

  it('below CrCl 30 the NSAID is a stop', async () => {
    const alerts = await run('Brufen 400 TDS x5d', { age_years: 75, weight_kg: 50, serum_creatinine: 2.2, sex: 'M' })
    expect(tierOf(alerts, 'nsaid_renal')).toBe('interrupt')
    expect(alerts.some((a) => a.type === 'nsaid_renal_caution')).toBe(false)
  })
})

describe('stacking rules (FIX_PLAN 1.4)', () => {
  it('triple whammy: the diuretic inside Telma-H + the NSAID inside Hifenac-P', async () => {
    const alerts = await run('Telma H OD; Hifenac-P BD x10d', { age_years: 70, weight_kg: 52, serum_creatinine: 1.1, sex: 'F' })
    const tw = alerts.find((a) => a.type === 'triple_whammy')!
    expect(tw.tier).toBe('interrupt')
    expect(tw.ingredients).toEqual(expect.arrayContaining(['telmisartan', 'hydrochlorothiazide', 'aceclofenac']))
  })

  it('post-MI dual antiplatelets + an NSAID from the orthopaedic surgeon is a bleeding stop', async () => {
    const alerts = await run('Ecosprin-AV 75 OD; Clopikind 75 OD; Metolar 25 BD; Zerodol-P BD x7d', { ...adult, age_years: 62 })
    expect(tierOf(alerts, 'bleeding_dual_antiplatelet_nsaid')).toBe('interrupt')
    // aspirin + clopidogrel on their own is intended (dual antiplatelet therapy): no stop for that pair
    expect(alerts.some((a) => a.tier === 'interrupt' && a.type === 'ddi' && a.ingredients.includes('clopidogrel') && a.ingredients.includes('aspirin'))).toBe(false)
  })

  it('warfarin + an NSAID is a bleeding stop that replaces the plain interaction note', async () => {
    const alerts = await run('Warf 5 OD; Voveran SR 100 OD', { ...adult, age_years: 66 })
    expect(tierOf(alerts, 'bleeding_anticoagulant_nsaid')).toBe('interrupt')
    expect(alerts.some((a) => a.type === 'ddi' && a.ingredients.includes('warfarin') && a.ingredients.includes('diclofenac'))).toBe(false)
  })

  it('two NSAIDs in a healthy 30-year-old are a note; at 68 they stop', async () => {
    const young = await run('Zerodol-P BD; Brufen 400 TDS', { age_years: 30, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' })
    expect(tierOf(young, 'nsaid_double_high_risk')).toBe('inform')
    expect(young.some((a) => a.type === 'class_duplication' && a.ingredients.includes('ibuprofen'))).toBe(false)
    const old = await run('Zerodol-P BD; Brufen 400 TDS', { age_years: 68 })
    expect(tierOf(old, 'nsaid_double_high_risk')).toBe('interrupt')
  })

  it('heart failure on spironolactone + an ARB, then trimethoprim with weak kidneys: high potassium stop', async () => {
    const alerts = await run('Aldactone OD; Telma 40 OD; Septran DS BD x5d', { age_years: 72, weight_kg: 50, serum_creatinine: 2.4, sex: 'M' })
    expect(tierOf(alerts, 'hyperkalaemia_stack')).toBe('interrupt')
  })

  it('an SSRI with the tramadol in Ultracet is a serotonin note', async () => {
    const alerts = await run('Nexito 10 OD; Ultracet BD x5d', adult)
    expect(tierOf(alerts, 'serotonergic_stack')).toBe('inform')
  })

  it('three QT drugs in a 66-year-old stop; two are a note', async () => {
    const p: Patient = { age_years: 66, weight_kg: 60, serum_creatinine: 0.9, sex: 'F' }
    expect(tierOf(await run('HCQS 200 BD; Azithral 500 OD x3d; Domstal 10mg TDS', p), 'qt_stack')).toBe('interrupt')
    expect(tierOf(await run('HCQS 200 BD; Azithral 500 OD x3d', p), 'qt_stack')).toBe('inform')
  })
})

describe('busy prescriptions with nothing wrong stay quiet', () => {
  it('diabetes + blood pressure + cholesterol + aspirin: no stop', async () => {
    const alerts = await run('Glycomet 500 SR BD; Telma-AM OD; Rosuvas 10 HS; Ecosprin 75 OD', { ...adult, age_years: 58 })
    expect(stops(alerts)).toEqual([])
  })

  it('a chest infection course: no stop', async () => {
    const alerts = await run('Augmentin 625 Duo BD x5d; Dolo 650 SOS; Allegra 120mg OD; Pan 40 OD x5d', { ...adult, age_years: 30, sex: 'F' })
    expect(stops(alerts)).toEqual([])
  })
})
