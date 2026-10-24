import { useEffect, useState } from 'react'
import { mailtoFor, queryDraft } from '../history/query'
import type { HistoryResult, Order } from '../history/types'

/**
 * A polite query to the prescriber, drafted from the findings. The pharmacist edits it and chooses whether to send it;
 * Parchi sends nothing.
 */
export const QueryDraftCard = ({ order, result }: { order: Order; result: HistoryResult }) => {
  const draft = queryDraft(order, result)
  const [text, setText] = useState(draft.body)
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  useEffect(() => {
    setText(draft.body)
    setCopied(null)
  }, [draft.body])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${text}`)
      setCopied('yes')
    } catch {
      setCopied('no')
    }
  }

  return (
    <details className="card order__tools">
      <summary>Query to the doctor (draft)</summary>
      <div className="order__tools-body">
        <p className="hint">
          To {draft.doctors.join(', ')}. Edit it, then send it your own way: Parchi does not send anything.
        </p>
        <label className="field">
          <span className="field__label">Message</span>
          <textarea className="rx-input query__text" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="actions">
          <button type="button" className="btn btn--secondary" onClick={copy}>
            Copy
          </button>
          <a className="btn btn--secondary" href={mailtoFor({ ...draft, body: text })}>
            Open in mail
          </a>
        </div>
        <p className="hint" role="status">
          {copied === 'yes' ? 'Copied.' : copied === 'no' ? 'Could not copy. Select the text and copy it.' : ''}
        </p>
      </div>
    </details>
  )
}
