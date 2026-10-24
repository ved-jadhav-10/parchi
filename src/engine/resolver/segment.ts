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

export function splitRx(text: string): string[] {
  return text
    .split(/\r?\n|;/)
    .map((l) => l.replace(/^\s*(?:\d{1,2}[.)]|[-*•])\s+/, '').trim())
    .filter((l) => l.length > 0)
}

export function splitBrandAndSig(line: string): { brand: string; sig: string } {
  const re = /\S+/g
  const tokens: { text: string; start: number }[] = []
  for (let m = re.exec(line); m; m = re.exec(line)) tokens.push({ text: m[0], start: m.index })
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i].text.toLowerCase().replace(/[.,:]+$/, '')
    const next = tokens[i + 1]?.text.toLowerCase().replace(/[.,:]+$/, '')
    const isSig =
      DOSE_PATTERN.test(t) ||
      SIG_WORDS.has(t) ||
      SIG_TOKEN.test(t) ||
      (SMALL_COUNT.test(t) && next !== undefined && DOSE_UNIT.test(next)) ||
      (ML_GLUED.test(t) && Number(ML_GLUED.exec(t)![1]) <= MAX_DOSE_ML) ||
      (/^\d+(?:\.\d+)?$/.test(t) && next === 'ml' && Number(t) <= MAX_DOSE_ML)
    if (isSig) {
      return { brand: line.slice(0, tokens[i].start).trim(), sig: line.slice(tokens[i].start).trim() }
    }
  }
  return { brand: line.trim(), sig: '' }
}
