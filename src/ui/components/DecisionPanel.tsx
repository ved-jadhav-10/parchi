import { useEffect, useRef, useState } from 'react'
import { DECISIONS, DECISION_REASONS, STATUS_LABEL, decisionLabel } from '../history/labels'
import type { Decision, HistoryResult, Order, OrderStatus } from '../history/types'
import { addDecision } from '../storage/orders'

const count = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length

type Props = {
  order: Order
  result: HistoryResult
  last?: Decision
  onSaved: () => void
  /** The next waiting order, in queue order, or null when none is left */
  next: string | null
  othersWaiting: number
}

/**
 * The pharmacist's decision on an order. Parchi suggests a status; choosing a different one needs a reason. Saved to the audit log.
 * A suggested hold starts with nothing chosen, so agreeing with it is a choice rather than a default. Keys 1 to 3 choose, Ctrl+Enter saves.
 */
export const DecisionPanel = ({ order, result, last, onSaved, next, othersWaiting }: Props) => {
  const [decision, setDecision] = useState<OrderStatus | null>(last?.decision ?? (result.status === 'hold_contact_doctor' ? null : result.status))
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const differs = decision !== null && decision !== result.status
  const needsNote = reason === 'Other'
  const valid = decision !== null && (!differs || reason !== '') && (!needsNote || note.trim() !== '')

  const save = async (andNext: boolean) => {
    if (!valid || decision === null || saving) return
    setSaving(true)
    try {
      await addDecision({
        at: new Date().toISOString(),
        order_id: order.id,
        customer: order.customer.name,
        suggested: result.status,
        decision,
        reason: differs ? reason : 'As suggested',
        ...(note.trim() && { note: note.trim() }),
        interrupts: count(result, 'interrupt'),
        informs: count(result, 'inform'),
      })
      setFailed(false)
      setReason('')
      setNote('')
      onSaved()
      if (andNext && next) location.hash = `#/order/${encodeURIComponent(next)}`
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  // Keys act on the latest state without re-binding on every keystroke.
  const latest = useRef({ save, setDecision })
  latest.current = { save, setDecision }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) return
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        latest.current.save(true)
        return
      }
      const choice = DECISIONS[Number(e.key) - 1]
      if (!choice || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement
      if (t.closest('textarea, select, input:not([type=radio])')) return
      latest.current.setDecision(choice.value)
      setReason('')
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      className="decision"
      onSubmit={(e) => {
        e.preventDefault()
        save(true)
      }}
    >
      {last && (
        <p className="decision__saved" role="status">
          Saved: <strong>{decisionLabel(last.decision)}</strong>, {new Date(last.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.
        </p>
      )}
      <fieldset className="reasons">
        <legend className="field__label">Parchi suggests: {STATUS_LABEL[result.status]}. What do you decide?</legend>
        {DECISIONS.map((d, i) => (
          <label key={d.value} className="reasons__option decision__option">
            <input
              type="radio"
              name="decision"
              value={d.value}
              checked={decision === d.value}
              onChange={() => {
                setDecision(d.value)
                setReason('')
              }}
            />
            <span>
              {d.label} <kbd className="decision__key" aria-hidden="true">{i + 1}</kbd>
              <span className="decision__hint">{d.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {differs && (
        <label className="field">
          <span className="field__label">Why differ from the suggestion? (required)</span>
          <select className="field__input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Choose a reason</option>
            {DECISION_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span className="field__label">Note{needsNote ? ' (required)' : ' (optional)'}</span>
        <textarea className="rx-input decision__note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {decision !== null && (
        <p className="hint decision__confirm">
          Parchi suggested {STATUS_LABEL[result.status]}. You chose {decisionLabel(decision)}
          {differs && reason ? `, because: ${reason}` : ''}. Saving records this, with the time, in the order decisions log on this device.
        </p>
      )}

      {failed && (
        <p className="dialog__error" role="alert">
          Could not save on this device. The decision was not recorded. Press save again; if it keeps failing, free browser storage or use a normal window.
        </p>
      )}
      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={!valid || saving} aria-describedby={valid ? undefined : 'decision-needs'}>
          {next ? 'Save and open next' : 'Save decision'}
        </button>
        {next && (
          <button type="button" className="btn btn--secondary" disabled={!valid || saving} onClick={() => save(false)}>
            Save and stay
          </button>
        )}
      </div>
      {next ? (
        <p className="hint">
          {othersWaiting} more {othersWaiting === 1 ? 'order waits' : 'orders wait'}. The next one is the highest in the queue.
        </p>
      ) : (
        <p className="hint">
          No other order is waiting. <a href="#/queue">Back to the review queue</a>
        </p>
      )}
      {!valid && (
        <p className="hint" id="decision-needs">
          {decision === null ? 'Choose what you decide.' : differs && reason === '' ? 'Choose why this differs from the suggestion.' : 'Add a note for “Other”.'}
        </p>
      )}
      <p className="hint decision__keys">Keys 1, 2, 3 choose. Ctrl+Enter saves and opens the next order.</p>
    </form>
  )
}
