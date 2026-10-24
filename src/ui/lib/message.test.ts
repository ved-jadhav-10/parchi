import { describe, expect, it } from 'vitest'
import type { Alert } from '../../engine/contracts'
import { askTheCustomer } from './askCustomer'
import { buildNote } from './message'

const alert = (tier: Alert['tier'], reason: string): Alert => ({ tier, type: 't', ingredients: [], reason, source: 's', confidence: 1 })
const stop = alert('interrupt', 'Colchicine and clarithromycin (Zycolchin, Pylokit): major interaction, raises colchicine levels. Pharmacist to review before dispensing.')

describe('copyable notes', () => {
  it('a prescriber note lists what stopped the order and adds no advice', () => {
    const t = buildNote('prescriber', { name: 'Ramesh K.', age_years: 68 }, [stop, alert('inform', 'a note')])
    expect(t).toContain('Query from the dispensing pharmacist')
    expect(t).toContain('Patient: Ramesh K., 68 years')
    expect(t).toContain('1. Colchicine and clarithromycin (Zycolchin, Pylokit): major interaction, raises colchicine levels.')
    expect(t).not.toContain('2.') // only the stops while there is one
    expect(t).not.toMatch(/Pharmacist to review/)
    expect(t).toContain('not a diagnosis')
  })

  it('a customer note says nothing was changed and asks them to reply', () => {
    const t = buildNote('customer', { name: 'Priya', age_years: 30 }, [stop], { pharmacy: 'Parchi Pharmacy' })
    expect(t).toContain('Hello Priya, this is Parchi Pharmacy.')
    expect(t).toContain('We have not changed anything on your prescription.')
  })

  it('falls back to the notes when nothing stops, and is empty when there is nothing to say', () => {
    expect(buildNote('prescriber', { age_years: 40 }, [alert('inform', 'two PPIs. Pharmacist to review.')])).toContain('1. two PPIs.')
    expect(buildNote('prescriber', { age_years: 40 }, [alert('silent', 'logged')])).toBe('')
  })
})

describe('questions for the customer', () => {
  it('asks only about what is commonly bought without a prescription', () => {
    expect(askTheCustomer(['ibuprofen', 'aceclofenac'])).toEqual(['Does the customer also take another painkiller tablet bought without a prescription?'])
    expect(askTheCustomer(['paracetamol', 'phenylephrine', 'chlorphenamine'])).toHaveLength(2)
    expect(askTheCustomer(['metformin', 'telmisartan'])).toEqual([])
  })
})
