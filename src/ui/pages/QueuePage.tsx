import { useEffect, useMemo, useState } from 'react'
import { Card, KpiCard } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { decisionLabel, doctorName, longDate } from '../history/labels'
import { runHistory } from '../history/run'
import type { Decision, HistoryResult, Order } from '../history/types'
import { useDecisions, useOrders } from '../storage/orders'

type Row = { order: Order; result: HistoryResult | 'failed' | undefined }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const tierCount = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length

/** Orders waiting for a pharmacist, riskiest first. The order of the queue is Parchi's suggestion; the pharmacist can open any. */
export const QueuePage = () => {
  const { orders, ready, error } = useOrders()
  const { decisions } = useDecisions()
  const [results, setResults] = useState<Record<string, HistoryResult | 'failed'>>({})

  useEffect(() => {
    let live = true
    Promise.all(orders.map(async (o) => [o.id, await runHistory(o).catch(() => 'failed' as const)] as const)).then((entries) => live && setResults(Object.fromEntries(entries)))
    return () => {
      live = false
    }
  }, [orders])

  const decided = useMemo(() => {
    const latest = new Map<string, Decision>()
    for (const d of decisions) if (!latest.has(d.order_id)) latest.set(d.order_id, d)
    return latest
  }, [decisions])

  const rows: Row[] = orders
    .map((order) => ({ order, result: results[order.id] }))
    .sort((a, b) => {
      const pa = typeof a.result === 'object' ? a.result.priority : -1
      const pb = typeof b.result === 'object' ? b.result.priority : -1
      return pb - pa || a.order.placed.localeCompare(b.order.placed)
    })

  const waiting = rows.filter((r) => !decided.has(r.order.id))
  const suggested = (s: string) => waiting.filter((r) => typeof r.result === 'object' && r.result.status === s).length

  return (
    <>
      <PageIntro title="Review queue" note="Orders waiting for a pharmacist, riskiest first." />
      <div className="workspace workspace--single">
        <div className="kpis">
          <KpiCard label="Waiting" value={waiting.length} hint="No decision yet" />
          <KpiCard label="Suggested hold" value={suggested('hold_contact_doctor')} hint="Contact the doctor" tier="interrupt" />
          <KpiCard label="Clear, with a note" value={suggested('clear_with_note')} tier="inform" />
          <KpiCard label="Decided" value={decided.size} hint="Saved on this device" />
        </div>

        <Card title="Orders" icon="log" description="Sample account until real orders are connected. Select an order to see its timeline and alerts.">
          <div className="toolbar">
            <a className="btn btn--primary toolbar__end" href="#/history">
              New order
            </a>
          </div>
          {error && <p className="hint">This browser cannot store data, so new orders and decisions will not be kept. The sample orders still show.</p>}
          {!ready ? null : rows.length === 0 ? (
            <EmptyState title="No orders yet">
              <p>Add an order with its prescriptions to see it here.</p>
            </EmptyState>
          ) : (
            <ol className="queue">
              {rows.map(({ order, result }, i) => {
                const d = decided.get(order.id)
                const doctors = new Set(order.prescriptions.map((p) => doctorName(p.doctor)))
                return (
                  <li key={order.id} className="queue__row" data-decided={!!d}>
                    <span className="queue__rank num" aria-label={`Position ${i + 1}`}>
                      {i + 1}
                    </span>
                    <div className="queue__who">
                      <a className="queue__name" href={`#/order/${encodeURIComponent(order.id)}`}>
                        {order.customer.name} <span className="queue__id">{order.id}</span>
                      </a>
                      <span className="queue__meta">
                        {order.customer.age_years} y{order.customer.sex ? `, ${order.customer.sex === 'M' ? 'male' : 'female'}` : ''} · placed {longDate(order.placed)} ·{' '}
                        {plural(order.prescriptions.length, 'prescription')} from {plural(doctors.size, 'doctor')}
                      </span>
                    </div>
                    <div className="queue__status">
                      {result === undefined ? (
                        <span className="queue__meta">Checking…</span>
                      ) : result === 'failed' ? (
                        <span className="queue__meta">Could not check this order</span>
                      ) : (
                        <>
                          <StatusBadge status={result.status} />
                          <span className="queue__meta num">
                            {tierCount(result, 'interrupt')} Interrupt · {tierCount(result, 'inform')} Inform
                            {result.unverified.length > 0 && ` · ${result.unverified.length} unverified`}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="queue__decision">
                      {d ? (
                        <>
                          <strong>{decisionLabel(d.decision)}</strong>
                          <span className="queue__meta">{new Date(d.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </>
                      ) : (
                        <span className="queue__meta">Waiting for a decision</span>
                      )}
                    </div>
                    <a className="btn btn--secondary" href={`#/order/${encodeURIComponent(order.id)}`}>
                      {d ? 'Open' : 'Review'}
                    </a>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      </div>
    </>
  )
}
