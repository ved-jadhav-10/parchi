// ABDM FHIR R4 PrescriptionRecord (NRCeS profile) -> history. Bundles in, `Prescription[]` and `LabResult[]` out.
// Tolerant on purpose: only the fields the engine needs are read, and anything unusable is reported in `warnings`,
// never guessed. Not tied to one vendor: any R4 document Bundle with Composition + MedicationRequest works.
import type { LabResult, Prescription } from '../contracts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** What the Patient resource and a weight Observation say about the customer; the screens turn birth_date into an age on the order date. */
export interface FhirPatient {
  name?: string
  sex?: 'M' | 'F'
  /** ISO date */
  birth_date?: string
  weight_kg?: number
}

export interface FhirImport {
  prescriptions: Prescription[]
  labs: LabResult[]
  /** From the first bundle that has a Patient; absent when none does. */
  patient?: FhirPatient
  /** What was skipped or assumed, for the pharmacist (a medication with no name, a missing date, ...). */
  warnings: string[]
}

/** Frequency per day from a structured timing, when the dosage has no free text. */
const FREQUENCY_SIG: Record<number, string> = { 1: 'OD', 2: 'BD', 3: 'TDS', 4: 'QID' }
const DURATION_UNIT_DAYS: Record<string, number> = { d: 1, day: 1, days: 1, wk: 7, week: 7, weeks: 7, mo: 30, month: 30, months: 30 }
const HAS_DURATION = /\bx\s*\d+\s*d\b|\bfor\s+\d+\s+(day|days|week|weeks)\b/i
/** LOINC 2160-0: creatinine [mass/volume] in serum or plasma. */
const CREATININE_LOINC = '2160-0'
/** LOINC 29463-7: body weight. */
const WEIGHT_LOINC = '29463-7'

function humanName(name: unknown): string | undefined {
  const n = Array.isArray(name) ? name[0] : name
  if (!n) return undefined
  if (typeof n === 'string') return n
  const o = n as Json
  return (o.text as string | undefined) ?? ([...(o.prefix ?? []), ...(o.given ?? []), o.family].filter(Boolean).join(' ') || undefined)
}

function conceptText(c: Json | undefined): string | undefined {
  return (c?.text as string | undefined) ?? (c?.coding as Json[] | undefined)?.find((x) => x.display)?.display
}

function durationDays(d: Json | undefined): number | undefined {
  const unit = DURATION_UNIT_DAYS[String(d?.unit ?? d?.code ?? '').toLowerCase()]
  return typeof d?.value === 'number' && unit ? Math.round(d.value * unit) : undefined
}

export function fhirToHistory(input: unknown): FhirImport {
  const bundles = (Array.isArray(input) ? input : [input]) as Json[]
  const out: FhirImport = { prescriptions: [], labs: [], warnings: [] }
  bundles.forEach((bundle, b) => {
    if (bundle?.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
      out.warnings.push(`Item ${b + 1} is not a FHIR Bundle with entries and was skipped`)
      return
    }
    importBundle(bundle, b, out)
  })
  return out
}

