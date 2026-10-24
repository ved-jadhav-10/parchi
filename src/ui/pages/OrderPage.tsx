import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCard } from '../components/AlertCard'
import { BrandMatch } from '../components/BrandMatch'
import { Card } from '../components/Card'
import { CoverageNote } from '../components/CoverageNote'
import { HerbalCard } from '../components/HerbalCard'
import { LeafletCard } from '../components/LeafletCard'
import { DecisionPanel } from '../components/DecisionPanel'
import { DecisionSheet } from '../components/DecisionSheet'
import { OverrideDialog } from '../components/OverrideDialog'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { QueryDraftCard } from '../components/QueryDraftCard'
import { SilentLog } from '../components/SilentLog'
import { StatusBadge } from '../components/StatusBadge'
import { TierKey } from '../components/TierKey'
import { Timeline } from '../components/Timeline'
import { TierBadge } from '../components/Icons'
import { XrayTable } from '../components/XrayTable'
import { latestLab } from '../history/check'
import { doctorName, longDate, rangeLabel, shortDate, STATUS_LABEL, STATUS_TIER, todayIso } from '../history/labels'
import { leadAlert } from '../history/queue'
import { runHistory } from '../history/run'
import type { AlertChange, HistoryAlert, HistoryLine, HistoryResult, LabResult, Order } from '../history/types'
import { useNextWaiting } from '../history/useNext'
import { downloadText } from '../lib/csv'
import { orderToFhir } from '../lib/fhirOrder'
import { alertTypeLabel, candidateLabel } from '../lib/resolved'
import { pct } from '../lib/format'
import { useMedia } from '../lib/useMedia'
import { useRouteParam } from '../route'
import { addOverride, useOverrides } from '../storage/overrides'
import { useCatalogue } from '../storage/catalogue'
import { saveOrder, useDecisions, useOrders } from '../storage/orders'

const count = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length
const sameLab = (a: LabResult, b: LabResult) => a.date === b.date && a.value === b.value
const PRESCRIBED_JOIN = (r: HistoryAlert) => r.prescribed.map((p) => `${doctorName(p.doctor)} (${shortDate(p.date)})`).join(' and ')
const alertKey = (a: { type: string; ingredients: string[] }) => a.type + a.ingredients.join()
const overrideDomId = (a: { type: string; ingredients: string[] }) => `ov-${alertKey(a).replace(/[^a-z0-9]+/gi, '-')}`

/** How many Informs are shown in full; the rest fold into one list so a single Interrupt is never buried under amber cards. */
const INFORMS_SHOWN = 2

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

const Kidney = ({ order, result, onAdd }: { order: Order; result: HistoryResult; onAdd: (lab: LabResult) => void }) => {
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
    </div>
  )
}

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

/**
 * The answer first: what Parchi suggests, the finding that weighs most (in full, with its source, the prescribers and the
 * override), and the counts. Everything else is evidence below it; the decision sits beside it.
 */
const Verdict = ({ result, children }: { result: HistoryResult; children?: React.ReactNode }) => {
  const unverified = result.unverified.length
  const shown = result.alerts.filter((a) => a.tier !== 'silent').length
  return (
    <section className="verdict" data-tier={STATUS_TIER[result.status]} aria-labelledby="verdict-title">
      <h2 id="verdict-title" className="sr-only">
        What Parchi suggests
      </h2>
      <header className="verdict__head">
        <StatusBadge status={result.status} />
        <span className="verdict__counts">
          {count(result, 'interrupt')} Interrupt, {count(result, 'inform')} Inform
          {unverified > 0 && `, ${unverified} unverified ${unverified === 1 ? 'brand' : 'brands'}`}
          {shown > 1 && ` · ${shown - 1} more below`}
        </span>
      </header>
      {children ?? <p className="verdict__lead">No alerts from the checks run. This is not a statement that the order is safe.</p>}
      <p className="hint verdict__note">Parchi suggests; the pharmacist decides. Limits and alert rules are drafts until a pharmacist signs them off.</p>
      <TierKey />
    </section>
  )
}

