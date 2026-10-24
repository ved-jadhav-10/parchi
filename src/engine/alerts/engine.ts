// 3-tier alert engine: pharmacist suppression list, alert budget and ordering over the raw rule output.
import type { Alert, Tier } from '../contracts'
import type { AlertRules } from '../rules/config'

const TIER_ORDER: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }

/** Which Interrupt survives the budget first: a wrong product beats a wrong dose beats a patient-risk rule. */
const TYPE_PRIORITY: Record<string, number> = { banned_fdc: 0, dose_excess: 1, ddi: 3 }
const priority = (a: Alert) => TYPE_PRIORITY[a.type] ?? 2

export interface FinalizeContext {
  config: AlertRules
  classesOf: (id: string) => string[]
}

function suppressionFor(alert: Alert, ctx: FinalizeContext): string | undefined {
  if (alert.tier === 'interrupt') return undefined // the suppression list can quiet noise, never a stop
  return ctx.config.suppression.find(
    (s) =>
      (s.type === undefined || s.type === alert.type) &&
      (s.all_in_classes === undefined ||
        (alert.ingredients.length > 0 &&
          alert.ingredients.every((id) => ctx.classesOf(id).some((c) => s.all_in_classes!.includes(c))))),
  )?.id
}

export function finalizeAlerts(raw: Alert[], ctx: FinalizeContext): Alert[] {
  const seen = new Set<string>()
  let alerts = raw.filter((a) => {
    const key = `${a.type}|${[...a.ingredients].sort().join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  alerts = alerts.map((a) => {
    const id = suppressionFor(a, ctx)
    return id ? { ...a, tier: 'silent' as Tier, suppressed: id } : a
  })

  const interrupts = alerts.filter((a) => a.tier === 'interrupt').sort((a, b) => priority(a) - priority(b) || b.confidence - a.confidence)
  const demote = new Set(interrupts.slice(ctx.config.alert_budget.max_interrupts_per_rx))
  alerts = alerts.map((a) => (demote.has(a) ? { ...a, tier: 'inform' as Tier, budget_demoted: true } : a))

  return alerts.sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || priority(a) - priority(b) || b.confidence - a.confidence,
  )
}
