import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCard, NestedAlert, type InputAction } from '../components/AlertCard'
import { AlertGroups } from '../components/AlertGroups'
import { DayDetail } from '../components/DayDetail'
import { FlagSummary } from '../components/FlagSummary'
import { BrandMatch } from '../components/BrandMatch'
import { Card } from '../components/Card'
import { CoverageNote } from '../components/CoverageNote'
import { LeafletCard } from '../components/LeafletCard'
import { DecisionPanel } from '../components/DecisionPanel'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { HerbalCard } from '../components/HerbalCard'
import { StatusBadge } from '../components/StatusBadge'
import { panelId, tabId, Tabs, type TabItem } from '../components/Tabs'
import { Timeline } from '../components/Timeline'
import { TierBadge } from '../components/Icons'
import { XrayTable } from '../components/XrayTable'
import { latestLab } from '../history/check'
import { dayBefore, doctorName, longDate, rangeLabel, shortDate, todayIso } from '../history/labels'
import { shortFinding } from '../history/queue'
import { runHistory } from '../history/run'
import type { AlertChange, HistoryAlert, HistoryLine, HistoryResult, LabResult, Order } from '../history/types'
import { downloadText } from '../lib/csv'
import { orderToFhir } from '../lib/fhirOrder'
import { alertTypeLabel, candidateLabel } from '../lib/resolved'
import { pct } from '../lib/format'
import { useRouteParam } from '../route'
import { useCatalogue } from '../storage/catalogue'
import { saveOrder, useDecisions, useOrders } from '../storage/orders'
import { useQueueProgress } from '../lib/useQueueProgress'

type TabKey = 'alerts' | 'timeline' | 'xray' | 'prescriptions' | 'leaflet'
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
    <Card id="kidney" title="Kidney function" icon="user">
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
          <input id="kidney-creatinine" className="field__input" type="number" inputMode="decimal" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Result date</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="btn btn--secondary" type="submit" disabled={!ok}>
          Add and re-check
        </button>
      </form>
    </Card>
  )
}

