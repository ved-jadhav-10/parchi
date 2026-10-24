// Day arithmetic on ISO dates (UTC, no time zones): a prescription date is a calendar day, not an instant.
const DAY_MS = 86_400_000

/** Whole days since 1970-01-01 for "YYYY-MM-DD" (a longer ISO datetime is cut to its date). Throws on a bad date. */
export function dayNumber(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) throw new Error(`Invalid date "${iso}": expected YYYY-MM-DD`)
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const back = new Date(t)
  if (back.getUTCFullYear() !== Number(m[1]) || back.getUTCMonth() !== Number(m[2]) - 1 || back.getUTCDate() !== Number(m[3])) {
    throw new Error(`Invalid date "${iso}": no such day`)
  }
  return t / DAY_MS
}

export function isoDay(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}
