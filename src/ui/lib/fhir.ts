import type { Patient, ResolvedBrand, Sig } from '../../engine/contracts'

type Line = { resolved: ResolvedBrand; sig: Sig | null }

/** Export stub: a FHIR R4 collection of draft MedicationRequests. Not ABDM-profiled and not for submission. */
export const toFhirBundle = (lines: Line[], patient: Patient) => ({
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    { resource: { resourceType: 'Patient', id: 'patient', ...(patient.sex && { gender: patient.sex === 'M' ? 'male' : 'female' }) } },
    ...lines
      .filter((l) => l.resolved.brand)
      .map((l, i) => ({
        resource: {
          resourceType: 'MedicationRequest',
          id: `rx-${i + 1}`,
          status: 'draft',
          intent: 'proposal',
          medicationCodeableConcept: { text: l.resolved.brand },
          subject: { reference: 'Patient/patient' },
          dosageInstruction: [
            {
              text: l.resolved.raw,
              ...(l.sig && { asNeededBoolean: l.sig.sos }),
              ...(l.sig && !l.sig.sos && { timing: { repeat: { frequency: l.sig.doses_per_day, period: 1, periodUnit: 'd' } } }),
            },
          ],
        },
      })),
  ],
})
