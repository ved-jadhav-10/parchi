// The optional online sig reader: asked only for lines the rules could not read, and never trusted blindly.
import { describe, expect, it, vi } from 'vitest'
import type { Sig } from './contracts'
import { createPipeline } from './pipeline'
import { alertRules, testDdi } from './rules/testing'
import { testResolver } from './resolver/testing'
import { sigFromLlm, validateLlmFields } from './sig'
import { realDeps } from './wiring'

const adult = { age_years: 40, weight_kg: 70, serum_creatinine: 0.9, sex: 'M' as const }
const pipeline = (refineSig: (text: string, rules: Sig) => Promise<Sig>) =>
  createPipeline({ ...realDeps({ resolver: testResolver(), ddi: testDdi(), rules: alertRules() }), refineSig })

describe('refineSig (online sig reader)', () => {
  it('is not asked about a sig the rules read', async () => {
    const refine = vi.fn(async (_t: string, s: Sig) => s)
    await pipeline(refine)('Dolo 650 1-0-1 x5d', adult)
    expect(refine).not.toHaveBeenCalled()
  })

  it('is asked about an unclear sig, and its answer is still flagged for the pharmacist', async () => {
    const fields = validateLlmFields({ administrations_per_day: 3, units_per_dose: 1, volume_ml_per_dose: null, total_units_per_day: null, sos: false, sos_max_doses_per_day: null, duration_days: 5 })!
    const refine = vi.fn(async () => sigFromLlm(fields))
    const { lines, alerts } = await pipeline(refine)('Dolo 650 teen baar khane ke baad paanch din', adult)
    expect(refine).toHaveBeenCalledTimes(1)
    expect(lines[0].sig.doses_per_day).toBe(3)
    expect(alerts.some((a) => a.type === 'sig_unclear')).toBe(true)
  })

  it('falls back to the rules result when the reader fails', async () => {
    const refine = vi.fn(async () => {
      throw new Error('offline')
    })
    const { lines } = await pipeline(refine)('Dolo 650 teen baar khane ke baad paanch din', adult)
    expect(lines).toHaveLength(1)
  })
})
