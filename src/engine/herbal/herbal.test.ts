import { describe, it, expect } from 'vitest'
import { rawData, testResolver } from '../resolver/testing'
import data from './herbal.json'
import { HERBAL_RULES, analyzeHerbal, matchNames, partitionRx, type HerbalLine } from './index'

const resolver = testResolver()
const classesOf = (id: string) => resolver.ingredient(id)?.classes
const isKnownBrand = (b: string) => resolver.resolve(b).confidence >= 0.97
const KNOWN_IDS = rawData.ingredients().ingredients

/** Run the full path for a prescription: partition, resolve the rest, analyse. */
function run(rx: string, windows: Record<number, { start?: string; end?: string }> = {}, start?: (i: number) => { start?: string; end?: string }) {
  const part = partitionRx(rx, { isKnownBrand })
  const ordinary = part.restLines.map((raw, i) => {
    const r = resolver.resolveLine(raw).resolved
    return { brand: r.brand ?? r.raw, ingredients: r.ingredients.map((x) => x.id), ...(start?.(i) ?? {}) }
  })
  return { part, report: analyzeHerbal(part.herbal, ordinary, classesOf, windows) }
}
const ruleIds = (rx: string) => run(rx).report.findings.map((f) => f.rule)

describe('herbal data integrity', () => {
  it('every rule has real sources, valid ingredient ids and classes, and is unapproved', () => {
    const classes = new Set(Object.values(KNOWN_IDS).flatMap((i) => i.classes ?? []))
    expect(HERBAL_RULES.length).toBeGreaterThanOrEqual(10)
    for (const r of HERBAL_RULES) {
      expect(r.sources.length, r.id).toBeGreaterThan(0)
      for (const s of r.sources) {
        expect(s.label.length, r.id).toBeGreaterThan(10)
        expect(s.url, r.id).toMatch(/^https:\/\/\S+$/)
      }
      expect(r.pharmacist_approved, r.id).toBe(false)
      expect(['established', 'limited'], r.id).toContain(r.evidence)
      for (const h of r.herbs) expect(h in data.herbs, `${r.id}: herb ${h}`).toBe(true)
      for (const id of r.with.ingredients ?? []) expect(id in KNOWN_IDS, `${r.id}: ingredient ${id}`).toBe(true)
      for (const c of r.with.classes ?? []) expect(classes.has(c), `${r.id}: class ${c}`).toBe(true)
    }
  })

  it('the tier follows the evidence (established = inform, limited = silent), except the one documented exception', () => {
    for (const r of HERBAL_RULES) {
      if (r.id === 'giloy_liver') continue // limited evidence, but a serious and India-specific signal: suggested as inform
      expect(r.tier, r.id).toBe(r.evidence === 'established' ? 'inform' : 'silent')
    }
  })

  it('no alias belongs to two different names, and formulation herbs exist', () => {
    const seen = new Map<string, string>()
    const all: [string, string[]][] = [
      ...Object.entries(data.herbs).map(([id, h]) => [`herb:${id}`, h.aliases] as [string, string[]]),
      ...Object.entries(data.formulations).map(([id, f]) => [`formulation:${id}`, f.aliases] as [string, string[]]),
      ...Object.entries(data.ambiguous).map(([id, f]) => [`ambiguous:${id}`, f.aliases] as [string, string[]]),
    ]
    for (const [who, aliases] of all) {
      for (const a of aliases) {
        const k = a.toLowerCase()
        expect(seen.has(k), `"${a}" is used by ${seen.get(k)} and ${who}`).toBe(false)
        seen.set(k, who)
      }
    }
    for (const f of Object.values(data.formulations)) for (const h of f.herbs) expect(h in data.herbs).toBe(true)
  })

  it('says plainly that it is unverified and that a missing rule is not safety', () => {
    expect(data._meta.status).toMatch(/UNVERIFIED/)
    expect(data._meta.status).toMatch(/NOT evidence of safety/)
  })
})

