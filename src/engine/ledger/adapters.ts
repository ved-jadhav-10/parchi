// Track B -> Track C hand-off: the exact function shapes `createPipeline` takes (see docs/track-c-engine.md).
import type { Ledger, Patient, ResolvedBrand, Sig } from '../contracts'
import type { Resolver } from '../resolver'
import { parseSig } from '../sig'
import { computeDose, type DoseResult } from './dose'
import type { LedgerLine } from './ledger'

/**
 * `createPipeline({ resolver, ddi, rules, ...createDoseDeps(resolver) })`.
 * `computeDose` returns what the pipeline's `buildLedger` cannot: findings (over limit, kidney), questions for the pharmacist and notes.
 */
export function createDoseDeps(resolver: Pick<Resolver, 'ingredient'>) {
  const classesOf = (id: string) => resolver.ingredient(id)?.classes
  return {
    parseSig: (sigText: string, _resolved: ResolvedBrand): Sig => parseSig(sigText),
    buildLedger: (lines: LedgerLine[], patient: Patient): Ledger => computeDose(lines, patient, { classesOf }).ledger,
    computeDose: (lines: LedgerLine[], patient: Patient): DoseResult => computeDose(lines, patient, { classesOf }),
  }
}
