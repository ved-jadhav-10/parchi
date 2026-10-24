import { getDeps } from '../engine'
import { createHistoryCheck } from './check'
import type { HistoryResult, Order } from './types'

let checker: Promise<ReturnType<typeof createHistoryCheck>> | null = null

/** Runs the history check with the engine's data (fetched once, service-worker cached). Pass the earlier result to get "what changed". */
export const runHistory = async (order: Order, previous?: HistoryResult): Promise<HistoryResult> =>
  (await (checker ??= getDeps().then(createHistoryCheck).catch((e) => ((checker = null), Promise.reject(e)))))(order, previous)
