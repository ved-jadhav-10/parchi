import { useEffect, useRef, useState } from 'react'
import type { Alert, Patient } from '../../engine/contracts'
import { AlertCard, NestedAlert, type InputAction } from '../components/AlertCard'
import { AlertGroups } from '../components/AlertGroups'
import { BrandMatch } from '../components/BrandMatch'
import { Card, KpiCard } from '../components/Card'
import { FlagSummary } from '../components/FlagSummary'
import { Icon } from '../components/Icons'
import { Select } from '../components/Select'
import { OverrideDialog } from '../components/OverrideDialog'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { panelId, tabId, Tabs, type TabItem } from '../components/Tabs'
import { TotalsNotes, XrayTable } from '../components/XrayTable'
import { runCheck, type CheckResult } from '../engine'
import { CoverageNote } from '../components/CoverageNote'
import { HerbalCard } from '../components/HerbalCard'
import { LeafletCard } from '../components/LeafletCard'
import { askTheCustomer } from '../lib/askCustomer'
import { downloadText } from '../lib/csv'
import { toFhirBundle } from '../lib/fhir'
import { needsReview, swapBrand, tidy } from '../lib/resolved'
import { isRunKey } from '../lib/shortcuts'
import { demoPatient, demoRxText } from '../demoCase'
import { useCatalogue } from '../storage/catalogue'
import { addOverride } from '../storage/overrides'

const blank = { age: '', sex: '', weight: '', creatinine: '', egfr: '', allergies: '', pregnancy: '', liver: '', alcohol: '' }

type TabKey = 'alerts' | 'xray' | 'brands' | 'leaflet'

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
  ...(p.egfr && { egfr: Number(p.egfr) }),
  ...(p.allergies.trim() && { allergies: p.allergies.split(/[,;\n]/).map((a) => a.trim()).filter(Boolean) }),
  ...((p.pregnancy === 'yes' || p.pregnancy === 'no') && { pregnancy: p.pregnancy }),
  ...(p.liver && { liver_disease: true }),
  ...(p.alcohol && { heavy_alcohol_use: true }),
})

/** Moves the pharmacist to the first box the engine asked for (weight or creatinine). */
const focusPrompt = () => {
  const el = document.querySelector<HTMLInputElement>('.prompt input')
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el?.focus({ preventScroll: true })
}

