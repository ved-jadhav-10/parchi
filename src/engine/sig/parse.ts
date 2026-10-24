// Track B sig parser: Indian dosing text -> Sig (see contracts.ts). Rules only, deterministic, offline.
// Handles 1-0-1 and ½-0-½ patterns, OD/BD/TDS/QID/HS/SOS/STAT, q8h, "x5d", "2 tab TDS", "5 ml BD",
// weekly dosing and common Hinglish ("subah-shaam", "din mein 2 baar", "raat ko").
import type { Sig } from '../contracts'

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4,
}
const NUM = '\\d+(?:\\.\\d+)?'
const NUM_WORD = Object.keys(NUMBER_WORDS).join('|')

/** Words that carry no dose information (meal timing, filler). Anything else left over is reported as unparsed. */
const IGNORE = new Set([
  'ac', 'pc', 'after', 'before', 'with', 'without', 'food', 'meal', 'meals', 'khane', 'khana', 'ke', 'baad', 'pehle',
  'khali', 'pet', 'empty', 'stomach', 'water', 'milk', 'a', 'an', 'the', 'and', 'of', 'in', 'per', 'at', 'on', 'to',
  'daily', 'day', 'days', 'din', 'mein', 'ko', 'roz', 'lena', 'le', 'lo', 'dose', 'doses', 'tab', 'tabs', 'tablet',
  'tablets', 'cap', 'caps', 'capsule', 'capsules', 'x', 'for', 'next', 'continue', 'then', 'times', 'time', 'baar',
  'bar', 'max', 'maximum', 'upto', 'up', 'not', 'more', 'than', 'no', 'only', 'if', 'when', 'as', 'required', 'needed',
  'need', 'basis', 'hourly', 'hrly', 'hours', 'hour', 'hrs', 'hr', 'every', 'regularly', 'orally', 'oral', 'po',
  'till', 'until', 'finished', 'finish', 'review', 'ongoing', 'course', 'follow', 'stop', 'reassess', 'long', 'term', 'lifelong', 'indefinitely',
  'breakfast', 'lunch', 'dinner', 'nashta', 'nashte', 'bhojan', 'tea', 'chai',
])

function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/×/g, 'x')
    .replace(/(\d)\s*½/g, '$1.5')
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/\b1\/2\b/g, '0.5')
    .replace(/\b1\/4\b/g, '0.25')
    .replace(/\b3\/4\b/g, '0.75')
    .replace(/(?<=[\d.])\+(?=[\d.])/g, '-')
    .replace(/(?<=[a-z])-(?=[a-z])/g, ' ')
    // dotted Latin initialisms: b.i.d., t.d.s., q.i.d., o.d., p.r.n., q.1.d. -> bid, tds, qid, od, prn, q1d
    .replace(/\bq\.1\.d\b\.?/g, 'qd')
    .replace(/(?<![\w.])(?:[a-z]\.){2,4}/g, (m) => m.replace(/\./g, ''))
    .replace(/\bs\.?\s?o\.?\s?s\.?(?=\W|$)/g, 'sos')
    .replace(/[,;:()[\]]/g, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Counts written out in a course length ("for ten days"). Needs "for", so "one week" alone is never read as a duration here. */
const DURATION_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
}

/** Longest course the parser will believe (ten years). */
export const MAX_DURATION_DAYS = 3650

const toNum = (s: string): number => (s in NUMBER_WORDS ? NUMBER_WORDS[s] : parseFloat(s))

