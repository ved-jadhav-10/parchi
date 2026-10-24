// "What changed" between two checks of the same customer (e.g. after a new creatinine arrives).
import type { Alert, AlertChanges } from '../contracts'
import type { AlertRules } from '../rules/config'

export type AlertKey = (a: Alert) => string

/** Same kind of alert about the same ingredients. */
export const alertKey: AlertKey = (a) => `${a.type}|${[...a.ingredients].sort().join(',')}`

/**
 * A patient rule (e.g. nsaid_renal) is one finding about the patient however many of its drugs are active, so it is
 * keyed by rule only: when one NSAID ends, the alert does not split in two.
 */
export function alertKeyFor(config: AlertRules): AlertKey {
  const ruleIds = new Set(config.patient_rules.map((r) => r.id))
  return (a) => (ruleIds.has(a.type) ? a.type : alertKey(a))
}

/** Alerts added, cleared or moved to another tier. Alerts that are silent on both sides are not news. */
export function diffAlerts(before: Alert[], after: Alert[], keyOf: AlertKey = alertKey): AlertChanges {
  const prev = new Map(before.map((a) => [keyOf(a), a]))
  const next = new Map(after.map((a) => [keyOf(a), a]))
  const quiet = (a?: Alert) => a === undefined || a.tier === 'silent'
  const added: Alert[] = []
  const cleared: Alert[] = []
  const changed: AlertChanges['changed'] = []
  for (const [key, a] of next) {
    const b = prev.get(key)
    if (!b) {
      if (!quiet(a)) added.push(a)
    } else if (b.tier !== a.tier) changed.push({ before: b, after: a })
  }
  for (const [key, b] of prev) if (!next.has(key) && !quiet(b)) cleared.push(b)
  return { added, cleared, changed }
}