export const CheckPage = () => {
  const [rx, setRx] = useState('')
  const { catalogue } = useCatalogue()
  const [patient, setPatient] = useState(blank)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>('alerts')
  const [overriding, setOverriding] = useState<number | null>(null)
  const [overridden, setOverridden] = useState<Record<number, string>>({})
  const resultRef = useRef<HTMLDivElement>(null)

  const ageOk = Number(patient.age) > 0
  const canCheck = rx.trim() !== '' && ageOk
  const needs = rx.trim() === '' ? (ageOk ? 'Add the prescription to check.' : "Add the patient's age and the prescription to check.") : 'Age is needed before checking.'

  // One column below 960px puts the result under the form: bring it into view after a check.
  useEffect(() => {
    if (!result && !failed) return
    if (!window.matchMedia('(max-width: 959px)').matches) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [result, failed])

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPatient({ ...patient, [k]: e.target.value })
  const toggle = (k: 'liver' | 'alcohol') => (e: React.ChangeEvent<HTMLInputElement>) => setPatient({ ...patient, [k]: e.target.checked ? 'yes' : '' })
  const canBePregnant = patient.sex === 'F' && Number(patient.age) >= 12 && Number(patient.age) <= 50

  const check = async (text = rx) => {
    if (text.trim() === '' || !ageOk) return
    try {
      setFailed(false)
      setOverridden({})
      setResult(await runCheck(text, toPatient(patient)))
    } catch {
      setFailed(true)
    }
  }

  // The engine asks for weight or creatinine only when a medicine needs it. Once a result is showing, filling those in runs the
  // check again by itself (after a short pause for typing), so there is no separate "Check again" step to remember.
  const asked = useRef({ weight: patient.weight, creatinine: patient.creatinine, egfr: patient.egfr })
  useEffect(() => {
    const was = asked.current
    asked.current = { weight: patient.weight, creatinine: patient.creatinine, egfr: patient.egfr }
    if (!result || (was.weight === patient.weight && was.creatinine === patient.creatinine && was.egfr === patient.egfr)) return
    const t = setTimeout(() => void check(), 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.weight, patient.creatinine, patient.egfr])

  /** The pharmacist picked another possible brand for a line: put it in the text and check again. */
  const pickBrand = (raw: string, brand: string) => {
    const next = swapBrand(rx, raw, brand)
    if (next === null) return
    setRx(next)
    void check(next)
  }

  const alerts = (result?.alerts ?? []).map((alert, i) => ({ alert, i }))
  const shown = alerts.filter((x) => x.alert.tier !== 'silent')
  const silent = alerts.filter((x) => x.alert.tier === 'silent')
  const count = (t: Alert['tier']) => alerts.filter((x) => x.alert.tier === t).length
  const prompts = result?.prompts ?? []
  const toCheck = result?.lines.filter((l) => needsReview(l.resolved)).length ?? 0
  const ingredientIds = result?.lines.flatMap((l) => l.resolved.ingredients.map((i) => i.id)) ?? []
  const ask = askTheCustomer(ingredientIds)
  const inputAction: InputAction = { label: 'Add what is asked', onClick: focusPrompt }
  const tabs: TabItem<TabKey>[] = [
    { id: 'alerts', label: 'Alerts', count: shown.length },
    { id: 'xray', label: 'X-ray' },
    { id: 'brands', label: 'Brand matches', count: result?.lines.length },
    { id: 'leaflet', label: 'Leaflet' },
  ]

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
          <Card id="patient" title="Patient" icon="user">
            <div className="fields">
              <Field label="Age (years)" type="number" inputMode="numeric" min={0} value={patient.age} onChange={set('age')} />
              <Select
                label="Sex"
                value={patient.sex}
                onChange={(sex) => setPatient({ ...patient, sex })}
                options={[
                  { value: '', label: 'Not given' },
                  { value: 'M', label: 'Male' },
                  { value: 'F', label: 'Female' },
                ]}
              />
            </div>
            <details className="more">
              <summary>More about the patient (optional)</summary>
              <p className="hint">Checked only if filled in. Leaving a box empty means "not entered", never "none".</p>
              <Field label="Known allergies" placeholder="penicillin, sulfa, NSAIDs, or a medicine name" value={patient.allergies} onChange={set('allergies')} />
              {canBePregnant && (
                <Select
                  label="Pregnant?"
                  value={patient.pregnancy}
                  onChange={(pregnancy) => setPatient({ ...patient, pregnancy })}
                  options={[
                    { value: '', label: 'Not entered' },
                    { value: 'no', label: 'No' },
                    { value: 'yes', label: 'Yes' },
                  ]}
                />
              )}
              <Field label="Lab eGFR (mL/min/1.73 m²)" type="number" inputMode="decimal" value={patient.egfr} onChange={set('egfr')} />
              <label className="check">
                <input type="checkbox" checked={patient.liver === 'yes'} onChange={toggle('liver')} /> Liver disease
              </label>
              <label className="check">
                <input type="checkbox" checked={patient.alcohol === 'yes'} onChange={toggle('alcohol')} /> Regular heavy alcohol use
              </label>
            </details>
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
                <p className="prompt__skip">The check runs again by itself when you fill these in. Skipping means limits are not adjusted for them.</p>
              </div>
            )}
          </Card>

          <Card title="Prescription" icon="flask" description="Type it as written: one medicine per line, or separated by semicolons.">
            <textarea
              className="rx-input"
              rows={4}
              value={rx}
              placeholder="Dolo 650 1-1-1 x5d; Pan D OD; ..."
              onChange={(e) => setRx(e.target.value)}
              onKeyDown={(e) => isRunKey(e) && check()}
            />
            <div className="actions">
              <button className="btn btn--primary" onClick={() => check()} disabled={!canCheck} aria-describedby={canCheck ? undefined : 'check-needs'}>
                {result ? 'Check again' : 'Check prescription'}
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => {
                  setRx(demoRxText)
                  setPatient({
                    ...blank,
                    age: String(demoPatient.age_years),
                    sex: demoPatient.sex ?? '',
                    weight: String(demoPatient.weight_kg ?? ''),
                    creatinine: String(demoPatient.serum_creatinine ?? ''),
                  })
                }}
              >
                Load demo
              </button>
              {(rx !== '' || result) && (
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setRx('')
                    setPatient(blank)
                    setResult(null)
                    setFailed(false)
                    setTab('alerts')
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {!canCheck && (
              <p className="hint" id="check-needs">
                {needs}
              </p>
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
              <p>Add the age and the prescription, then press Check prescription. Each line is checked for:</p>
              <ul className="checklist">
                <li>Daily totals across brands</li>
                <li>Kidney and age limits</li>
                <li>Interactions, with a source</li>
                <li>Duplicate classes</li>
                <li>Banned combinations</li>
              </ul>
            </EmptyState>
          ) : (
            <div aria-live="polite" className="result">
              {prompts.length > 0 && (
                <p className="result-note">
                  Some limits are not adjusted yet.{' '}
                  <button type="button" className="btn--link" onClick={focusPrompt}>
                    Add what is asked under Patient
                  </button>
                  ; the check runs again by itself.
                </p>
              )}

              <div className="kpis">
                <KpiCard label="Interrupt" value={count('interrupt')} hint="Target: 1 or fewer per Rx" tier="interrupt" />
                <KpiCard label="Inform" value={count('inform')} tier="inform" />
                <KpiCard label="Logged" value={count('silent')} hint="Silent, not shown" tier="silent" />
                <KpiCard label="Brands to check" value={toCheck} hint="Low-confidence match" />
              </div>

              <Tabs prefix="check" label="Parts of the result" items={tabs} value={tab} onChange={setTab} />
              <div className="tabpanel" role="tabpanel" id={panelId('check')} aria-labelledby={tabId('check', tab)} tabIndex={0}>
                {tab === 'alerts' && (
                  <>
                    <FlagSummary lines={result.lines} />
                    {shown.length === 0 && (
                      <EmptyState title="No alerts from the checks run">
                        <p>This is not a statement that the prescription is safe.</p>
                      </EmptyState>
                    )}
                    <AlertGroups
                      items={shown.map(({ alert, i }) => ({ alert, key: String(i) }))}
                      render={({ alert, key }, nested) => {
                        const i = Number(key)
                        return (
                          <AlertCard
                            key={key}
                            alert={alert}
                            overriddenReason={overridden[i]}
                            inputAction={inputAction}
                            nested={nested.map((n) => (
                              <NestedAlert key={n.key} alert={n.alert} inputAction={inputAction} />
                            ))}
                            onOverride={alert.tier === 'interrupt' ? () => setOverriding(i) : undefined}
                          />
                        )
                      }}
                    />
                    <CoverageNote gaps={result.ddi_gaps} limitGaps={result.limit_gaps} />
                    <HerbalCard report={result.herbal} />
                    {ask.length > 0 && (
                      <details className="card ask-fold">
                        <summary>
                          Ask the customer <span className="num">{ask.length}</span>
                        </summary>
                        <p className="hint">Parchi only sees this order. These are commonly bought without a prescription.</p>
                        <ul className="ask">
                          {ask.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {silent.length > 0 && (
                      <details className="silent-log">
                        <summary>{silent.length} logged (not shown)</summary>
                        {silent.map(({ alert, i }) => (
                          <AlertCard key={i} alert={alert} />
                        ))}
                      </details>
                    )}
                  </>
                )}

                {tab === 'xray' && (
                  <>
                    <CoverageNote gaps={result.ddi_gaps} limitGaps={result.limit_gaps} />
                    <Card title="Prescription X-ray" icon="chart" description="Daily total per ingredient across all brands, against the limit on file">
                      <XrayTable ledger={result.ledger} alerts={result.alerts} />
                      <TotalsNotes notes={result.notes} ledger={result.ledger} />
                    </Card>
                  </>
                )}

                {tab === 'brands' && (
                  <Card title="Brand matches" description="What was typed and what it was matched to. Select a line for details.">
                    <ul className="matches">
                      {result.lines.map((l, i) => (
                        <BrandMatch key={`${i}-${l.resolved.raw}`} resolved={l.resolved} sig={l.sig} onUse={(brand) => pickBrand(l.resolved.raw, brand)} alternatives={catalogue?.alternatives(l.resolved)} />
                      ))}
                    </ul>
                    {result.lines.some((l) => (l.resolved.jan_aushadhi?.length ?? 0) > 0) && (
                      <p className="hint">
                        Jan Aushadhi generics have the same ingredients and strengths. They are not a safety flag: the pharmacist confirms they are equivalent. The
                        list has no prices.
                      </p>
                    )}
                  </Card>
                )}

                {tab === 'leaflet' && <LeafletCard lines={result.lines} />}
              </div>

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
