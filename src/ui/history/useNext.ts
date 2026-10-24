// "Save and open next": which waiting order follows the one on screen, in the queue's own order.
import { useEffect, useMemo, useState } from 'react'
import { byQueueOrder } from './queue'
import { runHistory } from './run'
import type { Decision, HistoryResult, Order } from './types'

/**
 * The next waiting order after `currentId` (the riskiest first, as in the queue) and how many orders still wait besides it.
 * An order counts as decided once it has any saved decision. Results arrive as each order is checked; until then the
 * queue order is the order they were stored in.
 */
export function useNextWaiting(orders: Order[], decisions: Decision[], currentId: string) {
  const [results, setResults] = useState<Record<string, HistoryResult | 'failed'>>({})

  useEffect(() => {
    let live = true
    Promise.all(orders.map(async (o) => [o.id, await runHistory(o).catch(() => 'failed' as const)] as const)).then((entries) => live && setResults(Object.fromEntries(entries)))
    return () => {
      live = false
    }
  }, [orders])

  return useMemo(() => {
    const decided = new Set(decisions.map((d) => d.order_id))
    const waiting = orders
      .filter((o) => !decided.has(o.id) && o.id !== currentId)
      .map((order) => ({ order, result: results[order.id] }))
      .sort(byQueueOrder)
    return { next: waiting[0]?.order.id ?? null, othersWaiting: waiting.length }
  }, [orders, decisions, currentId, results])
}
