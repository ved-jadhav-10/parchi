import { describe, expect, it } from 'vitest'
import { parseDate, parsePastedOrder } from './pasteOrder'

const today = '2026-10-25'

describe('parseDate', () => {
  it('reads ISO, day-month, day-month-year and numeric dates', () => {
    expect(parseDate('2026-10-19', today)).toBe('2026-10-19')
    expect(parseDate('19 Oct', today)).toBe('2026-10-19')
    expect(parseDate('19 October 2025', today)).toBe('2025-10-19')
    expect(parseDate('19/10/2026', today)).toBe('2026-10-19')
    expect(parseDate('5-1-26', today)).toBe('2026-01-05')
  })
  it('rejects what is not a real date', () => {
    expect(parseDate('31 Feb', today)).toBeNull()
    expect(parseDate('Tuesday', today)).toBeNull()
  })
})

describe('parsePastedOrder', () => {
  it('splits one prescription per doctor and date, joining continuation lines', () => {
    const r = parsePastedOrder('Dr Mehta, 19 Oct: Dolo 650 1-1-1 x5d; Crocin TDS\nDr Rao, 21 Oct:\nZerodol-P BD\nBrufen 400 SOS', today)
    expect(r.problems).toEqual([])
    expect(r.prescriptions).toEqual([
      { doctor: 'Dr Mehta', date: '2026-10-19', text: 'Dolo 650 1-1-1 x5d; Crocin TDS' },
      { doctor: 'Dr Rao', date: '2026-10-21', text: 'Zerodol-P BD; Brufen 400 SOS' },
    ])
  })
  it('reports lines before any header instead of guessing a doctor', () => {
    const r = parsePastedOrder('Dolo 650 1-1-1', today)
    expect(r.prescriptions).toEqual([])
    expect(r.problems).toHaveLength(1)
  })
})
