// Display helpers for Track A's ResolvedBrand (docs/track-a-data.md). Pure functions, no React.
import type { Ingredient, ResolvedBrand } from '../../engine/contracts'
import { mg, titleCase } from './format'

/** Used only when a result carries no `needs_pharmacist` (the mock): below this a line is checked. */
const REVIEW_BELOW = 0.9

/** Track A decides when a line needs the pharmacist; absent means "not flagged", except an unmatched line. */
export const needsReview = (r: ResolvedBrand): boolean => r.needs_pharmacist ?? (r.brand === null || r.confidence < REVIEW_BELOW)

const UNITS: Record<string, string> = { percent_ww: '% w/w', percent_wv: '% w/v', percent_vv: '% v/v', iu: 'IU' }
export const unitLabel = (u: string) => UNITS[u] ?? u.replace(/_/g, ' ')

/** Never "0 mg" for a strength that is not in mg or not known. */
export const strengthLabel = (i: Ingredient): string => {
  if (i.strength_unknown) return 'strength not listed'
  if (i.other_unit) return `${i.other_unit.amount.toLocaleString('en-IN')} ${unitLabel(i.other_unit.unit)}`
  const s = `${mg(i.mg)} mg`
  return i.per_volume_ml ? `${s} per ${mg(i.per_volume_ml)} mL` : s
}

export const ingredientLabel = (i: Ingredient) => `${titleCase(i.id)} ${strengthLabel(i)}`

/** Only systemic lines count toward the daily mg total; gels, eye and ear drops do not. Absent means counted. */
export const countsTowardTotal = (r: ResolvedBrand) => r.systemic !== false

/** The name shown for a line: the matched brand, the generic ingredients, or "No match found". */
export const brandLabel = (r: ResolvedBrand): string => {
  if (r.brand) return r.brand
  if (r.match === 'generic' && r.ingredients.length > 0) return r.ingredients.map((i) => titleCase(i.id)).join(' + ')
  return 'No match found'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "JUL-2026" -> "Jul 2026". Anything else is shown as given. */
export const nsqMonth = (m: string) => {
  const [mon, yr] = m.split('-')
  return mon && yr && mon.length === 3 ? `${mon[0].toUpperCase()}${mon.slice(1).toLowerCase()} ${yr}` : m
}

/** CDSCO prints the failed test in capitals. */
export const sentenceCase = (s: string) => {
  const t = s.trim().toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** "2026-06-11" -> "11 Jun 2026". Anything else is shown as given. */
export const isoDate = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : d
}

/** A candidate the text could also mean, as one line: "Zerodol-P 100mg/500mg: Aceclofenac 100 mg + Paracetamol 500 mg". */
export const candidateLabel = (c: NonNullable<ResolvedBrand['candidates']>[number]) => `${c.brand}: ${c.ingredients.map(ingredientLabel).join(' + ')}`

/** Drops trailing full stops and spaces, so a sentence we end ourselves never doubles up ("Ltd.." ). */
export const tidy = (s: string) => s.replace(/[.\s]+$/, '')

/**
 * Track A's notes minus the ones that only restate a field the detail already shows in full (the failed batches
 * and the incomplete composition), so the pharmacist does not read the same thing twice.
 */
export const notesFor = (r: ResolvedBrand): string[] =>
  (r.notes ?? []).filter(
    (n) => !((r.nsq?.length ?? 0) > 0 && /^CDSCO lists \d+ failed batch/i.test(n)) && !(r.composition_complete === false && /^Source lists at most two ingredients/i.test(n)),
  )
