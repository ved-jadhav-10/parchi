// Track B: strict validation of buyer API requests (api/check). Plain-language errors, no guessing, bounded sizes.
import type { LabResult, Patient, Prescription } from '../contracts'
import { fhirToHistory, type HistoryOptions } from '../history'
import { toDay } from './windows'

export const LIMITS_API = { maxPrescriptions: 25, maxLabs: 50, maxRxChars: 2_000, maxLines: 30, maxConfirmations: 50 } as const

const inRange = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Strict patient check. Returns the patient or a plain-language problem. */
export function parsePatient(x: unknown): { patient: Patient } | { error: string } {
  if (!isObj(x)) return { error: 'patient is required' }
  if (!inRange(x.age_years, 0, 120)) return { error: 'patient.age_years must be a number from 0 to 120' }
  const patient: Patient = { age_years: x.age_years }
  if (x.weight_kg !== undefined) {
    if (!inRange(x.weight_kg, 0.5, 400)) return { error: 'patient.weight_kg must be a number from 0.5 to 400' }
    patient.weight_kg = x.weight_kg
  }
  if (x.serum_creatinine !== undefined) {
    if (!inRange(x.serum_creatinine, 0.1, 20)) return { error: 'patient.serum_creatinine must be a number from 0.1 to 20 (mg/dL)' }
    patient.serum_creatinine = x.serum_creatinine
  }
  if (x.sex !== undefined) {
    if (x.sex !== 'M' && x.sex !== 'F') return { error: 'patient.sex must be "M" or "F"' }
    patient.sex = x.sex
  }
  if (x.egfr !== undefined) {
    if (!inRange(x.egfr, 1, 200)) return { error: 'patient.egfr must be a number from 1 to 200 (mL/min/1.73 m2)' }
    patient.egfr = x.egfr
  }
  if (x.allergies !== undefined) {
    if (!Array.isArray(x.allergies) || x.allergies.length > 20 || !x.allergies.every((a) => typeof a === 'string' && a.trim() !== '' && a.length <= 60)) {
      return { error: 'patient.allergies must be a list of up to 20 names, each 1-60 characters' }
    }
    patient.allergies = x.allergies.map((a) => (a as string).trim())
  }
  if (x.pregnancy !== undefined) {
    if (x.pregnancy !== 'yes' && x.pregnancy !== 'no' && x.pregnancy !== 'unknown') return { error: 'patient.pregnancy must be "yes", "no" or "unknown"' }
    patient.pregnancy = x.pregnancy
  }
  for (const key of ['liver_disease', 'heavy_alcohol_use'] as const) {
    if (x[key] !== undefined) {
      if (typeof x[key] !== 'boolean') return { error: `patient.${key} must be true or false` }
      patient[key] = x[key] as boolean
    }
  }
  return { patient }
}

/** Optional per-person details for an account that orders for several people: { "Priya": { age_years, ... } }. */
export function parsePatientMap(x: unknown): { patients: Record<string, Patient> } | { error: string } {
  if (x === undefined) return { patients: {} }
  if (!isObj(x) || Object.keys(x).length > 10) return { error: 'patients must be an object of up to 10 named patients' }
  const out: Record<string, Patient> = {}
  for (const [name, p] of Object.entries(x)) {
    const r = parsePatient(p)
    if ('error' in r) return { error: `patients["${name}"]: ${r.error}` }
    out[name] = r.patient
  }
  return { patients: out }
}

/** Text of one prescription: bounded length and line count. */
export function checkRxText(text: unknown, label = 'rx_text'): string | null {
  if (typeof text !== 'string' || text.trim() === '' || text.length > LIMITS_API.maxRxChars) return `${label} must be 1-${LIMITS_API.maxRxChars} characters`
  if (text.split(/\r?\n|;/).filter((l) => l.trim()).length > LIMITS_API.maxLines) return `${label} has more than ${LIMITS_API.maxLines} lines`
  return null
}

export interface HistoryRequest {
  prescriptions: Prescription[]
  labs: LabResult[]
  options: HistoryOptions
  /** Notes from the FHIR import (resources it could not use), passed back to the caller. */
  warnings: string[]
}

