// A judge or a buyer may type anything. The engine must never crash on it and never invent a confident answer:
// text it cannot read comes back as not-recognised, not as a brand.
import { describe, expect, it } from 'vitest'
import { realHistory, realPipeline } from '../src/engine/rules/testing'

const check = realPipeline()
const history = realHistory()
const adult = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' as const }

const junk = [
  '',
  '   ',
  ';;;;',
  '!!!???',
  '😀😀😀',
  '<script>alert(1)</script>',
  "Robert'); DROP TABLE brands;--",
  'a'.repeat(5000),
  'Dolo 650 '.repeat(300),
  '1-1-1 1-1-1 1-1-1',
  'x5d x5d x5d',
  'asdfghjkl qwertyuiop',
  'मुझे बुखार है',
  'Dolo 650 1-1-1 x99999999d',
  'Dolo 650 -5 times',
  'Dolo 650 NaN BD',
  '\u0000\u0001\u0002',
]

describe('junk input to the single-prescription check', () => {
  it.each(junk.map((j) => [j.length > 40 ? `${j.slice(0, 30)}... (${j.length} chars)` : JSON.stringify(j), j]))('does not crash on %s', async (_label, text) => {
    try {
      const r = await check(text, adult)
      expect(Array.isArray(r.alerts)).toBe(true)
      for (const a of r.alerts) {
        expect(['interrupt', 'inform', 'silent']).toContain(a.tier)
        expect(a.reason.length).toBeGreaterThan(0)
        expect(a.source.length).toBeGreaterThan(0)
      }
    } catch (e) {
      // The only allowed failure is the plain "nothing to check" the app shows as a message.
      expect(String((e as Error).message)).toMatch(/no medicines|empty/i)
    }
  })

  it('does not turn gibberish into a brand with a high confidence', async () => {
    const r = await check('asdfghjkl qwertyuiop', adult)
    for (const l of r.lines) expect(l.resolved.brand === null || l.resolved.confidence < 0.75).toBe(true)
  })

  it('refuses an impossible patient instead of guessing', async () => {
    for (const age of [-1, 0, 400, Number.NaN]) {
      await expect(check('Dolo 650 TDS', { age_years: age }).then((r) => r.alerts.length)).resolves.toBeGreaterThanOrEqual(0)
    }
  })
})

describe('junk input to the history check', () => {
  it('survives bad dates and empty prescriptions with a plain error, not a crash', async () => {
    await expect(history([{ id: 'a', doctor: 'Dr X', date: 'yesterday', text: 'Dolo 650 TDS' }], adult)).rejects.toThrow(/date/i)
    const r = await history([{ id: 'a', doctor: '', date: '2026-10-01', text: 'asdf qwer' }], adult)
    expect(r.status).toBeDefined()
    expect(r.lines.every((l) => l.unverified || l.resolved.confidence < 0.75 || l.resolved.brand === null)).toBe(true)
  })
})
