// Track B ingredient ledger: mg/day per ingredient, summed across every brand on the prescription.
// A brand's ingredients come from Track A's resolver; how often it is taken comes from the sig parser.
// SOS (as needed) lines count at their worst case. Anything that cannot be turned into mg is reported, never counted as 0.
import type { Ledger, ResolvedBrand, Route, Sig } from '../contracts'
import { LIMITS, sosCapFor, type LimitsData } from '../limits'

export interface LedgerLine {
  resolved: ResolvedBrand
  sig: Sig
}

export interface LedgerNote {
  kind:
    | 'unresolved'
    | 'not_systemic'
    | 'unquantified_strength'
    | 'unquantified_dose'
    | 'unquantified_volume'
    | 'sos_cap_assumed'
    | 'assumed_measure'
    | 'volume_on_solid'
    | 'schedule_mismatch'
    | 'dosing_not_entered'
  line: number
  brand: string
  ingredient?: string
  message: string
}

export interface LedgerOptions {
  /** Ingredient classes (Track A: resolver.ingredient(id)?.classes), used to pick a class-level SOS cap. */
  classesOf?: (id: string) => string[] | undefined
  limits?: LimitsData
}

const NON_SYSTEMIC: Route[] = ['topical', 'ophthalmic', 'otic', 'nasal', 'vaginal', 'inhaled', 'rectal']
/** Oral liquid forms (Track A form names): the strength is per some volume, so without `per_volume_ml` mg/day is unknown. */
const ORAL_LIQUID_FORMS = new Set(['syrup', 'suspension', 'dry_syrup', 'oral_solution', 'oral_drops'])
/** Administrations per day above which a weekly or monthly drug is being read as taken more often than labelled. */
const SCHEDULE_MAX_PER_DAY = { weekly: 1 / 7, monthly: 1 / 28 } as const
const round2 = (n: number) => Math.round(n * 100) / 100

function countsSystemically(r: ResolvedBrand): boolean {
  if (r.systemic !== undefined) return r.systemic
  return !(r.route !== undefined && NON_SYSTEMIC.includes(r.route))
}

const mgText = (n: number) => `${round2(n).toLocaleString('en-US')}`

/**
 * Add up every ingredient across the prescription. `total_mg_day` = scheduled + SOS worst case; the two parts are
 * also returned so the UI can show "only if the SOS dose is used at its maximum".
 */
