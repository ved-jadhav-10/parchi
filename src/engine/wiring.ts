// The real engine: Track A resolver + DDInter, Track B sig parser and dose engine, Track C rules.
// The UI calls `createRealEngine` once at start-up: `check` is one prescription, `checkHistory` a customer's dated prescriptions.
import { createHistoryChecker } from './history'
import { computeDose } from './ledger'
import { createEngine, createPipeline, type PipelineDeps } from './pipeline'
import { parseSig } from './sig'

export type EngineData = Pick<PipelineDeps, 'resolver' | 'ddi' | 'rules'>

/** Pipeline deps with Track B's real parser and dose engine filled in. */
export function realDeps(data: EngineData): PipelineDeps {
  return { ...data, parseSig: (text) => parseSig(text), computeDose }
}

export function createRealPipeline(data: EngineData) {
  return createPipeline(realDeps(data))
}

export function createRealEngine(data: EngineData) {
  const deps = realDeps(data)
  return { check: createPipeline(deps), checkHistory: createHistoryChecker(createEngine(deps)) }
}
