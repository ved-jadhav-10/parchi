import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSig } from '../../engine/sig'
import { resetSigSmartState } from '../../engine/sig/llm'
import { testResolver } from '../../engine/resolver/testing'
import { clearReadings, parseSigWithReadings, readByAi, readUnclearSigs } from './smartSig'

const resolver = testResolver()
const good = { administrations_per_day: 2, units_per_dose: 1, volume_ml_per_dose: null, total_units_per_day: null, sos: false, sos_max_doses_per_day: null, duration_days: 5 }
const answer = () => vi.fn(async () => new Response(JSON.stringify({ fields: good }), { status: 200 })) as unknown as typeof fetch & ReturnType<typeof vi.fn>

beforeEach(() => {
  clearReadings()
  resetSigSmartState()
})

describe('readUnclearSigs', () => {
  it('reads a sig the rules cannot understand and hands it to the pipeline marked as read by an AI', async () => {
    const fetchImpl = answer()
    await readUnclearSigs(resolver, ['Dolo 650 zzz qqq'], 40, { online: true, fetchImpl })
    const s = parseSigWithReadings('zzz qqq')
    expect(readByAi(s)).toBe(true)
    expect(s.doses_per_day).toBe(2)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('leaves a sig the rules are sure of alone, with no network call', async () => {
    const fetchImpl = answer()
    await readUnclearSigs(resolver, ['Dolo 650 1-0-1 x5d'], 40, { online: true, fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(parseSigWithReadings('1-0-1 x5d')).toEqual(parseSig('1-0-1 x5d'))
  })

  it('does nothing offline: the rules reading stands', async () => {
    const fetchImpl = answer()
    await readUnclearSigs(resolver, ['Dolo 650 zzz qqq'], 40, { online: false, fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(readByAi(parseSigWithReadings('zzz qqq'))).toBe(false)
  })

  it('keeps the rules reading when the server fails, and does not throw', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(readUnclearSigs(resolver, ['Dolo 650 zzz qqq'], 40, { online: true, fetchImpl })).resolves.toBeUndefined()
    expect(parseSigWithReadings('zzz qqq')).toEqual(parseSig('zzz qqq'))
  })
})
