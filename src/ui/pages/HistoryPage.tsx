import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card'
import { PageIntro } from '../components/PageIntro'
import { demoOrders } from '../history/demoOrders'
import { todayIso } from '../history/labels'
import type { LabResult, Order } from '../history/types'
import { importFhirText } from '../lib/fhirOrder'
import { useRouteParam } from '../route'
import { saveOrder, useOrders } from '../storage/orders'

interface Draft {
  id: string
  placed: string
  name: string
  age: string
  sex: '' | 'M' | 'F'
  weight: string
  prescriptions: { doctor: string; date: string; text: string }[]
  labs: { value: string; date: string }[]
}

const newId = () => `ORD-${Date.now().toString(36).toUpperCase().slice(-5)}`
const blankRx = () => ({ doctor: '', date: todayIso(), text: '' })
const blank = (): Draft => ({ id: newId(), placed: todayIso(), name: '', age: '', sex: '', weight: '', prescriptions: [blankRx()], labs: [] })

const toDraft = (o: Order): Draft => ({
  id: o.id,
  placed: o.placed,
  name: o.customer.name,
  age: String(o.customer.age_years),
  sex: o.customer.sex ?? '',
  weight: o.customer.weight_kg ? String(o.customer.weight_kg) : '',
  prescriptions: o.prescriptions.map((p) => ({ doctor: p.doctor, date: p.date, text: p.text })),
  labs: o.labs.map((l) => ({ value: String(l.value), date: l.date })),
})

const toOrder = (d: Draft, keep?: Order): Order => ({
  id: d.id,
  placed: d.placed,
  customer: { name: d.name.trim(), age_years: Number(d.age), ...(d.sex && { sex: d.sex }), ...(Number(d.weight) > 0 && { weight_kg: Number(d.weight) }) },
  prescriptions: d.prescriptions.map((p, i) => ({ id: `rx-${d.id}-${i + 1}`, doctor: p.doctor.trim(), date: p.date, text: p.text.trim() })),
  labs: d.labs.map((l): LabResult => ({ type: 'serum_creatinine', value: Number(l.value), date: l.date })),
  ...(keep?.incoming_labs?.length && { incoming_labs: keep.incoming_labs }),
})

/** What is still missing before the history can be checked, in words. Empty = ready. */
const missing = (d: Draft): string[] => {
  const out: string[] = []
  if (d.name.trim() === '') out.push("the customer's name")
  if (!(Number(d.age) > 0)) out.push("the customer's age")
  d.prescriptions.forEach((p, i) => {
    const n = `prescription ${i + 1}`
    if (p.doctor.trim() === '') out.push(`the doctor on ${n}`)
    if (p.date === '') out.push(`the date on ${n}`)
    if (p.text.trim() === '') out.push(`the medicines on ${n}`)
  })
  d.labs.forEach((l, i) => {
    if (!(Number(l.value) > 0) || l.date === '') out.push(`the value and date of result ${i + 1}`)
  })
  return out
}

