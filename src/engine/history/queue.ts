// Order status and review-queue ranking, from the final alerts. Policy numbers live in alert_rules.json.
import type { Alert, OrderStatus, Tier } from '../contracts'
import type { HistoryPolicy } from '../rules/config'

const TIER_ORDER: Tier[] = ['interrupt', 'inform', 'silent']

/** An Interrupt moved down by the alert budget still counts as an Interrupt here: the budget shapes the screen, not the risk. */
const effectiveTier = (a: Alert): Tier => (a.budget_demoted ? 'interrupt' : a.tier)

/** Suggested status for the order. The pharmacist decides; this only says where to start. */
export function orderStatus(alerts: Alert[], policy: HistoryPolicy): OrderStatus {
  const worst = TIER_ORDER.find((t) => alerts.some((a) => effectiveTier(a) === t)) ?? 'silent'
  return policy.status_by_tier[worst]
}

/** Higher = look first. Silent alerts add nothing. */
export function orderPriority(alerts: Alert[], policy: HistoryPolicy): number {
  const q = policy.queue
  return alerts.reduce((sum, a) => {
    const tier = effectiveTier(a)
    if (tier === 'silent') return sum
    return sum + q.tier_weight[tier] + (q.type_bonus[a.type] ?? 0) + (a.cross_doctor ? q.cross_doctor_bonus : 0)
  }, 0)
}

export interface QueueItem<T> {
  /** order id (the prescription being reviewed) */
  id: string
  /** order date (ISO), the older order waits longer and goes first on a tie */
  date: string
  priority: number
  result: T
}

export interface RankedItem<T> extends QueueItem<T> {
  /** 1 = review first */
  rank: number
}

/** Rank orders for the pharmacist: highest priority first; ties by oldest order, then id (stable and explainable). */
export function rankQueue<T>(items: QueueItem<T>[]): RankedItem<T>[] {
  return [...items]
    .sort((a, b) => b.priority - a.priority || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((item, i) => ({ ...item, rank: i + 1 }))
}
