// Paste-a-block entry for a new order: "Dr Mehta, 19 Oct: Dolo 650 1-1-1 x5d; Pan D OD" per prescription. Display-side convenience
// only; the lines are checked by the same history engine as typed ones. A block that cannot be read is reported, never guessed.
export interface PastedRx {
  doctor: string
  date: string
  text: string
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n: number) => String(n).padStart(2, '0')
const valid = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/** "2026-10-19", "19 Oct", "19 Oct 2026", "19/10/2026", "19-10-26" -> ISO. A missing year is `today`'s year. */
export const parseDate = (raw: string, today: string): string | null => {
  const t = raw.trim().toLowerCase().replace(/,/g, '')
  const year = Number(today.slice(0, 4))
  const full = (y: number) => (y < 100 ? 2000 + y : y)
  let m: RegExpExecArray | null
  let y: number, mo: number, d: number
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t))) [y, mo, d] = [full(Number(m[3])), Number(m[2]), Number(m[1])]
  else if ((m = /^(\d{1,2})\s*([a-z]{3})[a-z]*\s*(\d{2}|\d{4})?$/.exec(t)) && MONTHS.includes(m[2])) [y, mo, d] = [m[3] ? full(Number(m[3])) : year, MONTHS.indexOf(m[2]) + 1, Number(m[1])]
  else return null
  return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
}

/** One prescription per header line ("Dr Mehta, 19 Oct:" then the medicines on the same or the next lines). */
export const parsePastedOrder = (text: string, today: string): { prescriptions: PastedRx[]; problems: string[] } => {
  const prescriptions: PastedRx[] = []
  const problems: string[] = []
  let current: PastedRx | null = null
  const header = /^\s*([^:\n]{2,60}?)\s*[,(\-–]\s*([^:\n)]{3,20})\)?\s*:\s*(.*)$/
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    const h = header.exec(line)
    const date = h ? parseDate(h[2], today) : null
    if (h && date) {
      current = { doctor: h[1].trim(), date, text: h[3].trim() }
      prescriptions.push(current)
    } else if (current) {
      current.text = current.text ? `${current.text}; ${line.trim()}` : line.trim()
    } else {
      problems.push(`Could not read "${line.trim().slice(0, 40)}": start each prescription with "Dr Name, 19 Oct:".`)
    }
  }
  return { prescriptions: prescriptions.filter((p) => p.text !== ''), problems }
}
