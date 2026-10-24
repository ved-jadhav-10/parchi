import type { HistoryLine, HistoryWindow } from '../history/types'
import { addDays } from '../history/check'
import { doctorName, longDate } from '../history/labels'
import { trimReason } from '../history/queue'
import { alertTypeLabel, brandLabel } from '../lib/resolved'
import { TierBadge } from './Icons'

interface Props {
  lines: HistoryLine[]
  windows: HistoryWindow[]
  selected: string
  placed: string
  /** First and last day with a medicine, ISO */
  first: string
  last: string
  onSelect: (iso: string) => void
  onOpenXray?: (windowIndex: number) => void
}

/** What is taken on one day, by doctor, and the alerts that hold then. It sits under the timeline; choosing a day there (or the arrows here) moves it. */
export const DayDetail = ({ lines, windows, selected, placed, first, last, onSelect, onOpenXray }: Props) => {
  const active = lines.filter((l) => l.start <= selected && l.end > selected)
  const widx = windows.findIndex((w) => w.start <= selected && w.end > selected)
  const w = widx >= 0 ? windows[widx] : undefined
  const alerts = w?.alerts.filter((a) => a.tier !== 'silent') ?? []
  const doctors = [...new Set(active.map((l) => l.doctor))]

  return (
    <section className="day" aria-live="polite" aria-label="Chosen day">
      <div className="day__head">
        <button type="button" className="day__step" onClick={() => onSelect(addDays(selected, -1))} disabled={selected <= first} aria-label="Previous day">
          ‹
        </button>
        <h3 className="day__date">
          {longDate(selected)}
          {selected === placed && <span className="chip chip--source">Order placed</span>}
        </h3>
        <button type="button" className="day__step" onClick={() => onSelect(addDays(selected, 1))} disabled={selected >= last} aria-label="Next day">
          ›
        </button>
      </div>

      {active.length === 0 ? (
        <p className="hint">No medicine from these prescriptions is taken on this day.</p>
      ) : (
        <>
          {doctors.map((doc) => (
            <div key={doc} className="day__doctor">
              <p className="day__doctorname">{doctorName(doc)}</p>
              <ul className="day__lines">
                {active
                  .filter((l) => l.doctor === doc)
                  .map((l) => (
                    <li key={l.index}>
                      <strong>{brandLabel(l.resolved)}</strong>
                      <span>{l.text}</span>
                      {l.end_assumed && <span className="chip chip--review">No duration written</span>}
                      {l.unverified && <span className="chip chip--review">Unverified</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          <p className="day__sub">Alerts holding on this day</p>
          {alerts.length === 0 ? (
            <p className="hint">None from the checks run. This is not a statement that the day is safe.</p>
          ) : (
            <ul className="day__alerts">
              {alerts.map((a) => (
                <li key={a.type + a.ingredients.join()} data-tier={a.tier}>
                  <TierBadge tier={a.tier} />
                  <span>
                    <strong>{alertTypeLabel(a.type)}.</strong> {trimReason(a.reason)}.
                  </span>
                </li>
              ))}
            </ul>
          )}
          {onOpenXray && widx >= 0 && (
            <button type="button" className="btn btn--secondary" onClick={() => onOpenXray(widx)}>
              See daily totals for this day
            </button>
          )}
        </>
      )}
    </section>
  )
}
