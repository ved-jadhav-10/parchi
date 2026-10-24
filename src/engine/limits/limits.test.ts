import { describe, it, expect } from 'vitest'
import type { Ledger, Patient } from '../contracts'
import { LIMITS, applyLimits, cockcroftGault, neededInputs, sosCapFor } from './index'

const demo: Patient = { age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'M' }
const entry = (total: number, extra: Record<string, unknown> = {}) => ({ total_mg_day: total, sources: ['x'], ...extra })

describe('Cockcroft-Gault', () => {
  it('matches the hand calculation for the demo patient (about 34 mL/min)', () => {
    // (140 - 68) x 55 / (72 x 1.6) = 34.375
    expect(cockcroftGault(demo).value).toBe(34.4)
  })
  it('applies the 0.85 factor for women', () => {
    expect(cockcroftGault({ ...demo, sex: 'F' }).value).toBe(29.2) // 34.375 x 0.85
  })
  it('says exactly which inputs are missing', () => {
    expect(cockcroftGault({ age_years: 68 })).toEqual({ value: null, missing: ['weight_kg', 'serum_creatinine', 'sex'] })
    expect(cockcroftGault({ age_years: 68, weight_kg: 55, sex: 'M' }).missing).toEqual(['serum_creatinine'])
  })
  it('is not calculated for children and never goes negative', () => {
    expect(cockcroftGault({ age_years: 8, weight_kg: 25, serum_creatinine: 0.5, sex: 'M' }).value).toBeNull()
    expect(cockcroftGault({ age_years: 150, weight_kg: 50, serum_creatinine: 1, sex: 'M' }).value).toBe(0)
  })
  it('ignores zero or negative values as missing', () => {
    expect(cockcroftGault({ ...demo, serum_creatinine: 0 }).missing).toEqual(['serum_creatinine'])
  })
})

describe('ask only when needed', () => {
  it('asks nothing when no ingredient has a kidney or weight rule', () => {
    expect(neededInputs(['pantoprazole', 'omeprazole', 'domperidone'], { age_years: 68 })).toEqual([])
  })
  it('asks for kidney inputs because an NSAID is present, and names the NSAID', () => {
    const needs = neededInputs(['paracetamol', 'ibuprofen'], { age_years: 68 })
    expect(needs.map((n) => n.field).sort()).toEqual(['serum_creatinine', 'sex', 'weight_kg'])
    expect(needs.every((n) => n.ingredients.includes('ibuprofen'))).toBe(true)
    expect(needs.find((n) => n.field === 'serum_creatinine')?.reason).toMatch(/Ibuprofen/)
  })
  it('asks only for what is still missing', () => {
    expect(neededInputs(['ibuprofen'], { age_years: 68, weight_kg: 55, sex: 'M' }).map((n) => n.field)).toEqual(['serum_creatinine'])
    expect(neededInputs(['ibuprofen'], demo)).toEqual([])
  })
  it('asks for weight for a child on a weight-dosed drug, and only then', () => {
    expect(neededInputs(['paracetamol'], { age_years: 6 }).map((n) => n.field)).toEqual(['weight_kg'])
    expect(neededInputs(['paracetamol'], { age_years: 6, weight_kg: 20 })).toEqual([])
    expect(neededInputs(['paracetamol'], { age_years: 40 })).toEqual([])
  })
  it('does not ask for kidney inputs for a child (the adult formula does not apply)', () => {
    expect(neededInputs(['ibuprofen'], { age_years: 6, weight_kg: 20 })).toEqual([])
  })
  it('lists each missing field once even when several ingredients need it', () => {
    const needs = neededInputs(['ibuprofen', 'aceclofenac', 'metformin'], { age_years: 70 })
    expect(needs.filter((n) => n.field === 'serum_creatinine')).toHaveLength(1)
    expect(needs.find((n) => n.field === 'serum_creatinine')?.ingredients).toEqual(['ibuprofen', 'aceclofenac', 'metformin'])
  })
  it('ignores ingredients the limits data does not know', () => {
    expect(neededInputs(['made-up-drug'], { age_years: 70 })).toEqual([])
  })
})

