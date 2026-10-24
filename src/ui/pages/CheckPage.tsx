import { useState } from 'react'
import { Card, KpiCard } from '../components/Card'
import { AlertCard } from '../components/AlertCard'
import { XrayTable } from '../components/XrayTable'
import { demoAlerts, demoLedger, demoLines, demoPatient, demoRxText } from '../mock/demoResult'

/** Below this the match is shown as "Check match" (needs pharmacist). Real value comes from Track A. */
const REVIEW_BELOW = 0.9

const Field = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="field">
    <span className="field__label">{label}</span>
    <input className="field__input" {...props} />
  </label>
)

export const CheckPage = () => {
  const [rx, setRx] = useState('')
  const [patient, setPatient] = useState({ age: '', sex: '', weight: '', creatinine: '' })
  const [checked, setChecked] = useState(false)

  const set = (k: keyof typeof patient) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPatient({ ...patient, [k]: e.target.value })

  const count = (t: string) => demoAlerts.filter((x) => x.tier === t).length
  const shown = demoAlerts.filter((x) => x.tier !== 'silent')
  const silent = demoAlerts.filter((x) => x.tier === 'silent')

  return (
    <>
      <div className="intro">
        <p className="intro__eyebrow">Pharmacist workspace,</p>
        <h1>Prescription check</h1>
      </div>

      <div className="workspace">
        <div className="workspace__input">
          <Card title="Prescription" icon="flask" description="Type it as written, one line per medicine or separated by ;">
            <textarea
              className="rx-input"
              rows={6}
              value={rx}
              placeholder="Dolo 650 1-1-1 x5d; Pan D OD; ..."
              onChange={(e) => setRx(e.target.value)}
              onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && setChecked(true)}
            />
            <div className="actions">
              <button className="btn btn--primary" onClick={() => setChecked(true)}>
                Check prescription
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => {
                  setRx(demoRxText)
                  setPatient(demoPatient)
                }}
              >
                Load demo
              </button>
            </div>
          </Card>

          <Card title="Patient" icon="user">
            <div className="fields">
              <Field label="Age (years)" type="number" inputMode="numeric" value={patient.age} onChange={set('age')} />
              <label className="field">
                <span className="field__label">Sex</span>
                <select className="field__input" value={patient.sex} onChange={set('sex')}>
                  <option value="">Not given</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </label>
            </div>
            {checked && (
              <div className="prompt">
                <p className="prompt__reason">Creatinine and weight are asked because NSAIDs are present.</p>
                <div className="fields">
                  <Field label="Weight (kg)" type="number" inputMode="decimal" value={patient.weight} onChange={set('weight')} />
                  <Field label="Serum creatinine (mg/dL)" type="number" inputMode="decimal" value={patient.creatinine} onChange={set('creatinine')} />
                </div>
                <p className="prompt__skip">Skipping means limits are not adjusted for renal function.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="workspace__result">
          {!checked ? (
            <div className="empty">
              <p className="empty__title">No prescription checked yet</p>
              <p>Enter a prescription and select Check prescription. Everything runs on this device.</p>
            </div>
          ) : (
            <div aria-live="polite" className="result">
              <p className="mock-note">Demo data until the engine is connected</p>

              <div className="kpis">
                <KpiCard label="Interrupt" value={count('interrupt')} hint="Target: 1 or fewer per Rx" tier="interrupt" />
                <KpiCard label="Inform" value={count('inform')} tier="inform" />
                <KpiCard label="Logged" value={count('silent')} hint="Silent, not shown" tier="silent" />
                <KpiCard label="Brands to check" value={demoLines.filter((l) => l.confidence < REVIEW_BELOW).length} hint="Low-confidence match" />
              </div>

              <div className="alerts">
                {shown.map((al, i) => (
                  <AlertCard key={i} alert={al} />
                ))}
              </div>

              <Card title="Prescription X-ray" icon="chart" description="Daily total per ingredient across all brands, against the limit on file">
                <XrayTable ledger={demoLedger} />
              </Card>

              <Card title="Brand matches" description="What was typed and what it was matched to">
                <ul className="matches">
                  {demoLines.map((l) => (
                    <li key={l.raw} className="matches__row">
                      <span>
                        {l.raw} <span className="matches__arrow">→</span> <strong>{l.brand}</strong>
                      </span>
                      <span className="num matches__conf">{Math.round(l.confidence * 100)}%</span>
                      {l.confidence < REVIEW_BELOW && <span className="chip chip--review">Check match</span>}
                    </li>
                  ))}
                </ul>
              </Card>

              <details className="silent-log">
                <summary>{silent.length} logged (not shown)</summary>
                {silent.map((al, i) => (
                  <AlertCard key={i} alert={al} />
                ))}
              </details>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