describe('name matching', () => {
  const ids = (t: string) => matchNames(t).map((m) => m.id).sort()
  it('maps Hindi, Sanskrit, English and Latin names to the same herb', () => {
    for (const t of ['Mulethi', 'Yashtimadhu powder', 'licorice root', 'Glycyrrhiza']) expect(ids(t)).toEqual(['liquorice'])
    for (const t of ['Haldi doodh', 'Curcumin 500', 'Haridra']) expect(ids(t)).toEqual(['turmeric'])
    for (const t of ['Karela jamun juice']) expect(ids(t)).toContain('bitter_melon')
    expect(ids('Kali mirch')).toEqual(['black_pepper'])
    expect(ids('Pippali churna')).toEqual(['long_pepper'])
    expect(ids('Guggulu')).toEqual(['guggul'])
  })
  it('matches multi-word names', () => {
    expect(ids('holy basil capsule')).toEqual(['tulsi'])
    expect(ids('Indian gooseberry')).toEqual(['amla'])
    expect(ids('methi dana')).toEqual(['fenugreek'])
  })
  it('tolerates a typo in longer names only', () => {
    expect(ids('Ashwaganda 500 mg')).toEqual(['ashwagandha'])
    expect(ids('Ashvagandha')).toEqual(['ashwagandha'])
    expect(ids('Giloy')).toEqual(['giloy'])
    expect(ids('Gudmaar')).toEqual(['gymnema'])
    // short names must be exact: a near-miss is not a match
    for (const t of ['Neemo', 'Tulsy', 'Amlo', 'Neen']) expect(ids(t)).toEqual([])
  })
  it('knows formulations and flags the ambiguous name', () => {
    expect(matchNames('Trikatu churna').map((m) => `${m.kind}:${m.id}`)).toContain('formulation:trikatu')
    expect(matchNames('Brahmi')[0]).toMatchObject({ kind: 'ambiguous', id: 'brahmi' })
  })
  it('does not match ordinary words or numbers', () => {
    for (const t of ['Dolo 650', 'Paracetamol 500 mg', 'Pan D', 'Brufen 400', 'Metformin', '1-0-1', '']) expect(matchNames(t)).toEqual([])
  })
  it('does not claim real allopathic brands: sweep over 4,500 brand names from the index', () => {
    const names = rawData.brands().brands.map((b) => b[0]).filter((_, i) => i % 7 === 0)
    const hits = names.filter((n) => matchNames(n).length > 0)
    // Any hit must be a deliberate coincidence we can read; the count is the guard against new false positives.
    expect(hits.length, hits.slice(0, 20).join(' | ')).toBeLessThanOrEqual(5)
  })
})

