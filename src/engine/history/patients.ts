// FIX_PLAN 3.1: one phone number or loyalty account often orders for a whole family. Doses are only ever added up for one
// person, so a history is split by the name written on each prescription before it is checked. A prescription with no name,
// in an account where others have names, is never guessed into anyone's total: the pharmacist is asked whose it is.
import type { Alert, HistoryResult, LabResult, Patient, Prescription } from '../contracts'
import type { CheckHistory, HistoryOptions } from './check'

/** Case, spacing and punctuation do not make a different person ("Ramesh K." and "ramesh k"). */
export const patientKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export interface PatientGroup {
  /** The name as first written. Empty when no prescription in the account has a name (one person assumed, as before). */
  label: string
  prescriptions: Prescription[]
}

export function groupByPatient(prescriptions: Prescription[]): { groups: PatientGroup[]; unassigned: Prescription[] } {
  const named = prescriptions.filter((p) => p.patient && patientKey(p.patient) !== '')
  if (!named.length) return { groups: [{ label: '', prescriptions }], unassigned: [] }
  const groups = new Map<string, PatientGroup>()
  for (const rx of named) {
    const key = patientKey(rx.patient!)
    const g = groups.get(key) ?? { label: rx.patient!.trim(), prescriptions: [] }
    g.prescriptions.push(rx)
    groups.set(key, g)
  }
  return { groups: [...groups.values()], unassigned: prescriptions.filter((p) => !named.includes(p)) }
}

export interface PatientCheck {
  label: string
  patient: Patient
  result: HistoryResult
}

export interface AccountCheck {
  /** One result per person; a single entry with an empty label when no prescription is named. */
  patients: PatientCheck[]
  /** Prescriptions with no name in an account that has names: left out of every total until the pharmacist says whose they are. */
  unassigned: Prescription[]
  /** Account-level alerts (currently: whose prescription is this?). */
  alerts: Alert[]
}

/**
 * Check an account's prescriptions person by person. `patientFor` supplies each person's age, weight and so on (by the name
 * as written); a person it cannot supply gets `fallback`.
 */
export async function checkByPatient(
  check: CheckHistory,
  prescriptions: Prescription[],
  patientFor: (label: string) => Patient | undefined,
  fallback: Patient,
  labs: LabResult[] = [],
  options: HistoryOptions = {},
): Promise<AccountCheck> {
  const { groups, unassigned } = groupByPatient(prescriptions)
  const patients: PatientCheck[] = []
  for (const g of groups) {
    const patient = patientFor(g.label) ?? fallback
    patients.push({ label: g.label, patient, result: await check(g.prescriptions, patient, labs, options) })
  }
  const alerts: Alert[] = unassigned.length
    ? [
        {
          tier: 'inform',
          type: 'unassigned_prescription',
          ingredients: [],
          reason: `${unassigned.length === 1 ? 'A prescription has' : `${unassigned.length} prescriptions have`} no patient name (${unassigned.map((p) => `${p.doctor}, ${p.date}`).join('; ')}), while others on this account do. ${unassigned.length === 1 ? 'It is' : 'They are'} left out of every total until the pharmacist says whose ${unassigned.length === 1 ? 'it is' : 'they are'}.`,
          source: 'Account check',
          confidence: 1,
          approved: true,
        },
      ]
    : []
  return { patients, unassigned, alerts }
}
