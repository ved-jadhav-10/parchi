// Track B limits: patient-specific daily limits, kidney (CrCl) rules, SOS caps and ask-only-when-needed prompts.
// All clinical numbers live in limits.json with a source and a pharmacist_approved flag; this file has none.
import type { Ledger, LedgerEntry, Patient } from '../contracts'
import limitsJson from './limits.json'
import { cockcroftGault, type CrclInput } from './crcl'
import type { LimitFinding, LimitsData, PatientNeed, RenalRule, SosCap } from './types'

export { cockcroftGault } from './crcl'
export type { CrclResult } from './crcl'
export type { LimitFinding, LimitsData, PatientNeed, SosCap } from './types'

export const LIMITS = limitsJson as unknown as LimitsData

const cap = (id: string) => id.charAt(0).toUpperCase() + id.slice(1)
const round1 = (n: number) => Math.round(n * 10) / 10

/** Worst-case doses per day for an SOS line with no written maximum: by ingredient, then class, then the fallback. */
export function sosCapFor(id: string, classes: string[] | undefined, data: LimitsData = LIMITS): SosCap {
  const byIngredient = data.sos.by_ingredient[id]
  if (byIngredient) return byIngredient
  for (const c of classes ?? []) if (data.sos.by_class[c]) return data.sos.by_class[c]
  return data.sos.fallback
}

/** The lowest kidney band the patient falls under, or undefined. */
function renalRule(rules: RenalRule[] | undefined, crcl: number): RenalRule | undefined {
  return [...(rules ?? [])].sort((a, b) => a.crcl_below - b.crcl_below).find((r) => crcl < r.crcl_below)
}

/**
 * What to ask the pharmacist for, and only if it matters: weight when a child's dose is by weight, and kidney inputs
 * (weight, serum creatinine, sex) only when an ingredient on the prescription has a kidney rule. Nothing already known is asked again.
 */
export function neededInputs(ids: string[], patient: Patient, data: LimitsData = LIMITS): PatientNeed[] {
  const needs = new Map<PatientNeed['field'], PatientNeed>()
  const add = (field: PatientNeed['field'], reason: string, id: string) => {
    const n = needs.get(field)
    if (n) n.ingredients.push(id)
    else needs.set(field, { field, reason, ingredients: [id] })
  }
  const crcl = cockcroftGault(patient)
  for (const id of [...new Set(ids)]) {
    const lim = data.ingredients[id]
    if (!lim) continue
    if (patient.age_years < data._meta.paediatric_age_below && lim.paediatric && !(patient.weight_kg && patient.weight_kg > 0)) {
      add('weight_kg', `${cap(id)} is dosed by body weight in children`, id)
    }
    if (lim.renal?.length) {
      for (const f of crcl.missing as CrclInput[]) {
        const why =
          f === 'serum_creatinine'
            ? 'needed to estimate kidney function (CrCl) for a drug that kidneys clear or that can harm them'
            : f === 'weight_kg'
              ? 'needed with creatinine to estimate kidney function (CrCl)'
              : 'needed to estimate kidney function (CrCl); the formula differs by sex'
        add(f, `${cap(id)}: ${why}`, id)
      }
    }
  }
  return [...needs.values()]
}

interface Candidate {
  limit: number
  basis: string
  source: string
  approved: boolean
}

/**
 * Attach the patient's applicable daily limit to every ledger entry and list what is over it or needs a kidney warning.
 * Returns a new ledger; the input is not changed. `needs` lists missing inputs that stopped a limit from being applied.
 */
