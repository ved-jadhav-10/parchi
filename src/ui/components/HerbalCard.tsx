import type { HerbalReport } from '../../engine/herbal'
import { doctorName, shortDate } from '../history/labels'
import { Card } from './Card'
import { TierBadge } from './Icons'

const EVIDENCE = { established: 'Established evidence', limited: 'Limited evidence' } as const

/**
 * Ayurvedic and herbal items: what was recognised, what each might do alongside the ordinary medicines taken at the same
 * time, and what could not be checked. Starting rule set, every rule marked until a pharmacist signs it off. These notes
 * inform the review; they do not change the order's suggested status.
 */
export const HerbalCard = ({ report }: { report: HerbalReport | undefined }) => {
  if (!report) return null
  return (
    <Card title="Herbal and Ayurvedic items" icon="flask" description="Checked on their own and against the other medicines taken on the same days. A starting rule set, not a full reference.">
      {report.items.length > 0 && (
        <ul className="herbal__items">
          {report.items.map((i) => (
            <li key={`${i.rx_id ?? ''}-${i.line}`}>
              <strong>{i.raw}</strong>{' '}
              <span className="herbal__meta">
                {i.names.join(', ') || 'not named'}
                {i.doctor ? `, ${doctorName(i.doctor)}` : ''}
                {i.start ? `, from ${shortDate(i.start)}` : ''}
                {i.window_assumed ? ' (no duration written: default window, unverified)' : ''}
              </span>
              {i.note && <span className="hint herbal__note">{i.note}</span>}
            </li>
          ))}
        </ul>
      )}

      {report.findings.length === 0 ? (
        <p className="hint">No herbal rule applies to the medicines on this prescription. This is not a statement that they are safe together.</p>
      ) : (
        <ul className="herbal__findings">
          {report.findings.map((f) => (
            <li key={`${f.rule}-${f.items.join()}`} className="herbal__finding" data-tier={f.tier}>
              <div className="alert__head">
                <TierBadge tier={f.tier} />
                <span className="chip chip--source">{EVIDENCE[f.evidence]}</span>
                {!f.pharmacist_approved && (
                  <span className="chip chip--review" title="This rule has not been signed off by a pharmacist.">
                    Draft rule
                  </span>
                )}
              </div>
              <p className="alert__reason">{f.effect}</p>
              {f.partners.length > 0 && (
                <p className="alert__moved">
                  With {f.partners.map((p) => p.brand).join(', ')} ({f.items.join(', ')}).
                </p>
              )}
              {f.caveat && <p className="alert__moved">{f.caveat}</p>}
              <div className="chips">
                {f.sources.map((s) => (
                  <span key={s.label} className="chip chip--source">
                    {s.label}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {report.unrecognised.length > 0 && (
        <div className="herbal__unrecognised">
          <h3 className="order__sub">Not checked</h3>
          <ul className="changes">
            {report.unrecognised.map((u) => (
              <li key={`${u.rx_id ?? ''}-${u.line}`}>
                <strong>{u.raw}</strong>
                <span>{u.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="hint">{report.note}</p>
    </Card>
  )
}
