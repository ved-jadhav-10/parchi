import { useEffect, useMemo, useState } from 'react'
import { Card, KpiCard } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { decisionLabel, doctorName, shortDate } from '../history/labels'
import { byQueueOrder, leadFinding, suggestionCounts, waitedLabel } from '../history/queue'
import { runAll } from '../history/run'
import type { Decision, HistoryResult, Order, OrderStatus } from '../history/types'
import { queueShortcut, targetOf, useSingleKeys } from '../lib/shortcuts'
import { useDecisions, useOrders } from '../storage/orders'

type Result = HistoryResult | 'failed' | undefined
type Row = { order: Order; result: Result }
type View = 'waiting' | 'decided'
type Filter = 'all' | OrderStatus

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const tierCount = (r: HistoryResult, tier: 'interrupt' | 'inform') => r.alerts.filter((a) => a.tier === tier).length

const openHref = (order: Order) => `#/order/${encodeURIComponent(order.id)}`

/** Keys j and k move focus between the orders' Review links, as in a mail list. Ignored while typing. */
const useRowKeys = (on: boolean) =>
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const move = queueShortcut(e, targetOf(e.target), on)
      if (!move || (e.target as HTMLElement).closest('dialog')) return
      const links = [...document.querySelectorAll<HTMLAnchorElement>('.queue__open')]
      if (links.length === 0) return
      const at = links.indexOf(document.activeElement as HTMLAnchorElement)
      const next = at === -1 ? 0 : Math.min(links.length - 1, Math.max(0, at + (move === 'next' ? 1 : -1)))
      links[next].focus()
      links[next].closest('li')?.scrollIntoView({ block: 'nearest' })
      e.preventDefault()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [on])

