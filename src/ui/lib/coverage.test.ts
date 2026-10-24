import { describe, expect, it } from 'vitest'
import { testResolver } from '../../engine/resolver/testing'
import { testDdi } from '../../engine/rules/testing'
import { createCheck } from '../engine'
import { alertRules } from '../../engine/rules/testing'
import { ddiGapNames } from './coverage'

const resolver = testResolver()
const ddi = testDdi()
const lines = (rx: string) => resolver.resolveText(rx).map((l) => ({ resolved: l.resolved }))

describe('interaction data coverage', () => {
  it('names ingredients DDInter has nothing on (Indian-only drugs)', () => {
    expect(ddiGapNames(lines('Zerodol-P BD; Pan-D OD; Dolo 650 TDS'), ddi, resolver)).toEqual(['Aceclofenac', 'Domperidone'])
  })

  it('names nothing when every ingredient is on file', () => {
    expect(ddiGapNames(lines('Dolo 650 TDS; Ecosprin 75 OD'), ddi, resolver)).toEqual([])
  })

  it('leaves out non-systemic lines', () => {
    const gel = ddiGapNames(lines('Zerodol gel BD'), ddi, resolver)
    expect(gel).toEqual([])
  })

  it('rides along on the check result', async () => {
    const r = await createCheck({ resolver, ddi, rules: alertRules() })('Zerodol-P BD; Dolo 650 TDS', { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' })
    expect(r.ddi_gaps).toEqual(['Aceclofenac'])
  })
})
