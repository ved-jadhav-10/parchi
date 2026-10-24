// Rows for the Data & limits page: Track B's dose limits and SOS caps, and Track C's alert rules and suppression list.
// Every row carries its source and whether a pharmacist approved it; nothing is shown without one or the other.
import type { LimitsData } from '../../engine/limits'
import type { AlertRules } from '../../engine/rules'
import type { DataRow } from './dataFiles'
import { mg, titleCase } from './format'

const row = (name: string, detail: string, value: string, source: string, approved: boolean | undefined, checked?: string): DataRow => ({
  name, detail, value, source, approved, ...(checked ? { checked } : {}),
})

/** "Label quote checked 25 Oct 2026": a script found the cited sentence in the label. Says nothing about a pharmacist. */
const labelChecked = (iso: string | undefined) => {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? 'Label quote checked' : `Label quote checked ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`
}

const perDay = (n: number) => `${mg(n)} mg/day`

/** Adult, elderly, paediatric and kidney limits per ingredient (Track B, src/engine/limits/limits.json). */
export function limitRows(limits: LimitsData): DataRow[] {
  const { elderly_age_from: old, paediatric_age_below: young } = limits._meta
  const rows: DataRow[] = []
  for (const [id, l] of Object.entries(limits.ingredients)) {
    const name = titleCase(id)
    if (l.adult) rows.push(row(name, 'Adult', perDay(l.adult.max_mg_day), l.adult.source, l.adult.pharmacist_approved, labelChecked(l.adult.label_checked)))
    if (l.elderly) rows.push(row(name, `Age ${old} and over`, perDay(l.elderly.max_mg_day), l.elderly.source, l.elderly.pharmacist_approved, labelChecked(l.elderly.label_checked)))
    if (l.paediatric) rows.push(row(name, `Under ${young} years, by weight`, `${mg(l.paediatric.max_mg_per_kg_day)} mg/kg/day`, l.paediatric.source, l.paediatric.pharmacist_approved, labelChecked(l.paediatric.label_checked)))
    for (const rc of l.risk_caps ?? []) {
      const detail = { low_weight: `Weight under ${rc.weight_below} kg`, liver_disease: 'Liver disease', heavy_alcohol_use: 'Heavy alcohol use' }[rc.factor]
      rows.push(row(name, detail, rc.max_mg_per_kg_day !== undefined ? `${mg(rc.max_mg_per_kg_day)} mg/kg/day` : perDay(rc.max_mg_day ?? 0), rc.source, rc.pharmacist_approved))
    }
    for (const r of l.renal ?? []) {
      const value = r.action === 'avoid' ? 'Avoid' : r.action === 'caution' ? 'Use with caution' : perDay(r.max_mg_day ?? 0)
      rows.push(row(name, `Kidney: CrCl below ${r.crcl_below} mL/min`, value, r.source, r.pharmacist_approved))
    }
  }
  return rows
}

/** Doses a day assumed for an as-needed (SOS) line when the prescription writes no maximum. */
export function sosRows(limits: LimitsData): DataRow[] {
  const doses = (n: number) => `${n} a day`
  const detail = 'Assumed when no maximum is written'
  return [
    ...Object.entries(limits.sos.by_ingredient).map(([id, c]) => row(titleCase(id), detail, doses(c.max_doses_per_day), c.source, c.pharmacist_approved)),
    ...Object.entries(limits.sos.by_class).map(([id, c]) => row(`${id.toUpperCase()} class`, detail, doses(c.max_doses_per_day), c.source, c.pharmacist_approved)),
    row('Any other medicine', detail, doses(limits.sos.fallback.max_doses_per_day), limits.sos.fallback.source, limits.sos.fallback.pharmacist_approved),
  ]
}

const tierName = (t: string | null) => (t ? titleCase(t) : 'Not raised')

