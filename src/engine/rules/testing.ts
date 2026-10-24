// Test helpers for Track C. The sig parser and ledger here are stand-ins for Track B's, only good
// enough for the demo sigs; the pipeline takes Track B's real ones through PipelineDeps.
import rulesRaw from '../../../public/data/alert_rules.json?raw'
import ddiRaw from '../../../public/data/ddi.json?raw'
import type { Ledger, Patient, ResolvedBrand, Sig } from '../contracts'
import { createHistoryChecker } from '../history'
import { createEngine, createPipeline } from '../pipeline'
import { realDeps } from '../wiring'
import { createDdiIndex, type DdiJson } from '../resolver/ddi'
import { testResolver } from '../resolver/testing'
import { parseAlertRules, type AlertRules } from './config'

export const alertRules = () => parseAlertRules(JSON.parse(rulesRaw))
export const testDdi = () => createDdiIndex(JSON.parse(ddiRaw) as DdiJson)

export function stubSig(text: string): Sig {
  const t = text.toLowerCase()
  const days = /x\s*(\d+)\s*d/.exec(t)?.[1]
  const duration_days = days ? Number(days) : undefined
  if (/\bsos\b/.test(t)) return { doses_per_day: 0, max_doses_per_day: 3, sos: true, duration_days }
  const n = /(\d)-(\d)-(\d)/.exec(t)
  const perDay = n ? Number(n[1]) + Number(n[2]) + Number(n[3]) : /\btds\b/.test(t) ? 3 : /\bbd\b/.test(t) ? 2 : /\bqid\b/.test(t) ? 4 : 1
  return { doses_per_day: perDay, max_doses_per_day: perDay, sos: false, duration_days }
}

/** Sum of mg x max doses over systemic lines; paracetamol gets a 4,000 mg/day adult limit. */
export function stubLedger(lines: { resolved: ResolvedBrand; sig: Sig }[]): Ledger {
  const ledger: Ledger = {}
  for (const { resolved, sig } of lines) {
    if (resolved.systemic === false) continue
    for (const ing of resolved.ingredients) {
      const e = (ledger[ing.id] ??= { total_mg_day: 0, sources: [] })
      e.total_mg_day += ing.mg * sig.max_doses_per_day
      e.sources.push(resolved.brand ?? resolved.raw)
    }
  }
  if (ledger.paracetamol) ledger.paracetamol.limit_mg_day = 4000
  return ledger
}

export function testPipeline() {
  return createPipeline({
    resolver: testResolver(),
    ddi: testDdi(),
    rules: alertRules(),
    parseSig: (text) => stubSig(text),
    buildLedger: (lines, _patient: Patient) => stubLedger(lines),
  })
}

/** Same pipeline with Track B's real sig parser, ledger and limits. */
export function realPipeline() {
  return createPipeline(realDeps({ resolver: testResolver(), ddi: testDdi(), rules: alertRules() }))
}

/** The real engine's history check (Track B's parser and dose engine under Track C's rules). */
export function realHistory(rules: AlertRules = alertRules()) {
  const engine = createEngine(realDeps({ resolver: testResolver(), ddi: testDdi(), rules }))
  return createHistoryChecker(engine)
}
