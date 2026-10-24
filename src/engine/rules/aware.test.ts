import { describe, expect, it } from 'vitest'
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import ingredientsRaw from '../../../public/data/ingredients.json?raw'
import { realPipeline } from './testing'

const check = realPipeline()
const adult = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' as const }
const aware = (JSON.parse(rulesRaw) as { aware: { ingredients: Record<string, string> } }).aware

describe('WHO AWaRe antibiotic rule', () => {
  it('logs a Watch antibiotic silently', async () => {
    const { alerts } = await check('Taxim-O 200 BD x5d', adult)
    const a = alerts.find((x) => x.type === 'aware_watch')!
    expect(a.tier).toBe('silent')
    expect(a.ingredients).toEqual(['cefixime'])
    expect(a.source).toContain('AWaRe')
    expect(a.approved).toBe(false)
  })

  it('informs on a Reserve antibiotic and names the brand', async () => {
    const { alerts } = await check('Linezolid 600 BD x7d', adult)
    const a = alerts.find((x) => x.type === 'aware_reserve')!
    expect(a.tier).toBe('inform')
    expect(a.reason).toContain('Reserve')
    expect(a.reason).toContain('specialist')
  })

  it('says nothing about an Access antibiotic or a non-antibiotic', async () => {
    const { alerts } = await check('Augmentin 625 BD x5d; Dolo 650 TDS', adult)
    expect(alerts.filter((x) => x.type.startsWith('aware_'))).toEqual([])
  })

  it('groups several antibiotics of one group into one alert', async () => {
    const { alerts } = await check('Cifran 500 BD x5d; Azithral 500 OD x3d', adult)
    const watch = alerts.filter((x) => x.type === 'aware_watch')
    expect(watch).toHaveLength(1)
    expect(watch[0].ingredients).toEqual(['azithromycin', 'ciprofloxacin'])
  })

  it('only lists canonical ingredient ids', () => {
    const known = (JSON.parse(ingredientsRaw) as { ingredients: Record<string, unknown> }).ingredients
    for (const id of Object.keys(aware.ingredients)) expect(known[id], id).toBeDefined()
  })
})
