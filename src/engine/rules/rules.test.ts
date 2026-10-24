import { describe, expect, it } from 'vitest'
import type { Ingredient, Ledger, Patient, ResolvedBrand } from '../contracts'
import { testResolver } from '../resolver/testing'
import { cockcroftGault } from './crcl'
import { runRules, neededInputs, type RuleContext } from './index'
import { alertRules, stubLedger, stubSig, testDdi } from './testing'

const resolver = testResolver()

function context(rx: string, patient: Patient, ledger?: Ledger): RuleContext {
  const lines = resolver.resolveText(rx, { age_years: patient.age_years }).map(({ resolved, sig_text }, index) => ({ index, resolved, sig: stubSig(sig_text) }))
  return {
    lines,
    ledger: ledger ?? stubLedger(lines),
    patient,
    ddi: testDdi(),
    config: alertRules(),
    info: (id) => ({ name: resolver.ingredient(id)?.name ?? id, classes: resolver.ingredient(id)?.classes ?? [] }),
  }
}

function fake(brand: string, ingredients: Ingredient[], extra: Partial<ResolvedBrand> = {}): ResolvedBrand {
  return { raw: brand, brand, confidence: 1, ingredients, form: 'tablet', flags: [], ...extra }
}

describe('Cockcroft-Gault', () => {
  it('gives ~34 mL/min for the demo patient', () => {
    expect(Math.round(cockcroftGault({ age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'M' })!)).toBe(34)
  })
  it('applies the 0.85 factor for women', () => {
    const m = cockcroftGault({ age_years: 60, weight_kg: 60, serum_creatinine: 1, sex: 'M' })!
    expect(cockcroftGault({ age_years: 60, weight_kg: 60, serum_creatinine: 1, sex: 'F' })).toBeCloseTo(m * 0.85, 0)
  })
  it('is null without weight, creatinine or sex, and never negative', () => {
    expect(cockcroftGault({ age_years: 60 })).toBeNull()
    expect(cockcroftGault({ age_years: 60, weight_kg: 60 })).toBeNull()
    expect(cockcroftGault({ age_years: 60, weight_kg: 60, serum_creatinine: 1 })).toBeNull()
    expect(cockcroftGault({ age_years: 150, weight_kg: 60, serum_creatinine: 1, sex: 'M' })).toBe(0)
  })
})

describe('dose rule', () => {
  it('stays quiet at exactly the limit', () => {
    const ctx = context('Dolo 650 OD', { age_years: 30 }, { paracetamol: { total_mg_day: 4000, sources: ['Dolo 650'], limit_mg_day: 4000 } })
    expect(runRules(ctx).filter((a) => a.type === 'dose_excess')).toHaveLength(0)
  })
  it('does not alert when the ledger has no limit for the ingredient (unknown is not unsafe)', () => {
    const ctx = context('Dolo 650 OD', { age_years: 30 }, { paracetamol: { total_mg_day: 9000, sources: ['Dolo 650'] } })
    expect(runRules(ctx).filter((a) => a.type === 'dose_excess')).toHaveLength(0)
  })
  it('names a single brand when one brand alone exceeds the limit', () => {
    const ctx = context('Dolo 650 OD', { age_years: 30 }, { paracetamol: { total_mg_day: 5200, sources: ['Dolo 650'], limit_mg_day: 4000 } })
    const a = runRules(ctx).find((x) => x.type === 'dose_excess')!
    expect(a.reason).toContain('from Dolo 650')
    expect(a.tier).toBe('interrupt')
  })
})

describe('non-systemic lines', () => {
  it('ignores a topical line in duplicate, class and interaction checks', () => {
    const ctx = context('Brufen 400 BD; Zerodol P BD', { age_years: 30 })
    ctx.lines[1] = { ...ctx.lines[1], resolved: { ...ctx.lines[1].resolved, systemic: false, route: 'topical' } }
    const types = runRules(ctx).map((a) => a.type)
    expect(types).not.toContain('class_duplication')
    expect(types).not.toContain('duplicate_ingredient')
  })
})

describe('class duplication', () => {
  it('does not fire for two classmates inside one brand', () => {
    const lines = [{ index: 0, resolved: fake('Combo', [{ id: 'ibuprofen', mg: 400 }, { id: 'diclofenac', mg: 50 }]), sig: stubSig('BD') }]
    const ctx = { ...context('Omez OD', { age_years: 30 }), lines, ledger: {} }
    expect(runRules(ctx).filter((a) => a.type === 'class_duplication')).toHaveLength(0)
  })
  it('fires for two classmates in two brands', () => {
    const ctx = context('Brufen 400 BD; Voveran 50 BD', { age_years: 30, weight_kg: 70, serum_creatinine: 0.8 })
    expect(runRules(ctx).filter((a) => a.type === 'class_duplication').map((a) => a.ingredients)).toEqual([['diclofenac', 'ibuprofen']])
  })
  it('does not treat aspirin as an NSAID duplicate of ibuprofen', () => {
    const ctx = context('Brufen 400 BD; Ecosprin 75 OD', { age_years: 30, weight_kg: 70, serum_creatinine: 0.8 })
    expect(runRules(ctx).filter((a) => a.type === 'class_duplication')).toHaveLength(0)
  })
})