export function applyLimits(
  ledger: Ledger,
  patient: Patient,
  data: LimitsData = LIMITS,
): { ledger: Ledger; findings: LimitFinding[]; needs: PatientNeed[]; crcl: number | null } {
  const out: Ledger = {}
  const findings: LimitFinding[] = []
  const crclRes = cockcroftGault(patient)
  const crcl = crclRes.value
  const isChild = patient.age_years < data._meta.paediatric_age_below
  const isElder = patient.age_years >= data._meta.elderly_age_from

  for (const [id, entry] of Object.entries(ledger)) {
    const next: LedgerEntry = { ...entry, caveats: entry.caveats ? [...entry.caveats] : undefined }
    const lim = data.ingredients[id]
    const candidates: Candidate[] = []
    if (lim) {
      if (isChild) {
        if (lim.paediatric && patient.weight_kg && patient.weight_kg > 0) {
          const byWeight = lim.paediatric.max_mg_per_kg_day * patient.weight_kg
          const adult = lim.adult?.max_mg_day
          candidates.push({
            limit: adult !== undefined ? Math.min(byWeight, adult) : byWeight,
            basis: `Paediatric ${lim.paediatric.max_mg_per_kg_day} mg/kg/day x ${patient.weight_kg} kg`,
            source: lim.paediatric.source,
            approved: lim.paediatric.pharmacist_approved,
          })
        } else if (!lim.paediatric) {
          ;(next.caveats ??= []).push(`No paediatric limit for ${id} in the data, so no limit was applied for this child`)
        }
      } else if (isElder && lim.elderly) {
        candidates.push({ limit: lim.elderly.max_mg_day, basis: `Age ${data._meta.elderly_age_from}+ cap`, source: lim.elderly.source, approved: lim.elderly.pharmacist_approved })
      } else if (lim.adult) {
        candidates.push({ limit: lim.adult.max_mg_day, basis: 'Adult maximum', source: lim.adult.source, approved: lim.adult.pharmacist_approved })
      }
      if (!isChild) {
        for (const rc of lim.risk_caps ?? []) {
          const applies =
            rc.factor === 'low_weight'
              ? patient.weight_kg !== undefined && patient.weight_kg > 0 && patient.weight_kg < (rc.weight_below ?? 0)
              : patient[rc.factor] === true
          if (!applies) continue
          const byWeight = rc.max_mg_per_kg_day !== undefined && patient.weight_kg ? rc.max_mg_per_kg_day * patient.weight_kg : undefined
          const limit = Math.min(...[rc.max_mg_day, byWeight, lim.adult?.max_mg_day].filter((n): n is number => n !== undefined))
          const why = { low_weight: `weight ${patient.weight_kg} kg (under ${rc.weight_below} kg)`, liver_disease: 'liver disease', heavy_alcohol_use: 'heavy alcohol use' }[rc.factor]
          candidates.push({ limit, basis: `Lower cap: ${why}`, source: rc.source, approved: rc.pharmacist_approved })
        }
      }
      const renal = crcl !== null ? renalRule(lim.renal, crcl) : undefined
      if (renal && crcl !== null) {
        const basis = `Kidney: CrCl ${crcl} mL/min (below ${renal.crcl_below})`
        if (renal.action === 'max_mg_day' && renal.max_mg_day !== undefined) {
          candidates.push({ limit: renal.max_mg_day, basis, source: renal.source, approved: renal.pharmacist_approved })
        } else {
          const avoid = renal.action === 'avoid'
          findings.push({
            kind: avoid ? 'renal_avoid' : 'renal_caution',
            ingredient: id,
            total_mg_day: entry.total_mg_day,
            basis,
            source: renal.source,
            pharmacist_approved: renal.pharmacist_approved,
            crcl_ml_min: crcl,
            message: `${cap(id)} with kidney function (${crclRes.basis === 'egfr' ? 'lab eGFR' : 'CrCl'}) of ${crcl} mL/min: ${avoid ? 'usually avoided' : 'use with caution'}`,
          })
        }
      }
    }
    const best = candidates.sort((a, b) => a.limit - b.limit)[0]
    if (best) {
      next.limit_mg_day = round1(best.limit)
      next.limit_basis = best.basis
      next.limit_source = best.source
      next.limit_pharmacist_approved = best.approved
      if (entry.total_mg_day > next.limit_mg_day + 1e-6) {
        const scheduled = entry.scheduled_mg_day ?? entry.total_mg_day
        findings.push({
          kind: 'over_limit',
          ingredient: id,
          total_mg_day: entry.total_mg_day,
          limit_mg_day: next.limit_mg_day,
          basis: best.basis,
          source: best.source,
          pharmacist_approved: best.approved,
          sos_dependent: (entry.sos_mg_day ?? 0) > 0 && scheduled <= next.limit_mg_day + 1e-6,
          message: `${cap(id)} adds up to ${entry.total_mg_day} mg/day across ${entry.sources.length} line${entry.sources.length === 1 ? '' : 's'}; limit ${next.limit_mg_day} mg/day (${best.basis})`,
        })
      }
    }
    if (!next.caveats?.length) delete next.caveats
    out[id] = next
  }

  const needs = neededInputs(Object.keys(ledger), patient, data)
  return { ledger: out, findings, needs, crcl }
}