describe('partitionRx: herbal lines are claimed before the ordinary resolver can guess a drug', () => {
  it('Ayurvedic names the resolver used to turn into drugs are now herbal items', () => {
    // Before this: "Triphala churna" -> Triohale (an inhaler), "Haldi doodh" -> Palido-OD (an antipsychotic)
    for (const rx of ['Triphala churna HS', 'Haldi doodh BD', 'Mulethi powder TDS']) {
      const p = partitionRx(rx, { isKnownBrand })
      expect(p.herbal, rx).toHaveLength(1)
      expect(p.restLines, rx).toEqual([])
    }
  })
  it('splits a mixed prescription and keeps the ordinary lines untouched for the pipeline', () => {
    const p = partitionRx('Dolo 650 TDS x5d; Ashwagandha 500 mg 1-0-1; Pan D OD', { isKnownBrand })
    expect(p.restLines).toEqual(['Dolo 650 TDS x5d', 'Pan D OD'])
    expect(p.restText).toBe('Dolo 650 TDS x5d\nPan D OD')
    expect(p.herbal[0].item).toMatchObject({ kind: 'herb', herbs: ['ashwagandha'], sig: '1-0-1' })
    expect(p.herbal[0].item?.names[0]).toBe('Ashwagandha (Withania somnifera)')
  })
  it('expands a formulation to its herbs, with its composition note', () => {
    const it = partitionRx('Trikatu churna 3 g BD').herbal[0].item!
    expect(it).toMatchObject({ kind: 'formulation', herbs: ['ginger', 'black_pepper', 'long_pepper'] })
    expect(it.note).toMatch(/piperine content of a given product is not known/)
    expect(partitionRx('Triphala churna').herbal[0].item).toMatchObject({ kind: 'formulation', herbs: [] })
  })
  it('flags the ambiguous name instead of picking one plant', () => {
    const it = partitionRx('Brahmi 1 cap BD').herbal[0].item!
    expect(it.kind).toBe('ambiguous')
    expect(it.note).toMatch(/two different plants/)
  })
  it('recognises herbo-mineral preparations', () => {
    for (const rx of ['Shankh bhasma 125 mg BD', 'Makaradhwaja 1 tab OD', 'Rasa sindura']) {
      expect(partitionRx(rx).herbal[0].item?.kind, rx).toBe('herbo_mineral')
    }
  })
  it('reports an unknown Ayurvedic product as unrecognised and does not guess its contents', () => {
    const p = partitionRx('Sarvarishta syrup 15 ml BD; Foo ghan vati BD', { isKnownBrand })
    expect(p.herbal.every((h) => h.unrecognised && !h.item)).toBe(true)
    expect(p.herbal).toHaveLength(2)
    expect(p.herbal[0].unrecognised?.reason).toMatch(/Ask the patient/)
  })
  it('never takes an exactly known medicine, even if its text contains a form word', () => {
    const p = partitionRx('Dolo 650 TDS', { isKnownBrand })
    expect(p.herbal).toEqual([])
  })
  it('a misspelt herb name or a bare form word never overrides a brand the resolver knows exactly', () => {
    const known = { isKnownBrand: () => true }
    expect(partitionRx('Ashwaganda 500', known).herbal).toEqual([]) // fuzzy herb match: the known brand wins
    expect(partitionRx('Foo vati BD', known).herbal).toEqual([]) // form word alone: the known brand wins
    expect(partitionRx('Ashwaganda 500', { isKnownBrand: () => false }).herbal).toHaveLength(1)
    expect(partitionRx('Foo vati BD', { isKnownBrand: () => false }).herbal).toHaveLength(1)
    // an exact herb name still counts as herbal even when the brand lookup is unsure
    expect(partitionRx('Ashwagandha 500', known).herbal).toHaveLength(1)
  })
  it('keeps line numbers, handles empty text', () => {
    expect(partitionRx('Dolo 650 TDS; Giloy BD').herbal[0].line).toBe(1)
    expect(partitionRx('')).toEqual({ herbal: [], restLines: [], restText: '' })
  })
})

