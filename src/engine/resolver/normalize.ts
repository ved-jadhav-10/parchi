// Text normalisation shared by brand and ingredient lookup.
// The ingredient functions are a port of data/rxdata/ingredients.py; a parity test checks the
// examples that data/build.py writes into ingredients.json.

const QUALIFIER_RE =
  /\s*\((?:as|eq\.?|equivalent|expressed|in the form)[^)]*\)|\s+as\s+.*$|\s+eq\.?\s*to\b.*$|\s+equivalent to\b.*$/i
const PREFIX_RE = /^(?:combikit of|dried|light|heavy|purified|precipitated|exsiccated|colloidal)\s+/

export function normaliseText(raw: string): string {
  let t = (raw ?? '').toLowerCase().trim()
  t = t.replace(/&/g, ' and ').replace(/’/g, "'")
  t = t.replace(/sulph/g, 'sulf').replace(/aluminum/g, 'aluminium')
  t = t.replace(/\//g, ' ') // "Paracetamol/Acetaminophen"
  t = t.replace(/\s*-\s*/g, '-')
  t = t.replace(/\s+/g, ' ')
  return t.replace(/^[ .,;]+|[ .,;]+$/g, '')
}

export function stripQualifiers(text: string): string {
  let t = text.replace(QUALIFIER_RE, '')
  t = t.replace(/\s*\([^)]*\)/g, '')
  t = t.replace(/\s+from\s+.*$/, '')
  t = t.trim().replace(PREFIX_RE, '')
  return t.replace(/\s+/g, ' ').replace(/^[ .,;]+|[ .,;]+$/g, '')
}

export function stripSaltWords(text: string, saltWords: Set<string>, inorganicBases: Set<string>): string {
  const words = text.split(' ')
  if (words.length >= 2 && inorganicBases.has(words[0])) return text
  while (words.length > 1 && saltWords.has(words[words.length - 1])) words.pop()
  return words.join(' ')
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export interface CanonicalTables {
  aliases: Record<string, string>
  saltWords: Set<string>
  inorganicBases: Set<string>
}

/** Port of Registry._canonical: alias table first, then strip qualifiers and salts, else a slug. */
export function canonicalize(raw: string, t: CanonicalTables): string | null {
  const text = normaliseText(raw)
  if (!text) return null
  if (t.aliases[text]) return t.aliases[text]
  const stripped = stripQualifiers(text)
  if (t.aliases[stripped]) return t.aliases[stripped]
  const base = stripSaltWords(stripped, t.saltWords, t.inorganicBases)
  if (t.aliases[base]) return t.aliases[base]
  return slugify(base || stripped) || null
}

// --- Devanagari -> Latin (enough for brand names typed in Hindi script, e.g. "डोलो 650") ---

const CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n', च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'f', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', व: 'v', श: 'sh',
  ष: 'sh', स: 's', ह: 'h', क़: 'q', ख़: 'kh', ग़: 'g', ज़: 'z', ड़: 'r', ढ़: 'rh', फ़: 'f',
}
const VOWELS: Record<string, string> = {
  अ: 'a', आ: 'a', इ: 'i', ई: 'i', उ: 'u', ऊ: 'u', ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऑ: 'o',
}
const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o',
}
const VIRAMA = '्'
const DIGITS = '०१२३४५६७८९'

export function transliterateDevanagari(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text
  const chars = [...text.normalize('NFC')]
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const next = chars[i + 1]
    if (CONSONANTS[c] !== undefined) {
      out += CONSONANTS[c]
      if (next === VIRAMA) { i++; continue }
      if (next && MATRAS[next] !== undefined) { out += MATRAS[next]; i++; continue }
      // inherent "a", dropped at the end of a word (schwa deletion: "डोलो" -> "dolo", "पैन" -> "pain")
      const atWordEnd = !next || !/[ऀ-ॿ]/.test(next) || next === 'ं' || next === 'ँ'
      if (!atWordEnd) out += 'a'
    } else if (VOWELS[c] !== undefined) out += VOWELS[c]
    else if (c === 'ं' || c === 'ँ') out += 'n'
    else if (c === 'ः') out += 'h'
    else if (DIGITS.includes(c)) out += String(DIGITS.indexOf(c))
    else if (c === 'ऽ' || c === '़') continue
    else out += c
  }
  return out
}

// --- brand query parsing ---

