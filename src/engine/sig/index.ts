// Track B: Indian sig parser. `sig_text` from Track A's resolver goes straight into parseSig.
export { parseSig } from './parse'

export { parseSigSmart, resetSigSmartState, validateLlmFields, sigFromLlm, SIG_LLM_CALL_BUDGET, type SmartSigOptions } from './llm'
