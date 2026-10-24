// Split typed prescription text into lines, and each line into the brand part and the sig part.
// The brand part becomes ResolvedBrand.raw; the sig part is for Track B's parser.
// Conservative: the brand ends at the first token that can only be dosing instructions.

const DOSE_PATTERN = /^[\d½¼¾.]+(?:\/\d+)?(?:-[\d½¼¾.]+(?:\/\d+)?){2,3}$/ // 1-0-1, 1/2-0-1/2, 1-1-1-1, ½-0-½
const SIG_WORDS = new Set([
  'od', 'bd', 'bid', 'tds', 'tid', 'qid', 'qds', 'hs', 'sos', 'stat', 'prn', 'ac', 'pc', 'qhs', 'qam', 'qpm',
  'daily', 'once', 'twice', 'thrice', 'x', 'for', 'after', 'before', 'with', 'morning', 'night', 'noon',
  'evening', 'bedtime', 'mane', 'nocte', 'weekly', 'alternate', 'subah', 'shaam', 'sham', 'raat', 'dopahar',
  'khane', 'khana', 'khali', 'roz', 'din', 'baar', 'times',
])
const SIG_TOKEN = /^(?:x\d+(?:d|days?|w|wks?|weeks?)?|\d+(?:d|days?|w|wks?)|q\d+h|\d+x)$/ // x5d, 5d, q8h, 3x
const DOSE_UNIT = /^(?:tabs?|tablets?|caps?|capsules?|tsp|tbsp|ml|puffs?|drops?|sachets?)$/
const SMALL_COUNT = /^(?:[1-4]|½|¼|¾|1\/2|1\.5|0\.5)$/
// A liquid dose written as "5ml" or "5 ml" is dosing; larger numbers ("Syrup 100ml") are pack sizes and stay in the brand.
const ML_GLUED = /^(\d+(?:\.\d+)?)ml$/
const MAX_DOSE_ML = 20

// Words that can open the dosing part after a comma ("..., after food", "..., empty stomach"), so no new line starts.
const SIG_CONTINUATION = new Set([
  ...SIG_WORDS, 'empty', 'food', 'meal', 'meals', 'water', 'milk', 'if', 'when', 'as', 'only', 'then', 'till', 'until',
  'both', 'left', 'right', 'each', 'in', 'on', 'at', 'every', 'per', 'one', 'two', 'three', 'half', 'continue', 'stop',
])

/** Does a comma-separated piece start like dosing rather than like the next medicine? */
function continuesSig(piece: string): boolean {
  const first = piece.trim().toLowerCase().split(/\s+/)[0] ?? ''
  return first === '' || /^[\d½¼¾(]/.test(first) || SIG_CONTINUATION.has(first) || SIG_TOKEN.test(first) || DOSE_UNIT.test(first) || DOSE_PATTERN.test(first)
}

/** "dolo 650 1-1-1 x 5 days, crocin advance sos" is two lines; "Pan 40 OD, before food" is one. */
function splitCommas(line: string): string[] {
  const out: string[] = []
  for (const piece of line.split(',')) {
    if (out.length && continuesSig(piece)) out[out.length - 1] += `,${piece}`
    else out.push(piece)
  }
  return out
}

export function splitRx(text: string): string[] {
  return text
    .split(/\r?\n|;/)
    .flatMap(splitCommas)
    .map((l) => l.replace(/^\s*(?:\d{1,2}[.)]|[-*•])\s+/, '').trim())
    .filter((l) => l.length > 0)
}

const BATCH = /\b(?:batch|lot)\s*(?:no\.?|number|#)?\s*[:#.\-]?\s*([A-Za-z0-9][A-Za-z0-9-]{2,})/i
const QUANTITY = /\b(?:qty|quantity)\s*[:=.]?\s*(\d{1,4})\b/i

/**
 * Pull "batch AR5112" and "qty 10" out of a line before it is split into brand and dosing, so neither is mistaken for
 * part of the brand or the sig. Both are optional and come from the buyer's order data, not from the doctor.
 */
export function extractLineMeta(line: string): { line: string; batch?: string; quantity?: number } {
  let rest = line
  const out: { line: string; batch?: string; quantity?: number } = { line }
  const b = BATCH.exec(rest)
  if (b) {
    out.batch = b[1]
    rest = rest.replace(b[0], ' ')
  }
  const q = QUANTITY.exec(rest)
  if (q) {
    out.quantity = Number(q[1])
    rest = rest.replace(q[0], ' ')
  }
  out.line = rest.replace(/\s{2,}/g, ' ').replace(/[,;]\s*$/, '').trim()
  return out
}

export function splitBrandAndSig(line: string): { brand: string; sig: string } {
  const re = /\S+/g
  const tokens: { text: string; start: number }[] = []
  for (let m = re.exec(line); m; m = re.exec(line)) tokens.push({ text: m[0], start: m.index })
  const tok = (j: number) => tokens[j]?.text.toLowerCase().replace(/[.,:]+$/, '')
  /** Tokens used by an mL quantity at j ("5ml" = 1, "5 ml" = 2), 0 if none. */
  const mlAt = (j: number): number => {
    const t = tok(j)
    if (t === undefined) return 0
    const glued = ML_GLUED.exec(t)
    if (glued) return Number(glued[1]) <= MAX_DOSE_ML ? 1 : 0
    return /^\d+(?:\.\d+)?$/.test(t) && tok(j + 1) === 'ml' && Number(t) <= MAX_DOSE_ML ? 2 : 0
  }
  /** A dose quantity starts at j: "0.6 ml", "5ml", "1 tsp", "2 drops". */
  const doseAt = (j: number): boolean => {
    const t = tok(j)
    if (t === undefined) return false
    return mlAt(j) > 0 || (/^[\d½¼¾.]+(?:\/\d+)?$/.test(t) && DOSE_UNIT.test(tok(j + 1) ?? ''))
  }
  for (let i = 1; i < tokens.length; i++) {
    const t = tok(i)!
    const next = tok(i + 1)
    const ml = mlAt(i)
    const isSig =
      DOSE_PATTERN.test(t) ||
      SIG_WORDS.has(t) ||
      SIG_TOKEN.test(t) ||
      (SMALL_COUNT.test(t) && next !== undefined && DOSE_UNIT.test(next)) ||
      // a small mL amount is the dose, unless another dose follows it ("drops 15ml 0.6 ml": 15 mL is the pack)
      (ml > 0 && !doseAt(i + ml))
    if (isSig) {
      return { brand: line.slice(0, tokens[i].start).trim(), sig: line.slice(tokens[i].start).trim() }
    }
  }
  return { brand: line.trim(), sig: '' }
}
