import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCard } from '../components/AlertCard'
import { BrandMatch } from '../components/BrandMatch'
import { Card } from '../components/Card'
import { CoverageNote } from '../components/CoverageNote'
import { LeafletCard } from '../components/LeafletCard'
import { DecisionPanel } from '../components/DecisionPanel'
import { OverrideDialog } from '../components/OverrideDialog'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { StatusBadge } from '../components/StatusBadge'
import { Timeline } from '../components/Timeline'
import { TierBadge } from '../components/Icons'
import { XrayTable } from '../components/XrayTable'
import { latestLab } from '../history/check'
import { doctorName, longDate, rangeLabel, shortDate, STATUS_TIER, todayIso } from '../history/labels'
import { leadFinding } from '../history/queue'
import { runHistory } from '../history/run'
import type { AlertChange, HistoryAlert, HistoryResult, LabResult, Order } from '../history/types'
import { downloadText } from '../lib/csv'
import { orderToFhir } from '../lib/fhirOrder'
import { alertTypeLabel, candidateLabel } from '../lib/resolved'
import { pct } from '../lib/format'
import { useRouteParam } from '../route'
import { addOverride } from '../storage/overrides'
import { saveOrder, useDecisions, useOrders } from '../storage/orders'

const count = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length
const sameLab = (a: LabResult, b: LabResult) => a.date === b.date && a.value === b.value
const PRESCRIBED_JOIN = (r: HistoryAlert) => r.prescribed.map((p) => `${doctorName(p.doctor)} (${shortDate(p.date)})`).join(' and ')

/** Who prescribed what is the point of the history view: a cross-doctor problem names the doctors and the days. */
const Prescribers = ({ alert }: { alert: HistoryAlert }) =>
  alert.prescribed.length === 0 ? null : (
    <p className="alert__moved">
      {alert.cross_doctor ? <span className="chip chip--review">Different doctors</span> : null} Prescribed by {PRESCRIBED_JOIN(alert)}. Applies {rangeLabel(alert.from, alert.to)}.
    </p>
  )

const Changes = ({ changes }: { changes: AlertChange[] }) => (
  <Card title="What changed after the re-check" icon="chart" description="Alerts added, cleared or moved to another tier by the new result">
    {changes.length === 0 ? (
      <p className="hint">No alert changed.</p>
    ) : (
      <ul className="changes">
        {changes.map((c) => (
          <li key={`${c.kind}-${c.alert.type}-${c.alert.ingredients.join()}`} data-kind={c.kind}>
            <strong>{c.kind === 'added' ? 'Added' : c.kind === 'cleared' ? 'Cleared' : 'Changed tier'}</strong>
            <TierBadge tier={c.alert.tier} />
            <span>
              {alertTypeLabel(c.alert.type)}: {c.alert.ingredients.join(', ') || (c.alert.brands ?? []).join(', ')}
              {c.kind === 'tier_changed' && c.was ? ` (was ${c.was})` : ''}
            </span>
          </li>
        ))}
      </ul>
    )}
  </Card>
)

const KidneyCard = ({ order, result, onAdd }: { order: Order; result: HistoryResult; onAdd: (lab: LabResult) => void }) => {
  const lab = latestLab(order.labs)
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayIso())
  const ok = Number(value) > 0 && date !== ''
  return (
    <div className="kidney">
      <h3 className="order__sub">Kidney function</h3>
      <p className="hint kidney__now">
        {result.crcl !== null && lab
          ? `Estimated creatinine clearance ${result.crcl.toFixed(0)} mL/min, from creatinine ${lab.value} mg/dL on ${longDate(lab.date)}.`
          : 'No creatinine on file. Kidney checks wait for one.'}
      </p>
      {(order.incoming_labs ?? []).map((l) => (
        <div key={`${l.date}-${l.value}`} className="kidney__incoming">
          <span>
            New result: creatinine <strong>{l.value} mg/dL</strong>, {longDate(l.date)}
          </span>
          <button className="btn btn--primary" onClick={() => onAdd(l)}>
            Re-check with this result
          </button>
        </div>
      ))}
      <form
        className="kidney__form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          onAdd({ type: 'serum_creatinine', value: Number(value), date })
          setValue('')
        }}
      >
        <label className="field">
          <span className="field__label">Creatinine (mg/dL)</span>
          <input className="field__input" type="number" inputMode="decimal" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Result date</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="btn btn--secondary" type="submit" disabled={!ok}>
          Add and re-check
        </button>
      </form>
    </div>
  )
}

