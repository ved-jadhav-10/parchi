import { useEffect, useMemo, useState } from 'react'
import { nextWaiting } from '../history/queue'
import { runHistory } from '../history/run'
import type { Decision, HistoryResult, Order } from '../history/types'

/**
 * "2 of 3 decided" and the order to open next, from the same ranking the queue uses. Runs the check on every order the way the
 * queue page does; an order that fails to check ranks with the other unchecked ones, as in the queue.
 */
export const useQueueProgress = (currentId: string, orders: Order[], decisions: Decision[]) => {
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
    const { next, done, total } = nextWaiting(
      orders.map((order) => ({ order, result: results[order.id] })),
      decided,
      currentId,
    )
    return { done, total, next: next && { id: next.id, name: next.customer.name } }
  }, [currentId, orders, decisions, results])
}
