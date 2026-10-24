import { useEffect, useRef, useState } from 'react'
import '../styles/demo.css'
import { AlertCard } from '../components/AlertCard'
import { KpiCard } from '../components/Card'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { LimitBar } from '../components/LimitBar'
import { XrayTable } from '../components/XrayTable'
import { demoPatient, demoRxText } from '../demoCase'
import { runCheck, type CheckResult } from '../engine'
import { mg, titleCase } from '../lib/format'
import { pickHiddenIngredient, splitRx } from '../lib/demo'

const titles = ['The prescription', 'One drug, several brands', 'Every ingredient, one total', 'Only what needs attention', 'The pharmacist decides']
const LAST = titles.length - 1

/** Guided walkthrough of the demo case. Every sentence is built from the check result, not hard-coded. */
export const DemoPage = () => {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  useEffect(() => {
    runCheck(demoRxText, demoPatient).then(setResult).catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    if (moved.current) heading.current?.focus()
    moved.current = true
  }, [step])

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, LAST))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0))
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])

  if (failed) {
    return (
      <>
        <PageIntro note="Guided walkthrough." title="Demo case" />
        <EmptyState title="Could not run the demo case">
          <p>Nothing was saved. Try again, or use the Check page.</p>
        </EmptyState>
      </>
    )
  }
  if (!result) return <PageIntro note="Guided walkthrough." title="Demo case" />

  const lines = splitRx(demoRxText)
  const hidden = pickHiddenIngredient(result.ledger)
  const alerts = result.alerts
  const count = (t: string) => alerts.filter((a) => a.tier === t).length
  const facts = [
    `${demoPatient.age_years} years`,
    demoPatient.sex === 'M' ? 'Male' : demoPatient.sex === 'F' ? 'Female' : null,
    demoPatient.weight_kg ? `${demoPatient.weight_kg} kg` : null,
    demoPatient.serum_creatinine ? `Creatinine ${demoPatient.serum_creatinine} mg/dL` : null,
  ].filter(Boolean) as string[]

  const body = [
    <>
      <p className="demo__lead">
        {lines.length} medicines, typed the way they arrive at the counter, for a patient with these details.
      </p>
      <ol className="demo__rx">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ol>
      <p className="chips">
        {facts.map((f) => (
          <span key={f} className="chip">
            {f}
          </span>
        ))}
      </p>
    </>,

    hidden ? (
      <>
        <p className="demo__lead">
          {titleCase(hidden.id)} is in {hidden.sources.length} of the {result.lines.length} brands on this prescription.
        </p>
        <div className="demo__hidden">
          <span className="chips">
            {hidden.sources.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </span>
          <span className="demo__arrow" aria-hidden="true">
            →
          </span>
          <strong>{titleCase(hidden.id)}</strong>
        </div>
        <LimitBar total={hidden.total_mg_day} limit={hidden.limit_mg_day} />
        <p className="demo__note">
          Added up across brands: <strong className="num">{mg(hidden.total_mg_day)} mg/day</strong>
          {hidden.limit_mg_day !== undefined &&
            (hidden.total_mg_day > hidden.limit_mg_day
              ? `, above the ${mg(hidden.limit_mg_day)} mg/day limit on file. Review.`
              : `, against a limit of ${mg(hidden.limit_mg_day)} mg/day on file.`)}
        </p>
      </>
    ) : (
      <p className="demo__lead">No ingredient repeats across brands in this case.</p>
    ),

    <>
      <p className="demo__lead">Totals are added across all brands. Where no limit is on file, it says so instead of guessing one.</p>
      <XrayTable ledger={result.ledger} />
    </>,

    <>
      <p className="demo__lead">
        Interrupt is kept for what needs action before dispensing. The aim is {1} or fewer per prescription; this one has {count('interrupt')}.
      </p>
      <div className="kpis">
        <KpiCard label="Interrupt" value={count('interrupt')} tier="interrupt" />
        <KpiCard label="Inform" value={count('inform')} tier="inform" />
        <KpiCard label="Logged" value={count('silent')} hint="Silent, not shown" tier="silent" />
      </div>
      <div className="alerts">
        {alerts
          .filter((a) => a.tier === 'interrupt')
          .map((a, i) => (
            <AlertCard key={i} alert={a} />
          ))}
      </div>
      <p className="demo__note">
        Plus {count('inform')} Inform alert{count('inform') === 1 ? '' : 's'} on the Check page. Each one states its reason and source.
      </p>
    </>,

    <>
      <p className="demo__lead">Parchi informs a pharmacist. It never decides.</p>
      <ul className="demo__points">
        <li>Checks run on this device, so they work offline at the counter.</li>
        <li>An Interrupt can only be overridden with a reason, which is kept in the override log.</li>
        <li>Limits and rules come from data files that show their source and whether a pharmacist has signed them off.</li>
      </ul>
      <div className="actions">
        <a className="btn btn--primary" href="#/check">
          Try it yourself
        </a>
        <a className="btn btn--secondary" href="#/benchmark">
          See the measured comparison
        </a>
        <a className="btn btn--secondary" href="#/data">
          Data and limits
        </a>
      </div>
    </>,
  ]

  return (
    <>
      <PageIntro note="Guided walkthrough." title="Demo case" />
      <div className="workspace workspace--single">
        <nav aria-label="Demo steps">
          <ol className="stepper">
            {titles.map((t, i) => (
              <li key={t}>
                <button className="stepper__dot" aria-label={`Step ${i + 1}: ${t}`} aria-current={i === step ? 'step' : undefined} data-done={i < step} onClick={() => setStep(i)} />
              </li>
            ))}
          </ol>
        </nav>

        <section className="card demo">
          <p className="mock-note">Limits and alert rules are drafts until a pharmacist signs them off.</p>
          <p className="demo__eyebrow">
            Step {step + 1} of {titles.length}
          </p>
          <h2 ref={heading} tabIndex={-1} className="demo__title">
            {titles[step]}
          </h2>
          {body[step]}
        </section>

        <div className="actions demo__nav">
          <button className="btn btn--secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>
            Back
          </button>
          {step < LAST ? (
            <button className="btn btn--primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn btn--secondary" onClick={() => setStep(0)}>
              Start again
            </button>
          )}
          <span className="hint demo__keys">Arrow keys also move between steps.</span>
        </div>
      </div>
    </>
  )
}
