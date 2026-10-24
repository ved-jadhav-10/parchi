import { getDeps } from '../engine'
import { createHistoryCheck } from './check'
import type { HistoryResult, Order } from './types'

type Checker = ReturnType<typeof createHistoryCheck>

const MAX_KEPT = 64

/**
 * A runner for the history check. The same order is checked again and again as the queue, the order page and "save and
 * open next" all ask. A result is a pure function of the order's content, so it is kept by content (not by id: an edit or a
 * confirmed brand is a different order). `load` supplies the engine once; tests pass their own.
 */
export function createRunner(load: () => Promise<Checker>) {
  let checker: Promise<Checker> | null = null
  const kept = new Map<string, Promise<HistoryResult>>()

  const compute = async (order: Order, previous?: HistoryResult): Promise<HistoryResult> =>
    (await (checker ??= load().catch((e) => ((checker = null), Promise.reject(e)))))(order, previous)

  const runHistory = (order: Order, previous?: HistoryResult): Promise<HistoryResult> => {
    if (previous) return compute(order, previous) // a diff depends on what was shown before, so it is not shared
    const key = JSON.stringify(order)
    let hit = kept.get(key)
    if (!hit) {
      hit = compute(order).catch((e) => {
        kept.delete(key)
        return Promise.reject(e)
      })
      kept.set(key, hit)
      if (kept.size > MAX_KEPT) kept.delete(kept.keys().next().value as string)
    }
    return hit
  }

  /**
   * Every order's result, one at a time with a breath between them so a long queue never freezes typing or scrolling.
   * An order that cannot be checked is 'failed' (the queue says so) rather than failing the lot.
   */
  const runAll = async (orders: Order[], isLive: () => boolean = () => true): Promise<Record<string, HistoryResult | 'failed'>> => {
    const out: Record<string, HistoryResult | 'failed'> = {}
    for (const o of orders) {
      if (!isLive()) break
      out[o.id] = await runHistory(o).catch(() => 'failed' as const)
      await new Promise((r) => setTimeout(r, 0))
    }
    return out
  }

  return { runHistory, runAll }
}

const app = createRunner(() => getDeps().then(createHistoryCheck))

/** Runs the history check with the engine's data (fetched once, service-worker cached). Pass the earlier result to get "what changed". */
export const runHistory = app.runHistory
export const runAll = app.runAll
