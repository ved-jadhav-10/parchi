import { describe, expect, it } from 'vitest'
import demo from '../../../tests/fixtures/demo_rx.json'
import { createResolver, decodeData } from './index'
import { createNsqIndex } from './nsq'
import { rawData, testResolver } from './testing'
import type { NsqJson } from './data'

const columns = ['brand', 'product', 'batch', 'mfg', 'exp', 'manufacturer', 'result', 'reported_by', 'month', 'spurious', 'remarks']
const row = (brand: string | null, batch: string, spurious = 0) =>
  [brand, `${brand} tablets`, batch, 'Jan-2025', 'Dec-2026', 'Acme', 'Dissolution', 'CDL', 'SEP-2026', spurious, null]
const doc = (entries: (string | number | null)[][]): NsqJson => ({ schema: 1, months: ['SEP-2026'], columns, entries })

describe('nsq index', () => {
  const idx = createNsqIndex(doc([row('Alzomac-0.5 Tablets', 'A1'), row('Pepcia-D', 'B2'), row('NA', 'C3'), row(null, 'D4'), row('Ab', 'E5')]))

  it('matches by brand name, ignoring strengths and form words', () => {
    expect(idx.check('Alzomac 0.5mg', [])[0].batch).toBe('A1')
    expect(idx.check('PEPCIA D', [])[0].batch).toBe('B2')
  })

  it('keeps a named strength only when it fits the resolved product', () => {
    expect(idx.check('Alzomac', [{ id: 'alprazolam', mg: 0.25 }])).toHaveLength(0)
    expect(idx.check('Alzomac', [{ id: 'alprazolam', mg: 0.5 }])).toHaveLength(1)
  })

  it('ignores rows without a brand and very short names', () => {
    expect(idx.check('NA', [])).toHaveLength(0)
    expect(idx.check('Ab', [])).toHaveLength(0)
  })

  it('is empty when the list was not loaded', () => {
    expect(createNsqIndex(undefined).check('Pepcia-D', [])).toHaveLength(0)
  })
})

describe('resolver nsq flag', () => {
  it('flags a brand with a failed batch and tells the pharmacist to check the strip', () => {
    const res = testResolver().resolve('Clavam 625')
    expect(res.flags).toContain('nsq')
    expect(res.nsq?.length).toBeGreaterThan(0)
    expect(res.nsq?.[0]).toMatchObject({ month: expect.stringMatching(/-2026$/), spurious: false })
    expect(res.notes?.join(' ')).toContain('check the batch number on the strip')
  })

  it('flags only Pan-D among the demo Rx brands (failed batch 25441645, Jul 2026 list)', () => {
    const flagged = demo.expected.resolver.filter((l) => testResolver().resolve(l.brand).flags.includes('nsq')).map((l) => l.brand)
    expect(flagged).toEqual(['Pan-D'])
  })

  it('marks spurious alerts', () => {
    const data = decodeData(rawData.brands(), rawData.ingredients(), rawData.banned(), doc([row('Clavam 625', 'X9', 1)]))
    const res = createResolver(data).resolve('Clavam 625')
    expect(res.nsq).toEqual([expect.objectContaining({ batch: 'X9', spurious: true })])
  })

  it('works without the NSQ file (offline first load)', () => {
    const res = createResolver(decodeData(rawData.brands(), rawData.ingredients(), rawData.banned())).resolve('Clavam 625')
    expect(res.flags).not.toContain('nsq')
    expect(res.nsq).toBeUndefined()
  })
})
