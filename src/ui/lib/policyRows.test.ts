import { describe, expect, it } from 'vitest'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { LIMITS } from '../../engine/limits'
import { parseAlertRules } from '../../engine/rules'
import { approvedCount, limitRows, ruleRows, sosRows, suppressionRows } from './policyRows'

const rules = parseAlertRules(JSON.parse(rulesRaw))

describe('policy rows for the Data page', () => {
  it('lists every limit with its source and approval, in words a pharmacist reads', () => {
    const rows = limitRows(LIMITS)
    expect(rows.length).toBeGreaterThan(Object.keys(LIMITS.ingredients).length)
    const adult = rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Adult')
    expect(adult?.value).toBe('4,000 mg/day')
    expect(rows.find((r) => r.name === 'Paracetamol' && r.detail.startsWith('Age 65'))?.value).toBe('3,000 mg/day')
    expect(rows.every((r) => r.source.length > 0 && typeof r.approved === 'boolean')).toBe(true)
  })

  it('words kidney bands and paediatric limits without raw field names', () => {
    const rows = limitRows(LIMITS)
    expect(rows.some((r) => /^Kidney: CrCl below \d+ mL\/min$/.test(r.detail))).toBe(true)
    expect(rows.some((r) => /mg\/kg\/day$/.test(r.value))).toBe(true)
    expect(rows.every((r) => !/_/.test(r.name + r.detail + r.value))).toBe(true)
  })

  it('lists the SOS caps by ingredient, by class and as a fallback', () => {
    const rows = sosRows(LIMITS)
    expect(rows.some((r) => r.name === 'Paracetamol')).toBe(true)
    expect(rows.some((r) => r.name === 'NSAID class')).toBe(true)
    expect(rows.at(-1)?.name).toBe('Any other medicine')
    expect(rows.every((r) => /^\d+ a day$/.test(r.value))).toBe(true)
  })

  it('lists the alert budget, interaction tiers, duplicate classes and patient rules', () => {
    const rows = ruleRows(rules)
    expect(rows[0].name).toBe('Alert budget')
    expect(rows[0].value).toMatch(/Interrupts a prescription$/)
    expect(rows.some((r) => r.name === 'Interactions')).toBe(true)
    expect(rows.some((r) => r.name === 'Nsaid renal' && /CrCl below 60/.test(r.detail))).toBe(true)
  })

  it('lists the suppression rules, and counts approvals', () => {
    const rows = suppressionRows(rules)
    expect(rows.length).toBe(rules.suppression.length)
    expect(rows.every((r) => r.value === 'Logged, not shown')).toBe(true)
    expect(approvedCount([{ name: '', detail: '', value: '', source: '', approved: true }, { name: '', detail: '', value: '', source: '', approved: undefined }])).toBe(1)
  })
})