describe('DDI rule', () => {
  it('maps a major DDInter hit to Inform and a minor one to nothing', () => {
    const ctx = context('Brufen 400 BD; Ecosprin 75 OD; Omez 20 OD', { age_years: 30, weight_kg: 70, serum_creatinine: 0.8 })
    const ddi = runRules(ctx).filter((a) => a.type === 'ddi')
    expect(ddi.map((a) => `${a.ingredients.join('+')}:${a.tier}`)).toEqual(['aspirin+ibuprofen:inform'])
  })
  it('lets the pharmacist list promote a pair to Interrupt', () => {
    const ctx = context('Brufen 400 BD; Ecosprin 75 OD', { age_years: 30, weight_kg: 70, serum_creatinine: 0.8 })
    ctx.config.ddi_tiers.interrupt_pairs = ['aspirin|ibuprofen']
    expect(runRules(ctx).find((a) => a.type === 'ddi')!.tier).toBe('interrupt')
  })
})

describe('patient rules', () => {
  const need = (rx: string, p: Patient) => neededInputs(context(rx, p))
  it('asks for weight, creatinine and sex only when a renal-rule drug is present', () => {
    expect(need('Brufen 400 BD', { age_years: 68 }).sort()).toEqual(['serum_creatinine', 'sex', 'weight_kg'])
    expect(need('Brufen 400 BD', { age_years: 68, weight_kg: 55, sex: 'M' })).toEqual(['serum_creatinine'])
    expect(need('Omez 20 OD', { age_years: 68 })).toEqual([])
    expect(need('Brufen 400 BD', { age_years: 68, weight_kg: 55, serum_creatinine: 1.6, sex: 'F' })).toEqual([])
    expect(need('Brufen 400 BD', { age_years: 8 })).toEqual([]) // a child: the adult formula is not used, nothing to ask
  })
  it('applies the domperidone rule from the age threshold, not below it', () => {
    const at = (age: number) => runRules(context('Pan D OD', { age_years: age })).some((a) => a.type === 'domperidone_elderly')
    expect(at(64)).toBe(false)
    expect(at(65)).toBe(true)
  })
  it('uses the female factor when deciding the renal rule', () => {
    const p = { age_years: 60, weight_kg: 70, serum_creatinine: 1.2 }
    const fires = (sex: 'M' | 'F') => runRules(context('Brufen 400 BD', { ...p, sex })).some((a) => a.type === 'nsaid_renal_caution')
    expect(Math.round(cockcroftGault({ ...p, sex: 'M' })!)).toBe(65)
    expect(fires('M')).toBe(false)
    expect(fires('F')).toBe(true) // 64.8 x 0.85 = 55 < 60
  })
})

describe('resolver flag rule', () => {
  const run = (resolved: ResolvedBrand) =>
    runRules({ ...context('Omez OD', { age_years: 30 }), lines: [{ index: 0, resolved, sig: stubSig('OD') }], ledger: {} })

  it('interrupts on a certain banned FDC and only informs when the composition may be incomplete', () => {
    const ref = (certain: boolean) => ({ so: '3385(E)', date: '02.08.2024', list: '156', text: 'Test FDC', certain })
    const certain = run(fake('X', [{ id: 'paracetamol', mg: 500 }], { flags: ['banned_fdc'], banned_fdc: [ref(true)] })).find((a) => a.type === 'banned_fdc')!
    const unsure = run(fake('X', [{ id: 'paracetamol', mg: 500 }], { flags: ['banned_fdc'], banned_fdc: [ref(false)] })).find((a) => a.type === 'banned_fdc')!
    expect([certain.tier, unsure.tier]).toEqual(['interrupt', 'inform'])
    expect(certain.source).toBe('S.O. 3385(E) (02.08.2024)')
  })
  it('makes a spurious batch an Inform and a plain NSQ batch Silent', () => {
    const nsq = (spurious: boolean) => ({ batch: 'B1', month: 'JUL-2026', result: 'Assay failed', product: 'X', manufacturer: 'M', spurious })
    const tier = (s: boolean) => run(fake('X', [{ id: 'paracetamol', mg: 500 }], { flags: ['nsq'], nsq: [nsq(s)] })).find((a) => a.type === 'nsq')!.tier
    expect([tier(true), tier(false)]).toEqual(['inform', 'silent'])
  })
  it('informs on a look-alike with the alternatives, and carries the resolver confidence', () => {
    const a = run(fake('Medzol', [{ id: 'pantoprazole', mg: 40 }], { confidence: 0.8, flags: ['lasa'], candidates: [{ brand: 'Medzol (midazolam)', form: 'injection', score: 0.8, ingredients: [] }] })).find((x) => x.type === 'lasa')!
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain('Medzol (midazolam)')
    expect(a.confidence).toBe(0.8)
  })
  it('logs a discontinued brand silently', () => {
    expect(run(fake('X', [{ id: 'paracetamol', mg: 500 }], { flags: ['discontinued'] })).find((a) => a.type === 'discontinued')!.tier).toBe('silent')
  })
})
