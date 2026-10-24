import { useState } from 'react'
import type { Tier } from '../../engine/contracts'
import { Card, KpiCard } from '../components/Card'
import { Icon, TierBadge } from '../components/Icons'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { downloadText, toCsv } from '../lib/csv'
import { titleCase } from '../lib/format'
import { decisionLabel, STATUS_LABEL } from '../history/labels'
import { useOverrides } from '../storage/overrides'
import { useDecisions } from '../storage/orders'

const columns = ['at', 'tier', 'type', 'ingredients', 'alert_reason', 'source', 'override_reason', 'note']

export const LogPage = () => {
  const { rows, ready, error } = useOverrides()
  const { decisions } = useDecisions()
  const [tier, setTier] = useState<'' | Tier>('')
  const [from, setFrom] = useState('')

  const shown = rows.filter((r) => (!tier || r.tier === tier) && (!from || r.at.slice(0, 10) >= from))

  return (
    <>
      <PageIntro note="Every override, with the reason given." title="Override log" />

      {error && (
        <EmptyState title="This browser cannot store the log">
          <p>Private windows and blocked site data stop overrides from being saved. Use a normal window to keep a record.</p>
        </EmptyState>
      )}

      {!error && (
        <div className="workspace workspace--single">
          <div className="kpis">
            <KpiCard label="Overrides" value={rows.length} hint="Stored on this device" />
            <KpiCard label="Interrupts overridden" value={rows.filter((r) => r.tier === 'interrupt').length} tier="interrupt" />
            <KpiCard label="Latest" value={rows[0] ? new Date(rows[0].at).toLocaleDateString('en-IN') : '—'} />
          </div>

          <Card title="Overrides" icon="log">
            <div className="toolbar">
              <label className="field">
                <span className="field__label">Tier</span>
                <select className="field__input" value={tier} onChange={(e) => setTier(e.target.value as '' | Tier)}>
                  <option value="">All</option>
                  <option value="interrupt">Interrupt</option>
                  <option value="inform">Inform</option>
                  <option value="silent">Silent</option>
                </select>
              </label>
              <label className="field">
                <span className="field__label">From date</span>
                <input className="field__input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <button
                className="btn btn--secondary toolbar__end"
                disabled={shown.length === 0}
                onClick={() => downloadText('override-log.csv', toCsv(columns, shown as unknown as Record<string, unknown>[]), 'text/csv')}
              >
                <Icon name="download" size={16} /> Export CSV
              </button>
            </div>

            {!ready ? null : shown.length === 0 ? (
              <p className="hint">{rows.length === 0 ? 'No overrides yet. They appear here when an Interrupt is overridden with a reason.' : 'No overrides match these filters.'}</p>
            ) : (
              <div className="xray">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Alert</th>
                      <th scope="col">Reason given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.id}>
                        <th scope="row">{new Date(r.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</th>
                        <td>
                          <div className="log__alert">
                            <TierBadge tier={r.tier} />
                            <span>{titleCase(r.type)}</span>
                          </div>
                          <p className="log__text">{r.alert_reason}</p>
                          <span className="chips">
                            {r.ingredients.map((i) => (
                              <span key={i} className="chip">
                                {i}
                              </span>
                            ))}
                            <span className="chip chip--source">{r.source}</span>
                          </span>
                        </td>
                        <td>
                          <strong>{r.override_reason}</strong>
                          {r.note && <p className="log__text">{r.note}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Order decisions" icon="shield" description="What the pharmacist decided on each order in the review queue, and what Parchi had suggested">
            <div className="toolbar">
              <button
                className="btn btn--secondary toolbar__end"
                disabled={decisions.length === 0}
                onClick={() =>
                  downloadText(
                    'order-decisions.csv',
                    toCsv(['at', 'order_id', 'customer', 'suggested', 'decision', 'reason', 'note', 'interrupts', 'informs'], decisions as unknown as Record<string, unknown>[]),
                    'text/csv',
                  )
                }
              >
                <Icon name="download" size={16} /> Export CSV
              </button>
            </div>
            {decisions.length === 0 ? (
              <p className="hint">No decisions yet. They appear here when a pharmacist saves one on an order.</p>
            ) : (
              <div className="xray">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Order</th>
                      <th scope="col">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisions.map((d) => (
                      <tr key={d.id}>
                        <th scope="row">{new Date(d.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</th>
                        <td>
                          <a href={`#/order/${encodeURIComponent(d.order_id)}`}>{d.customer}</a>
                          <p className="log__text">
                            {d.order_id} · {d.interrupts} Interrupt, {d.informs} Inform
                          </p>
                        </td>
                        <td>
                          <strong>{decisionLabel(d.decision)}</strong>
                          <p className="log__text">
                            Parchi suggested: {STATUS_LABEL[d.suggested]}. Reason: {d.reason}.{d.note ? ` ${d.note}` : ''}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