export function computeLedger(lines: LedgerLine[], opts: LedgerOptions = {}): { ledger: Ledger; notes: LedgerNote[] } {
  const limits = opts.limits ?? LIMITS
  const ledger: Ledger = {}
  const notes: LedgerNote[] = []

  lines.forEach(({ resolved: r, sig }, i) => {
    const name = r.brand ?? r.raw
    if (r.ingredients.length === 0) {
      notes.push({ kind: 'unresolved', line: i, brand: name, message: `"${r.raw}" was not recognised, so its ingredients are not in the totals` })
      return
    }
    if (!countsSystemically(r)) {
      notes.push({ kind: 'not_systemic', line: i, brand: name, message: `${name} is applied locally (${r.route ?? 'topical'}), so it is left out of the daily totals` })
      return
    }

    if (sig.dosing_missing) {
      notes.push({ kind: 'dosing_not_entered', line: i, brand: name, message: `${name}: dosing not entered, so its daily total was not computed${r.schedule_hint ? `; it is normally taken ${r.schedule_hint === 'weekly' ? 'once a week' : 'once a month'}, so confirm how it is taken` : ''}` })
      return
    }

    const perDay = sig.administrations_per_day ?? sig.doses_per_day
    if (r.schedule_hint && !sig.sos && perDay > SCHEDULE_MAX_PER_DAY[r.schedule_hint] + 1e-9) {
      notes.push({
        kind: 'schedule_mismatch',
        line: i,
        brand: name,
        message: `${name} is normally taken ${r.schedule_hint === 'weekly' ? 'once a week' : 'once a month'} (${r.schedule_source ?? 'labelled schedule'}), but the dosing reads as ${round2(perDay)} time${perDay === 1 ? '' : 's'} a day`,
      })
    }

    for (const ing of r.ingredients) {
      if (ORAL_LIQUID_FORMS.has(r.form) && !(ing.per_volume_ml && ing.per_volume_ml > 0) && !ing.strength_unknown && !ing.other_unit && ing.mg > 0) {
        notes.push({
          kind: 'unquantified_volume',
          line: i,
          brand: name,
          ingredient: ing.id,
          message: `${name} is a liquid and the source does not say what volume its ${ing.mg} mg of ${ing.id} is in, so it is not added to the totals; check the pack`,
        })
        continue
      }
      if (ing.strength_unknown || ing.other_unit || !(ing.mg > 0)) {
        notes.push({
          kind: 'unquantified_strength',
          line: i,
          brand: name,
          ingredient: ing.id,
          message: ing.other_unit
            ? `${ing.id} in ${name} is measured in ${ing.other_unit.unit}, not mg, so it is not added to the mg totals`
            : `${name} does not give a usable strength for ${ing.id}, so it is not added to the totals`,
        })
        continue
      }
      if (sig.dose_unit === 'drop' || sig.dose_unit === 'puff') {
        notes.push({ kind: 'unquantified_dose', line: i, brand: name, ingredient: ing.id, message: `${name} is dosed in ${sig.dose_unit}s, which cannot be turned into mg here` })
        continue
      }

      // Units per day for this ingredient: tablets/capsules, or millilitres for liquids.
      const liquid = ing.per_volume_ml !== undefined && ing.per_volume_ml > 0
      let sosCapAssumed: { doses: number; source: string } | undefined
      let scheduledUnits: number
      let sosUnits = 0
      let detail: string

      const adminsScheduled = sig.administrations_per_day ?? sig.doses_per_day
      if (liquid) {
        const perDoseMl = sig.volume_ml_per_dose ?? ing.per_volume_ml!
        if (sig.volume_ml_per_dose === undefined) {
          notes.push({ kind: 'assumed_measure', line: i, brand: name, ingredient: ing.id, message: `No volume written for ${name}; assumed one measure (${ing.per_volume_ml} mL) per dose` })
        }
        scheduledUnits = adminsScheduled * perDoseMl
        if (sig.sos) {
          const admins = sig.max_doses_per_day || (sosCapAssumed = pickCap(ing.id)).doses
          sosUnits = admins * perDoseMl
        }
        detail = `${round2(scheduledUnits + sosUnits)} mL x ${mgText(ing.mg)} mg/${ing.per_volume_ml} mL`
      } else {
        if (sig.volume_ml_per_dose !== undefined) {
          notes.push({ kind: 'volume_on_solid', line: i, brand: name, ingredient: ing.id, message: `${name} is a solid form but the dose is written in mL; counted by the number of doses` })
        }
        scheduledUnits = sig.sos ? 0 : sig.doses_per_day
        if (sig.sos) sosUnits = sig.max_doses_per_day || (sosCapAssumed = pickCap(ing.id)).doses
        detail = `${round2(scheduledUnits + sosUnits)} x ${mgText(ing.mg)} mg`
      }

      const factor = liquid ? ing.mg / ing.per_volume_ml! : ing.mg
      const scheduledMg = scheduledUnits * factor
      const sosMg = sosUnits * factor
      if (sosCapAssumed) {
        notes.push({
          kind: 'sos_cap_assumed',
          line: i,
          brand: name,
          ingredient: ing.id,
          message: `${name} is SOS with no maximum written; worst case assumed ${sosCapAssumed.doses} doses/day (${sosCapAssumed.source})`,
        })
      }

      const entry = (ledger[ing.id] ??= { total_mg_day: 0, sources: [], scheduled_mg_day: 0, sos_mg_day: 0 })
      entry.scheduled_mg_day = round2((entry.scheduled_mg_day ?? 0) + scheduledMg)
      entry.sos_mg_day = round2((entry.sos_mg_day ?? 0) + sosMg)
      entry.total_mg_day = round2(entry.scheduled_mg_day + entry.sos_mg_day)
      entry.sources.push(`${name}: ${sig.sos ? 'SOS, up to ' : ''}${detail}`)

      const caveats = (entry.caveats ??= [])
      const push = (c: string) => caveats.includes(c) || caveats.push(c)
      if (ing.per_volume_assumed) push(`${name}: strength per ${ing.per_volume_ml} mL was not stated and is assumed (usual syrup convention); check the pack`)
      if (r.composition_complete === false) push(`${name}: the source may list only some of its ingredients, so this total could be understated`)
      if (r.needs_pharmacist || r.confidence < 0.75) push(`${name}: brand match is uncertain (${Math.round(r.confidence * 100)}%); confirm it`)
      if ((sig.confidence ?? 1) < 0.7 || sig.assumptions?.length) push(`${name}: dosing was assumed (${sig.assumptions?.join('; ') ?? 'unclear'})`)
      if (sosCapAssumed) push(`${name}: SOS counted at an assumed ${sosCapAssumed.doses} doses/day`)
    }
  })

  for (const e of Object.values(ledger)) {
    if (e.sos_mg_day === 0) delete e.sos_mg_day
    if (e.caveats && e.caveats.length === 0) delete e.caveats
  }
  return { ledger, notes }

  function pickCap(id: string) {
    const c = sosCapFor(id, opts.classesOf?.(id), limits)
    return { doses: c.max_doses_per_day, source: c.pharmacist_approved ? c.source : `${c.source}; unverified` }
  }
}

/** Contract-shaped ledger only, for callers that do not need the notes. */
export function buildLedger(lines: LedgerLine[], opts?: LedgerOptions): Ledger {
  return computeLedger(lines, opts).ledger
}
