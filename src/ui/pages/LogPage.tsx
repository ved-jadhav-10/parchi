import { Select } from '../components/Select'
import { useState } from 'react'
import type { Tier } from '../../engine/contracts'
import { Card } from '../components/Card'
import { Icon, TierBadge } from '../components/Icons'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { downloadText, toCsv } from '../lib/csv'
import { trimReason } from '../history/queue'
import { decisionLabel, STATUS_LABEL } from '../history/labels'
import { useOverrides } from '../storage/overrides'
import { useDecisions } from '../storage/orders'

const columns = ['at', 'order_id', 'tier', 'type', 'ingredients', 'alert_reason', 'source', 'override_reason', 'note']

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
          <p>Overrides cannot be saved here, so nothing would be kept. Open Parchi in a normal browser window, or ask whoever looks after this device to allow storage.</p>
        </EmptyState>
      )}

      {!error && (
        <div className="workspace workspace--single">
          <p className="logsum" role="status">
            <strong className="num">{rows.length}</strong> {rows.length === 1 ? 'override' : 'overrides'} on this device
            {rows.length > 0 && (
              <>
                {' · '}
                <strong className="num">{rows.filter((r) => r.tier === 'interrupt').length}</strong> of an Interrupt
                {' · latest '}
                {new Date(rows[0].at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </>
            )}
          </p>

          <Card title="Overrides" icon="log">
            <div className="toolbar">
              <Select
                label="Tier"
                value={tier}
                onChange={setTier}
                options={[
                  { value: '', label: 'All' },
                  { value: 'interrupt', label: 'Interrupt' },
                  { value: 'inform', label: 'Inform' },
                  { value: 'silent', label: 'Silent' },
                ]}
              />
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
              <ol className="logrows">
                {shown.map((r) => (
                  <li key={r.id} className="logrow" data-tier={r.tier}>
                    <time className="logrow__when" dateTime={r.at}>
                      <strong>{new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>
                      <span>{new Date(r.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                    </time>
                    <div className="logrow__main">
                      <p className="logrow__head">
                        <TierBadge tier={r.tier} />
                        <span>{trimReason(r.alert_reason)}</span>
                      </p>
                      <p className="logrow__why">
                        <strong>{r.override_reason}</strong>
                        {r.note && <span> · {r.note}</span>}
                        {r.order_id && (
                          <>
                            {' · '}
                            <a href={`#/order/${encodeURIComponent(r.order_id)}`}>{r.order_id}</a>
                          </>
                        )}
                      </p>
                      <details className="logrow__more">
                        <summary>Full alert and source</summary>
                        <p>{r.alert_reason}</p>
                        <span className="chips">
                          {r.ingredients.map((i) => (
                            <span key={i} className="chip">
                              {i}
                            </span>
                          ))}
                          <span className="chip chip--source">{r.source}</span>
                        </span>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Order decisions" icon="shield" description="What the pharmacist decided on each order in the review queue, and what Parchi had suggested">
            {decisions.length > 0 && (
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
            )}
            {decisions.length === 0 ? (
              <p className="hint">No decisions yet. They appear here when a pharmacist saves one on an order.</p>
            ) : (
              <ol className="logrows">
                {decisions.map((d) => (
                  <li key={d.id} className="logrow">
                    <time className="logrow__when" dateTime={d.at}>
                      <strong>{new Date(d.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>
                      <span>{new Date(d.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                    </time>
                    <div className="logrow__main">
                      <p className="logrow__head">
                        <a href={`#/order/${encodeURIComponent(d.order_id)}`}>{d.customer}</a>
                        <strong>{decisionLabel(d.decision)}</strong>
                      </p>
                      <p className="logrow__why">
                        {d.order_id} · {d.interrupts} Interrupt, {d.informs} Inform · Parchi suggested {STATUS_LABEL[d.suggested]}. Reason: {d.reason}.{d.note ? ` ${d.note}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