function validatePrescriptions(list: unknown): { prescriptions: Prescription[] } | { error: string } {
  if (!Array.isArray(list) || list.length === 0) return { error: 'prescriptions must be a non-empty array' }
  if (list.length > LIMITS_API.maxPrescriptions) return { error: `at most ${LIMITS_API.maxPrescriptions} prescriptions per request` }
  const seen = new Set<string>()
  const out: Prescription[] = []
  for (const [i, rx] of list.entries()) {
    const where = `prescriptions[${i}]`
    if (!isObj(rx)) return { error: `${where} must be an object` }
    if (typeof rx.id !== 'string' || rx.id.trim() === '' || rx.id.length > 64) return { error: `${where}.id must be 1-64 characters` }
    if (seen.has(rx.id)) return { error: `${where}.id "${rx.id}" is used twice; ids must be unique` }
    seen.add(rx.id)
    if (typeof rx.doctor !== 'string' || rx.doctor.trim() === '' || rx.doctor.length > 100) return { error: `${where}.doctor must be 1-100 characters` }
    if (typeof rx.date !== 'string' || toDay(rx.date) === null) return { error: `${where}.date must be a real date as YYYY-MM-DD` }
    const bad = checkRxText(rx.text, `${where}.text`)
    if (bad) return { error: bad }
    if (rx.patient !== undefined && (typeof rx.patient !== 'string' || rx.patient.length > 100)) return { error: `${where}.patient must be a name of up to 100 characters` }
    const who = typeof rx.patient === 'string' && rx.patient.trim() !== '' ? { patient: rx.patient.trim() } : {}
    out.push({ id: rx.id, doctor: rx.doctor.trim(), date: rx.date, text: rx.text as string, ...who })
  }
  return { prescriptions: out }
}

function validateLabs(list: unknown): { labs: LabResult[] } | { error: string } {
  if (list === undefined) return { labs: [] }
  if (!Array.isArray(list) || list.length > LIMITS_API.maxLabs) return { error: `labs must be an array of at most ${LIMITS_API.maxLabs} results` }
  const out: LabResult[] = []
  for (const [i, l] of list.entries()) {
    if (!isObj(l) || l.type !== 'serum_creatinine') return { error: `labs[${i}].type must be "serum_creatinine"` }
    if (!inRange(l.value, 0.1, 20)) return { error: `labs[${i}].value must be a number from 0.1 to 20 (mg/dL)` }
    if (typeof l.date !== 'string' || toDay(l.date) === null) return { error: `labs[${i}].date must be a real date as YYYY-MM-DD` }
    out.push({ type: 'serum_creatinine', value: l.value, date: l.date })
  }
  return { labs: out }
}

/**
 * Body of a history request: either `prescriptions` (+ optional `labs`) or an ABDM FHIR `fhir` bundle(s).
 * Optional: `as_of`, `from` (dates), `confirmations` ({ "rx-3#1": "Dolo 650" }).
 */
export function parseHistoryRequest(body: Record<string, unknown>): { request: HistoryRequest } | { error: string } {
  let prescriptions: Prescription[]
  let labs: LabResult[]
  let warnings: string[] = []
  if (body.fhir !== undefined) {
    if (body.prescriptions !== undefined) return { error: 'send either prescriptions or fhir, not both' }
    const imported = fhirToHistory(body.fhir)
    warnings = imported.warnings
    const v = validatePrescriptions(imported.prescriptions)
    if ('error' in v) return { error: `fhir: ${v.error}` }
    const l = validateLabs([...imported.labs, ...(Array.isArray(body.labs) ? body.labs : [])])
    if ('error' in l) return l
    prescriptions = v.prescriptions
    labs = l.labs
  } else {
    const v = validatePrescriptions(body.prescriptions)
    if ('error' in v) return v
    const l = validateLabs(body.labs)
    if ('error' in l) return l
    prescriptions = v.prescriptions
    labs = l.labs
  }
  const options: HistoryOptions = {}
  for (const k of ['as_of', 'from'] as const) {
    if (body[k] === undefined) continue
    if (typeof body[k] !== 'string' || toDay(body[k] as string) === null) return { error: `${k} must be a real date as YYYY-MM-DD` }
    options[k === 'as_of' ? 'asOf' : 'from'] = body[k] as string
  }
  if (body.confirmations !== undefined) {
    const c = body.confirmations
    if (!isObj(c) || Object.keys(c).length > LIMITS_API.maxConfirmations || Object.values(c).some((v) => typeof v !== 'string' || v.length === 0 || v.length > 100)) {
      return { error: `confirmations must be an object of at most ${LIMITS_API.maxConfirmations} brand names ({ "rx-3#1": "Dolo 650" })` }
    }
    options.confirmations = c as Record<string, string>
  }
  return { request: { prescriptions, labs, options, warnings } }
}
