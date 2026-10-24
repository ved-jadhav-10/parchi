import { describe, expect, it } from 'vitest'
import { realPipeline } from '../rules/testing'
import { splitRx } from './segment'

describe('splitRx: commas', () => {
  it('starts a new line when the piece after a comma opens like a medicine', () => {
    expect(splitRx('tab dolo 650 1-1-1 x 5 days, crocin advance sos, combiflam bd')).toEqual([
      'tab dolo 650 1-1-1 x 5 days',
      'crocin advance sos',
      'combiflam bd',
    ])
  })

  it('keeps dosing after a comma on the same line', () => {
    expect(splitRx('Pan 40 OD, before food')).toEqual(['Pan 40 OD, before food'])
    expect(splitRx('Dolo 650 1-0-1, x5d')).toEqual(['Dolo 650 1-0-1, x5d'])
    expect(splitRx('Thyronorm 50mcg OD, empty stomach')).toEqual(['Thyronorm 50mcg OD, empty stomach'])
    expect(splitRx('Calpol 500, 1 tab SOS, if fever')).toEqual(['Calpol 500, 1 tab SOS, if fever'])
  })

  it('still splits on semicolons and new lines', () => {
    expect(splitRx('Dolo 650 TDS; Pan-D OD\nOmez 20 OD')).toEqual(['Dolo 650 TDS', 'Pan-D OD', 'Omez 20 OD'])
  })

  it('a comma-separated prescription totals every brand in it', async () => {
    const { lines } = await realPipeline()('Dolo 650 1-1-1, Crocin Cold & Flu Max TDS, Zerodol-P BD', { age_years: 40 })
    expect(lines.map((l) => l.resolved.brand)).toHaveLength(3)
  })
})
