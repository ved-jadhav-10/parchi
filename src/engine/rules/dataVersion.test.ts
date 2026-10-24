// HOLES H4/H12: a result names the version of the clinical drafts it used. The constant and the data file must not drift apart.
import { describe, expect, it } from 'vitest'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import { CLINICAL_DATA_VERSION } from './config'
import { STATUS_LABEL, DECISIONS } from '../../ui/history/labels'

describe('clinical data version', () => {
  it('matches alert_rules.json', () => {
    expect(JSON.parse(rulesRaw).data_version).toBe(CLINICAL_DATA_VERSION)
  })
})

describe('status wording (FIX_PLAN 0.6)', () => {
  it('suggests attention, not an instruction to phone a doctor', () => {
    expect(STATUS_LABEL.hold_contact_doctor).toBe('Needs pharmacist attention')
    expect(DECISIONS[0].label).not.toMatch(/contact the doctor/i)
    expect(Object.values(STATUS_LABEL).join(' ')).not.toMatch(/safe|approved/i)
  })
})
