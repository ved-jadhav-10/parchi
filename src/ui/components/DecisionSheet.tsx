import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The decision form as a sheet from the bottom of the screen, for a phone. A native modal dialog, so focus is held inside it,
 * Escape closes it and focus returns to the button that opened it. The caller renders the form only while it is open.
 */
export const DecisionSheet = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // The form is what the sheet is for: start on its options, so the number keys work at once.
      requestAnimationFrame(() => d.querySelector<HTMLInputElement>('input[name=decision]:checked, input[name=decision]')?.focus())
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog sheet" aria-labelledby="sheet-title" onCancel={(e) => (e.preventDefault(), onClose())}>
      {open && (
        <div className="dialog__body">
          <header className="sheet__head">
            <h2 id="sheet-title" className="card__title">
              Your decision
            </h2>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Close
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
