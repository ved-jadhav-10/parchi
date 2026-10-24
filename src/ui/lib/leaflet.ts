import type { ResolvedBrand, Sig } from '../../engine/contracts'

/** Languages the leaflet endpoint writes (api/leaflet.ts). */
export const LEAFLET_LANGUAGES: [code: string, label: string][] = [
  ['hi', 'Hindi'],
  ['mr', 'Marathi'],
  ['gu', 'Gujarati'],
  ['bn', 'Bengali'],
  ['ta', 'Tamil'],
  ['te', 'Telugu'],
  ['kn', 'Kannada'],
  ['ml', 'Malayalam'],
  ['en', 'English'],
]

const count = (n: number, one: string, many: string) => `${Number.isInteger(n) ? n : n.toFixed(1)} ${n === 1 ? one : many}`

/** How a medicine is taken, in plain English, from what the sig parser read. Says "dose not written" rather than guessing. */
export function howTaken(sig: Sig): string {
  const unit = sig.dose_unit === 'ml' ? 'ml' : sig.dose_unit === 'drop' ? 'drops' : sig.dose_unit === 'puff' ? 'puffs' : null
  // Units per time = unit doses a day / times a day ("2 tab TDS" is 6 / 3 = 2 tablets each time).
  const units = sig.administrations_per_day && !sig.sos ? sig.doses_per_day / sig.administrations_per_day : undefined
  const per = sig.volume_ml_per_dose && unit === 'ml' ? `${sig.volume_ml_per_dose} ml` : units ? count(units, unit ? unit.replace(/s$/, '') : 'tablet or capsule', unit ?? 'tablets or capsules') : ''
  const days = sig.duration_days ? `, for ${count(sig.duration_days, 'day', 'days')}` : ''
  if (sig.sos) {
    const max = sig.max_doses_per_day ? `, no more than ${count(sig.max_doses_per_day, 'time', 'times')} a day` : ''
    return `${per ? `${per} ` : ''}only when needed${max}${days}`.trim()
  }
  const times = sig.administrations_per_day ?? sig.doses_per_day
  if (!times) return 'dose not written; ask the pharmacist'
  const freq = times < 1 ? `about ${count(Math.round(times * 7), 'time', 'times')} a week` : `${count(times, 'time', 'times')} a day`
  return `${per ? `${per}, ` : ''}${freq}${days}`
}

/** The request body for api/leaflet: the recognised medicines and how each is taken, plus the points the pharmacist typed. */
export function leafletRequest(language: string, lines: { resolved: ResolvedBrand; sig: Sig | null }[], points: string): {
  language: string
  medicines: { brand: string; how: string }[]
  points: string[]
} {
  const seen = new Set<string>()
  const medicines = lines
    .filter((l) => l.resolved.brand && l.resolved.systemic !== false)
    .map((l) => ({ brand: l.resolved.brand!, how: l.sig ? howTaken(l.sig) : 'dose not written; ask the pharmacist' }))
    .filter((m) => (seen.has(m.brand) ? false : (seen.add(m.brand), true)))
  return { language, medicines, points: points.split(/\r?\n/).map((p) => p.trim()).filter(Boolean) }
}
