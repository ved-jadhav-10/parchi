import { useEffect, useRef, useState } from 'react'
import type { Alert } from '../../engine/contracts'
import { TierBadge } from './Icons'

/** Starting list only. Replace with the pharmacist's real reasons after the session. */
export const OVERRIDE_REASONS = [
  'Clinically appropriate for this patient',
  'Prescriber confirmed',
  'Dose adjusted or will be adjusted',
  'Duplicate is intentional',
  'Known and being monitored',
  'Other',
]

type Props = { alert: Alert | null; onCancel: () => void; onSave: (reason: string, note: string) => Promise<void> }

export const OverrideDialog = ({ alert, onCancel, onSave }: Props) => {
  const ref = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (alert && !d.open) {
      setReason('')
      setNote('')
      setFailed(false)
      d.showModal()
    }
    if (!alert && d.open) d.close()
  }, [alert])

  const needsNote = reason === 'Other'
  const valid = reason !== '' && (!needsNote || note.trim() !== '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSave(reason, note.trim())
    } catch {
      setFailed(true)
    }
  }

  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => (e.preventDefault(), onCancel())} aria-labelledby="override-title">
      {alert && (
        <form onSubmit={submit} className="dialog__body">
          <h2 id="override-title">Override with reason</h2>
          <div className="dialog__alert">
            <TierBadge tier={alert.tier} />
            <p>{alert.reason}</p>
          </div>

          <fieldset className="reasons">
            <legend className="field__label">Why is this being overridden? (required)</legend>
            {OVERRIDE_REASONS.map((r) => (
              <label key={r} className="reasons__option">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span className="field__label">Note{needsNote ? ' (required)' : ' (optional)'}</span>
            <textarea className="rx-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {failed && <p className="dialog__error" role="alert">Could not save on this device. The override was not recorded.</p>}

          <div className="actions">
            <button type="submit" className="btn btn--primary" disabled={!valid}>
              Save override
            </button>
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}
