// FHIR R4 in and out for a whole order (a customer's dated prescriptions and labs).
// Import is the engine's `fhirToHistory` (Track C) plus turning its result into form fields.
// Export is a plain FHIR collection that `fhirToHistory` reads back; it is NOT validated against the ABDM/NRCeS profile.
import { fhirToHistory } from '../../engine/history'
import { splitBrandAndSig, splitRx } from '../../engine/resolver'
import type { Order } from '../history/types'

/** What an import fills into the history form. All text, as the form holds it. */
export interface ImportedOrder {
  name?: string
  age?: string
  sex?: 'M' | 'F'
  weight?: string
  prescriptions: { doctor: string; date: string; text: string }[]
  labs: { value: string; date: string }[]
  warnings: string[]
}

/** Whole years on `on` for someone born on `birth` (ISO dates). */
export function ageOn(birth: string, on: string): number {
  const b = new Date(`${birth}T00:00:00Z`)
  const d = new Date(`${on}T00:00:00Z`)
  let years = d.getUTCFullYear() - b.getUTCFullYear()
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) years--
  return Math.max(0, years)
}

/** Reads FHIR JSON text: one Bundle or an array of them. Throws a plain-language Error when it cannot. */
export function importFhirText(text: string): ImportedOrder {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const r = fhirToHistory(json)
  if (r.prescriptions.length === 0 && r.labs.length === 0) {
    throw new Error(r.warnings[0] ?? 'No prescriptions or lab results were found in that file.')
  }
  const newest = r.prescriptions.map((p) => p.date).sort().at(-1)
  const p = r.patient
  return {
    ...(p?.name && { name: p.name }),
    ...(p?.birth_date && { age: String(ageOn(p.birth_date, newest ?? new Date().toISOString().slice(0, 10))) }),
    ...(p?.sex && { sex: p.sex }),
    ...(p?.weight_kg && { weight: String(p.weight_kg) }),
    prescriptions: r.prescriptions.map(({ doctor, date, text }) => ({ doctor, date, text })),
    labs: r.labs.map((l) => ({ value: String(l.value), date: l.date })),
    warnings: r.warnings,
  }
}

/** A FHIR collection of the order: Patient, a Practitioner per doctor, MedicationRequests with date and requester, creatinine and weight Observations. */
export function orderToFhir(order: Order) {
  const doctors = [...new Set(order.prescriptions.map((p) => p.doctor))]
  const practitioner = (name: string) => `Practitioner/pr-${doctors.indexOf(name) + 1}`
  const obs = (id: string, loinc: string, display: string, value: number, unit: string, date: string) => ({
    resource: {
      resourceType: 'Observation',
      id,
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: loinc, display }], text: display },
      subject: { reference: 'Patient/pt-1' },
      effectiveDateTime: date,
      valueQuantity: { value, unit },
    },
  })
  return {
    resourceType: 'Bundle',
    type: 'collection',
    meta: { tag: [{ code: 'draft-export', display: 'Parchi draft export. Not validated against the ABDM/NRCeS PrescriptionRecord profile.' }] },
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'pt-1',
          name: [{ text: order.customer.name }],
          ...(order.customer.sex && { gender: order.customer.sex === 'M' ? 'male' : 'female' }),
        },
      },
      ...doctors.map((d, i) => ({ resource: { resourceType: 'Practitioner', id: `pr-${i + 1}`, name: [{ text: d }] } })),
      ...order.prescriptions.flatMap((rx) =>
        splitRx(rx.text).map((line, i) => {
          const { brand, sig } = splitBrandAndSig(line)
          return {
            resource: {
              resourceType: 'MedicationRequest',
              id: `${rx.id}-${i + 1}`,
              status: 'active',
              intent: 'order',
              authoredOn: rx.date,
              medicationCodeableConcept: { text: brand },
              subject: { reference: 'Patient/pt-1' },
              requester: { reference: practitioner(rx.doctor) },
              ...(sig && { dosageInstruction: [{ text: sig }] }),
            },
          }
        }),
      ),
      ...order.labs.map((l, i) => obs(`cr-${i + 1}`, '2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', l.value, 'mg/dL', l.date)),
      ...(order.customer.weight_kg ? [obs('wt-1', '29463-7', 'Body weight', order.customer.weight_kg, 'kg', order.placed)] : []),
    ],
  }
}
