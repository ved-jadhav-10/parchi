// Track B: ingredient ledger and dose engine.
export { computeLedger, buildLedger, type LedgerLine, type LedgerNote, type LedgerOptions } from './ledger'
export { computeDose, type DoseResult } from './dose'
export { createDoseDeps } from './adapters'
export {
  lineWindow, cutSegments, patientAsOf, computeDoseByWindow, toDay, fromDay,
  type IsoDate, type LineWindow, type Span, type Segment, type LabResult, type DatedLine, type WindowDose,
} from './windows'
