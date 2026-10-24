import { describe, expect, it } from 'vitest'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { LIMITS } from '../../engine/limits'
import { parseAlertRules } from '../../engine/rules'
import { approvedCount, limitRows, ruleRows, sosRows, suppressionRows, supplementRows } from './policyRows'

const rules = parseAlertRules(JSON.parse(rulesRaw))

describe('policy rows for the Data page', () => {
  it('shows signed-off limits with the signer and leaves caps and niche drugs unapproved', () => {
    const rows = limitRows(LIMITS)
    const para = rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Adult')
    expect(para?.approved).toBe(true)
    expect(para?.approvedBy).toMatch(/Dhanushkar/)
    expect(rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Heavy alcohol use')?.approved).toBe(false)
    expect(rows.find((r) => r.name === 'Nimesulide' && r.detail === 'Adult')?.approved).toBe(false)
    expect(approvedCount(rows)).toBe(21)
  })
  it('lists every limit with its source and approval, in words a pharmacist reads', () => {
    const rows = limitRows(LIMITS)
    expect(rows.length).toBeGreaterThan(Object.keys(LIMITS.ingredients).length)
    const adult = rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Adult')
    expect(adult?.value).toBe('4,000 mg/day')
    expect(rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Adult')?.value).toBe('4,000 mg/day')
    expect(rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Liver disease')?.value).toBe('3,000 mg/day')
    expect(rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Weight under 50 kg')?.value).toBe('60 mg/kg/day')
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
    expect(rows.some((r) => r.name === 'Nsaid renal' && /CrCl below 30/.test(r.detail))).toBe(true)
    expect(rows.some((r) => r.name === 'Nsaid renal caution' && /CrCl 30 to below 60/.test(r.detail))).toBe(true)
    expect(rows.find((r) => r.name === 'ACE inhibitor/ARB + diuretic + NSAID')?.value).toBe('Interrupt')
  })

  it('lists the suppression rules, and counts approvals', () => {
    const rows = suppressionRows(rules)
    expect(rows.length).toBe(rules.suppression.length)
    expect(rows.every((r) => r.value === 'Logged, not shown')).toBe(true)
    expect(approvedCount([{ name: '', detail: '', value: '', source: '', approved: true }, { name: '', detail: '', value: '', source: '', approved: undefined }])).toBe(1)
  })
})

describe('curated interaction rows', () => {
  it('lists each rule with its medicines, level, source and approval', () => {
    const rows = supplementRows({ rules: [{ id: 'acei_k_sparing', a: ['ramipril'], b: ['spironolactone'], level: 'major', note: 'both raise potassium', source: 'Labelling', pharmacist_approved: false }] })
    expect(rows).toEqual([{ name: 'Acei k sparing', detail: 'ramipril with spironolactone: both raise potassium', value: 'Major', source: 'Labelling', approved: false }])
  })
  it('gives no rows for unreadable input', () => {
    expect(supplementRows(null)).toEqual([])
    expect(supplementRows({ rules: 'x' })).toEqual([])
  })
})

describe('label checks on the Data page', () => {
  it('marks limits whose label quote was verified and dated, apart from who signed them off', () => {
    const rows = limitRows(LIMITS)
    const adult = rows.find((r) => r.name === 'Paracetamol' && r.detail === 'Adult')!
    expect(adult.checked).toMatch(/^Label quote checked \d{1,2} \w{3} 2026$/)
    expect(adult.approved).toBe(true)
    const etoricoxib = rows.find((r) => r.name === 'Etoricoxib' && r.detail === 'Adult')!
    expect(etoricoxib.checked).toBeDefined()
    expect(etoricoxib.approved).toBe(false)
  })

  it('does not mark a limit that has no label quote', () => {
    const rows = limitRows(LIMITS)
    expect(rows.find((r) => r.name === 'Aceclofenac' && r.detail === 'Adult')?.checked).toBeUndefined()
  })

  it('says which drug an interaction weakens, and that a label quote backs it', () => {
    const [r] = supplementRows({ rules: [{ id: 'clopidogrel_omeprazole', a: ['clopidogrel'], b: ['omeprazole'], level: 'major', note: 'x', source: 's', pharmacist_approved: false, effect: 'reduces_effect', reduces: ['clopidogrel'], evidence: [{ set_id: 'a', quote: 'b' }] }] })
    expect(r.value).toBe('Major: may weaken Clopidogrel')
    expect(r.checked).toBe('Label quote checked')
    expect(r.approved).toBe(false)
  })
})
