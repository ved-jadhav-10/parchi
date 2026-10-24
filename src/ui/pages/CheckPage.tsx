import { useEffect, useRef, useState } from 'react'
import type { Alert, Patient } from '../../engine/contracts'
import { AlertCard } from '../components/AlertCard'
import { BrandMatch } from '../components/BrandMatch'
import { Card, KpiCard } from '../components/Card'
import { Icon } from '../components/Icons'
import { OverrideDialog } from '../components/OverrideDialog'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { TotalsNotes, XrayTable } from '../components/XrayTable'
import { runCheck, type CheckResult } from '../engine'
import { CoverageNote } from '../components/CoverageNote'
import { downloadText } from '../lib/csv'
import { toFhirBundle } from '../lib/fhir'
import { needsReview, tidy } from '../lib/resolved'
import { demoPatient, demoRxText } from '../demoCase'
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
  const resultRef = useRef<HTMLDivElement>(null)

  const ageOk = Number(patient.age) > 0
  const canCheck = rx.trim() !== '' && ageOk
  const needs = rx.trim() === '' ? (ageOk ? 'Add the prescription to check.' : "Add the prescription and the patient's age to check.") : 'Age is needed before checking.'

  // One column below 960px puts the result under the form: bring it into view after a check.
  useEffect(() => {
    if (!result && !failed) return
    if (!window.matchMedia('(max-width: 959px)').matches) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [result, failed])

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
  const toCheck = result?.lines.filter((l) => needsReview(l.resolved)).length ?? 0

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
      <PageIntro title="Prescription check" note="A second look for the pharmacist, run entirely on this device." />

      <div className="workspace">
        <div className="workspace__input">
          <Card title="Prescription" icon="flask" description="Type it as written: one medicine per line, or separated by semicolons.">
            <textarea
              className="rx-input"
              rows={6}
              value={rx}
              placeholder="Dolo 650 1-1-1 x5d; Pan D OD; ..."
              onChange={(e) => setRx(e.target.value)}
              onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && check()}
            />
            <div className="actions">
              <button className="btn btn--primary" onClick={check} disabled={!canCheck} aria-describedby={canCheck ? undefined : 'check-needs'}>
                {result ? 'Check again' : 'Check prescription'}
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => {
                  setRx(demoRxText)
                  setPatient({
                    age: String(demoPatient.age_years),
                    sex: demoPatient.sex ?? '',
                    weight: String(demoPatient.weight_kg ?? ''),
                    creatinine: String(demoPatient.serum_creatinine ?? ''),
                  })
                }}
              >
                Load demo
              </button>
            </div>
            {!canCheck && <p className="hint" id="check-needs">{needs}</p>}
          </Card>

          <Card id="patient" title="Patient" icon="user">
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
                    <p className="prompt__reason">{tidy(p.reason)}.</p>
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

        <div className="workspace__result" ref={resultRef}>
          {failed ? (
            <EmptyState title="Could not check this prescription">
              <p>Nothing was saved. Review the text and try again.</p>
            </EmptyState>
          ) : !result ? (
            <EmptyState title="No prescription checked yet">
              <p>Enter a prescription and the patient's age, then select Check prescription. Each line is checked for:</p>
              <ul className="checks">
                <li>
                  <strong>Daily totals</strong>
                  <span>Each ingredient added up across every brand on the slip, against the limit on file.</span>
                </li>
                <li>
                  <strong>Age and kidney function</strong>
                  <span>Weight or creatinine is asked for only when a medicine needs it.</span>
                </li>
                <li>
                  <strong>Interactions</strong>
                  <span>With a severity and the source it comes from.</span>
                </li>
                <li>
                  <strong>Duplicate classes</strong>
                  <span>Two NSAIDs, two PPIs, or any other pair from one class.</span>
                </li>
                <li>
                  <strong>Banned combinations</strong>
                  <span>Fixed-dose combinations on the banned list.</span>
                </li>
              </ul>
            </EmptyState>
          ) : (
            <div aria-live="polite" className="result">
              <p className="mock-note">Limits and alert rules are drafts until a pharmacist signs them off.</p>
              {prompts.length > 0 && (
                <p className="result-note">
                  Some limits are not adjusted yet. <a href="#patient">Add what is asked under Patient</a>, then check again.
                </p>
              )}

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

              <CoverageNote gaps={result.ddi_gaps} />

              <Card title="Prescription X-ray" icon="chart" description="Daily total per ingredient across all brands, against the limit on file">
                <XrayTable ledger={result.ledger} alerts={result.alerts} />
                <TotalsNotes notes={result.notes} ledger={result.ledger} />
              </Card>

              <Card title="Brand matches" description="What was typed and what it was matched to. Select a line for details.">
                <ul className="matches">
                  {result.lines.map((l, i) => (
                    <BrandMatch key={`${i}-${l.resolved.raw}`} resolved={l.resolved} sig={l.sig} />
                  ))}
                </ul>
                {result.lines.some((l) => (l.resolved.jan_aushadhi?.length ?? 0) > 0) && (
                  <p className="hint">
                    Jan Aushadhi generics have the same ingredients and strengths. They are not a safety flag: the pharmacist confirms they are equivalent. The
                    list has no prices.
                  </p>
                )}
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
