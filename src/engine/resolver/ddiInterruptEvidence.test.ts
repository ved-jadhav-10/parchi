// Tier T1 (docs/TEST_PLAN.md): a pair that stops the pharmacist needs a reason we did not invent. `data/audit_sources.py
// interrupts` reads the FDA label (openFDA) for each curated Interrupt pair and records the sentence, or says plainly that none
// was found. This test makes sure the record is complete and that a rule never claims a label it did not find.
import { describe, expect, it } from 'vitest'
import supplementRaw from '../../../public/data/ddi_supplement.json?raw'
import evidence from './fixtures/ddi_interrupt_evidence.json'

type Rule = { id: string; interrupt?: boolean; basis?: string; pharmacist_approved: boolean }
const rules = (JSON.parse(supplementRaw).rules as Rule[]).filter((r) => r.interrupt)
type Entry = { rule: string; status: 'confirmed' | 'not_found' | 'no_fda_label'; looked_for?: string[]; quote?: string; basis: string }
const byRule = new Map((evidence.rules as Entry[]).map((e) => [e.rule, e]))

describe('every curated Interrupt pair has outside evidence, or an honest gap', () => {
  it('has an entry for every Interrupt rule and none for a rule that no longer stops', () => {
    expect([...byRule.keys()].sort()).toEqual(rules.map((r) => r.id).sort())
  })

  it.each(rules.map((r) => [r.id, r] as const))('%s', (id, r) => {
    const e = byRule.get(id)!
    expect(r.basis, `${id} needs a basis`).toBeTruthy()
    expect(r.pharmacist_approved).toBe(false)
    if (e.status === 'confirmed') {
      expect(e.quote!.length).toBeGreaterThan(30)
      expect(e.looked_for!.some((w) => e.quote!.toLowerCase().includes(w.toLowerCase())), `${id}: quote does not name the partner`).toBe(true)
    } else if (e.status === 'not_found') {
      // No label sentence: the rule may only claim a published list or stated consensus, never "label".
      expect(r.basis, `${id} claims a label that was not found`).toMatch(/^(onc_high_priority|clinical_consensus)/)
    } else {
      expect(r.basis, `${id}: no US label, so the basis must name the EMA text`).toContain('EMA')
    }
  })

  it('records the gaps so the reviewer sees them', () => {
    const gaps = (evidence.rules as Entry[]).filter((e) => e.status !== 'confirmed').map((e) => e.rule)
    expect(gaps).toContain('methotrexate_trimethoprim')
    expect(gaps.length).toBeLessThan(rules.length)
  })
})
