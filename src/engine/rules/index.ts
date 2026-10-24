import type { Alert } from '../contracts'
import { awareRule } from './aware'
import { burdenRule } from './burden'
import { classDupRule } from './classDup'
import { ddiRule } from './ddi'
import { doseRule } from './dose'
import { findingsRule } from './findings'
import { flagRule } from './flags'
import { patientRule } from './patient'
import { stackRule } from './stack'
import type { Rule, RuleContext } from './types'

export { loadAlertRules, parseAlertRules, type AlertRules } from './config'
export { cockcroftGault } from './crcl'
export { neededInputs, type PatientInput } from './patient'
export type { DoseFacts, LineOrigin, RuleContext, RuleLine } from './types'

const RULES: Rule[] = [flagRule, doseRule, findingsRule, classDupRule, ddiRule, patientRule, stackRule, burdenRule, awareRule]

/** Raw alerts from every rule, before suppression, budget and ordering (see ../alerts). */
export function runRules(ctx: RuleContext): Alert[] {
  return RULES.flatMap((rule) => rule(ctx))
}
