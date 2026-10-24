import { describe, expect, it } from 'vitest'
import { parseSig } from '../../engine/sig'
import { testResolver } from '../../engine/resolver/testing'
import { howTaken, leafletRequest } from './leaflet'

describe('howTaken', () => {
  it.each([
    ['1-0-1 x5d', '1 tablet or capsule, 2 times a day, for 5 days'],
    ['2 tab TDS', '2 tablets or capsules, 3 times a day'],
    ['5 ml BD', '5 ml, 2 times a day'],
    ['SOS max 3', 'only when needed, no more than 3 times a day'],
    ['OD', '1 tablet or capsule, 1 time a day'],
  ])('%s', (sig, words) => {
    expect(howTaken(parseSig(sig))).toBe(words)
  })

  it('says so when no dose is written instead of guessing', () => {
    expect(howTaken({ doses_per_day: 0, max_doses_per_day: 0, sos: false })).toBe('dose not written; ask the pharmacist')
  })
})

describe('leafletRequest', () => {
  const resolver = testResolver()
  const lines = resolver.resolveText('Dolo 650 1-1-1 x5d; Zerodol gel BD; Dolo 650 SOS; Xylocort DX 400 OD').map((l) => ({ resolved: l.resolved, sig: parseSig(l.sig_text) }))

  it('names each recognised systemic medicine once, with how it is taken', () => {
    const r = leafletRequest('hi', lines, '')
    expect(r.language).toBe('hi')
    expect(r.medicines.map((m) => m.brand)).toEqual(['Dolo 650'])
    expect(r.medicines[0].how).toContain('3 times a day')
  })

  it('turns typed lines into points and drops blank ones', () => {
    expect(leafletRequest('en', lines, ' Take with water \n\n  Avoid alcohol ').points).toEqual(['Take with water', 'Avoid alcohol'])
  })
})
