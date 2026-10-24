// FIX_PLAN Phase 2: what a pharmacist asks first (allergies, pregnancy) and the inputs a real e-pharmacy has (a lab eGFR,
// no weight). Scenarios are realistic prescriptions where the problem hides inside a combination brand. Real engine, real data.
import { describe, expect, it } from 'vitest'
import type { Alert, Patient } from '../contracts'
import { parsePatient } from '../ledger/requests'
import { realPipeline } from './testing'

const check = realPipeline()
const run = async (rx: string, patient: Patient) => (await check(rx, patient)).alerts
const byType = (alerts: Alert[], type: string) => alerts.filter((a) => a.type === type)
const stops = (alerts: Alert[]) => alerts.filter((a) => a.tier === 'interrupt').map((a) => a.type).sort()

const woman: Patient = { age_years: 28, weight_kg: 58, serum_creatinine: 0.8, sex: 'F' }
const man: Patient = { age_years: 45, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }

describe('drug allergy', () => {
  it('a penicillin allergy stops on the amoxicillin hidden inside Mox-CV', async () => {
    const alerts = await run('Mox CV 625 BD x5d; Dolo 650 SOS', { ...woman, allergies: ['penicillin'] })
    const a = byType(alerts, 'allergy')[0]
    expect(a.tier).toBe('interrupt')
    expect(a.ingredients).toContain('amoxicillin')
    expect(a.brands).toEqual(['Mox CV 625'])
    expect(a.reason).toContain('recorded penicillin allergy')
  })

  it('a cephalosporin is only a note for a penicillin allergy', async () => {
    const alerts = await run('Taxim-O 200 BD x5d', { ...woman, allergies: ['Penicillin'] })
    expect(byType(alerts, 'allergy')).toHaveLength(0)
    const x = byType(alerts, 'allergy_cross')[0]
    expect(x.tier).toBe('inform')
    expect(x.ingredients).toContain('cefixime')
  })

  it('an NSAID allergy stops on the aceclofenac inside Zerodol-P, and aspirin counts as an NSAID', async () => {
    expect(stops(await run('Zerodol-P BD x5d', { ...man, allergies: ['NSAIDs'] }))).toContain('allergy')
    expect(stops(await run('Ecosprin 75 OD', { ...man, allergies: ['nsaid'] }))).toContain('allergy')
  })

  it('a sulfa allergy stops on co-trimoxazole (Septran DS)', async () => {
    expect(stops(await run('Septran DS BD x5d', { ...man, allergies: ['sulfonamide'] }))).toContain('allergy')
  })

  it('a single medicine named as an allergy stops on its brand, even an unrelated brand name', async () => {
    const alerts = await run('Augmentin 625 Duo BD x5d', { ...man, allergies: ['amoxicillin'] })
    expect(byType(alerts, 'allergy')[0].tier).toBe('interrupt')
    expect(await run('Dolo 650 TDS x3d', { ...man, allergies: ['amoxicillin'] })).toEqual([])
  })

  it('an allergy it cannot read is said out loud, never skipped', async () => {
    const alerts = await run('Dolo 650 TDS x3d', { ...man, allergies: ['penicilinn'] })
    const a = byType(alerts, 'input_needed')[0]
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain('"penicilinn" was not recognised')
  })

  it('with no allergy entered nothing is claimed either way', async () => {
    const alerts = await run('Mox CV 625 BD x5d', woman)
    expect(alerts.some((a) => a.type.startsWith('allergy'))).toBe(false)
  })

  it('an allergy to something not on the prescription raises nothing', async () => {
    expect(await run('Dolo 650 TDS x3d', { ...man, allergies: ['penicillin', 'sulfonamide'] })).toEqual([])
  })
})

