import { TierBadge } from './Icons'

/** What the three tiers mean, one click away wherever alerts are shown, so the words never have to be learned from the landing page. */
export const TierKey = () => (
  <details className="tierkey">
    <summary>What Interrupt, Inform and Silent mean</summary>
    <dl className="tierkey__list">
      <div>
        <dt>
          <TierBadge tier="interrupt" />
        </dt>
        <dd>A pharmacist should act before dispensing. Kept rare on purpose.</dd>
      </div>
      <div>
        <dt>
          <TierBadge tier="inform" />
        </dt>
        <dd>Worth knowing. No action is required.</dd>
      </div>
      <div>
        <dt>
          <TierBadge tier="silent" />
        </dt>
        <dd>Logged only, and collapsed. Never raised as an alert.</dd>
      </div>
    </dl>
  </details>
)