/** Tokens that join words in a brand name and carry no identity ("Cold & Flu", "cold n flu"). */
const CONNECTORS = new Set(['and', 'n', '&', '+', 'with'])
/** Leading or trailing dosage-form words a pharmacist types ("Tab. Dolo 650", "Ascoril LS syp"). */
const FORM_HINTS: Record<string, string> = {
  tab: 'tablet', tabs: 'tablet', tablet: 'tablet', tablets: 'tablet',
  cap: 'capsule', caps: 'capsule', capsule: 'capsule', capsules: 'capsule',
  syp: 'liquid', syr: 'liquid', syrup: 'liquid', susp: 'liquid', suspension: 'liquid', liquid: 'liquid', expectorant: 'liquid',
  drop: 'drops', drops: 'drops', gtt: 'drops',
  inj: 'injection', injection: 'injection', amp: 'injection', vial: 'injection', iv: 'injection',
  oint: 'topical', ointment: 'topical', cream: 'topical', gel: 'topical', lotion: 'topical',
  inh: 'inhaled', inhaler: 'inhaled', rotacap: 'inhaled', respules: 'inhaled', puff: 'inhaled',
}
/** Product forms that satisfy each typed hint. */
export const HINT_FORMS: Record<string, Set<string>> = {
  tablet: new Set(['tablet']),
  capsule: new Set(['capsule']),
  liquid: new Set(['syrup', 'suspension', 'dry_syrup', 'oral_solution']),
  drops: new Set(['oral_drops', 'eye_drops', 'ear_drops', 'eye_ear_drops', 'nasal_drops']),
  injection: new Set(['injection']),
  topical: new Set(['cream', 'ointment', 'gel', 'lotion', 'spray', 'topical_solution', 'dusting_powder']),
  inhaled: new Set(['inhaler', 'respules']),
}

const STRENGTH_RE = /^(\d+(?:\.\d+)?)(mg|mcg|g|gm|ml|iu|%)?$/

export interface ParsedName {
  /** identity tokens, lowercase, connectors and strengths removed */
  tokens: string[]
  compact: string
  /** strengths in mg (g and mcg converted); volumes and bare-unit numbers are not included */
  numbers: number[]
  /** per entry of `numbers`: true when typed without a unit ("Thyronorm 50" means 50 mcg) */
  unitless: boolean[]
  formHint?: string
}

function toMg(value: number, unit: string | undefined): number | null {
  if (!unit || unit === 'mg') return value
  if (unit === 'g' || unit === 'gm') return value * 1000
  if (unit === 'mcg') return value / 1000
  return null // ml, iu, %: not a mg strength
}

/** Split a brand name or typed query into identity tokens and strengths. */
export function parseName(raw: string): ParsedName {
  let t = transliterateDevanagari(raw).toLowerCase()
  t = t.replace(/&/g, ' & ').replace(/(\d)\s+(mg|mcg|gm|g|ml|iu)\b/g, '$1$2')
  t = t.replace(/\b([a-z]{2,})(\d{2,})/g, '$1 $2') // "dolo650" -> "dolo 650"; "b12", "d3" stay whole
  // split "650mg/5ml"-style or "500/125" strengths into separate number tokens
  const pieces = t.split(/[^a-z0-9.%&+]+|(?<=\d)\/(?=\d)|\/(?=\d)/).filter(Boolean)
  const tokens: string[] = []
  const numbers: number[] = []
  const unitless: boolean[] = []
  let formHint: string | undefined
  for (const piece of pieces) {
    const p = piece.replace(/^\.+|\.+$/g, '')
    if (!p) continue
    const m = STRENGTH_RE.exec(p)
    if (m) {
      const mg = toMg(parseFloat(m[1]), m[2])
      if (mg != null) {
        numbers.push(mg)
        unitless.push(!m[2])
      }
      continue
    }
    if (CONNECTORS.has(p)) continue
    tokens.push(p.replace(/\./g, ''))
  }
  // dosage-form words at either end are hints, not identity ("tab dolo 650", "ascoril ls syp")
  while (tokens.length > 1 && FORM_HINTS[tokens[0]]) formHint = FORM_HINTS[tokens.shift()!]
  while (tokens.length > 1 && FORM_HINTS[tokens[tokens.length - 1]]) formHint = FORM_HINTS[tokens.pop()!]
  return { tokens, compact: tokens.join(''), numbers, unitless, formHint }
}

/** Release/strength modifiers that often trail a brand name without changing its identity much. */
export const MODIFIERS = new Set([
  'duo', 'forte', 'plus', 'sr', 'cr', 'er', 'xr', 'xl', 'od', 'ds', 'dt', 'mr', 'la', 'pr', 'ir', 'kid', 'kids',
  'junior', 'jr', 'retard', 'new', 'mt', 'md', 'fast', 'rapid', 'advance', 'active', 'tr', 'gr',
])