/** Orders waiting for a pharmacist, riskiest first. The order of the queue is Parchi's suggestion; the pharmacist can open any. */
export const QueuePage = () => {
  const { orders, ready, error, refresh: refreshOrders } = useOrders()
  const { decisions, error: decisionsError, refresh: refreshDecisions } = useDecisions()
  const [results, setResults] = useState<Record<string, HistoryResult | 'failed'>>({})
  const [view, setView] = useState<View>('waiting')
  const [filter, setFilter] = useState<Filter>('all')
  const [singleKeys, setSingleKeys] = useSingleKeys()
  useRowKeys(singleKeys)

  useEffect(() => {
    let live = true
    runAll(orders, () => live).then((out) => live && setResults(out))
    return () => {
      live = false
    }
  }, [orders])

  const decided = useMemo(() => {
    const latest = new Map<string, Decision>()
    for (const d of decisions) if (!latest.has(d.order_id)) latest.set(d.order_id, d)
    return latest
  }, [decisions])

  const rows: Row[] = orders.map((order) => ({ order, result: results[order.id] })).sort(byQueueOrder)

  const waiting = rows.filter((r) => !decided.has(r.order.id))
  const done = rows.filter((r) => decided.has(r.order.id)).sort((a, b) => decided.get(b.order.id)!.at.localeCompare(decided.get(a.order.id)!.at))
  const { counts, running, failed } = suggestionCounts(waiting.map((r) => r.result))
  const shown =
    view === 'decided' ? done : filter === 'all' ? waiting : waiting.filter((r) => typeof r.result === 'object' && r.result.status === filter)
  const storageError = error || decisionsError
  const retry = () => {
    refreshOrders()
    refreshDecisions()
  }
  const pick = (f: Filter) => {
    setView('waiting')
    setFilter((now) => (now === f && f !== 'all' ? 'all' : f))
  }
  const firstOpen = shown.findIndex((r) => !decided.has(r.order.id))
  const announce = !ready
    ? 'Loading orders'
    : `${plural(shown.length, view === 'decided' ? 'decided order' : 'waiting order')} shown${running > 0 ? `, ${running} still being checked` : ''}${failed > 0 ? `, ${failed} could not be checked` : ''}`
  const waitingHint = [running > 0 && `${running} still being checked`, failed > 0 && `${failed} not checked`].filter(Boolean).join(', ')

  return (
    <>
      <PageIntro title="Review queue" note="Ranked by findings, interrupts first; the oldest order goes first on a tie." />
      <div className="workspace workspace--single">
        <div className="kpis kpis--queue" role="group" aria-label="Filter waiting orders by suggestion">
          <KpiCard label="Waiting" value={ready ? waiting.length : '–'} hint={waitingHint || undefined} short="Waiting" pressed={view === 'waiting' && filter === 'all'} onSelect={() => pick('all')} />
          <KpiCard label="Suggested hold" value={ready ? counts.hold_contact_doctor : '–'} tier="interrupt" short="Hold" pressed={view === 'waiting' && filter === 'hold_contact_doctor'} onSelect={() => pick('hold_contact_doctor')} />
          <KpiCard label="Clear, with a note" value={ready ? counts.clear_with_note : '–'} tier="inform" short="With note" pressed={view === 'waiting' && filter === 'clear_with_note'} onSelect={() => pick('clear_with_note')} />
          <KpiCard label="No alerts" value={ready ? counts.clear : '–'} tier="silent" short="No alerts" pressed={view === 'waiting' && filter === 'clear'} onSelect={() => pick('clear')} />
        </div>

        <Card title="Orders" icon="log" description="The sample account plus any order added on this device. None are real orders.">
          <div className="toolbar queue__toolbar">
            <div className="queue__views" role="group" aria-label="Show orders">
              {(['waiting', 'decided'] as const).map((v) => (
                <button key={v} type="button" className="queue__view" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === 'waiting' ? 'Waiting' : 'Decided'} <span className="num">{ready ? (v === 'waiting' ? waiting.length : done.length) : '–'}</span>
                </button>
              ))}
            </div>
            {view === 'waiting' && filter !== 'all' && (
              <button type="button" className="btn--link queue__clear" onClick={() => setFilter('all')}>
                Show all waiting
              </button>
            )}
          </div>
          <p className="sr-only" role="status">
            {announce}
          </p>
          {storageError && (
            <p className="queue__notice" role="alert">
              <span>This browser cannot store data. New orders and decisions will not be kept.</span>
              <button type="button" className="btn--link" onClick={retry}>
                Try again
              </button>
            </p>
          )}
          {!ready ? (
            <ol className="queue" aria-busy="true" aria-label="Loading orders">
              {[0, 1, 2].map((i) => (
                <li key={i} className="queue__row queue__row--loading" aria-hidden="true">
                  <span className="queue__bar queue__bar--rank" />
                  <span className="queue__bar queue__bar--name" />
                  <span className="queue__bar queue__bar--status" />
                  <span className="queue__bar queue__bar--meta" />
                  <span className="queue__bar queue__bar--note" />
                </li>
              ))}
            </ol>
          ) : shown.length === 0 ? (
            <EmptyState
              title={view === 'decided' ? 'No decisions yet' : filter !== 'all' ? 'No waiting orders with this suggestion' : decided.size > 0 ? 'No orders waiting' : 'No orders yet'}
            >
              <p>
                {view === 'decided'
                  ? 'A decision you save on an order is listed here.'
                  : filter !== 'all'
                    ? 'Choose Waiting to see every order.'
                    : decided.size > 0
                      ? 'Every order has a decision. They are under Decided.'
                      : 'Add an order with its prescriptions to see it here.'}
              </p>
            </EmptyState>
          ) : (
            <ol className="queue" data-view={view} aria-label={view === 'decided' ? 'Decided orders, latest first' : 'Waiting orders, review first at the top'}>
              {shown.map(({ order, result }, i) => {
                const d = decided.get(order.id)
                const doctors = new Set(order.prescriptions.map((p) => doctorName(p.doctor)))
                const lead = typeof result === 'object' ? leadFinding(result) : undefined
                const interrupts = typeof result === 'object' ? tierCount(result, 'interrupt') : 0
                const informs = typeof result === 'object' ? tierCount(result, 'inform') : 0
                return (
                  <li key={order.id} className="queue__row" data-decided={!!d} data-failed={result === 'failed' || undefined}>
                    {!d && (
                      <span className="queue__rank num" aria-hidden="true">
                        {i + 1}
                      </span>
                    )}
                    <p className="queue__name">
                      {order.customer.name} <span className="queue__id">{order.id}</span>
                    </p>
                    <div className="queue__status">
                      {result === undefined ? (
                        <span className="queue__meta">Checking…</span>
                      ) : result === 'failed' ? (
                        <span className="tier-badge queue__failed" data-tier="interrupt">
                          Not checked
                        </span>
                      ) : (
                        <>
                          <StatusBadge status={result.status} compact />
                          {(interrupts > 0 || informs > 0 || result.unverified.length > 0) && (
                            <span className="queue__counts num">
                              {[interrupts > 0 && `${interrupts} Interrupt`, informs > 0 && `${informs} Inform`, result.unverified.length > 0 && `${result.unverified.length} unverified`]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="queue__meta queue__info">
                      <span>
                        {order.customer.age_years} y{order.customer.sex ? `, ${order.customer.sex === 'M' ? 'male' : 'female'}` : ''}
                      </span>
                      <span>{d ? `placed ${shortDate(order.placed)}` : waitedLabel(order.placed)}</span>
                      <span>
                        {plural(order.prescriptions.length, 'Rx', 'Rx')},{' '}
                        {doctors.size > 1 ? <strong className="queue__doctors">{plural(doctors.size, 'doctor')}</strong> : plural(doctors.size, 'doctor')}
                      </span>
                    </p>
                    <div className="queue__note">
                      {d ? (
                        <>
                          <strong>{decisionLabel(d.decision)}</strong>
                          <span className="queue__meta">{new Date(d.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </>
                      ) : lead ? (
                        <span className="queue__why" title={lead.full !== lead.text ? lead.full : undefined}>
                          <span className="queue__why-text">{lead.text}</span>
                          {lead.more > 0 && (
                            <span className="queue__more num">
                              +{lead.more} more<span className="sr-only"> {lead.more === 1 ? 'finding' : 'findings'}</span>
                            </span>
                          )}
                        </span>
                      ) : result === 'failed' ? (
                        <span className="queue__why-text">Could not check this order. Review every prescription by hand.</span>
                      ) : null}
                    </div>
                    <a className={`btn ${i === firstOpen ? 'btn--primary' : 'btn--secondary'} queue__open`} href={openHref(order)}>
                      {d ? 'Open' : 'Review'}
                      <span className="sr-only"> {order.customer.name}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="queue__add">
            <a className="btn btn--secondary" href="#/history">
              New order
            </a>
          </p>
          <label className="decision__switch queue__keys">
            <input type="checkbox" checked={singleKeys} onChange={(e) => setSingleKeys(e.target.checked)} />
            <span>Keys j and k move between orders</span>
          </label>
        </Card>
      </div>
    </>
  )
}