describe('pregnancy', () => {
  it('an ARB in pregnancy stops (telmisartan inside Telma-AM)', async () => {
    const alerts = await run('Telma-AM OD', { ...woman, pregnancy: 'yes' })
    const a = byType(alerts, 'pregnancy')[0]
    expect(a.tier).toBe('interrupt')
    expect(a.ingredients).toContain('telmisartan')
    expect(a.source).toContain('openFDA')
  })

  it('methotrexate and warfarin stop; a statin and fluconazole are only notes', async () => {
    const stop = await run('Folitrax 7.5 once weekly; Warf 5 OD', { ...woman, pregnancy: 'yes' })
    expect(byType(stop, 'pregnancy').map((a) => a.tier)).toEqual(['interrupt', 'interrupt'])
    const note = await run('Rosuvas 10 HS; Forcan 150 stat', { ...woman, pregnancy: 'yes' })
    expect(byType(note, 'pregnancy').map((a) => a.tier)).toEqual(['inform', 'inform'])
  })

  it('asks for pregnancy status when a woman of child-bearing age has a stopping medicine and it is not entered', async () => {
    const alerts = await run('Telma-AM OD', woman)
    expect(byType(alerts, 'pregnancy')).toHaveLength(0)
    const ask = byType(alerts, 'input_needed')[0]
    expect(ask.tier).toBe('inform')
    expect(ask.reason).toContain('pregnancy status is not entered')
  })

  it('does not ask a man, a woman past 50, a child, or when pregnancy is entered as no', async () => {
    const rx = 'Telma-AM OD'
    for (const p of [man, { ...woman, age_years: 58 }, { ...woman, age_years: 10, weight_kg: 30 }, { ...woman, pregnancy: 'no' as const }]) {
      expect(byType(await run(rx, p), 'input_needed').filter((a) => a.reason.includes('pregnancy'))).toHaveLength(0)
    }
  })

  it('does not ask just because of a note-level medicine', async () => {
    expect(byType(await run('Rosuvas 10 HS', woman), 'input_needed').filter((a) => a.reason.includes('pregnancy'))).toHaveLength(0)
  })

  it('a pregnancy stop is never demoted by the alert budget', async () => {
    const alerts = await run('Telma-AM OD; Folitrax 7.5 once weekly; Warf 5 OD; Dolo 650 QID; Calpol 500 TDS', { ...woman, pregnancy: 'yes' })
    expect(alerts.filter((a) => a.type === 'pregnancy' && a.tier === 'interrupt').length).toBeGreaterThanOrEqual(3)
    expect(alerts.every((a) => !(a.type === 'pregnancy' && a.budget_demoted))).toBe(true)
  })
})

describe('kidney function from the lab eGFR', () => {
  const noWeight: Patient = { age_years: 71, sex: 'M', egfr: 40 }

  it('uses the eGFR when weight and creatinine are missing, and does not ask for them again', async () => {
    const r = await check('Glycomet 500 BD', noWeight)
    expect(r.needs).toEqual([])
    expect(r.crcl).toBe(40)
  })

  it('applies the metformin kidney cap at eGFR 40 (1,000 mg/day), and avoids it below 30', async () => {
    const over = await run('Glycomet 500 TDS', noWeight)
    expect(byType(over, 'dose_excess')[0].reason).toContain('1,000 mg/day')
    expect(stops(await run('Glycomet 500 BD', { ...noWeight, egfr: 25 }))).toContain('renal_avoid')
  })

  it('prefers Cockcroft-Gault when its inputs are all there', async () => {
    const r = await check('Glycomet 500 BD', { age_years: 71, weight_kg: 55, serum_creatinine: 1.6, sex: 'M', egfr: 80 })
    expect(r.crcl).toBeLessThan(40)
  })
})

describe('paracetamol limit follows risk, not age', () => {
  const rx = 'Dolo 650 QID; Calpol 500 OD' // 3,100 mg/day
  it('is quiet for a healthy 70-year-old, and stops with liver disease, heavy alcohol use or weight under 50 kg', async () => {
    const base: Patient = { age_years: 70, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' }
    expect(byType(await run(rx, base), 'dose_excess')).toHaveLength(0)
    for (const risk of [{ liver_disease: true }, { heavy_alcohol_use: true }, { weight_kg: 45 }]) {
      const a = byType(await run(rx, { ...base, ...risk }), 'dose_excess')[0]
      expect(a.tier, JSON.stringify(risk)).toBe('interrupt')
      expect(a.reason).toContain('lower cap:')
    }
  })
})

describe('patient request validation', () => {
  it('accepts the new optional fields', () => {
    const r = parsePatient({ age_years: 30, sex: 'F', allergies: [' penicillin '], pregnancy: 'yes', liver_disease: false, heavy_alcohol_use: true, egfr: 62 })
    expect(r).toEqual({ patient: { age_years: 30, sex: 'F', allergies: ['penicillin'], pregnancy: 'yes', liver_disease: false, heavy_alcohol_use: true, egfr: 62 } })
  })
  it.each([
    [{ allergies: 'penicillin' }, 'allergies'],
    [{ allergies: [''] }, 'allergies'],
    [{ allergies: Array(21).fill('x') }, 'allergies'],
    [{ pregnancy: 'maybe' }, 'pregnancy'],
    [{ liver_disease: 'yes' }, 'liver_disease'],
    [{ egfr: 0 }, 'egfr'],
    [{ egfr: 500 }, 'egfr'],
  ])('rejects %j', (bad, field) => {
    const r = parsePatient({ age_years: 30, ...bad })
    expect('error' in r && r.error).toContain(field)
  })
})