describe('conflict rules: each fires with the right medicine, with its sources', () => {
  const cases: [string, string, string[]][] = [
    ['liquorice + loop diuretic', 'Mulethi powder TDS; Furosemide 40 OD', ['liquorice_potassium']],
    ['liquorice + digoxin', 'Yashtimadhu BD; Digoxin 0.25 OD', ['liquorice_potassium']],
    ['liquorice + corticosteroid', 'Mulethi TDS; Prednisolone 10 OD', ['liquorice_potassium']],
    ['liquorice + blood-pressure medicine (inferred)', 'Mulethi TDS; Telmisartan 40 OD', ['liquorice_blood_pressure']],
    ['guggul + propranolol', 'Kaishore Guggulu 2 tab BD; Propranolol 40 BD', ['guggul_beta_blocker_ccb']],
    ['pepper + phenytoin', 'Kali mirch 1 g BD; Phenytoin 100 TDS', ['piperine_levels']],
    ['Trikatu (contains pepper) + theophylline', 'Trikatu churna BD; Theophylline 200 BD', ['piperine_levels']],
    ['karela + sulfonylurea', 'Karela juice 30 ml OD; Glimepiride 2 OD', ['blood_sugar_herbs']],
    ['methi + metformin', 'Methi dana 5 g OD; Metformin 500 BD', ['blood_sugar_herbs']],
    ['ashwagandha + levothyroxine', 'Ashwagandha 500 mg BD; Levothyroxine 50 OD', ['ashwagandha_thyroid']],
    ['ashwagandha + benzodiazepine', 'Ashwagandha HS; Alprazolam 0.25 HS', ['ashwagandha_sedatives']],
    ['ashwagandha + tacrolimus', 'Ashwagandha OD; Tacrolimus 1 BD', ['ashwagandha_immunosuppressants']],
    ['turmeric + warfarin', 'Haldi capsule BD; Warfarin 5 OD', ['bleeding_herbs']],
    ['garlic + aspirin', 'Lahsun 1 cap OD; Ecosprin 75 OD', ['bleeding_herbs']],
  ]
  it.each(cases)('%s', (_n, rx, expected) => {
    const { report } = run(rx)
    expect(report.findings.map((f) => f.rule)).toEqual(expect.arrayContaining(expected))
    for (const f of report.findings) {
      expect(f.sources.length).toBeGreaterThan(0)
      expect(f.pharmacist_approved).toBe(false)
    }
  })

  it('a finding names the herbal line and the ordinary medicine it conflicts with', () => {
    const f = run('Mulethi powder TDS; Furosemide 40 OD').report.findings[0]
    expect(f).toMatchObject({ rule: 'liquorice_potassium', tier: 'inform', evidence: 'established', herbs: ['liquorice'], items: ['Mulethi powder TDS'] })
    expect(f.partners).toEqual([{ brand: 'Furosemide 40', ingredient: 'furosemide' }])
    expect(f.sources[0].label).toMatch(/EMA/)
  })
  it('marks the inferred blood-pressure link as an inference', () => {
    expect(run('Mulethi TDS; Telmisartan 40 OD').report.findings.find((f) => f.rule === 'liquorice_blood_pressure')?.inferred).toBe(true)
  })

  describe('says nothing when there is nothing to say', () => {
    it.each([
      ['herb with no partner on the prescription', 'Mulethi TDS; Dolo 650 TDS'],
      ['herb the rule does not cover with that drug', 'Ashwagandha OD; Warfarin 5 OD'],
      ['ordinary medicines only', 'Dolo 650 TDS; Pan D OD'],
      ['a recognised herb with no rule at all', 'Tulsi drops BD; Furosemide 40 OD'],
      ['Triphala (no rules)', 'Triphala churna HS; Warfarin 5 OD'],
    ])('%s', (_n, rx) => {
      expect(ruleIds(rx)).toEqual([])
    })
  })

  it('a herb on its own can still carry a note about the herb (giloy, herbo-mineral)', () => {
    const giloy = run('Giloy ghan vati BD').report.findings
    expect(giloy.map((f) => f.rule)).toEqual(['giloy_liver'])
    expect(giloy[0].partners).toEqual([])
    const metals = run('Shankh bhasma BD').report.findings
    expect(metals.map((f) => f.rule)).toEqual(['herbo_mineral_metals'])
    expect(metals[0].effect).toMatch(/not a random sample/)
  })

  it('orders alerts before notes and always carries the "not a safety clearance" note', () => {
    const { report } = run('Giloy BD; Karela OD; Mulethi TDS; Furosemide 40 OD; Glimepiride 2 OD')
    const tiers = report.findings.map((f) => f.tier)
    expect(tiers).toEqual([...tiers].sort((a, b) => (a === b ? 0 : a === 'inform' ? -1 : 1)))
    expect(report.note).toMatch(/not a safety clearance/)
    expect(report.note).toMatch(/does not mean no interaction/)
  })

  describe('history mode: only medicines taken at the same time are matched', () => {
    const rx = 'Mulethi TDS; Furosemide 40 OD'
    it('overlapping courses match', () => {
      const { report } = run(rx, { 0: { start: '2026-10-01', end: '2026-10-10' } }, () => ({ start: '2026-10-05', end: '2026-10-20' }))
      expect(report.findings.map((f) => f.rule)).toContain('liquorice_potassium')
    })
    it('courses that never meet do not match', () => {
      const { report } = run(rx, { 0: { start: '2026-10-01', end: '2026-10-05' } }, () => ({ start: '2026-10-10', end: '2026-10-20' }))
      expect(report.findings).toEqual([])
    })
    it('an open-ended course counts as still running; bad dates fall back to matching', () => {
      expect(run(rx, { 0: { start: '2026-10-01', end: '2026-10-05' } }, () => ({ start: '2026-10-04' })).report.findings).toHaveLength(1)
      expect(run(rx, { 0: { start: 'soon' } }, () => ({ start: '2026-10-04' })).report.findings).toHaveLength(1)
    })
  })

  it('handles an empty analysis', () => {
    expect(analyzeHerbal([] as HerbalLine[], [], () => undefined).findings).toEqual([])
  })
})
