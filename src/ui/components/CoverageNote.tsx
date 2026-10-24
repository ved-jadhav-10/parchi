/**
 * "No alert" is not "safe": names what the interaction data has nothing on and which totals had no daily limit to compare
 * with. Renders nothing when everything is covered.
 */
export const CoverageNote = ({ gaps, limitGaps = [] }: { gaps: string[]; limitGaps?: string[] }) => (
  <>
    {gaps.length > 0 && (
      <p className="hint coverage" data-testid="ddi-gaps">
        <strong>Not covered by the interaction data:</strong> {gaps.join(', ')}. For {gaps.length === 1 ? 'this medicine' : 'these'}, no interaction alert means nothing is on file, not that none exists.
        The data also lacks some pairs between listed drugs, so the pharmacist's own check still applies.
      </p>
    )}
    {limitGaps.length > 0 && (
      <p className="hint coverage" data-testid="limit-gaps">
        <strong>No daily limit on file:</strong> {limitGaps.join(', ')}. {limitGaps.length === 1 ? 'Its total is' : 'Their totals are'} shown above but not compared with a maximum, so no dose alert here means not checked.
      </p>
    )}
  </>
)
