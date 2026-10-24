import type { ReactNode } from 'react'
import type { Alert } from '../../engine/contracts'
import { trimReason } from '../history/queue'
import { alertTypeLabel, movedBecause } from '../lib/resolved'
import { TierBadge } from './Icons'

/** What an `input_needed` alert offers instead of a link: the page decides where the missing value is entered. */
export type InputAction = { label: string; onClick: () => void }

type Props = {
  alert: Alert
  /** One line with the conclusion first; the engine's whole reason moves under "Full reason". Defaults to the trimmed reason. */
  headline?: string
  onOverride?: () => void
  overriddenReason?: string
  extra?: ReactNode
  inputAction?: InputAction
  /** Related alerts shown inside this one (a kidney check that is waiting on a creatinine value, for example) */
  nested?: ReactNode
}

/** An alert folded into the card it belongs to: its reason and, when a value is missing, the one action that supplies it. */
export const NestedAlert = ({ alert, inputAction }: { alert: Alert; inputAction?: InputAction }) => (
  <div className="alert__nested" data-tier={alert.tier}>
    <p>
      <strong>{alertTypeLabel(alert.type)}.</strong> {trimReason(alert.reason)}.
    </p>
    {alert.type === 'input_needed' && inputAction && (
      <button type="button" className="btn btn--secondary" onClick={inputAction.onClick}>
        {inputAction.label}
      </button>
    )}
  </div>
)

/** Rule sign-off is shown only where it exists: a page-wide note says everything else is a draft. */
export const AlertCard = ({ alert, headline, onOverride, overriddenReason, extra, inputAction, nested }: Props) => {
  const moved = movedBecause(alert)
  const lead = headline ?? trimReason(alert.reason)
  const showFull = lead !== alert.reason && lead !== alert.reason.replace(/\.$/, '')
  const urgent = alert.tier === 'interrupt'
  return (
    <article className="card alert" data-tier={alert.tier} role={urgent ? 'alert' : undefined}>
      <header className="alert__head">
        <TierBadge tier={alert.tier} />
        <span className="alert__type">{alertTypeLabel(alert.type)}</span>
      </header>
      <p className="alert__reason">{lead}</p>
      {urgent && extra}
      {nested}
      {alert.type === 'input_needed' && inputAction && (
        <button type="button" className="btn btn--secondary alert__action" onClick={inputAction.onClick}>
          {inputAction.label}
        </button>
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
      <details className="alert__more">
        <summary>Why, and the source</summary>
        {showFull && <p className="alert__full">{alert.reason}</p>}
        {!urgent && extra}
        {moved && <p className="alert__moved">{moved}</p>}
        <footer className="chips">
          {alert.ingredients.map((i) => (
            <span key={i} className="chip">
              {i}
            </span>
          ))}
          <span className="chip chip--source">{alert.source}</span>
          {alert.approved === true && (
            <span className="chip chip--ok" title="A pharmacist has signed off the rule behind this alert.">
              Approved rule
            </span>
          )}
          <span className="alert__conf num">Confidence {Math.round(alert.confidence * 100)}%</span>
        </footer>
      </details>
    </article>
  )
}