function importBundle(bundle: Json, b: number, out: FhirImport): void {
  const resources: { url?: string; res: Json }[] = (bundle.entry as Json[]).filter((e) => e?.resource).map((e) => ({ url: e.fullUrl, res: e.resource }))
  const byRef = new Map<string, Json>()
  for (const { url, res } of resources) {
    if (url) byRef.set(url, res)
    if (res.resourceType && res.id) byRef.set(`${res.resourceType}/${res.id}`, res)
  }
  const resolve = (ref: Json | undefined): Json | undefined => (ref?.reference ? byRef.get(ref.reference as string) : undefined)
  const ofType = (t: string) => resources.map((r) => r.res).filter((r) => r.resourceType === t)

  const doctorOf = (ref: Json | undefined): string | undefined => humanName(resolve(ref)?.name) ?? (ref?.display as string | undefined)

  const pt = ofType('Patient')[0]
  if (pt && !out.patient) {
    const sex = pt.gender === 'male' ? 'M' : pt.gender === 'female' ? 'F' : undefined
    const birth = typeof pt.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(pt.birthDate) ? pt.birthDate.slice(0, 10) : undefined
    out.patient = { ...(humanName(pt.name) && { name: humanName(pt.name) }), ...(sex && { sex }), ...(birth && { birth_date: birth }) }
  }

  const requests = ofType('MedicationRequest')
  const composition = ofType('Composition')[0]

  // One prescription per Composition; a bundle with no Composition is split by requester and date.
  const groups = new Map<string, { id: string; doctor?: string; date?: string; lines: string[] }>()
  const group = (key: string, id: string, doctor?: string, date?: string) => {
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { id, doctor, date, lines: [] }))
    return g
  }
  const compDoctor = composition ? doctorOf((composition.author as Json[] | undefined)?.[0]) : undefined

  for (const [i, mr] of requests.entries()) {
    const med = mr.medicationCodeableConcept ? conceptText(mr.medicationCodeableConcept) : (conceptText(resolve(mr.medicationReference)?.code) ?? (mr.medicationReference?.display as string | undefined))
    if (!med) {
      out.warnings.push(`MedicationRequest ${i + 1} in bundle ${b + 1} has no medication name and was skipped`)
      continue
    }
    const dosage = (mr.dosageInstruction as Json[] | undefined)?.[0]
    const repeat = dosage?.timing?.repeat as Json | undefined
    let sig = (dosage?.text as string | undefined)?.trim() ?? ''
    if (!sig && repeat?.frequency && (repeat.period ?? 1) === 1 && String(repeat.periodUnit ?? 'd') === 'd') sig = FREQUENCY_SIG[repeat.frequency as number] ?? ''
    if (!sig) out.warnings.push(`${med}: no dosage written; the engine will assume once daily`)
    const days = durationDays(repeat?.boundsDuration) ?? durationDays(mr.dispenseRequest?.expectedSupplyDuration)
    if (days && !HAS_DURATION.test(sig)) sig = `${sig} x${days}d`.trim()

    const requester = doctorOf(mr.requester) ?? compDoctor
    const authored = (mr.authoredOn as string | undefined) ?? (composition?.date as string | undefined)
    const key = composition ? 'composition' : `${requester ?? '?'}|${authored?.slice(0, 10) ?? '?'}`
    const compId = composition ? ((composition.identifier?.value as string | undefined) ?? (composition.id as string | undefined)) : undefined
    const g = group(key, compId ?? `fhir-${b + 1}-${groups.size + 1}`, composition ? compDoctor : requester, composition ? (composition.date as string | undefined) : authored)
    g.lines.push(`${med} ${sig}`.trim())
  }

  for (const g of groups.values()) {
    if (!g.date) {
      out.warnings.push(`Prescription ${g.id} has no date and was skipped: overlaps cannot be worked out`)
      continue
    }
    if (!g.doctor) out.warnings.push(`Prescription ${g.id} names no prescriber; shown as "Unknown prescriber"`)
    out.prescriptions.push({ id: g.id, doctor: g.doctor ?? 'Unknown prescriber', date: g.date.slice(0, 10), text: g.lines.join('; ') })
  }

  for (const obs of ofType('Observation')) {
    const codes = ((obs.code?.coding as Json[] | undefined) ?? []).map((c) => c.code as string)
    const wq = obs.valueQuantity as Json | undefined
    if ((codes.includes(WEIGHT_LOINC) || /body weight/i.test(conceptText(obs.code) ?? '')) && typeof wq?.value === 'number' && /^kg|kilogram/i.test(String(wq.unit ?? wq.code ?? 'kg'))) {
      out.patient = { ...out.patient, weight_kg: wq.value }
      continue
    }
    const isCreatinine = codes.includes(CREATININE_LOINC) || /creatinine/i.test(conceptText(obs.code) ?? '')
    if (!isCreatinine) continue
    const q = obs.valueQuantity as Json | undefined
    const when = (obs.effectiveDateTime as string | undefined) ?? (obs.issued as string | undefined)
    if (typeof q?.value !== 'number' || !when) {
      out.warnings.push('A creatinine Observation without a numeric value or date was skipped')
      continue
    }
    const unit = String(q.unit ?? q.code ?? 'mg/dL').toLowerCase()
    const micro = unit.includes('mol')
    if (!micro && !unit.includes('mg')) {
      out.warnings.push(`A creatinine value in unit "${q.unit}" was skipped: only mg/dL and µmol/L are read`)
      continue
    }
    out.labs.push({ type: 'serum_creatinine', value: Math.round((micro ? q.value / 88.4 : q.value) * 100) / 100, date: when.slice(0, 10) })
  }
}