/** One order: what Parchi suggests, the pharmacist's decision, and the evidence (timeline, alerts, totals, brands). */
/** Brands the resolver did not recognise: the closest matches to choose from, and the ones already confirmed (with undo). */
const UnverifiedBrands = ({ result, onConfirm, onUndo }: { result: HistoryResult; onConfirm: (l: HistoryLine, brand: string) => void; onUndo: (l: HistoryLine) => void }) => {
  const confirmed = result.lines.filter((l) => l.confirmed)
  if (result.unverified.length === 0 && confirmed.length === 0) return null
  return (
    <Card title="Unverified brands" icon="inform" description="Not recognised, so left out of the totals until you confirm a brand. Confirming re-checks the order.">
      <ul className="unverified">
        {result.unverified.map((l) => {
          const candidates = (l.resolved.candidates ?? []).slice(0, 3)
          const proposed = l.resolved.proposed_composition
          return (
            <li key={l.index} className="unverified__item">
              <p className="unverified__line">
                <strong>{l.resolved.raw}</strong>
                <span>
                  {doctorName(l.doctor)}, {shortDate(l.start)}
                </span>
              </p>
              {proposed && (
                <p className="hint">
                  Likely contains {proposed.ingredients.map((i) => `${i.id} ${i.mg} mg`).join(' + ')} ({pct(proposed.confidence)}, unverified).{proposed.caution ? ` ${proposed.caution}.` : ''}
                </p>
              )}
              {candidates.length === 0 ? (
                <p className="hint">No close match in the brand list. Edit the prescription to correct the name.</p>
              ) : (
                <ul className="unverified__options">
                  {candidates.map((c, i) => (
                    <li key={c.brand}>
                      <span>
                        {candidateLabel(c)} <span className="unverified__score">({pct(c.score)})</span>
                      </span>
                      <button type="button" className={`btn ${i === 0 && c.score >= 0.85 ? 'btn--primary' : 'btn--secondary'}`} onClick={() => onConfirm(l, c.brand)}>
                        Use this brand
                        <span className="sr-only">
                          {' '}
                          {c.brand} for {l.resolved.raw}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
        {confirmed.map((l) => (
          <li key={`c-${l.index}`} className="unverified__item unverified__item--done">
            <p>
              You confirmed <strong>{l.confirmed}</strong> for “{l.written ?? l.resolved.raw}” ({doctorName(l.doctor)}, {shortDate(l.start)}). It now counts in the totals.
            </p>
            <button type="button" className="btn btn--secondary" onClick={() => onUndo(l)}>
              Undo
              <span className="sr-only"> confirmation of {l.confirmed}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export const OrderPage = () => {
  const id = useRouteParam()
  const { orders, ready, refresh } = useOrders()
  const { decisions, refresh: refreshDecisions } = useDecisions()
  const order = orders.find((o) => o.id === id)

  const [result, setResult] = useState<HistoryResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [changes, setChanges] = useState<AlertChange[] | null>(null)
  const [windowIdx, setWindowIdx] = useState<number | null>(null)
  const [tab, setTab] = useState<TabKey>('alerts')
  const [day, setDay] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const previous = useRef<HistoryResult | null>(null)
  const wantDiff = useRef(false)

  useEffect(() => {
    setResult(null)
    setChanges(null)
    setTab('alerts')
    setDay(null)
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
        setDay(null)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [order])

  const last = useMemo(() => decisions.find((d) => d.order_id === id), [decisions, id])
  const progress = useQueueProgress(id, orders, decisions)
  const { catalogue } = useCatalogue()

  const saveAndRecheck = async (next: Order) => {
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

  const addLab = (lab: LabResult) => {
    if (!order) return
    return saveAndRecheck({ ...order, labs: [...order.labs, lab], incoming_labs: (order.incoming_labs ?? []).filter((l) => !sameLab(l, lab)) })
  }

  const confirmBrand = (l: HistoryLine, brand: string) => {
    if (!order) return
    void saveAndRecheck({ ...order, confirmations: { ...order.confirmations, [`${l.rx_id}#${l.rx_line}`]: brand } })
  }

  const undoConfirm = (l: HistoryLine) => {
    if (!order) return
    const { [`${l.rx_id}#${l.rx_line}`]: _gone, ...rest } = order.confirmations ?? {}
    const { confirmations: _old, ...without } = order
    void saveAndRecheck(Object.keys(rest).length > 0 ? { ...without, confirmations: rest } : without)
  }

  /** Where the missing value goes on this page: the kidney card (or the edit form for a weight), or the waiting result. */
  const inputAction = (a: HistoryAlert): InputAction => {
    const incoming = (order?.incoming_labs ?? [])[0]
    if (incoming && /creatinine/i.test(a.reason)) return { label: `Re-check with creatinine ${incoming.value} mg/dL`, onClick: () => addLab(incoming) }
    if (/weight/i.test(a.reason) && !/creatinine/i.test(a.reason)) return { label: 'Add the weight', onClick: () => (location.hash = `#/history/${encodeURIComponent(id)}`) }
    return {
      label: 'Add creatinine',
      onClick: () => {
        const el = document.getElementById('kidney-creatinine')
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el?.focus({ preventScroll: true })
      },
    }
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
  const shown = result?.alerts.filter((a) => a.tier !== 'silent') ?? []
  const interrupts = result ? count(result, 'interrupt') : 0
  const first = result ? result.lines.reduce((m, l) => (l.start < m ? l.start : m), result.lines[0].start) : ''
  const lastDay = result ? dayBefore(result.lines.reduce((m, l) => (l.end > m ? l.end : m), result.lines[0].end)) : ''
  const chosenDay = day ?? (result ? result.windows[result.peak].start : '')
  const tabs: TabItem<TabKey>[] = [
    { id: 'alerts', label: 'Alerts', count: shown.length },
    { id: 'timeline', label: 'Timeline' },
    { id: 'xray', label: 'X-ray' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'leaflet', label: 'Leaflet' },
  ]

  /** Choosing a day also points the X-ray at the stretch of days that holds it. */
  const pickDay = (iso: string) => {
    if (!result) return
    setDay(iso)
    const i = result.windows.findIndex((x) => x.start <= iso && x.end > iso)
    if (i >= 0) setWindowIdx(i)
  }

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
        <>
          <p className="order__status">
            <StatusBadge status={result.status} />
            <span className="hint">
              {interrupts} Interrupt, {count(result, 'inform')} Inform
              {result.unverified.length > 0 && `, ${result.unverified.length} unverified ${result.unverified.length === 1 ? 'brand' : 'brands'}`}. Parchi suggests; the pharmacist decides below.
            </span>
          </p>

          <div className="workspace workspace--flat workspace--order">
            <div className="workspace__result">
              <div className="result">
                <div aria-live="polite">{changes && <Changes changes={changes} />}</div>

                <Tabs prefix="order" label="Parts of the review" items={tabs} value={tab} onChange={setTab} />
                <div className="tabpanel" role="tabpanel" id={panelId('order')} aria-labelledby={tabId('order', tab)} tabIndex={0}>
                  {tab === 'alerts' && (
                    <div className="alerts alerts--grouped">
                      <FlagSummary lines={result.lines} />
                      {shown.length === 0 && (
                        <EmptyState title="No alerts from the checks run">
                          <p>This is not a statement that the order is safe.</p>
                        </EmptyState>
                      )}
                      <AlertGroups
                        items={shown.map((alert) => ({ alert, key: alert.type + alert.ingredients.join() }))}
                        interruptNote={<p className="hint alertgroup__note">To release the order with an Interrupt open, choose a reason in the decision bar below. It is logged against each Interrupt.</p>}
                        render={({ alert: a, key }, nested) => (
                          <AlertCard
                            key={key}
                            alert={a}
                            headline={shortFinding(a, result)}
                            extra={<Prescribers alert={a} />}
                            inputAction={inputAction(a)}
                            nested={nested.map((n) => (
                              <NestedAlert key={n.key} alert={n.alert} inputAction={inputAction(n.alert)} />
                            ))}
                          />
                        )}
                      />
                      <HerbalCard report={result.herbal} />
                    </div>
                  )}

                  {tab === 'timeline' && (
                    <>
                      <Card title="Timeline" icon="chart" description="Every medicine, by doctor and day. Choose a day to see what is taken then. Where bars from different doctors overlap, doses add up.">
                        <Timeline lines={result.lines} alerts={result.alerts} placed={order.placed} selected={chosenDay} onSelect={pickDay} />
                      </Card>
                      <Card title="That day" icon="log">
                        <DayDetail
                          lines={result.lines}
                          windows={result.windows}
                          selected={chosenDay}
                          placed={order.placed}
                          first={first}
                          last={lastDay}
                          onSelect={pickDay}
                          onOpenXray={(i) => {
                            setWindowIdx(i)
                            setTab('xray')
                          }}
                        />
                      </Card>
                    </>
                  )}

                  {tab === 'xray' && (
                    <>
                      <CoverageNote gaps={result.ddi_gaps} limitGaps={result.limit_gaps} />
                      <Card title="Prescription X-ray" icon="chart" description="Daily total per ingredient for the days chosen, against the limit on file">
                        <p className="hint">Doses are added up only within a stretch of days that has the same medicines; pick the stretch to see its totals.</p>
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
                    </>
                  )}

                  {tab === 'prescriptions' && (
                    <>
                      <UnverifiedBrands result={result} onConfirm={confirmBrand} onUndo={undoConfirm} />
                      {order.prescriptions.map((rx) => (
                        <Card key={rx.id} title={`${doctorName(rx.doctor)}, ${longDate(rx.date)}`} description="What was written and what each line was matched to. Select a line for details.">
                          <ul className="matches">
                            {result.lines
                              .filter((l) => l.rx_id === rx.id)
                              .map((l) => (
                                <BrandMatch key={l.index} resolved={l.resolved} sig={l.sig} onUse={(brand) => confirmBrand(l, brand)} alternatives={catalogue?.alternatives(l.resolved)} />
                              ))}
                          </ul>
                        </Card>
                      ))}
                    </>
                  )}

                  {tab === 'leaflet' && <LeafletCard lines={result.lines} />}
                </div>
              </div>
            </div>

            <aside className="workspace__input workspace__input--tall" aria-label="Customer details">
              <KidneyCard order={order} result={result} onAdd={addLab} />
              {saveFailed && <p className="dialog__error">Could not save on this device. The result was not added.</p>}
              <p className="hint">
                <a href={`#/history/${encodeURIComponent(order.id)}`}>Edit prescriptions and labs</a>
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => downloadText(`${order.id}.fhir.json`, JSON.stringify(orderToFhir(order), null, 2), 'application/json')}
                >
                  Download as FHIR (draft)
                </button>
              </div>
            </aside>
          </div>

          <DecisionPanel key={order.id + result.status} order={order} result={result} last={last} progress={progress} onSaved={refreshDecisions} />
        </>
      )}
    </>
  )
}