describe('applyLimits', () => {
  it('uses the adult maximum for adults', () => {
    const r = applyLimits({ paracetamol: entry(3000) }, { age_years: 40 })
    expect(r.ledger.paracetamol.limit_mg_day).toBe(4000)
    expect(r.ledger.paracetamol.limit_basis).toBe('Adult maximum')
    expect(r.findings).toEqual([])
  })
  it('uses the stricter 65+ cap and reports an over-limit finding with its source and approval status', () => {
    const r = applyLimits({ paracetamol: entry(4100, { scheduled_mg_day: 4100, sources: ['Dolo', 'Crocin', 'Zerodol-P'] }) }, demo)
    expect(r.ledger.paracetamol.limit_mg_day).toBe(3000)
    expect(r.ledger.paracetamol.limit_pharmacist_approved).toBe(false)
    const f = r.findings.find((x) => x.kind === 'over_limit')!
    expect(f).toMatchObject({ ingredient: 'paracetamol', total_mg_day: 4100, limit_mg_day: 3000, basis: 'Age 65+ cap', pharmacist_approved: false })
    expect(f.sos_dependent).toBe(false)
    expect(f.message).toMatch(/4100 mg\/day across 3 lines/)
  })
  it('does not flag a total exactly at the limit', () => {
    expect(applyLimits({ paracetamol: entry(4000) }, { age_years: 40 }).findings).toEqual([])
    expect(applyLimits({ paracetamol: entry(4000.5) }, { age_years: 40 }).findings).toHaveLength(1)
  })
  it('marks a finding sos_dependent when only the SOS worst case crosses the limit', () => {
    const r = applyLimits({ paracetamol: entry(4500, { scheduled_mg_day: 3000, sos_mg_day: 1500 }) }, { age_years: 40 })
    expect(r.findings[0]).toMatchObject({ kind: 'over_limit', sos_dependent: true })
  })
  it('reports a kidney caution for an NSAID at the demo patient CrCl, with no numeric limit change', () => {
    const r = applyLimits({ ibuprofen: entry(400) }, demo)
    const f = r.findings.find((x) => x.kind === 'renal_caution')!
    expect(f).toMatchObject({ ingredient: 'ibuprofen', crcl_ml_min: 34.4, pharmacist_approved: false })
    expect(f.basis).toBe('Kidney: CrCl 34.4 mL/min (below 60)')
    expect(r.ledger.ibuprofen.limit_mg_day).toBe(2400)
    expect(r.crcl).toBe(34.4)
  })
  it('reports "avoid" below CrCl 30 (lowest matching band wins over the caution band)', () => {
    const r = applyLimits({ ibuprofen: entry(400) }, { ...demo, serum_creatinine: 2.4 }) // CrCl 22.9
    expect(r.findings.map((f) => f.kind)).toEqual(['renal_avoid'])
  })
  it('lowers the numeric cap for a kidney band and keeps the strictest limit', () => {
    const r = applyLimits({ metformin: entry(1500) }, { ...demo, serum_creatinine: 1.4 }) // CrCl 39.3 -> band below 45
    expect(r.ledger.metformin.limit_mg_day).toBe(1000)
    expect(r.ledger.metformin.limit_basis).toMatch(/^Kidney: CrCl 39\.3/)
    expect(r.findings.map((f) => f.kind)).toEqual(['over_limit'])
  })
  it('gives no kidney findings when kidney function is fine or unknown', () => {
    expect(applyLimits({ ibuprofen: entry(400) }, { ...demo, serum_creatinine: 0.8 }).findings).toEqual([]) // CrCl 68.8
    const unknown = applyLimits({ ibuprofen: entry(400) }, { age_years: 68 })
    expect(unknown.findings).toEqual([])
    expect(unknown.crcl).toBeNull()
    expect(unknown.needs.map((n) => n.field)).toContain('serum_creatinine')
  })
  it('limits a child by weight and never above the adult maximum', () => {
    const r = applyLimits({ paracetamol: entry(1000) }, { age_years: 6, weight_kg: 20 })
    expect(r.ledger.paracetamol.limit_mg_day).toBe(1200) // 60 mg/kg/day x 20 kg
    expect(r.ledger.paracetamol.limit_basis).toBe('Paediatric 60 mg/kg/day x 20 kg')
    expect(r.findings).toEqual([])
    const heavy = applyLimits({ paracetamol: entry(1000) }, { age_years: 11, weight_kg: 90 })
    expect(heavy.ledger.paracetamol.limit_mg_day).toBe(4000) // 5,400 by weight, capped at the adult maximum
  })
  it('flags a child over their weight-based limit', () => {
    const r = applyLimits({ paracetamol: entry(2000) }, { age_years: 6, weight_kg: 20 })
    expect(r.findings[0]).toMatchObject({ kind: 'over_limit', limit_mg_day: 1200 })
  })
  it('applies no limit to a child without weight, asks for it, and does not borrow the adult limit', () => {
    const r = applyLimits({ paracetamol: entry(2000), cetirizine: entry(10) }, { age_years: 6 })
    expect(r.ledger.paracetamol.limit_mg_day).toBeUndefined()
    expect(r.findings).toEqual([])
    expect(r.needs.map((n) => n.field)).toEqual(['weight_kg'])
    expect(r.ledger.cetirizine.caveats?.[0]).toMatch(/No paediatric limit for cetirizine/)
  })
  it('leaves ingredients without limit data alone (no limit means unknown, not safe)', () => {
    const r = applyLimits({ caffeine: entry(32) }, demo)
    expect(r.ledger.caffeine).toEqual({ total_mg_day: 32, sources: ['x'] })
    expect(r.findings).toEqual([])
  })
  it('does not change the ledger it is given', () => {
    const input: Ledger = { paracetamol: entry(4100) }
    applyLimits(input, demo)
    expect(input.paracetamol.limit_mg_day).toBeUndefined()
  })
})

describe('limits data', () => {
  it('every number carries a source and a pharmacist_approved flag, and none is pre-approved', () => {
    const rules: { source?: string; pharmacist_approved?: boolean }[] = []
    for (const lim of Object.values(LIMITS.ingredients)) {
      for (const r of [lim.adult, lim.elderly, lim.paediatric, ...(lim.renal ?? [])]) if (r) rules.push(r)
    }
    for (const c of [...Object.values(LIMITS.sos.by_ingredient), ...Object.values(LIMITS.sos.by_class), LIMITS.sos.fallback]) rules.push(c)
    expect(rules.length).toBeGreaterThan(20)
    for (const r of rules) {
      expect(typeof r.source).toBe('string')
      expect(r.source!.length).toBeGreaterThan(10)
      expect(typeof r.pharmacist_approved).toBe('boolean')
      expect(r.pharmacist_approved).toBe(false)
    }
  })
  it('SOS caps fall back from ingredient to class to the default', () => {
    expect(sosCapFor('paracetamol', ['analgesic_antipyretic']).max_doses_per_day).toBe(4)
    expect(sosCapFor('diclofenac', ['nsaid']).max_doses_per_day).toBe(3)
    expect(sosCapFor('cetirizine', ['antihistamine']).source).toMatch(/Assumed/)
  })
})
