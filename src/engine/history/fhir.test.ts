import { describe, expect, it } from 'vitest'
import hist from '../../../tests/fixtures/demo_history.json'
import fhir from '../../../tests/fixtures/fhir_prescriptions.json'
import type { LabResult, Patient } from '../contracts'
import { realHistory } from '../rules/testing'
import { fhirToHistory } from './fhir'

describe('FHIR PrescriptionRecord import', () => {
  const imported = fhirToHistory(fhir.bundles)

  it('maps each Composition to a prescription with its doctor and date', () => {
    expect(imported.prescriptions.map((p) => [p.id, p.doctor, p.date])).toEqual([
      ['rx-1', 'Dr Rao (GP)', '2026-10-01'],
      ['rx-2', 'Dr Anil Mehta', '2026-10-05'],
    ])
  })

  it('builds sig text from free text, structured frequency and duration', () => {
    const [a, b] = imported.prescriptions
    expect(a.text).toBe('Dolo 650 1-1-1 x10d; Zerodol P BD x10d; Omez 20 once daily x10d')
    // Medication reference, TDS from timing.repeat, and "for 1 week" kept as written (no second duration added)
    expect(b.text).toBe('Crocin Cold & Flu Max TDS x5d; Brufan 400 TDS for 1 week; Pan D OD x7d')
  })

  it('reads a creatinine Observation by LOINC code', () => {
    expect(imported.labs).toEqual([{ type: 'serum_creatinine', value: 1.6, date: '2026-10-09' }])
  })

  it('reports what it skipped instead of guessing', () => {
    expect(imported.warnings).toEqual(['MedicationRequest 4 in bundle 2 has no medication name and was skipped'])
  })

  it('converts umol/L creatinine and ignores other units and other tests', () => {
    const obs = (valueQuantity: object, code: object) => ({
      resourceType: 'Bundle',
      entry: [{ resource: { resourceType: 'Observation', code, valueQuantity, effectiveDateTime: '2026-10-01' } }],
    })
    const umol = fhirToHistory(obs({ value: 141.4, unit: 'umol/L' }, { text: 'Serum creatinine' }))
    expect(umol.labs[0].value).toBeCloseTo(1.6, 1)
    expect(fhirToHistory(obs({ value: 5, unit: 'g/L' }, { text: 'Creatinine' })).labs).toEqual([])
    expect(fhirToHistory(obs({ value: 5, unit: 'mg/dL' }, { text: 'Haemoglobin' })).labs).toEqual([])
  })

  it('splits a bundle with no Composition by prescriber and date, and skips what is not a Bundle', () => {
    const req = (doc: string, name: string) => ({
      resource: { resourceType: 'MedicationRequest', authoredOn: '2026-10-01', requester: { display: doc }, medicationCodeableConcept: { text: name }, dosageInstruction: [{ text: 'OD' }] },
    })
    const r = fhirToHistory([
      { resourceType: 'Bundle', entry: [req('Dr A', 'Omez 20'), req('Dr B', 'Dolo 650'), req('Dr A', 'Ecosprin 75')] },
      { resourceType: 'Patient' },
    ])
    expect(r.prescriptions.map((p) => [p.doctor, p.text])).toEqual([
      ['Dr A', 'Omez 20 OD; Ecosprin 75 OD'],
      ['Dr B', 'Dolo 650 OD'],
    ])
    expect(r.warnings).toEqual(['Item 2 is not a FHIR Bundle with entries and was skipped'])
  })

  it('skips a prescription with no date', () => {
    const r = fhirToHistory({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'MedicationRequest', medicationCodeableConcept: { text: 'Omez 20' } } }] })
    expect(r.prescriptions).toEqual([])
    expect(r.warnings.join(' ')).toContain('has no date')
  })

  it('gives the same check result as the typed demo history for those two prescriptions', async () => {
    const check = realHistory()
    const patient = hist.patient as Patient
    const fromFhir = await check(imported.prescriptions, patient, imported.labs, { asOf: '2026-10-05' })
    const typed = await check(hist.prescriptions.slice(0, 2), patient, hist.labs as LabResult[], { asOf: '2026-10-05' })
    expect(fromFhir.alerts.map((a) => [a.tier, a.type, a.window])).toEqual(typed.alerts.map((a) => [a.tier, a.type, a.window]))
    expect(fromFhir.status).toBe('hold_contact_doctor')
  })
})

describe('FHIR Patient and weight', () => {
  it('reads name, sex, birth date and a body-weight Observation', () => {
    const r = fhirToHistory({
      resourceType: 'Bundle',
      entry: [
        { resource: { resourceType: 'Patient', name: [{ given: ['Asha'], family: 'Kulkarni' }], gender: 'female', birthDate: '1950-04-02' } },
        { resource: { resourceType: 'Observation', code: { coding: [{ code: '29463-7' }] }, valueQuantity: { value: 58, unit: 'kg' }, effectiveDateTime: '2026-10-01' } },
      ],
    })
    expect(r.patient).toEqual({ name: 'Asha Kulkarni', sex: 'F', birth_date: '1950-04-02', weight_kg: 58 })
    expect(r.labs).toEqual([])
  })

  it('leaves patient out when the bundle has none', () => {
    expect(fhirToHistory({ resourceType: 'Bundle', entry: [] }).patient).toBeUndefined()
  })
})
