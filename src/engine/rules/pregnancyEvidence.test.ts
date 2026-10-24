// Tier T1 (docs/TEST_PLAN.md): no pregnancy rule without an outside source, and no formulary-rated risk left unexplained.
// Evidence quotes were read from the FDA label (openFDA) and the National Formulary of India (Eka NFI MCQA) on 24 Oct 2026.
import { describe, expect, it } from 'vitest'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import ingredientsRaw from '../../../public/data/ingredients.json?raw'
import evidence from './fixtures/pregnancy_evidence.json'
import xd from './fixtures/nfi_pregnancy_xd.json'
import { parseAlertRules } from './config'

const rules = parseAlertRules(JSON.parse(rulesRaw))
const ingredients = (JSON.parse(ingredientsRaw) as { ingredients: Record<string, { classes?: string[] }> }).ingredients
const members = (r: { ingredients?: string[]; classes?: string[] }) => [
  ...(r.ingredients ?? []),
  ...Object.entries(ingredients).filter(([, v]) => v.classes?.some((c) => r.classes?.includes(c))).map(([id]) => id),
]

describe('every pregnancy rule has an outside source', () => {
  it.each(rules.pregnancy_rules.map((r) => [r.id, r] as const))('%s', (_id, r) => {
    const found = evidence.evidence.filter((e) => e.evidence === r.evidence && members(r).includes(e.ingredient))
    expect(found.length, `${r.id}: no ${r.evidence} evidence for ${members(r).join(', ')}`).toBeGreaterThan(0)
    for (const e of found) expect(e.quote.length).toBeGreaterThan(20)
    expect(r.pharmacist_approved).toBe(false)
    expect(r.source).toMatch(/openFDA|National Formulary of India/)
  })

  it('only names ingredients and classes that exist', () => {
    for (const r of rules.pregnancy_rules) {
      for (const id of r.ingredients ?? []) expect(ingredients[id], `${r.id}: ${id}`).toBeDefined()
      expect(members(r).length, r.id).toBeGreaterThan(0)
    }
  })

  it('tiers follow the evidence: boxed warnings and contraindications stop, a label note or category D informs', () => {
    for (const r of rules.pregnancy_rules) {
      if (r.evidence === 'fda_boxed_warning' || r.evidence === 'fda_contraindication' || r.evidence === 'nfi_category_x') expect(r.tier, r.id).toBe('interrupt')
      if (r.evidence === 'fda_label' || r.evidence === 'nfi_category_d') expect(r.tier, r.id).toBe('inform')
    }
  })
})

describe('the National Formulary of India rating (category X or D) is covered or explained', () => {
  const covered = new Set(rules.pregnancy_rules.flatMap(members))

  it('has a rule, or a written reason, for every X or D drug in our table', () => {
    expect(xd.drugs.length).toBeGreaterThanOrEqual(15)
    for (const d of xd.drugs) {
      if (d.decision === 'rule') expect(covered.has(d.ingredient), `${d.ingredient} (category ${d.nfi_category}) has no rule`).toBe(true)
      else expect((d as { reason?: string }).reason?.length, `${d.ingredient} is excluded without a reason`).toBeGreaterThan(30)
    }
  })

  it('stops on every category X drug that is covered', () => {
    for (const d of xd.drugs.filter((x) => x.nfi_category === 'X' && x.decision === 'rule')) {
      const tiers = rules.pregnancy_rules.filter((r) => members(r).includes(d.ingredient)).map((r) => r.tier)
      expect(tiers, d.ingredient).toContain('interrupt')
    }
  })
})