/** One order: what Parchi suggests, the pharmacist's decision, and the evidence (timeline, alerts, totals, brands). */
export const OrderPage = () => {
  const id = useRouteParam()
  const { orders, ready, refresh } = useOrders()
  const { decisions, refresh: refreshDecisions } = useDecisions()
  const { rows: overrideRows, refresh: refreshOverrides } = useOverrides()
  const { catalogue } = useCatalogue()
  const order = orders.find((o) => o.id === id)

  // A result belongs to the order it was computed for: after a move to another order the old one must not show, not even for a frame.
  const [held, setHeld] = useState<{ id: string; result: HistoryResult } | null>(null)
  const result = held?.id === id ? held.result : null
  const [failed, setFailed] = useState(false)
  const [changes, setChanges] = useState<AlertChange[] | null>(null)
  const [windowIdx, setWindowIdx] = useState<number | null>(null)
  const [overriding, setOverriding] = useState<HistoryAlert | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [workingsOpen, setWorkingsOpen] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 960px)').matches)
  const previous = useRef<HistoryResult | null>(null)
  const wantDiff = useRef(false)

  useEffect(() => {
    setHeld(null)
    setChanges(null)
    previous.current = null
    wantDiff.current = false
  }, [id])

  // A result waiting to be added opens the kidney tools by itself, so a new value is never missed.
  const hasIncoming = (order?.incoming_labs ?? []).length > 0
  useEffect(() => setToolsOpen(hasIncoming), [id, hasIncoming])

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
        setHeld({ id: order.id, result: r })
        setWindowIdx(null)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [order])

  const last = useMemo(() => decisions.find((d) => d.order_id === id), [decisions, id])
  const nextWaiting = useNextWaiting(orders, decisions, id)

  // The overrides already saved for this order, so a reload does not offer one again.
  const overridden = useMemo(() => {
    const out: Record<string, string> = {}
    for (const r of [...overrideRows].sort((a, b) => a.at.localeCompare(b.at))) if (r.order_id === id) out[r.type + r.ingredients.join()] = r.override_reason
    return out
  }, [overrideRows, id])

  // On a wide screen the decision sits beside the evidence. On a phone it is a sheet that a bar at the bottom of the screen opens,
  // so it is never a thousand pixels of scrolling away. Only one copy of the form exists at a time.
  const narrow = useMedia('(max-width: 959px)')
  const [sheetOpen, setSheetOpen] = useState(false)
  useEffect(() => setSheetOpen(false), [id, narrow])

  /** Save a changed order (a lab, a confirmed brand) and let the page check it again, with the diff against what it showed. */
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
    void saveAndRecheck({ ...order, labs: [...order.labs, lab], incoming_labs: (order.incoming_labs ?? []).filter((l) => !sameLab(l, lab)) })
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

  const saveOverride = async (reason: string, note: string) => {
    if (!overriding) return
    const saved = overriding
    await addOverride({
      at: new Date().toISOString(),
      tier: saved.tier,
      type: saved.type,
      ingredients: saved.ingredients,
      alert_reason: saved.reason,
      source: saved.source,
      override_reason: reason,
      order_id: order?.id,
      ...(note && { note }),
    })
    await refreshOverrides()
    setOverriding(null)
    // The button that opened the dialog is gone now; put the cursor on what replaced it.
    setTimeout(() => document.getElementById(overrideDomId(saved))?.focus(), 60)
  }

  /** "Add it now" on an alert that waits for an input: the kidney form when creatinine is missing, else the edit page. */
  const needInput = () => {
    if (!order) return
    if (result?.prompts.some((p) => p.field === 'serum_creatinine')) {
      setToolsOpen(true)
      setTimeout(() => document.getElementById('kidney-creatinine')?.focus(), 60)
    } else location.hash = `#/history/${encodeURIComponent(order.id)}`
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

  const shownAlerts = result?.alerts.filter((a) => a.tier !== 'silent') ?? []
  const silentAlerts = result?.alerts.filter((a) => a.tier === 'silent') ?? []
  const lead = result ? leadAlert(result) : undefined
  const rest = shownAlerts.filter((a) => a !== lead)
  const interrupts = rest.filter((a) => a.tier === 'interrupt')
  const informs = rest.filter((a) => a.tier === 'inform')
  const interruptAlerts = shownAlerts.filter((a) => a.tier === 'interrupt')
  const acknowledged = interruptAlerts.filter((a) => overridden[alertKey(a)] !== undefined).length

  const decisionForm = result && (
    <DecisionPanel
      key={order.id}
      order={order}
      result={result}
      last={last}
      onSaved={() => {
        void refreshDecisions()
        setSheetOpen(false)
      }}
      next={nextWaiting.next}
      othersWaiting={nextWaiting.othersWaiting}
      interrupts={{ total: interruptAlerts.length, acknowledged }}
    />
  )

  const renderAlert = (a: HistoryAlert, variant: 'card' | 'lead' = 'card') => (
    <AlertCard
      key={alertKey(a)}
      alert={a}
      variant={variant}
      extra={<Prescribers alert={a} />}
      overriddenReason={overridden[alertKey(a)]}
      overrideId={overrideDomId(a)}
      onNeedInput={needInput}
      onOverride={a.tier === 'interrupt' ? () => setOverriding(a) : undefined}
    />
  )

  const statusLine = result
    ? `${count(result, 'interrupt')} Interrupt, ${count(result, 'inform')} Inform${result.unverified.length > 0 ? `, ${result.unverified.length} unverified` : ''}. Parchi suggests: ${STATUS_LABEL[result.status]}.`
    : failed
      ? 'Could not check this order.'
      : 'Checking the order.'

  return (
    <>
      <p className="backlink">
        <a href="#/queue">← Review queue</a>
      </p>
      <PageIntro
        title={order.customer.name}
        note={`${order.id} · ${order.customer.age_years} y${order.customer.sex ? `, ${order.customer.sex === 'M' ? 'male' : 'female'}` : ''}${order.customer.weight_kg ? `, ${order.customer.weight_kg} kg` : ''} · placed ${longDate(order.placed)} · ${order.prescriptions.length} prescriptions from ${doctors.size} doctors`}
      />
      <p className="sr-only" role="status">
        {statusLine}
      </p>

      {failed && (
        <EmptyState title="Could not check this order">
          <p>Nothing was saved. Review the prescriptions and try again.</p>
        </EmptyState>
      )}
      {!failed && !result && <p className="hint">Checking…</p>}

      {result && w && (
        <div className="workspace order">
          <div className="workspace__result">
            <div className="result">
              <Verdict result={result}>{lead && renderAlert(lead, 'lead')}</Verdict>

              {changes && <Changes changes={changes} />}

              {(interrupts.length > 0 || informs.length > 0) && (
                <div className="alerts">
                  {interrupts.map((a) => renderAlert(a))}
                  {informs.slice(0, INFORMS_SHOWN).map((a) => renderAlert(a))}
                  {informs.length > INFORMS_SHOWN && (
                    <details className="silent-log">
                      <summary>{informs.length - INFORMS_SHOWN} more Inform {informs.length - INFORMS_SHOWN === 1 ? 'alert' : 'alerts'}</summary>
                      {informs.slice(INFORMS_SHOWN).map((a) => renderAlert(a))}
                    </details>
                  )}
                </div>
              )}

              <SilentLog alerts={silentAlerts} />

              <UnverifiedBrands result={result} onConfirm={confirmBrand} onUndo={undoConfirm} />

              <HerbalCard report={result.herbal} />

              <CoverageNote gaps={result.ddi_gaps} limitGaps={result.limit_gaps} />

              <details className="card workings" open={workingsOpen || undefined} onToggle={(e) => setWorkingsOpen(e.currentTarget.open)}>
                <summary>Workings: timeline, daily totals and what was written</summary>
                <div className="workings__body">
                  <section aria-labelledby="w-timeline">
                    <h3 id="w-timeline" className="order__sub">
                      Timeline
                    </h3>
                    <p className="hint">Every medicine, by doctor and day. Where bars from different doctors overlap, doses add up. A line with no written duration uses an unverified default window.</p>
                    <Timeline lines={result.lines} alerts={result.alerts} placed={order.placed} />
                  </section>

                  <section aria-labelledby="w-xray">
                    <h3 id="w-xray" className="order__sub">
                      Prescription X-ray
                    </h3>
                    <p className="hint">Daily total per ingredient for the days chosen, against the limit on file.</p>
                    <div className="windows" role="group" aria-label="Days to show">
                      {result.windows.map((win, i) => (
                        <button key={win.start} className="windows__btn" aria-pressed={i === (windowIdx ?? result.peak)} onClick={() => setWindowIdx(i)}>
                          {rangeLabel(win.start, win.end)}
                          {i === result.peak && <span className="windows__peak"> · most serious</span>}
                        </button>
                      ))}
                    </div>
                    <XrayTable ledger={w.ledger} alerts={w.alerts} />
                  </section>

                  <section aria-labelledby="w-written">
                    <h3 id="w-written" className="order__sub">
                      What was written
                    </h3>
                    <p className="hint">Each line as written and what it was matched to. Select a line for details.</p>
                    {order.prescriptions.map((rx) => (
                      <div key={rx.id} className="order__rx">
                        <h4 className="order__rxhead">
                          {doctorName(rx.doctor)}, {longDate(rx.date)}
                        </h4>
                        <ul className="matches">
                          {result.lines
                            .filter((l) => l.rx_id === rx.id)
                            .map((l) => (
                              <BrandMatch key={l.index} resolved={l.resolved} sig={l.sig} onUse={(brand) => confirmBrand(l, brand)} alternatives={catalogue?.alternatives(l.resolved)} />
                            ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                </div>
              </details>
            </div>
          </div>

          <div className="workspace__input order__rail">
            {!narrow && (
              <Card id="decision" title="Your decision" icon="log">
                {decisionForm}
              </Card>
            )}

            <QueryDraftCard order={order} result={result} />

            <details className="card order__tools" open={toolsOpen || undefined} onToggle={(e) => setToolsOpen(e.currentTarget.open)}>
              <summary>
                Kidney result, edit and export
                {hasIncoming && <span className="chip chip--review order__badge">New result waiting</span>}
              </summary>
              <div className="order__tools-body">
                <Kidney order={order} result={result} onAdd={addLab} />
                {saveFailed && (
                  <p className="dialog__error" role="alert">
                    Could not save on this device. Nothing was changed.
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

            <LeafletCard lines={result.lines} inDetails />
          </div>

          {narrow && (
            <>
              <div className="decide-bar">
                <StatusBadge status={result.status} compact />
                <button type="button" className="btn btn--primary" onClick={() => setSheetOpen(true)}>
                  Decide
                </button>
              </div>
              <DecisionSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
                {sheetOpen && decisionForm}
              </DecisionSheet>
            </>
          )}
        </div>
      )}

      <OverrideDialog alert={overriding} orderId={order.id} onCancel={() => setOverriding(null)} onSave={saveOverride} />
    </>
  )
}
