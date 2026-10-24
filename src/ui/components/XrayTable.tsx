import type { Ledger } from '../../engine/contracts'
import { mg, titleCase } from '../lib/format'
import { LimitBar } from './LimitBar'

/** Prescription X-ray: ingredient -> brands that contribute -> daily total vs limit. */
export const XrayTable = ({ ledger }: { ledger: Ledger }) => {
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
          {rows.map(([id, row]) => (
            <tr key={id}>
              <th scope="row">{titleCase(id)}</th>
              <td>
                <span className="chips">
                  {row.sources.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </span>
              </td>
              <td>
                <LimitBar total={row.total_mg_day} limit={row.limit_mg_day} />
                <span className="sr-only">{mg(row.total_mg_day)} milligrams per day</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
