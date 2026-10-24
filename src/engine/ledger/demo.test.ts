// Track B against tests/fixtures/demo_rx.json: Track A's real resolver -> sig parser -> ledger -> limits.
import { describe, it, expect } from 'vitest'
import demo from '../../../tests/fixtures/demo_rx.json'
import type { Patient } from '../contracts'
import { testResolver } from '../resolver/testing'
import { parseSig } from '../sig'
import { computeDose, type LedgerLine } from './index'

const resolver = testResolver()
const classesOf = (id: string) => resolver.ingredient(id)?.classes

function run(rxText: string, patient: Patient) {
  const lines: LedgerLine[] = resolver
    .resolveText(rxText, { age_years: patient.age_years })
    .map((l) => ({ resolved: l.resolved, sig: parseSig(l.sig_text) }))
  return { lines, dose: computeDose(lines, patient, { classesOf }) }
}

describe('demo prescription (68 y, 55 kg, creatinine 1.6)', () => {
  const { lines, dose } = run(demo.rx_text, demo.patient as Patient)

  it('parses every line of the real sig text from the resolver', () => {
    expect(lines.map((l) => [l.sig.doses_per_day, l.sig.max_doses_per_day, l.sig.sos, l.sig.duration_days])).toEqual([
      [3, 3, false, 5], // Dolo 650 1-1-1 x5d
      [3, 3, false, undefined], // Crocin TDS
      [2, 2, false, undefined], // Zerodol P BD
      [0, 0, true, undefined], // Brufan 400 SOS
      [1, 1, false, undefined], // Ecosprin OD
      [1, 1, false, undefined], // Pan D OD
      [1, 1, false, undefined], // Omez OD
    ])
    expect(lines.every((l) => l.sig.unparsed === undefined)).toBe(true)
  })

  it('finds the hidden paracetamol: 4,100 mg/day across three brands (fixture value)', () => {
    const p = dose.ledger.paracetamol
    expect(p.total_mg_day).toBe(demo.expected.ledger_paracetamol_mg_day)
    expect(p.sources).toEqual(['Dolo 650: 3 x 650 mg', 'Crocin Cold & Flu Max: 3 x 500 mg', 'Zerodol-P: 2 x 325 mg'])
  })

  it('counts the SOS ibuprofen at the NSAID worst case from the limits data (3 x 400 mg)', () => {
    expect(dose.ledger.ibuprofen).toMatchObject({ total_mg_day: 1200, scheduled_mg_day: 0, sos_mg_day: 1200 })
    expect(dose.notes.some((n) => n.kind === 'sos_cap_assumed' && n.ingredient === 'ibuprofen')).toBe(true)
  })

  it('totals the other ingredients correctly', () => {
    const t = Object.fromEntries(Object.entries(dose.ledger).map(([id, e]) => [id, e.total_mg_day]))
    expect(t).toMatchObject({ aceclofenac: 200, aspirin: 75, caffeine: 96, phenylephrine: 30, pantoprazole: 40, domperidone: 30, omeprazole: 20 })
  })

  it('estimates kidney function (CrCl) as about 34 mL/min and needs nothing more from the pharmacist', () => {
    expect(dose.crcl).toBe(34.4)
    expect(dose.needs).toEqual([])
  })

  it('reports the over-limit paracetamol and kidney cautions for both NSAIDs, each with a source and unverified flag', () => {
    const kinds = dose.findings.map((f) => `${f.kind}:${f.ingredient}`).sort()
    expect(kinds).toEqual(['over_limit:paracetamol', 'renal_caution:aceclofenac', 'renal_caution:ibuprofen'])
    const over = dose.findings.find((f) => f.kind === 'over_limit')!
    expect(over).toMatchObject({ total_mg_day: 4100, limit_mg_day: 3000, basis: 'Age 65+ cap', sos_dependent: false })
    expect(dose.findings.every((f) => f.pharmacist_approved === false && f.source.length > 0)).toBe(true)
  })

  it('does not flag ingredients that are within their limits (aceclofenac 200 and domperidone 30 are exactly at it)', () => {
    expect(dose.findings.some((f) => f.kind === 'over_limit' && f.ingredient !== 'paracetamol')).toBe(false)
  })
})

describe('ask-only-when-needed on real prescriptions', () => {
  it('asks for creatinine, weight and sex only because an NSAID is present', () => {
    const { dose } = run(demo.rx_text, { age_years: 68 })
    expect(dose.needs.map((n) => n.field).sort()).toEqual(['serum_creatinine', 'sex', 'weight_kg'])
    expect(dose.needs[0].ingredients.some((i) => ['ibuprofen', 'aceclofenac'].includes(i))).toBe(true)
    expect(dose.crcl).toBeNull()
  })
  it('asks nothing for a prescription with no kidney-sensitive drug', () => {
    const { dose } = run('Dolo 650 TDS; Pan D OD; Omez 20 OD', { age_years: 68 })
    expect(dose.needs).toEqual([])
    expect(dose.findings).toEqual([])
  })
  it('asks only for weight for a child on a weight-dosed drug', () => {
    const { dose } = run('Dolo 650 TDS', { age_years: 6 })
    expect(dose.needs.map((n) => n.field)).toEqual(['weight_kg'])
  })
})

describe('liquid doses written next to the brand', () => {
  it('keeps "5ml" and "10 ml" as dosing, not part of the brand name, so syrups are counted in mg', () => {
    const a = run('Syp Ascoril LS 5ml TDS', { age_years: 40 })
    expect(a.lines[0].sig.volume_ml_per_dose).toBe(5)
    expect(a.dose.ledger.ambroxol.total_mg_day).toBe(90) // 3 x 5 mL x 30 mg/5 mL
    const b = run('Syp Ascoril LS 10 ml BD', { age_years: 40 })
    expect(b.dose.ledger.ambroxol.total_mg_day).toBe(120)
    expect(b.dose.notes.some((n) => n.kind === 'assumed_measure')).toBe(false)
  })
  it('does not mistake a pack size for a dose', () => {
    const c = run('Ascoril LS Syrup 100ml TDS', { age_years: 40 })
    expect(c.lines[0].sig.volume_ml_per_dose).toBeUndefined()
  })
})
