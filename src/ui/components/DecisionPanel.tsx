import { useState } from 'react'
import { DECISIONS, STATUS_LABEL, decisionLabel } from '../history/labels'
import type { Decision, HistoryResult, Order, OrderStatus } from '../history/types'
import { addDecision } from '../storage/orders'
import { OVERRIDE_REASONS } from './OverrideDialog'

const count = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length

/** The pharmacist's decision on an order. Parchi suggests a status; choosing a different one needs a reason. Saved to the audit log. */
export const DecisionPanel = ({ order, result, last, onSaved }: { order: Order; result: HistoryResult; last?: Decision; onSaved: () => void }) => {
  const [decision, setDecision] = useState<OrderStatus>(last?.decision ?? result.status)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)

  const differs = decision !== result.status
  const needsNote = reason === 'Other'
  const valid = (!differs || reason !== '') && (!needsNote || note.trim() !== '')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
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
    } catch {
      setFailed(true)
    }
  }

  return (
    <form className="decision" onSubmit={save}>
      {last && (
        <p className="decision__saved" role="status">
          Saved: <strong>{decisionLabel(last.decision)}</strong>, {new Date(last.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.
        </p>
      )}
      <fieldset className="reasons">
        <legend className="field__label">Parchi suggests: {STATUS_LABEL[result.status]}. What do you decide?</legend>
        {DECISIONS.map((d) => (
          <label key={d.value} className="reasons__option decision__option">
            <input type="radio" name="decision" value={d.value} checked={decision === d.value} onChange={() => setDecision(d.value)} />
            <span>
              {d.label}
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
            {OVERRIDE_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span className="field__label">Note{needsNote ? ' (required)' : ' (optional)'}</span>
        <textarea className="rx-input decision__note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {failed && (
        <p className="dialog__error" role="alert">
          Could not save on this device. The decision was not recorded.
        </p>
      )}
      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={!valid} aria-describedby={valid ? undefined : 'decision-needs'}>
          Save decision
        </button>
      </div>
      {!valid && (
        <p className="hint" id="decision-needs">
          {differs && reason === '' ? 'Choose why this differs from the suggestion.' : 'Add a note for “Other”.'}
        </p>
      )}
    </form>
  )
}
