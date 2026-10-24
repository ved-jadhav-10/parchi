// The real engine: Track A resolver + DDInter, Track B sig parser and dose engine, Track C rules.
// The UI calls this once at start-up; `check` is one prescription, `checkHistory` is a customer's dated prescriptions.
import { computeDose } from './ledger'
import { createPipeline, type PipelineDeps } from './pipeline'
import { parseSig } from './sig'

export type EngineData = Pick<PipelineDeps, 'resolver' | 'ddi' | 'rules'>

/** Pipeline deps with Track B's real parser and dose engine filled in. */
export function realDeps(data: EngineData): PipelineDeps {
  return { ...data, parseSig: (text) => parseSig(text), computeDose }
}

export function createRealPipeline(data: EngineData) {
  return createPipeline(realDeps(data))
}
