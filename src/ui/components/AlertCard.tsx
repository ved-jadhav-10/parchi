import type { ReactNode } from 'react'
import type { Alert } from '../../engine/contracts'
import { alertTypeLabel, movedBecause } from '../lib/resolved'
import { TierBadge } from './Icons'

type Props = { alert: Alert; onOverride?: () => void; overriddenReason?: string; extra?: ReactNode }

export const AlertCard = ({ alert, onOverride, overriddenReason, extra }: Props) => {
  const moved = movedBecause(alert)
  return (
    <article className="card alert" data-tier={alert.tier} role={alert.tier === 'interrupt' ? 'alert' : undefined}>
      <header className="alert__head">
        <TierBadge tier={alert.tier} />
        <span className="alert__type">{alertTypeLabel(alert.type)}</span>
        <span className="alert__conf num">{Math.round(alert.confidence * 100)}%</span>
      </header>
      <p className="alert__reason">{alert.reason}</p>
      {extra}
      {moved && <p className="alert__moved">{moved}</p>}
      <footer className="chips">
        {alert.ingredients.map((i) => (
          <span key={i} className="chip">
            {i}
          </span>
        ))}
        <span className="chip chip--source">{alert.source}</span>
        {alert.approved === false && (
          <span className="chip chip--review" title="The rule behind this alert has not been signed off by a pharmacist.">
            Draft rule
          </span>
        )}
      </footer>
      {alert.type === 'input_needed' && (
        <p className="alert__moved">
          <a href="#patient">Add it under Patient</a>, then check again.
        </p>
      )}
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
}
