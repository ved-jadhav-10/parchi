import { getDeps } from '../engine'
import { createHistoryCheck } from './check'
import type { HistoryResult, Order } from './types'

/** Runs the history check with the engine's data (fetched once, service-worker cached). */
export const runHistory = async (order: Order): Promise<HistoryResult> => createHistoryCheck(await getDeps())(order)
