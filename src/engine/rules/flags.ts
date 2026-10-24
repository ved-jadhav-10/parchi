// Alerts from the resolver's own flags: banned FDC, NSQ batch, look-alike, discontinued, unsure match.
import type { Alert } from '../contracts'
import { joinNames, lineLabel, originFields, type Rule } from './types'

export const flagRule: Rule = (ctx) => {
  const alerts: Alert[] = []
  for (const line of ctx.lines) {
    const r = line.resolved
    const label = lineLabel(line)
    const base = { ingredients: r.ingredients.map((i) => i.id), brands: [label], confidence: r.confidence, ...originFields([line]) }
    const push = (a: Omit<Alert, 'ingredients' | 'brands' | 'confidence'>) => alerts.push({ ...base, ...a })

    if (r.match === 'none' && r.ingredients.length === 0) {
      // The resolver's best guess is shown as a proposal only; it never enters the totals until a pharmacist confirms it.
      const best = r.candidates?.[0]
      const proposal = best
        ? ` Closest match: ${best.brand} (${joinNames(best.ingredients.map((i) => `${ctx.info(i.id).name} ${i.mg} mg`))}), ${Math.round(best.score * 100)}% sure, unverified.`
        : ''
      push({
        tier: 'inform',
        type: 'unresolved',
        reason: `"${r.raw}" was not recognised.${proposal} Pharmacist to identify the medicine; it is left out of the dose and interaction checks until confirmed.`,
        source: 'Brand resolver',
        approved: true,
        ...(best ? { unverified: true } : {}),
      })
      continue
    }
    if (r.flags.includes('banned_fdc')) {
      const ref = r.banned_fdc?.[0]
      const uncertain = ref !== undefined && !ref.certain
      push({
        tier: uncertain ? 'inform' : 'interrupt',
        type: 'banned_fdc',
        reason: `${label} matches a banned fixed-dose combination${ref ? `: ${ref.text}` : ''}${uncertain ? ' (listed composition may be incomplete)' : ''}. Pharmacist to confirm before dispensing.`,
        source: ref ? `S.O. ${ref.so} (${ref.date})` : 'CDSCO banned FDC list',
        approved: true,
      })
    }
    if (r.flags.includes('nsq') && r.nsq?.length) {
      const n = r.nsq[0]
      const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const exact = r.batch ? r.nsq.find((x) => norm(x.batch) === norm(r.batch!)) : undefined
      if (exact) {
        // The order names the very batch CDSCO listed: that is a finding, not background.
        push({
          tier: 'inform',
          type: 'nsq_batch_match',
          reason: `Batch ${exact.batch} of ${label} is the batch CDSCO listed (${exact.month}) as ${exact.spurious ? 'spurious' : 'not of standard quality'}: ${exact.result.toLowerCase()}. Pharmacist to review before dispensing.`,
          source: `CDSCO NSQ/spurious list ${exact.month}`,
          approved: true,
        })
      }
      push({
        tier: r.nsq.some((x) => x.spurious) ? 'inform' : 'silent',
        type: 'nsq',
        reason: `CDSCO listed batch ${n.batch} of ${label} (${n.month}) as ${n.spurious ? 'spurious' : 'not of standard quality'}: ${n.result.toLowerCase()}. Batch-specific: check the batch number on the strip.`,
        source: `CDSCO NSQ/spurious list ${n.month}`,
        approved: true,
      })
    }
    if (r.flags.includes('lasa')) {
      const others = (r.candidates ?? []).map((c) => c.brand).slice(0, 3)
      push({
        tier: 'inform',
        type: 'lasa',
        reason: `"${r.raw}" could also be ${others.length ? joinNames(others) : 'a look-alike brand with different ingredients'}. Pharmacist to confirm which was meant.`,
        source: 'Resolver look-alike check',
        approved: true,
      })
    } else if (r.needs_pharmacist) {
      push({ tier: 'inform', type: 'low_confidence', reason: `${label}: ${r.notes?.[0] ?? 'match is uncertain'}. Pharmacist to confirm.`, source: 'Brand resolver', approved: true })
    }
    if (r.flags.includes('discontinued')) {
      push({ tier: 'silent', type: 'discontinued', reason: `${label} is marked discontinued in the brand data.`, source: 'Brand dataset', approved: true })
    }
  }
  return alerts
}
