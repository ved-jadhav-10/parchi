import { describe, it, expect } from 'vitest'
import { parseName, transliterateDevanagari } from './normalize'
import { splitBrandAndSig, splitRx } from './segment'

describe('parseName', () => {
  it.each([
    ['Dolo 650', ['dolo'], [650], undefined],
    ['Crocin cold n flu max', ['crocin', 'cold', 'flu', 'max'], [], undefined],
    ['Crocin Cold & Flu Max', ['crocin', 'cold', 'flu', 'max'], [], undefined],
    ['Pan-D', ['pan', 'd'], [], undefined],
    ['Tab. Zerodol-P 100mg/500mg', ['zerodol', 'p'], [100, 500], 'tablet'],
    ['Ascoril LS syp', ['ascoril', 'ls'], [], 'liquid'],
    ['dolo650', ['dolo'], [650], undefined],
    ['Augmentin 1 g', ['augmentin'], [1000], undefined],
    ['Methylcobalamin 1500 mcg', ['methylcobalamin'], [1.5], undefined],
    ['Ascoril LS 100 ml', ['ascoril', 'ls'], [], undefined],
  ])('%s', (raw, tokens, numbers, hint) => {
    const p = parseName(raw)
    expect(p.tokens).toEqual(tokens)
    expect(p.numbers).toEqual(numbers)
    expect(p.formHint).toBe(hint)
  })

  it('keeps short codes such as B12 and D3 as name tokens', () => {
    expect(parseName('Uprise D3').tokens).toEqual(['uprise', 'd3'])
  })
})

describe('transliterateDevanagari', () => {
  it.each([
    ['डोलो', 'dolo'],
    ['डोलो 650', 'dolo 650'],
    ['क्रोसिन', 'krosin'],
    ['Dolo', 'Dolo'],
  ])('%s -> %s', (input, out) => {
    expect(transliterateDevanagari(input)).toBe(out)
  })
})

describe('splitBrandAndSig', () => {
  it.each([
    ['Dolo 650 1-1-1 x5d', 'Dolo 650', '1-1-1 x5d'],
    ['Crocin cold n flu max TDS', 'Crocin cold n flu max', 'TDS'],
    ['Pan D OD', 'Pan D', 'OD'],
    ['Brufan 400 SOS', 'Brufan 400', 'SOS'],
    ['Tab Dolo 650 1 tab TDS', 'Tab Dolo 650', '1 tab TDS'],
    ['Montair LC ½-0-½ x 10 days', 'Montair LC', '½-0-½ x 10 days'],
    ['Pantocid 40 subah khali pet', 'Pantocid 40', 'subah khali pet'],
    ['Augmentin 625 Duo', 'Augmentin 625 Duo', ''],
  ])('%s', (line, brand, sig) => {
    expect(splitBrandAndSig(line)).toEqual({ brand, sig })
  })
})

describe('splitRx', () => {
  it('splits on semicolons, newlines and list numbering', () => {
    expect(splitRx('1. Dolo 650 TDS\n2) Pan D OD; Omez 20 OD\n\n')).toEqual(['Dolo 650 TDS', 'Pan D OD', 'Omez 20 OD'])
  })
})