/** The alert policy (Track C, public/data/alert_rules.json): budget, interaction tiers, duplicate classes, patient rules, stacking rules. */
export function ruleRows(rules: AlertRules): DataRow[] {
  const b = rules.alert_budget
  const d = rules.ddi_tiers
  return [
    row('Alert budget', b.never_demote?.length ? 'Extra routine Interrupts are shown as Inform; contraindications and kidney "avoid" never are' : 'Extra Interrupts are shown as Inform', `${b.max_interrupts_per_rx} Interrupts a prescription`, 'Team setting', b.pharmacist_approved),
    row('Interactions', 'Severity to tier: major, moderate, minor', `${tierName(d.major)}, ${tierName(d.moderate)}, ${tierName(d.minor)}`, d.source, d.pharmacist_approved),
    ...rules.class_duplication.map((c) => row(c.label, 'Two or more in one prescription', tierName(c.tier), c.source, c.pharmacist_approved)),
    ...rules.patient_rules.map((p) => {
      const crcl = p.crcl_below === undefined ? '' : p.crcl_at_least !== undefined ? `CrCl ${p.crcl_at_least} to below ${p.crcl_below} mL/min` : `CrCl below ${p.crcl_below} mL/min`
      const when = [p.age_at_least !== undefined ? `Age ${p.age_at_least} and over` : '', crcl].filter(Boolean).join(', ')
      return row(titleCase(p.id), when || 'Any patient', tierName(p.tier), p.source, p.pharmacist_approved)
    }),
    ...rules.stack_rules.map((s) => {
      const groups = s.groups.map((g) => (g.min && g.min > 1 ? `${g.min}+ ${g.label}` : g.label)).join(' + ')
      const need = s.min_groups !== undefined && s.min_groups < s.groups.length ? `any ${s.min_groups} of: ${groups}` : groups
      const tier = s.escalate ? `${tierName(s.tier)}; ${tierName(s.escalate.tier)} when higher risk` : tierName(s.tier)
      return row(s.label, need, tier, s.source, s.pharmacist_approved)
    }),
    ...awareRows(rules),
  ]
}

/** WHO AWaRe antibiotic groups: what a Reserve or Watch antibiotic raises, with how many antibiotics are listed in each group. */
const awareRows = (rules: AlertRules): DataRow[] => {
  const a = rules.aware
  if (!a) return []
  const listed = (g: string) => Object.values(a.ingredients).filter((v) => v === g).length
  return (['reserve', 'watch'] as const).map((g) => row(`${titleCase(g)} antibiotics (AWaRe)`, `${listed(g)} antibiotics listed`, tierName(a.tiers[g] ?? null), a.label, a.pharmacist_approved))
}

/** Hand-curated interaction rules (public/data/ddi_supplement.json) that DDInter lacks. Unreadable input gives no rows. */
export function supplementRows(json: unknown): DataRow[] {
  const rules = (json as { rules?: unknown } | null)?.rules
  if (!Array.isArray(rules)) return []
  type Rule = { id?: string; a?: string[]; b?: string[]; level?: string; note?: string; source?: string; pharmacist_approved?: boolean; interrupt?: boolean; effect?: string; reduces?: string[]; evidence?: unknown[] }
  return rules.map((r: Rule) => {
    const level = r.interrupt ? 'Interrupt (contraindicated)' : titleCase(String(r.level ?? ''))
    const value = r.effect === 'reduces_effect' && r.reduces?.length ? `${level}: may weaken ${r.reduces.map(titleCase).join(', ')}` : r.effect === 'adds_effect' ? `${level}: effects add up` : level
    return row(titleCase(String(r.id ?? '')), `${(r.a ?? []).join(', ')} with ${(r.b ?? []).join(', ')}: ${r.note ?? ''}`, value, String(r.source ?? ''), r.pharmacist_approved, r.evidence?.length ? 'Label quote checked' : undefined)
  })
}

/** Alerts the pharmacist chose to log without showing. */
export function suppressionRows(rules: AlertRules): DataRow[] {
  return rules.suppression.map((s) => row(titleCase(s.id), s.reason, 'Logged, not shown', s.source, s.pharmacist_approved))
}

export const approvedCount = (rows: DataRow[]) => rows.filter((r) => r.approved === true).length
