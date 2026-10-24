import { describe, expect, it } from 'vitest'
import fhir from '../../../tests/fixtures/fhir_prescriptions.json'
import { demoOrders } from '../history/demoOrders'
import { ageOn, importFhirText, orderToFhir } from './fhirOrder'

describe('FHIR import for the history form', () => {
  it('turns the sample bundles into form fields, with the age on the newest prescription date', () => {
    const r = importFhirText(JSON.stringify(fhir.bundles))
    expect(r.prescriptions.map((p) => p.doctor)).toEqual(['Dr Rao (GP)', 'Dr Anil Mehta'])
    expect(r.labs).toEqual([{ value: '1.6', date: '2026-10-09' }])
    expect(r.name).toBe('Demo Patient')
    expect(r.sex).toBe('M')
    expect(r.age).toBe('68')
    expect(r.warnings).toHaveLength(1)
  })

  it('computes whole years, not rounded', () => {
    expect(ageOn('1958-03-02', '2026-03-01')).toBe(67)
    expect(ageOn('1958-03-02', '2026-03-02')).toBe(68)
  })

  it('says what is wrong with a file that is not usable', () => {
    expect(() => importFhirText('not json')).toThrow('not valid JSON')
    expect(() => importFhirText('{"resourceType":"Patient"}')).toThrow(/not a FHIR Bundle/)
    expect(() => importFhirText('{"resourceType":"Bundle","entry":[]}')).toThrow(/No prescriptions/)
  })
})

describe('FHIR export of an order', () => {
  const order = demoOrders[0]

  it('reads back to the same prescriptions, labs and weight', () => {
    const back = importFhirText(JSON.stringify(orderToFhir({ ...order, labs: [{ type: 'serum_creatinine', value: 1.6, date: '2026-10-22' }] })))
    const norm = (t: string) => t.replace(/\s+/g, ' ').trim()
    expect(back.prescriptions.map((p) => [p.doctor, p.date]).sort()).toEqual(order.prescriptions.map((p) => [p.doctor, p.date]).sort())
    for (const rx of order.prescriptions) {
      const got = back.prescriptions.find((p) => p.doctor === rx.doctor && p.date === rx.date)!
      expect(norm(got.text)).toBe(norm(rx.text))
    }
    expect(back.labs).toEqual([{ value: '1.6', date: '2026-10-22' }])
    expect(back.name).toBe(order.customer.name)
    expect(back.weight).toBe(order.customer.weight_kg ? String(order.customer.weight_kg) : undefined)
  })

  it('says in the file that it is a draft', () => {
    expect(JSON.stringify(orderToFhir(order))).toContain('Not validated')
  })
})
