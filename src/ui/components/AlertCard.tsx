import type { ReactNode } from 'react'
import type { Alert } from '../../engine/contracts'
import { alertTypeLabel, movedBecause } from '../lib/resolved'
import { TierBadge } from './Icons'

type Props = {
  alert: Alert
  onOverride?: () => void
  overriddenReason?: string
  /** Id of the "Overridden" line, so focus can return there after the override is saved */
  overrideId?: string
  extra?: ReactNode
  /** Called by "Add it" on an alert that waits for an input (weight, creatinine) */
  onNeedInput?: () => void
  /** `lead` sits inside another block (the order verdict) instead of being a card of its own */
  variant?: 'card' | 'lead'
}

export const AlertCard = ({ alert, onOverride, overriddenReason, overrideId, extra, onNeedInput, variant = 'card' }: Props) => {
  const moved = movedBecause(alert)
  return (
    <article className={`${variant === 'card' ? 'card ' : ''}alert${variant === 'lead' ? ' alert--lead' : ''}`} data-tier={alert.tier}>
      <header className="alert__head">
        <TierBadge tier={alert.tier} />
        <span className="alert__type">{alertTypeLabel(alert.type)}</span>
        <span className="alert__conf num" title="How sure the rule or match is that this applies">
          Confidence {Math.round(alert.confidence * 100)}%
        </span>
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
      {alert.type === 'input_needed' && onNeedInput && (
        <p className="alert__moved">
          <button type="button" className="btn--link" onClick={onNeedInput}>
            Add it now
          </button>
          , then Parchi checks again.
        </p>
      )}
      {overriddenReason ? (
        <p className="alert__overridden" id={overrideId} tabIndex={-1}>
          Overridden: {overriddenReason}
        </p>
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
