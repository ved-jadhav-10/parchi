import { useState } from 'react'
import type { Flag, ResolvedBrand, Sig } from '../../engine/contracts'
import { pct, titleCase } from '../lib/format'
import { brandLabel, candidateLabel, countsTowardTotal, ingredientLabel, isoDate, needsReview, notesFor, nsqMonth, sentenceCase, tidy } from '../lib/resolved'

const flagText: Record<Flag, { label: string; tier: 'interrupt' | 'inform' }> = {
  banned_fdc: { label: 'Banned FDC', tier: 'interrupt' },
  lasa: { label: 'Look-alike name', tier: 'inform' },
  discontinued: { label: 'Discontinued', tier: 'inform' },
  // Batch-specific (CDSCO failed or spurious batches), so never Interrupt: the pharmacist checks the batch on the strip.
  nsq: { label: 'Check batch (NSQ)', tier: 'inform' },
}

export const FlagBadge = ({ flag }: { flag: Flag }) => (
  <span className="tier-badge" data-tier={flagText[flag].tier}>
    {flagText[flag].label}
  </span>
)

const sigText = (s: Sig) =>
  s.sos ? `As needed, up to ${s.max_doses_per_day}/day assumed` : `${s.doses_per_day}/day${s.duration_days ? ` for ${s.duration_days} days` : ''}`

/** Most rows of a long list that are shown; the rest are counted. */
const SHOW = 3

const More = ({ total }: { total: number }) => (total > SHOW ? <li className="match__more">and {total - SHOW} more</li> : null)

/** One resolved line. Click to expand what it matched, what it contains and everything Track A knows about it. */
export const BrandMatch = ({ resolved, sig, sigText: written }: { resolved: ResolvedBrand; sig: Sig | null; sigText: string }) => {
  const [open, setOpen] = useState(false)
  const r = resolved
  const generic = r.brand === null && r.match === 'generic'
  const unmatched = r.brand === null && !generic
  const nsq = r.nsq ?? []
  const banned = r.banned_fdc ?? []
  const jan = r.jan_aushadhi ?? []
  const candidates = (r.candidates ?? []).slice(0, SHOW)
  const notes = notesFor(r)
  return (
    <li className="match" data-open={open}>
      <button className="match__row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="match__names">
          {r.raw} <span className="matches__arrow">→</span> <strong>{brandLabel(r)}</strong>
          {generic && <span className="match__kind"> (generic name, no brand)</span>}
        </span>
        {!unmatched && <span className="num matches__conf">{pct(r.confidence)}</span>}
        {needsReview(r) && <span className="chip chip--review">Check match</span>}
        {r.match === 'fuzzy' && !needsReview(r) && <span className="chip">Corrected spelling</span>}
        {r.flags.map((f) => (
          <FlagBadge key={f} flag={f} />
        ))}
      </button>
      {open && (
        <dl className="match__detail">
          <dt>Contains</dt>
          <dd>{r.ingredients.length === 0 ? 'Unknown' : r.ingredients.map(ingredientLabel).join(', ')}</dd>
          {r.composition_complete === false && (
            <>
              <dt>Composition</dt>
              <dd>The source lists at most two ingredients and may hide more, so totals for this line may be low.</dd>
            </>
          )}
          <dt>Form</dt>
          <dd>{titleCase(r.form)}</dd>
          {!countsTowardTotal(r) && (
            <>
              <dt>Daily total</dt>
              <dd>Not counted: {r.route ? `${r.route} product` : 'not taken systemically'}.</dd>
            </>
          )}
          <dt>Taken</dt>
          <dd>{sig ? sigText(sig) : written ? `As written: ${written}` : 'No dosing written'}</dd>

          {notes.length > 0 && (
            <>
              <dt>For the pharmacist</dt>
              <dd>
                <ul className="match__list">
                  {notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          {candidates.length > 0 && (
            <>
              <dt>Could also be</dt>
              <dd>
                <ul className="match__list">
                  {candidates.map((c) => (
                    <li key={c.brand}>{candidateLabel(c)}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          {banned.length > 0 && (
            <>
              <dt>Banned combination</dt>
              <dd>
                <ul className="match__list">
                  {banned.map((b) => (
                    <li key={b.so}>
                      <span className="chip chip--source">{b.so}</span> {isoDate(b.date)}, {b.list}. {b.text}
                      {!b.certain && ' The listed composition may be incomplete, so this match is uncertain.'}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          {nsq.length > 0 && (
            <>
              <dt>Failed batches</dt>
              <dd>
                <p className="match__lead">CDSCO lists these for this brand name. Check the batch number on the strip.</p>
                <ul className="match__list">
                  {nsq.slice(0, SHOW).map((n) => (
                    <li key={`${n.batch}-${n.month}`}>
                      <span className="chip chip--source">{n.batch}</span> {nsqMonth(n.month)}: {tidy(sentenceCase(n.result))}. {tidy(n.manufacturer)}.
                      {n.spurious && ' Reported as spurious.'}
                    </li>
                  ))}
                  <More total={nsq.length} />
                </ul>
              </dd>
            </>
          )}
          {jan.length > 0 && (
            <>
              <dt>Jan Aushadhi generic</dt>
              <dd>
                <ul className="match__list">
                  {jan.slice(0, 2).map((j) => (
                    <li key={j.code}>
                      {j.name}, {j.unit}
                      {j.release && ` (${j.release}: confirm the release type matches)`}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      )}
    </li>
  )
}