/** Enter or edit a customer's history: one prescription per doctor and date, plus lab results. Saved on this device. */
export const HistoryPage = () => {
  const id = useRouteParam()
  const { orders, ready } = useOrders()
  const existing = id ? orders.find((o) => o.id === id) : undefined
  const [draft, setDraft] = useState<Draft>(blank)
  const [failed, setFailed] = useState(false)
  const [imported, setImported] = useState<{ prescriptions: number; labs: number; warnings: string[] } | { error: string } | null>(null)
  const loaded = useRef('')

  useEffect(() => {
    if (existing && loaded.current !== existing.id) {
      loaded.current = existing.id
      setDraft(toDraft(existing))
    }
  }, [existing])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setRx = (i: number, k: 'doctor' | 'date' | 'text', v: string) => set('prescriptions', draft.prescriptions.map((p, j) => (j === i ? { ...p, [k]: v } : p)))
  const setLab = (i: number, k: 'value' | 'date', v: string) => set('labs', draft.labs.map((l, j) => (j === i ? { ...l, [k]: v } : l)))

  const todo = missing(draft)
  const ok = todo.length === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ok) return
    try {
      await saveOrder(toOrder(draft, existing))
      setFailed(false)
      location.hash = `#/order/${encodeURIComponent(draft.id)}`
    } catch {
      setFailed(true)
    }
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const r = importFhirText(await file.text())
      setDraft((d) => ({
        ...d,
        name: r.name ?? d.name,
        age: r.age ?? d.age,
        sex: r.sex ?? d.sex,
        weight: r.weight ?? d.weight,
        prescriptions: r.prescriptions.length ? r.prescriptions : d.prescriptions,
        labs: r.labs.length ? r.labs : d.labs,
      }))
      setImported({ prescriptions: r.prescriptions.length, labs: r.labs.length, warnings: r.warnings })
    } catch (e) {
      setImported({ error: e instanceof Error ? e.message : 'That file could not be read.' })
    }
  }

  const loadSample = () => {
    const s = demoOrders[0]
    setDraft({ ...toDraft(s), id: newId(), labs: [], name: `${s.customer.name} (sample)` })
  }

  if (id && !ready) return <PageIntro title="History" note="Loading." />

  return (
    <>
      <p className="backlink">
        <a href={existing ? `#/order/${encodeURIComponent(existing.id)}` : '#/queue'}>← {existing ? 'Back to the order' : 'Review queue'}</a>
      </p>
      <PageIntro title={existing ? 'Edit history' : 'New order'} note="One prescription for each doctor and date, as the buyer holds them. Parchi checks them together." />
      <form className="workspace workspace--single" onSubmit={submit}>
        <Card title="Customer" icon="user">
          <div className="fields fields--4">
            <label className="field">
              <span className="field__label">Name</span>
              <input className="field__input" value={draft.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
            </label>
            <label className="field">
              <span className="field__label">Age (years)</span>
              <input className="field__input" type="number" inputMode="numeric" min={0} value={draft.age} onChange={(e) => set('age', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Sex</span>
              <select className="field__input" value={draft.sex} onChange={(e) => set('sex', e.target.value as Draft['sex'])}>
                <option value="">Not given</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Weight (kg)</span>
              <input className="field__input" type="number" inputMode="decimal" min={0} value={draft.weight} onChange={(e) => set('weight', e.target.value)} />
            </label>
          </div>
          <label className="field history__placed">
            <span className="field__label">Order placed</span>
            <input className="field__input" type="date" value={draft.placed} onChange={(e) => set('placed', e.target.value)} />
          </label>
        </Card>

        {draft.prescriptions.map((p, i) => (
          <Card key={i} title={`Prescription ${i + 1}`} icon="flask">
            <div className="fields">
              <label className="field">
                <span className="field__label">Doctor</span>
                <input className="field__input" value={p.doctor} onChange={(e) => setRx(i, 'doctor', e.target.value)} autoComplete="off" />
              </label>
              <label className="field">
                <span className="field__label">Date written</span>
                <input className="field__input" type="date" value={p.date} onChange={(e) => setRx(i, 'date', e.target.value)} />
              </label>
            </div>
            <label className="field history__text">
              <span className="field__label">Medicines, as written</span>
              <textarea className="rx-input" rows={3} value={p.text} placeholder="Dolo 650 1-1-1 x5d; Pan D OD" onChange={(e) => setRx(i, 'text', e.target.value)} />
            </label>
            {draft.prescriptions.length > 1 && (
              <div className="actions">
                <button type="button" className="btn btn--secondary" onClick={() => set('prescriptions', draft.prescriptions.filter((_, j) => j !== i))}>
                  Remove prescription {i + 1}
                </button>
              </div>
            )}
          </Card>
        ))}
        <div className="actions history__add">
          <button type="button" className="btn btn--secondary" onClick={() => set('prescriptions', [...draft.prescriptions, blankRx()])}>
            Add a prescription
          </button>
          {!existing && (
            <button type="button" className="btn btn--secondary" onClick={loadSample}>
              Load the sample customer
            </button>
          )}
        </div>

        <Card title="Lab results" icon="chart" description="Serum creatinine. The latest result is used to estimate kidney function; adding a new one re-checks the order.">
          {draft.labs.length === 0 && <p className="hint">No result on file. Kidney checks will ask for one when a medicine needs it.</p>}
          {draft.labs.map((l, i) => (
            <div key={i} className="fields fields--lab">
              <label className="field">
                <span className="field__label">Creatinine (mg/dL)</span>
                <input className="field__input" type="number" inputMode="decimal" min={0} step="0.01" value={l.value} onChange={(e) => setLab(i, 'value', e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Result date</span>
                <input className="field__input" type="date" value={l.date} onChange={(e) => setLab(i, 'date', e.target.value)} />
              </label>
              <button type="button" className="btn btn--secondary" onClick={() => set('labs', draft.labs.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <div className="actions">
            <button type="button" className="btn btn--secondary" onClick={() => set('labs', [...draft.labs, { value: '', date: todayIso() }])}>
              Add a result
            </button>
          </div>
        </Card>

        <Card title="Or import from FHIR" icon="flask" description="Instead of typing: a FHIR R4 Bundle (for example an ABDM prescription record) fills in the form above; check it before saving.">
          <label className="field">
            <span className="field__label">FHIR file (.json)</span>
            <input className="field__input" type="file" accept=".json,application/json,application/fhir+json" onChange={(e) => importFile(e.target.files?.[0])} />
          </label>
          <div aria-live="polite">
            {imported && 'error' in imported && (
              <p className="dialog__error" role="alert">
                {imported.error}
              </p>
            )}
            {imported && !('error' in imported) && (
              <>
                <p className="hint">
                  Read {imported.prescriptions} {imported.prescriptions === 1 ? 'prescription' : 'prescriptions'} and {imported.labs} lab {imported.labs === 1 ? 'result' : 'results'}. Anything
                  already in the form above was replaced.
                </p>
                {imported.warnings.length > 0 && (
                  <ul className="changes">
                    {imported.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </Card>

        {failed && (
          <p className="dialog__error" role="alert">
            Could not save on this device, so the order was not added. Press the button again; if it keeps failing, ask whoever looks after this device, because the browser may be blocking storage.
          </p>
        )}
        <div className="actions">
          <button type="submit" className="btn btn--primary" disabled={!ok} aria-describedby={ok ? undefined : 'history-needs'}>
            Check history
          </button>
        </div>
        {!ok && (
          <p className="hint" id="history-needs">
            Still needed: {todo.slice(0, 4).join(', ')}
            {todo.length > 4 ? ` and ${todo.length - 4} more` : ''}.
          </p>
        )}
      </form>
    </>
  )
}
