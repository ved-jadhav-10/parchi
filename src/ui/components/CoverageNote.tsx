/** "No alert" is not "no interaction": names what the interaction data has nothing on. Renders nothing when everything is covered. */
export const CoverageNote = ({ gaps }: { gaps: string[] }) =>
  gaps.length === 0 ? null : (
    <p className="hint coverage" data-testid="ddi-gaps">
      <strong>Not covered by the interaction data:</strong> {gaps.join(', ')}. For {gaps.length === 1 ? 'this medicine' : 'these'}, no interaction alert means nothing is on file, not that none exists.
      The data also lacks some pairs between listed drugs, so the pharmacist's own check still applies.
    </p>
  )
