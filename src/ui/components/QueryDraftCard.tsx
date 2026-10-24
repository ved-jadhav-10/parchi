import { useEffect, useState } from 'react'
import { mailtoFor, queryDraft } from '../history/query'
import type { HistoryResult, Order } from '../history/types'
import { buildNote } from '../lib/message'

type Audience = 'prescriber' | 'customer'

/**
 * A message drafted from the findings, for the prescriber or for the customer. Indian pharmacists rarely get through to a
 * prescriber, so a hold often means asking the customer; both are here. The pharmacist edits the text and chooses whether to
 * send it: Parchi sends nothing. The notes quote the alerts and add no advice.
 */
export const QueryDraftCard = ({ order, result }: { order: Order; result: HistoryResult }) => {
  const [audience, setAudience] = useState<Audience>('prescriber')
  const doctorDraft = queryDraft(order, result)
  const customerNote = buildNote('customer', { name: order.customer.name, age_years: order.customer.age_years }, result.alerts)
  const base = audience === 'prescriber' ? doctorDraft.body : customerNote
  const [text, setText] = useState(base)
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  useEffect(() => {
    setText(base)
    setCopied(null)
  }, [base])

  const subject = audience === 'prescriber' ? doctorDraft.subject : `Your order ${order.id}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(audience === 'prescriber' ? `${subject}\n\n${text}` : text)
      setCopied('yes')
    } catch {
      setCopied('no')
    }
  }

  return (
    <details className="card order__tools">
      <summary>Message about this order (draft)</summary>
      <div className="order__tools-body">
        <fieldset className="reasons">
          <legend className="field__label">Write to</legend>
          <label className="reasons__option">
            <input type="radio" name="message-audience" checked={audience === 'prescriber'} onChange={() => setAudience('prescriber')} />
            The prescriber ({doctorDraft.doctors.join(', ')})
          </label>
          <label className="reasons__option">
            <input type="radio" name="message-audience" checked={audience === 'customer'} onChange={() => setAudience('customer')} />
            The customer
          </label>
        </fieldset>
        {text === '' ? (
          <p className="hint">There is nothing to ask about on this order.</p>
        ) : (
          <>
            <p className="hint">Edit it, then send it your own way: Parchi does not send anything.</p>
            <label className="field">
              <span className="field__label">Message</span>
              <textarea className="rx-input query__text" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <div className="actions">
              <button type="button" className="btn btn--secondary" onClick={copy}>
                Copy
              </button>
              {audience === 'prescriber' && (
                <a className="btn btn--secondary" href={mailtoFor({ ...doctorDraft, body: text })}>
                  Open in mail
                </a>
              )}
            </div>
            <p className="hint" role="status">
              {copied === 'yes' ? 'Copied.' : copied === 'no' ? 'Could not copy. Select the text and copy it.' : ''}
            </p>
          </>
        )}
      </div>
    </details>
  )
}
