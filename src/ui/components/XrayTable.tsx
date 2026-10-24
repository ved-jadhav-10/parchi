import type { Alert, Ledger, Tier } from '../../engine/contracts'
import type { LedgerNote } from '../../engine/ledger'
import { mg, titleCase } from '../lib/format'
import { TierBadge } from './Icons'
import { LimitBar } from './LimitBar'

const RANK: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }

/** The strongest shown alert on each ingredient, and the brands those alerts name. Silent alerts mark nothing. */
const attention = (alerts: Alert[]) => {
  const out = new Map<string, { tier: Tier; brands: Set<string> }>()
  for (const a of alerts) {
    if (a.tier === 'silent') continue
    for (const id of a.ingredients) {
      const cur = out.get(id)
      if (!cur) out.set(id, { tier: a.tier, brands: new Set(a.brands ?? []) })
      else {
        if (RANK[a.tier] < RANK[cur.tier]) cur.tier = a.tier
        for (const b of a.brands ?? []) cur.brands.add(b)
      }
    }
  }
  return out
}

/** A ledger source reads "Dolo 650: 3 x 650 mg"; the brand is what comes before the colon. */
const brandOf = (source: string) => source.split(':')[0].trim()

/** Prescription X-ray: ingredient -> brands that contribute -> daily total vs limit, marked where an alert names it. */
export const XrayTable = ({ ledger, alerts = [] }: { ledger: Ledger; alerts?: Alert[] }) => {
  const marked = attention(alerts)
  const rows = Object.entries(ledger).sort(
    ([, a], [, b]) => (b.limit_mg_day ? b.total_mg_day / b.limit_mg_day : 0) - (a.limit_mg_day ? a.total_mg_day / a.limit_mg_day : 0),
  )
  return (
    <div className="xray">
      <table>
        <thead>
          <tr>
            <th scope="col">Ingredient</th>
            <th scope="col">From brands</th>
            <th scope="col">Daily total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, row]) => {
            const flag = marked.get(id)
            return (
              <tr key={id} data-tier={flag?.tier}>
                <th scope="row">
                  {titleCase(id)}
                  {flag && (
                    <span className="xray__flag">
                      <TierBadge tier={flag.tier} />
                    </span>
                  )}
                </th>
                <td>
                  <span className="chips">
                    {row.sources.map((s) => (
                      <span key={s} className={`chip${flag?.brands.has(brandOf(s)) ? ' chip--hit' : ''}`}>
                        {s}
                      </span>
                    ))}
                  </span>
                </td>
                <td>
                  <LimitBar total={row.total_mg_day} limit={row.limit_mg_day} />
                  <span className="sr-only">{mg(row.total_mg_day)} milligrams per day</span>
                  {(row.sos_mg_day ?? 0) > 0 && <span className="xray__line">Includes up to {mg(row.sos_mg_day!)} mg as needed (worst case).</span>}
                  {row.limit_basis && (
                    <details className="xray__basis">
                      <summary>
                        {row.limit_basis}
                        {row.limit_pharmacist_approved === false && ', unverified'}
                      </summary>
                      <p>{row.limit_source}</p>
                    </details>
                  )}
                  {row.caveats?.map((c) => (
                    <span key={c} className="xray__line">
                      {c}
                    </span>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** What the totals leave out or assume (Track B): topical products, unknown strengths, assumed measures, weekly drugs on a daily sig. */
export const TotalsNotes = ({ notes, ledger }: { notes: LedgerNote[]; ledger: Ledger }) => {
  const shown = new Set(Object.values(ledger).flatMap((e) => e.caveats ?? []))
  const rest = notes.filter((n) => !shown.has(n.message))
  return rest.length === 0 ? null : (
    <details className="xray__notes">
      <summary>
        {rest.length} {rest.length === 1 ? 'thing' : 'things'} left out of or assumed in the totals
      </summary>
      <ul>
        {rest.map((n, i) => (
          <li key={i}>{n.message.includes(n.brand) ? n.message : `${n.brand}: ${n.message}`}</li>
        ))}
      </ul>
    </details>
  )
}