/** Remove the first match of `re` from `state.text` and return it. */
function take(state: { text: string }, re: RegExp): RegExpExecArray | null {
  const m = re.exec(state.text)
  if (m) state.text = (state.text.slice(0, m.index) + ' ' + state.text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
  return m
}

const ABBREVIATIONS: [RegExp, number][] = [
  [/\b(?:qid|qds|q1d)\b/, 4],
  [/\b(?:tds|tid|td)\b/, 3],
  [/\b(?:bd|bid|bds)\b/, 2],
  [/\b(?:od|qd|qhs|hs|qam|qpm|mane|nocte|bedtime)\b/, 1],
  [/\b(?:qod|eod)\b/, 0.5],
  [/\bqwk\b/, 1 / 7],
]

interface Frequency {
  administrations: number
}

/** 1-0-1, 1-1-1-1, 0.5-0-0.5 (3-4 slots), or 1-2 (2 slots: a range when a unit or frequency word follows, else morning-night). */
function parseSlots(state: { text: string }): { slots: number[]; range: boolean } | null {
  const m = take(state, new RegExp(`(?<![\\w.-])(${NUM}(?:-${NUM}){1,3})(?![\\w.-])`))
  if (!m) return null
  const slots = m[1].split('-').map(Number)
  const range = slots.length === 2 && /\b(?:tabs?|tablets?|caps?|capsules?|od|bd|tds|tid|qid|hs|ml|tsp)\b/.test(state.text)
  return { slots, range }
}

function parseFrequency(state: { text: string }): Frequency | null {
  // q8h, every 6 hours, 8 hourly
  const hourly =
    take(state, /\bq\s?(\d{1,2})\s?h(?:rs?|ours?)?\b/) ??
    take(state, /\bevery\s+(\d{1,2})\s*(?:h|hrs?|hours?)\b/) ??
    take(state, /\b(\d{1,2})\s*(?:hourly|hrly)\b/)
  if (hourly) return { administrations: 24 / Number(hourly[1]) }
  // weekly and alternate day
  if (take(state, /\b(?:alternate days?|every other day|alt day)\b/)) return { administrations: 0.5 }
  if (take(state, /\b(?:once\s+(?:a\s+|per\s+)?month(?:ly)?|monthly|every month|1\s*\/\s*month)\b/)) return { administrations: 1 / 30 }
  // "weekly" or a count before "week" (once a week, twice weekly, 2 x week). A bare "week" is a duration ("for a week"), not a schedule.
  const weekly = take(
    state,
    new RegExp(`\\b(?:(once|twice|thrice|${NUM}\\s*(?:x|times))\\s*(?:a|per|/|in)?\\s*(?:weekly|week|wk|hafte)|(?:every|per|each)\\s+week|weekly)\\b`),
  )
  if (weekly) {
    const k = weekly[1]?.trim()
    const n = !k ? 1 : k === 'once' ? 1 : k === 'twice' ? 2 : k === 'thrice' ? 3 : parseFloat(k)
    return { administrations: n / 7 }
  }
  for (const [re, n] of ABBREVIATIONS) if (take(state, re)) return { administrations: n }
  // once / twice / thrice (a day)
  const word = take(state, /\b(once|twice|thrice)\b/)
  if (word) return { administrations: word[1] === 'once' ? 1 : word[1] === 'twice' ? 2 : 3 }
  // 3 times a day, 3x/day, din mein 2 baar, do baar, 2/day
  const times = take(state, new RegExp(`\\b(${NUM}|${NUM_WORD})\\s*(?:x|times?|baar|bar|doses?)\\b(?:\\s*(?:a|per|/|in|ek)?\\s*(?:day|daily|din))?`))
  if (times) return { administrations: toNum(times[1]) }
  const perDay = take(state, new RegExp(`\\b(${NUM})\\s*/\\s*(?:day|d)\\b`))
  if (perDay) return { administrations: Number(perDay[1]) }
  if (take(state, /\b(?:once daily|daily|roz|everyday|every day)\b/)) return { administrations: 1 }
  // times of day: "subah shaam", "morning night"
  const found = new Set<string>()
  const tod: [string, RegExp][] = [
    ['morning', /\b(?:morning|subah|mane|am)\b/],
    ['noon', /\b(?:noon|afternoon|dopahar)\b/],
    ['evening', /\b(?:evening|shaam|sham|pm)\b/],
    ['night', /\b(?:night|raat|bedtime)\b/],
  ]
  for (const [name, re] of tod) if (take(state, re)) found.add(name)
  if (found.size) return { administrations: found.size }
  return null
}

function parseDuration(state: { text: string }): number | undefined {
  // "for a week", "for one month", "for a fortnight": a count of one written as a word. Needs "for" so "once a week" is not a duration.
  const word = take(state, /\bfor\s+(?:the\s+next\s+)?(?:a|an|one)\s+(day|week|month|fortnight)\b/)
  if (word) return { day: 1, week: 7, fortnight: 14, month: 30 }[word[1] as 'day' | 'week' | 'fortnight' | 'month']
  // "for ten days", "for the next two weeks"
  const spelled = take(state, new RegExp(`\\bfor\\s+(?:the\\s+next\\s+)?(${Object.keys(DURATION_WORDS).join('|')})\\s+(days?|weeks?|months?)\\b`))
  if (spelled) return DURATION_WORDS[spelled[1]] * (spelled[2].startsWith('w') ? 7 : spelled[2].startsWith('m') ? 30 : 1)
  // Shorthand "x 5/7" (days), "2/52" (weeks), "1/12" (months)
  const frac = take(state, new RegExp(`(?:\\bx|\\bfor)\\s*(\\d{1,3})\\s*/\\s*(7|52|12)\\b|(?<![\\w.-])(\\d{1,3})\\s*/\\s*(52|12)\\b`))
  if (frac) {
    const n = Number(frac[1] ?? frac[3])
    const per = frac[2] ?? frac[4]
    return per === '7' ? n : per === '52' ? n * 7 : n * 30
  }
  // "5 days", "x 3-5 days" (a range uses the upper end, the longer course), "for 2 weeks"
  const m = take(
    state,
    new RegExp(`(?:(?:\\bx|\\bfor\\s+(?:next\\s+)?|\\bnext\\s+|\\bcontinue\\s+for\\s+)\\s*|(?<![\\w.-]))(${NUM})(?:\\s*-\\s*(${NUM}))?\\s*(days?|d|din|weeks?|wks?|w|hafta|hafte|haftey|fortnights?|months?|mths?|mahina|mahine)\\b`),
  )
  if (!m) return undefined
  const n = Math.max(Number(m[1]), m[2] !== undefined ? Number(m[2]) : 0)
  const unit = m[3]
  if (/^fortnight/.test(unit)) return n * 14
  if (/^(?:w|wks?|weeks?|haft)/.test(unit)) return n * 7
  if (/^(?:m|mth|mahin)/.test(unit)) return n * 30
  return n
}

/** Parse the dosing part of one prescription line. Never throws; unknown text lowers `confidence`. */
export function parseSig(raw: string): Sig {
  // "2 tab stat then 1 tab TDS", "1-0-1 x5d then 1-0-0": more than one phase. Daily totals use the highest phase.
  // "x 10 days then stop" / "then review" is one phase: the closing word is not a dose.
  const phases = normalise(raw)
    .split(/\b(?:then|followed by|thereafter|phir)\b/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(?:stop|stopped|review|and review|finish|finished|discontinue|reassess)$/.test(p))
  if (phases.length > 1) {
    const parsed = phases.map(parseSig)
    const worst = parsed.reduce((a, b) => (Math.max(b.doses_per_day, b.max_doses_per_day) > Math.max(a.doses_per_day, a.max_doses_per_day) ? b : a))
    return {
      ...worst,
      confidence: Math.min(worst.confidence ?? 1, 0.7),
      assumptions: [...(worst.assumptions ?? []), 'More than one dosing phase written (loading, tapering or step-down); used the highest daily amount as the worst case'],
    }
  }
  const state = { text: normalise(raw) }
  const assumptions: string[] = []
  const unparsed: string[] = []

  const stat = take(state, /\bstat\b/) !== null
  const durationRaw = parseDuration(state)
  // A course of 0 days or more than ten years is a typo or noise, not a duration: ignore it and say so.
  const duration_days = durationRaw !== undefined && durationRaw >= 1 && durationRaw <= MAX_DURATION_DAYS ? durationRaw : undefined
  if (durationRaw !== undefined && duration_days === undefined) assumptions.push(`Course length "${durationRaw}" days is not plausible and was ignored`)
  const slotMatch = parseSlots(state)
  const sosRe = /\b(?:sos|prn|as needed|as required|as and when required|if needed|if required|when needed|when required|need basis|jab zaroorat ho|zaroorat padne par|zaroorat ho to|zarurat ho to|if (?:fever|pain|vomiting|nausea|cough))\b/
  let sos = false
  while (take(state, sosRe)) sos = true

  // Dose size: liquids first (a bare "5 ml" must not look like a tablet count)
  let volume: number | undefined
  let dose_unit: Sig['dose_unit'] = 'unit'
  let unitCount: number | undefined
  const ml = take(state, new RegExp(`(${NUM})\\s*ml\\b`))
  if (ml) {
    volume = Number(ml[1])
    dose_unit = 'ml'
  } else {
    const spoon = take(state, new RegExp(`(?:(${NUM}|${NUM_WORD})\\s*)?(tsp|teaspoons?|tbsp|tablespoons?|chamach)\\b`))
    if (spoon) {
      const n = spoon[1] ? toNum(spoon[1]) : 1
      volume = n * (/^tb/.test(spoon[2]) ? 15 : 5)
      dose_unit = 'ml'
    }
  }
  if (!ml) {
    const drops = take(state, new RegExp(`(${NUM})\\s*(?:drops?|gtt|bund)\\b`))
    const puffs = !drops ? take(state, new RegExp(`(${NUM})\\s*puffs?\\b`)) : null
    if (drops || puffs) {
      unitCount = Number((drops ?? puffs)![1])
      dose_unit = drops ? 'drop' : 'puff'
    }
  }
  if (dose_unit === 'unit') {
    const tabs = take(state, new RegExp(`(${NUM}|${NUM_WORD})\\s*(?:tabs?|tablets?|caps?|capsules?|pills?)\\b`))
    if (tabs) unitCount = toNum(tabs[1])
  }

  // SOS daily maximum: "max 3", "upto 4 times", "max TDS"
  let sosCap: number | undefined
  if (sos) {
    const cap = take(state, new RegExp(`\\b(?:max(?:imum)?|upto|up to|not more than|no more than)\\s*(${NUM}|${NUM_WORD})\\b(?!\\s*(?:mg|ml|g)\\b)(?:\\s*(?:times?|doses?|/\\s*day|a day|per day|daily))?`))
    if (cap) sosCap = toNum(cap[1])
    else state.text = state.text.replace(/\b(?:max(?:imum)?|upto|up to|not more than|no more than)\b/g, ' ').trim()
  }

  const freq = slotMatch && !slotMatch.range ? null : parseFrequency(state)

  let administrations: number
  let unitsPerDay: number
  let confidence = 1
  let dosingMissing = false
  if (slotMatch && !slotMatch.range) {
    administrations = slotMatch.slots.filter((p) => p > 0).length
    unitsPerDay = slotMatch.slots.reduce((a, b) => a + b, 0)
  } else if (freq) {
    administrations = freq.administrations
    if (slotMatch?.range) {
      unitCount = Math.max(...slotMatch.slots)
      assumptions.push(`Dose range written; used the upper end (${unitCount}) as the worst case`)
    }
    unitsPerDay = administrations * (unitCount ?? 1)
  } else if (sos || stat) {
    administrations = 0
    unitsPerDay = 0
  } else if (state.text === '' && raw.trim() === '') {
    // A cart line has a product and a pack, not a frequency. Guessing "once daily" would understate a TDS course, so the
    // line is counted as "dosing not entered" and left out of the daily totals (it still takes part in duplicate and interaction checks).
    administrations = 0
    unitsPerDay = 0
    dosingMissing = true
    assumptions.push('No dosing written')
    confidence = 0.4
  } else {
    administrations = 1
    unitsPerDay = unitCount ?? 1
    assumptions.push('Could not find how often to take it; assumed once daily')
    confidence = 0.4
  }

  if (stat) {
    administrations = administrations || 1
    unitsPerDay = unitsPerDay || unitCount || 1
  }

  for (const w of state.text.split(' ').filter(Boolean)) if (/[a-z0-9]/.test(w) && !IGNORE.has(w)) unparsed.push(w)
  if (unparsed.length) confidence = Math.min(confidence, 0.6)
  if ((dose_unit === 'drop' || dose_unit === 'puff') && !sos) {
    assumptions.push(`Dose in ${dose_unit}s cannot be turned into mg without the product's strength per ${dose_unit}`)
    confidence = Math.min(confidence, 0.6)
  }

  const out: Sig = { doses_per_day: 0, max_doses_per_day: 0, sos }
  if (sos) {
    // Scheduled part is whatever was written outside the SOS words (usually nothing); worst case is the cap.
    const capAdmin = sosCap ?? (freq || slotMatch ? administrations : undefined)
    const perDose = dose_unit === 'ml' ? 1 : unitCount ?? 1
    out.doses_per_day = 0
    if (slotMatch && !slotMatch.range && sosCap === undefined) {
      out.max_doses_per_day = unitsPerDay
    } else if (capAdmin !== undefined) {
      out.max_doses_per_day = capAdmin * perDose
    } else {
      out.max_doses_per_day = 0
      out.sos_cap_unspecified = true
      assumptions.push('SOS with no daily maximum written; the worst-case cap comes from the limits data')
    }
    out.administrations_per_day = 0
  } else {
    out.doses_per_day = dose_unit === 'ml' || dose_unit === 'drop' || dose_unit === 'puff' ? administrations : unitsPerDay
    out.max_doses_per_day = out.doses_per_day
    out.administrations_per_day = administrations
  }
  if (dosingMissing) out.dosing_missing = true
  if (volume !== undefined) out.volume_ml_per_dose = volume
  if (dose_unit !== 'unit') out.dose_unit = dose_unit
  else if (unitCount !== undefined || freq || slotMatch) out.dose_unit = 'unit'
  if (duration_days !== undefined) out.duration_days = duration_days
  if (stat) out.stat = true
  out.confidence = Math.round(confidence * 100) / 100
  if (assumptions.length) out.assumptions = assumptions
  if (unparsed.length) out.unparsed = unparsed
  return out
}
