import type { Tier } from '../../engine/contracts'
import { addDays, touches } from '../history/check'
import { doctorName, longDate, shortDate } from '../history/labels'
import type { HistoryAlert, HistoryLine } from '../history/types'
import { brandLabel } from '../lib/resolved'
import { tierLabel } from './Icons'
import { ScrollRegion } from './ScrollRegion'

const RANK: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }
const DAY_MS = 86_400_000

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)
const weekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay())

/** The strongest alert on screen that names this line; silent alerts mark nothing. */
const markOf = (line: HistoryLine, alerts: HistoryAlert[]): Tier | undefined =>
  alerts
    .filter((a) => a.tier !== 'silent' && touches(a, line))
    .map((a) => a.tier)
    .sort((a, b) => RANK[a] - RANK[b])[0]

/**
 * Every medicine on the order as a bar from the day it starts to the day it stops, grouped under the doctor who
 * prescribed it. Where bars from different doctors overlap, the problem is visible. Outlined bars are named by an alert.
 */
export const Timeline = ({ lines, alerts, placed, selected, onSelect }: { lines: HistoryLine[]; alerts: HistoryAlert[]; placed: string; selected?: string; onSelect?: (iso: string) => void }) => {
  const first = lines.reduce((m, l) => (l.start < m ? l.start : m), lines[0].start)
  const last = lines.reduce((m, l) => (l.end > m ? l.end : m), lines[0].end)
  const days = daysBetween(first, last)
  const dates = Array.from({ length: days }, (_, i) => addDays(first, i))
  const col = (iso: string) => daysBetween(first, iso) + 2 // column 1 holds the labels

  // Doctors in the order of their earliest prescription; their lines in the order written.
  const doctors = [...new Set([...lines].sort((a, b) => a.start.localeCompare(b.start) || a.index - b.index).map((l) => l.doctor))]
  // A label every few days keeps the header readable however long the order runs.
  const step = days > 60 ? 7 : days > 24 ? 4 : 3
  const placedAt = placed >= first && placed <= last ? daysBetween(first, placed) + 0.5 : null

  return (
    <div className="tl" role="group" aria-label="Timeline of every medicine on this order, by doctor">
      <ScrollRegion className="tl__scroll" label="Timeline, scrolls sideways">
        <div className="tl__grid" style={{ ['--days' as string]: days, ...(placedAt !== null && { ['--at' as string]: placedAt }) }}>
          <div className="tl__corner" style={{ gridColumn: 1, gridRow: 1 }} />
          {dates.map((d, i) => (
            <button
              key={d}
              type="button"
              className="tl__date"
              style={{ gridColumn: i + 2, gridRow: 1 }}
              data-weekend={weekend(d)}
              data-selected={d === selected}
              aria-label={`Show ${longDate(d)}`}
              aria-pressed={onSelect ? d === selected : undefined}
              disabled={!onSelect}
              onClick={() => onSelect?.(d)}
            >
              {i % step === 0 ? shortDate(d) : ''}
            </button>
          ))}

          {doctors.map((doc) => (
            <div key={doc} style={{ display: 'contents' }}>
              <div className="tl__doctor">{doctorName(doc)}</div>
              {lines
                .filter((l) => l.doctor === doc)
                .map((l) => {
                  const mark = markOf(l, alerts)
                  return (
                    <div key={l.index} className="tl__row">
                      <div className="tl__label" style={{ gridColumn: 1, gridRow: 1 }} title={l.text}>
                        {brandLabel(l.resolved)}
                      </div>
                      {dates.map((d, i) => (
                        <div key={d} className="tl__cell" style={{ gridColumn: i + 2, gridRow: 1 }} data-weekend={weekend(d)} data-selected={d === selected} />
                      ))}
                      <div
                        className="tl__bar"
                        data-tier={mark}
                        data-unverified={l.unverified}
                        data-assumed={l.end_assumed}
                        style={{ gridColumn: `${col(l.start)} / ${col(l.end)}`, gridRow: 1 }}
                        title={`${l.text}: ${longDate(l.start)} to ${longDate(addDays(l.end, -1))}${l.end_assumed ? ' (no duration written; default window assumed)' : ''}${l.refill_overlap_days ? ` (repeated by the same doctor ${l.refill_overlap_days} days before it ran out; read as a refill)` : ''}`}
                      >
                        <span>{l.text}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          ))}
          {placedAt !== null && <div className="tl__placed" aria-hidden="true" />}
        </div>
      </ScrollRegion>

      {days > 36 && <p className="hint tl__hint">This order runs {days} days: scroll sideways for the later days.</p>}
      <ul className="tl__legend">
        <li>
          <i className="tl__swatch" /> Taken for the written duration
        </li>
        <li>
          <i className="tl__swatch" data-assumed="true" /> No duration written: a default window is assumed (unverified)
        </li>
        <li>
          <i className="tl__swatch" data-tier="interrupt" /> Solid outline: named by an Interrupt
        </li>
        <li>
          <i className="tl__swatch" data-tier="inform" /> Dashed outline: named by an Inform
        </li>
        <li>
          <i className="tl__swatch tl__swatch--placed" /> Order placed
        </li>
      </ul>

      {/* A table keeps its content width inside a 1px box and would widen the page, so the clipped box is a div around it. */}
      <div className="sr-only">
      <table>
        <caption>Medicines on this order</caption>
        <thead>
          <tr>
            <th scope="col">Medicine</th>
            <th scope="col">Doctor</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Alert</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const mark = markOf(l, alerts)
            return (
              <tr key={l.index}>
                <th scope="row">{l.text}</th>
                <td>{l.doctor}</td>
                <td>{longDate(l.start)}</td>
                <td>{longDate(addDays(l.end, -1))}</td>
                <td>{mark ? tierLabel[mark] : 'None'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}
