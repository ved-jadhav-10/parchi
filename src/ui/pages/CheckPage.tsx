import { useState } from 'react'
import type { Alert, Patient } from '../../engine/contracts'
import { AlertCard } from '../components/AlertCard'
import { BrandMatch, REVIEW_BELOW } from '../components/BrandMatch'
import { Card, KpiCard } from '../components/Card'
import { Icon } from '../components/Icons'
import { OverrideDialog } from '../components/OverrideDialog'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { XrayTable } from '../components/XrayTable'
import { runCheck, isMock, type CheckResult } from '../engine'
import { downloadText } from '../lib/csv'
import { toFhirBundle } from '../lib/fhir'
import { demoPatient, demoRxText } from '../mock/demoResult'
import { addOverride } from '../storage/overrides'

const blank = { age: '', sex: '', weight: '', creatinine: '' }

const Field = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="field">
    <span className="field__label">{label}</span>
    <input className="field__input" {...props} />
  </label>
)

const toPatient = (p: typeof blank): Patient => ({
  age_years: Number(p.age),
  ...(p.sex && { sex: p.sex as 'M' | 'F' }),
  ...(p.weight && { weight_kg: Number(p.weight) }),
  ...(p.creatinine && { serum_creatinine: Number(p.creatinine) }),
})

export const CheckPage = () => {
  const [rx, setRx] = useState('')
  const [patient, setPatient] = useState(blank)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [overriding, setOverriding] = useState<number | null>(null)
  const [overridden, setOverridden] = useState<Record<number, string>>({})

  const ageOk = Number(patient.age) > 0
  const canCheck = rx.trim() !== '' && ageOk

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPatient({ ...patient, [k]: e.target.value })

  const check = async () => {
    if (!canCheck) return
    try {
      setFailed(false)
      setOverridden({})
      setResult(await runCheck(rx, toPatient(patient)))
    } catch {
      setFailed(true)
    }
  }

  const alerts = (result?.alerts ?? []).map((alert, i) => ({ alert, i }))
  const shown = alerts.filter((x) => x.alert.tier !== 'silent')
  const silent = alerts.filter((x) => x.alert.tier === 'silent')
  const count = (t: Alert['tier']) => alerts.filter((x) => x.alert.tier === t).length
  const prompts = result?.prompts ?? []
  const toCheck = result?.lines.filter((l) => l.resolved.brand === null || l.resolved.confidence < REVIEW_BELOW).length ?? 0

  const saveOverride = async (reason: string, note: string) => {
    if (overriding === null || !result) return
    const a = result.alerts[overriding]
    await addOverride({
      at: new Date().toISOString(),
      tier: a.tier,
      type: a.type,
      ingredients: a.ingredients,
      alert_reason: a.reason,
      source: a.source,
      override_reason: reason,
      ...(note && { note }),
    })
    setOverridden({ ...overridden, [overriding]: reason })
    setOverriding(null)
  }

  return (
    <>
      <PageIntro eyebrow="Pharmacist workspace," title="Prescription check" />

      <div className="workspace">
        <div className="workspace__input">
          <Card title="Prescription" icon="flask" description="Type it as written, one line per medicine or separated by ;">
            <textarea
              className="rx-input"
              rows={6}
              value={rx}
              placeholder="Dolo 650 1-1-1 x5d; Pan D OD; ..."
              onChange={(e) => setRx(e.target.value)}
              onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && check()}
            />
            <div className="actions">
              <button className="btn btn--primary" onClick={check} disabled={!canCheck}>
                {result ? 'Check again' : 'Check prescription'}
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
            {rx.trim() !== '' && !ageOk && <p className="hint">Age is needed before checking.</p>}
          </Card>

          <Card title="Patient" icon="user">
            <div className="fields">
              <Field label="Age (years)" type="number" inputMode="numeric" min={0} value={patient.age} onChange={set('age')} />
              <label className="field">
                <span className="field__label">Sex</span>
                <select className="field__input" value={patient.sex} onChange={set('sex')}>
                  <option value="">Not given</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </label>
            </div>
            {prompts.length > 0 && (
              <div className="prompt">
                {prompts.map((p) => (
                  <div key={p.field} className="prompt__item">
                    <p className="prompt__reason">{p.reason}.</p>
                    {p.field === 'weight_kg' ? (
                      <Field label="Weight (kg)" type="number" inputMode="decimal" value={patient.weight} onChange={set('weight')} />
                    ) : (
                      <Field label="Serum creatinine (mg/dL)" type="number" inputMode="decimal" value={patient.creatinine} onChange={set('creatinine')} />
                    )}
                  </div>
                ))}
                <p className="prompt__skip">Skipping means limits are not adjusted for these. Select Check again after filling in.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="workspace__result">
          {failed ? (
            <EmptyState title="Could not check this prescription">
              <p>Nothing was saved. Review the text and try again.</p>
            </EmptyState>
          ) : !result ? (
            <EmptyState title="No prescription checked yet">
              <p>Enter a prescription and the patient's age, then select Check prescription. Everything runs on this device.</p>
            </EmptyState>
          ) : (
            <div aria-live="polite" className="result">
              {isMock && <p className="mock-note">Demo data until the engine is connected</p>}

              <div className="kpis">
                <KpiCard label="Interrupt" value={count('interrupt')} hint="Target: 1 or fewer per Rx" tier="interrupt" />
                <KpiCard label="Inform" value={count('inform')} tier="inform" />
                <KpiCard label="Logged" value={count('silent')} hint="Silent, not shown" tier="silent" />
                <KpiCard label="Brands to check" value={toCheck} hint="Low-confidence match" />
              </div>

              {shown.length === 0 && (
                <EmptyState title="No alerts from the checks run">
                  <p>This is not a statement that the prescription is safe.</p>
                </EmptyState>
              )}
              <div className="alerts">
                {shown.map(({ alert, i }) => (
                  <AlertCard
                    key={i}
                    alert={alert}
                    overriddenReason={overridden[i]}
                    onOverride={alert.tier === 'interrupt' ? () => setOverriding(i) : undefined}
                  />
                ))}
              </div>

              <Card title="Prescription X-ray" icon="chart" description="Daily total per ingredient across all brands, against the limit on file">
                <XrayTable ledger={result.ledger} />
              </Card>

              <Card title="Brand matches" description="What was typed and what it was matched to. Select a line for details.">
                <ul className="matches">
                  {result.lines.map((l) => (
                    <BrandMatch key={l.resolved.raw} resolved={l.resolved} sig={l.sig} />
                  ))}
                </ul>
              </Card>

              {silent.length > 0 && (
                <details className="silent-log">
                  <summary>{silent.length} logged (not shown)</summary>
                  {silent.map(({ alert, i }) => (
                    <AlertCard key={i} alert={alert} />
                  ))}
                </details>
              )}

              <div className="actions">
                <button
                  className="btn btn--secondary"
                  onClick={() => downloadText('prescription.fhir.json', JSON.stringify(toFhirBundle(result.lines, toPatient(patient)), null, 2), 'application/json')}
                >
                  <Icon name="download" size={16} /> Export FHIR (draft)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <OverrideDialog alert={overriding === null || !result ? null : result.alerts[overriding]} onCancel={() => setOverriding(null)} onSave={saveOverride} />
    </>
  )
}