/** The answer first: what Parchi suggests, how many findings, and the one that weighs most. The decision itself sits beside the evidence. */
const Verdict = ({ result }: { result: HistoryResult }) => {
  const lead = leadFinding(result)
  const unverified = result.unverified.length
  return (
    <section className="verdict" data-tier={STATUS_TIER[result.status]} aria-labelledby="verdict-title">
      <h2 id="verdict-title" className="sr-only">
        What Parchi suggests
      </h2>
      <StatusBadge status={result.status} />
      <p className="verdict__lead">{lead.text}</p>
      <p className="verdict__counts">
        {count(result, 'interrupt')} Interrupt, {count(result, 'inform')} Inform
        {unverified > 0 && `, ${unverified} unverified ${unverified === 1 ? 'brand' : 'brands'}`}
        {lead.more > 0 && ` · ${lead.more} more below`}
      </p>
      <p className="hint verdict__note">Parchi suggests; the pharmacist decides. Limits and alert rules are drafts until a pharmacist signs them off.</p>
    </section>
  )
}

/** One order: what Parchi suggests, the pharmacist's decision, and the evidence (timeline, alerts, totals, brands). */
export const OrderPage = () => {
  const id = useRouteParam()
  const { orders, ready, refresh } = useOrders()
  const { decisions, refresh: refreshDecisions } = useDecisions()
  const order = orders.find((o) => o.id === id)

  const [result, setResult] = useState<HistoryResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [changes, setChanges] = useState<AlertChange[] | null>(null)
  const [windowIdx, setWindowIdx] = useState<number | null>(null)
  const [overriding, setOverriding] = useState<HistoryAlert | null>(null)
  const [overridden, setOverridden] = useState<Record<string, string>>({})
  const [saveFailed, setSaveFailed] = useState(false)
  const previous = useRef<HistoryResult | null>(null)
  const wantDiff = useRef(false)

  useEffect(() => {
    setResult(null)
    setChanges(null)
    previous.current = null
    wantDiff.current = false
  }, [id])

  useEffect(() => {
    if (!order) return
    let live = true
    setFailed(false)
    const diffAgainst = wantDiff.current ? (previous.current ?? undefined) : undefined
    runHistory(order, diffAgainst)
      .then((r) => {
        if (!live) return
        if (diffAgainst) {
          setChanges(r.changes ?? [])
          wantDiff.current = false
        }
        previous.current = r
        setResult(r)
        setWindowIdx(null)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [order])

  const last = useMemo(() => decisions.find((d) => d.order_id === id), [decisions, id])

  // On a phone the decision sits below the evidence; a bar at the bottom of the screen reaches it until it is in view.
  const [decisionInView, setDecisionInView] = useState(false)
  const hasResult = result !== null
  useEffect(() => {
    const el = document.getElementById('decision')
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setDecisionInView(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [hasResult])

  const goDecide = () => {
    const el = document.getElementById('decision')
    if (!el) return
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    const radio = el.querySelector<HTMLInputElement>('input[type=radio]:checked') ?? el.querySelector<HTMLInputElement>('input[type=radio]')
    radio?.focus({ preventScroll: true })
  }

  const addLab = async (lab: LabResult) => {
    if (!order) return
    const next: Order = { ...order, labs: [...order.labs, lab], incoming_labs: (order.incoming_labs ?? []).filter((l) => !sameLab(l, lab)) }
    wantDiff.current = true
    try {
      await saveOrder(next)
      setSaveFailed(false)
      await refresh()
    } catch {
      wantDiff.current = false
      setSaveFailed(true)
    }
  }

  const saveOverride = async (reason: string, note: string) => {
    if (!overriding) return
    await addOverride({
      at: new Date().toISOString(),
      tier: overriding.tier,
      type: overriding.type,
      ingredients: overriding.ingredients,
      alert_reason: overriding.reason,
      source: overriding.source,
      override_reason: reason,
      ...(note && { note: `${order?.id}: ${note}` }),
    })
    setOverridden({ ...overridden, [overriding.type + overriding.ingredients.join()]: reason })
    setOverriding(null)
  }

  if (!ready) return <PageIntro title="Order" note="Loading." />
  if (!order) {
    return (
      <>
        <PageIntro title="Order not found" note="It may have been removed from this device." />
        <EmptyState title={`No order ${id || ''}`}>
          <p>
            <a href="#/queue">Back to the review queue</a>
          </p>
        </EmptyState>
      </>
    )
  }

  const w = result ? result.windows[windowIdx ?? result.peak] : null
  const doctors = new Set(order.prescriptions.map((p) => doctorName(p.doctor)))

  return (
    <>
      <p className="backlink">
        <a href="#/queue">← Review queue</a>
      </p>
      <PageIntro
        title={order.customer.name}
        note={`${order.id} · ${order.customer.age_years} y${order.customer.sex ? `, ${order.customer.sex === 'M' ? 'male' : 'female'}` : ''}${order.customer.weight_kg ? `, ${order.customer.weight_kg} kg` : ''} · placed ${longDate(order.placed)} · ${order.prescriptions.length} prescriptions from ${doctors.size} doctors`}
      />

      {failed && (
        <EmptyState title="Could not check this order">
          <p>Nothing was saved. Review the prescriptions and try again.</p>
        </EmptyState>
      )}
      {!failed && !result && <p className="hint">Checking…</p>}

      {result && w && (
        <div className="workspace order">
          <div className="workspace__result">
            <div aria-live="polite" className="result">
              <Verdict result={result} />

              {changes && <Changes changes={changes} />}

              <div className="alerts">
                {result.alerts.filter((a) => a.tier !== 'silent').length === 0 && (
                  <EmptyState title="No alerts from the checks run">
                    <p>This is not a statement that the order is safe.</p>
                  </EmptyState>
                )}
                {result.alerts
                  .filter((a) => a.tier !== 'silent')
                  .map((a) => (
                    <AlertCard
                      key={a.type + a.ingredients.join()}
                      alert={a}
                      extra={<Prescribers alert={a} />}
                      overriddenReason={overridden[a.type + a.ingredients.join()]}
                      onOverride={a.tier === 'interrupt' ? () => setOverriding(a) : undefined}
                    />
                  ))}
              </div>

              <CoverageNote gaps={result.ddi_gaps} limitGaps={result.limit_gaps} />

              <Card title="Timeline" icon="chart" description="Every medicine, by doctor and day. Where bars from different doctors overlap, doses add up. A line with no written duration uses an unverified default window.">
                <Timeline lines={result.lines} alerts={result.alerts} placed={order.placed} />
              </Card>

              <Card title="Prescription X-ray" icon="chart" description="Daily total per ingredient for the days chosen, against the limit on file">
                <div className="windows" role="group" aria-label="Days to show">
                  {result.windows.map((win, i) => (
                    <button key={win.start} className="windows__btn" aria-pressed={i === (windowIdx ?? result.peak)} onClick={() => setWindowIdx(i)}>
                      {rangeLabel(win.start, win.end)}
                      {i === result.peak && <span className="windows__peak"> · most serious</span>}
                    </button>
                  ))}
                </div>
                <XrayTable ledger={w.ledger} alerts={w.alerts} />
              </Card>

              {result.unverified.length > 0 && (
                <Card title="Unverified brands" icon="inform" description="Not recognised, so left out of the totals until the pharmacist confirms them">
                  <ul className="changes">
                    {result.unverified.map((l) => {
                      const best = l.resolved.candidates?.[0]
                      return (
                        <li key={l.index}>
                          <strong>{l.resolved.raw}</strong>
                          <span>
                            {doctorName(l.doctor)}, {shortDate(l.start)}.{' '}
                            {best ? `Closest match, unverified: ${candidateLabel(best)} (${pct(best.score)}).` : 'No close match in the brand list.'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              )}

              <LeafletCard lines={result.lines} />

              <Card title="What was written" icon="log" description="Each line as written and what it was matched to. Select a line for details.">
                {order.prescriptions.map((rx) => (
                  <div key={rx.id} className="order__rx">
                    <h3 className="order__sub">
                      {doctorName(rx.doctor)}, {longDate(rx.date)}
                    </h3>
                    <ul className="matches">
                      {result.lines
                        .filter((l) => l.rx_id === rx.id)
                        .map((l) => (
                          <BrandMatch key={l.index} resolved={l.resolved} sig={l.sig} />
                        ))}
                    </ul>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          <div className="workspace__input order__rail">
            <Card id="decision" title="Your decision" icon="log">
              <DecisionPanel order={order} result={result} last={last} onSaved={refreshDecisions} />
            </Card>
            <details className="card order__tools" open={(order.incoming_labs ?? []).length > 0 || undefined}>
              <summary>Kidney result, edit and export</summary>
              <div className="order__tools-body">
                <KidneyCard order={order} result={result} onAdd={addLab} />
                {saveFailed && (
                  <p className="dialog__error" role="alert">
                    Could not save on this device. The result was not added.
                  </p>
                )}
                <a className="order__link" href={`#/history/${encodeURIComponent(order.id)}`}>
                  Edit prescriptions and labs
                </a>
                <div className="actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => downloadText(`${order.id}.fhir.json`, JSON.stringify(orderToFhir(order), null, 2), 'application/json')}
                  >
                    Download as FHIR (draft)
                  </button>
                </div>
              </div>
            </details>
          </div>

          {!decisionInView && (
            <div className="decide-bar">
              <StatusBadge status={result.status} compact />
              <button type="button" className="btn btn--primary" onClick={goDecide}>
                Decide
              </button>
            </div>
          )}
        </div>
      )}

      <OverrideDialog alert={overriding} onCancel={() => setOverriding(null)} onSave={saveOverride} />
    </>
  )
}
