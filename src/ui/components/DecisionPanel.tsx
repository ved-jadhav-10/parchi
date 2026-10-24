import { Select } from './Select'
import { useState } from 'react'
import { DECISIONS, STATUS_LABEL, decisionLabel } from '../history/labels'
import type { Decision, HistoryResult, Order, OrderStatus } from '../history/types'
import { buildNote, type Audience } from '../lib/message'
import { addOverride } from '../storage/overrides'
import { addDecision } from '../storage/orders'
import { OVERRIDE_REASONS } from './OverrideDialog'

const count = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length

export interface Progress {
  done: number
  total: number
  /** The order to open next, if any is still waiting */
  next?: { id: string; name: string }
}

/**
 * The pharmacist's decision on an order, as a bar that stays at the foot of the page while the alerts are read. Parchi suggests a
 * status; choosing a different one needs a reason. Releasing an order that has Interrupts logs that reason against each Interrupt
 * (the override log), so there is one decision, not a decision plus a separate override per alert. Saved to the audit log.
 */
export const DecisionPanel = ({ order, result, last, progress, onSaved }: { order: Order; result: HistoryResult; last?: Decision; progress?: Progress; onSaved: () => void }) => {
  const [decision, setDecision] = useState<OrderStatus>(last?.decision ?? result.status)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [more, setMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState<Audience | null>(null)

  const copy = async (audience: Audience) => {
    const text = buildNote(audience, { name: order.customer.name, age_years: order.customer.age_years }, result.alerts)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(audience)
    } catch {
      window.prompt('Copy this note', text)
    }
  }

  const interrupts = result.alerts.filter((a) => a.tier === 'interrupt')
  const releasing = decision !== 'hold_contact_doctor'
  const differs = decision !== result.status
  const needsNote = reason === 'Other'
  const valid = (!differs || reason !== '') && (!needsNote || note.trim() !== '')
  const chosen = DECISIONS.find((d) => d.value === decision)

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
        interrupts: interrupts.length,
        informs: count(result, 'inform'),
      })
      if (releasing) {
        for (const a of interrupts) {
          await addOverride({
            at: new Date().toISOString(),
            tier: a.tier,
            type: a.type,
            ingredients: a.ingredients,
            alert_reason: a.reason,
            source: a.source,
            override_reason: differs ? reason : 'As suggested',
            note: `${order.id}: released with this Interrupt open${note.trim() ? `. ${note.trim()}` : ''}`,
          })
        }
      }
      setFailed(false)
      setReason('')
      setNote('')
      setMore(false)
      onSaved()
    } catch {
      setFailed(true)
    }
  }

  return (
    <form className="decisionbar" onSubmit={save} aria-label="Your decision">
      <div className="decisionbar__row">
        <p className="decisionbar__suggest">
          Parchi suggests <strong>{STATUS_LABEL[result.status]}</strong>. You decide:
        </p>
        <fieldset className="segmented">
          <legend className="sr-only">Decision</legend>
          {DECISIONS.map((d) => (
            <label key={d.value} className="segmented__option">
              <input type="radio" name="decision" value={d.value} checked={decision === d.value} onChange={() => setDecision(d.value)} />
              <span>{d.short}</span>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="btn btn--primary" disabled={!valid} aria-describedby={valid ? undefined : 'decision-needs'}>
          Save decision
        </button>
      </div>
      {chosen && <p className="decisionbar__hint">{chosen.hint}</p>}

      {differs && (
        <div className="decisionbar__reason">
          <Select
            label="Why differ from the suggestion? (required)"
            value={reason}
            onChange={setReason}
            placeholder="Choose a reason"
            options={OVERRIDE_REASONS.map((r) => ({ value: r, label: r }))}
          />
        </div>
      )}
      {releasing && interrupts.length > 0 && (
        <p className="decisionbar__hint">
          Releasing with {interrupts.length === 1 ? 'an Interrupt' : `${interrupts.length} Interrupts`} open logs this reason against {interrupts.length === 1 ? 'it' : 'each'} in the override log.
        </p>
      )}

      <details className="decisionbar__more" open={more || needsNote} onToggle={(e) => setMore((e.target as HTMLDetailsElement).open)}>
        <summary>Note{needsNote ? ' (required)' : ''} and messages to copy</summary>
        <label className="field">
          <span className="field__label">Note{needsNote ? ' (required)' : ' (optional)'}</span>
          <textarea className="rx-input decision__note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="actions">
          <button type="button" className="btn btn--secondary" onClick={() => copy('prescriber')}>
            Copy a note for the prescriber
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => copy('customer')}>
            Copy a note for the customer
          </button>
        </div>
        {copied && (
          <p className="hint" role="status">
            Copied the note for the {copied}. It quotes the alerts and adds no advice; read it before sending.
          </p>
        )}
      </details>

      {failed && (
        <p className="dialog__error" role="alert">
          Could not save on this device. The decision was not recorded.
        </p>
      )}
      {!valid && (
        <p className="hint" id="decision-needs">
          {differs && reason === '' ? 'Choose why this differs from the suggestion.' : 'Add a note for “Other”.'}
        </p>
      )}
      {last && (
        <div className="decisionbar__saved" role="status">
          <span>
            Saved: <strong>{decisionLabel(last.decision)}</strong>, {new Date(last.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.
            {progress && ` ${progress.done} of ${progress.total} orders decided.`}
          </span>
          {progress?.next ? (
            <a className="btn btn--primary" href={`#/order/${encodeURIComponent(progress.next.id)}`}>
              Next order: {progress.next.name} →
            </a>
          ) : (
            progress && (
              <a className="btn btn--secondary" href="#/queue">
                No orders waiting. Back to the queue
              </a>
            )
          )}
        </div>
      )}
    </form>
  )
}
