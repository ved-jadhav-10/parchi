import type { Alert } from '../../engine/contracts'
import { TierBadge } from './Icons'

type Props = { alert: Alert; onOverride?: () => void; overriddenReason?: string }

export const AlertCard = ({ alert, onOverride, overriddenReason }: Props) => (
  <article className="card alert" data-tier={alert.tier} role={alert.tier === 'interrupt' ? 'alert' : undefined}>
    <header className="alert__head">
      <TierBadge tier={alert.tier} />
      <span className="alert__type">{alert.type.replace(/_/g, ' ')}</span>
      <span className="alert__conf num">{Math.round(alert.confidence * 100)}%</span>
    </header>
    <p className="alert__reason">{alert.reason}</p>
    <footer className="chips">
      {alert.ingredients.map((i) => (
        <span key={i} className="chip">
          {i}
        </span>
      ))}
      <span className="chip chip--source">{alert.source}</span>
    </footer>
    {overriddenReason ? (
      <p className="alert__overridden">Overridden: {overriddenReason}</p>
    ) : (
      onOverride && (
        <button className="btn btn--secondary alert__action" onClick={onOverride}>
          Override with reason
        </button>
      )
    )}
  </article>
)
