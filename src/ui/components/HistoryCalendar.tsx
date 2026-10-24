import { useState } from 'react'
import type { Tier } from '../../engine/contracts'
import { doctorName, longDate } from '../history/labels'
import type { HistoryLine, HistoryWindow } from '../history/types'
import { alertTypeLabel, brandLabel } from '../lib/resolved'
import { Icon, TierBadge, tierLabel } from './Icons'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const RANK: Record<Tier, number> = { interrupt: 0, inform: 1, silent: 2 }

const toIso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
const year = (iso: string) => Number(iso.slice(0, 4))
const month = (iso: string) => Number(iso.slice(5, 7)) - 1
const day = (iso: string) => Number(iso.slice(8, 10))
const monthIndex = (iso: string) => year(iso) * 12 + month(iso)
const dayBefore = (iso: string) => toIso(year(iso), month(iso), day(iso) - 1)
/** Monday-first column of a date, 0 to 6. */
const column = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7

interface Props {
  lines: HistoryLine[]
  windows: HistoryWindow[]
  placed: string
  /** The day to open on */
  initial: string
  /** Called with the window that holds the chosen day, so the X-ray tab follows it */
  onPickWindow?: (index: number) => void
  onOpenXray?: () => void
}

/**
 * The history as a month calendar. Each day shows how many medicines are taken, whether a prescription was written
 * and the strongest alert that holds that day. Choosing a day lists what is taken then, by doctor, and the alerts.
 */
export const HistoryCalendar = ({ lines, windows, placed, initial, onPickWindow, onOpenXray }: Props) => {
  const first = lines.reduce((m, l) => (l.start < m ? l.start : m), lines[0].start)
  const last = dayBefore(lines.reduce((m, l) => (l.end > m ? l.end : m), lines[0].end))
  const [selected, setSelected] = useState(initial)
  const [shown, setShown] = useState(monthIndex(initial))
  const lo = monthIndex(first)
  const hi = monthIndex(last)

  const y = Math.floor(shown / 12)
  const m = shown % 12
  const lead = column(toIso(y, m, 1))
  const length = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

  const info = (iso: string) => {
    const active = lines.filter((l) => l.start <= iso && l.end > iso)
    const widx = windows.findIndex((w) => w.start <= iso && w.end > iso)
    const w = widx >= 0 ? windows[widx] : undefined
    const tier = w?.alerts.map((a) => a.tier).filter((t) => t !== 'silent').sort((a, b) => RANK[a] - RANK[b])[0]
    return { active, widx, w, tier, written: lines.some((l) => l.start === iso) }
  }

  const choose = (iso: string) => {
    setSelected(iso)
    const { widx } = info(iso)
    if (widx >= 0) onPickWindow?.(widx)
  }

  const now = info(selected)
  const doctors = [...new Set(now.active.map((l) => l.doctor))]
  const shownAlerts = now.w?.alerts.filter((a) => a.tier !== 'silent') ?? []

  return (
    <div className="cal">
      <div className="cal__month">
        <div className="cal__head">
          <button type="button" className="cal__nav" onClick={() => setShown(shown - 1)} disabled={shown <= lo} aria-label="Previous month">
            ‹
          </button>
          <h3 className="cal__title" aria-live="polite">
            {MONTHS[m]} {y}
          </h3>
          <button type="button" className="cal__nav" onClick={() => setShown(shown + 1)} disabled={shown >= hi} aria-label="Next month">
            ›
          </button>
        </div>
        <div className="cal__grid" role="group" aria-label={`${MONTHS[m]} ${y}`}>
          {WEEKDAYS.map((d) => (
            <span key={d} className="cal__dow" aria-hidden="true">
              {d}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: length }, (_, i) => {
            const iso = toIso(y, m, i + 1)
            const d = info(iso)
            const n = d.active.length
            const label = [
              longDate(iso),
              n === 0 ? 'no medicines' : `${n} ${n === 1 ? 'medicine' : 'medicines'}`,
              d.written ? 'prescription written' : '',
              d.tier ? `${tierLabel[d.tier]} alert` : '',
              iso === placed ? 'order placed' : '',
            ]
              .filter(Boolean)
              .join(', ')
            return (
              <button
                key={iso}
                type="button"
                className="cal__day"
                data-tier={d.tier}
                data-busy={n > 0}
                data-placed={iso === placed}
                aria-pressed={iso === selected}
                aria-label={label}
                onClick={() => choose(iso)}
              >
                <span className="cal__num">{i + 1}</span>
                {n > 0 && (
                  <span className="cal__meds">
                    {n}
                    <span className="cal__unit"> {n === 1 ? 'med' : 'meds'}</span>
                  </span>
                )}
                {d.written && <span className="cal__rx">Rx</span>}
                {d.tier && (
                  <span className="cal__tier">
                    <Icon name={d.tier} size={12} />
                    <span className="cal__tierword">{tierLabel[d.tier]}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <ul className="tl__legend">
          <li>
            <span className="cal__rx">Rx</span> A prescription was written
          </li>
          <li>
            <i className="tl__swatch tl__swatch--placed" /> Order placed
          </li>
        </ul>
      </div>

      <div className="cal__detail" aria-live="polite">
        <h3 className="cal__date">
          {longDate(selected)}
          {selected === placed && <span className="chip chip--source">Order placed</span>}
        </h3>
        {now.active.length === 0 ? (
          <p className="hint">No medicine from these prescriptions is taken on this day.</p>
        ) : (
          <>
            {doctors.map((doc) => (
              <div key={doc} className="cal__doctor">
                <p className="cal__doctorname">{doctorName(doc)}</p>
                <ul className="cal__lines">
                  {now.active
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
            <p className="cal__sub">Alerts holding on this day</p>
            {shownAlerts.length === 0 ? (
              <p className="hint">None from the checks run. This is not a statement that the day is safe.</p>
            ) : (
              <ul className="cal__alerts">
                {shownAlerts.map((a) => (
                  <li key={a.type + a.ingredients.join()} data-tier={a.tier}>
                    <TierBadge tier={a.tier} />
                    <span>
                      <strong>{alertTypeLabel(a.type)}.</strong> {a.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {onOpenXray && now.w && (
              <button type="button" className="btn btn--secondary" onClick={onOpenXray}>
                See daily totals for this day
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
