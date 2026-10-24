import { useState } from 'react'
import type { Flag, ResolvedBrand, Sig } from '../../engine/contracts'
import { mg, pct, titleCase } from '../lib/format'

/** Below this the match is shown as "Check match" (needs pharmacist). Real value comes from Track A. */
export const REVIEW_BELOW = 0.9

const flagText: Record<Flag, { label: string; tier: 'interrupt' | 'inform' }> = {
  banned_fdc: { label: 'Banned FDC', tier: 'interrupt' },
  lasa: { label: 'Look-alike name', tier: 'inform' },
  discontinued: { label: 'Discontinued', tier: 'inform' },
}

export const FlagBadge = ({ flag }: { flag: Flag }) => (
  <span className="tier-badge" data-tier={flagText[flag].tier}>
    {flagText[flag].label}
  </span>
)

const sigText = (s: Sig) =>
  s.sos ? `As needed, up to ${s.max_doses_per_day}/day assumed` : `${s.doses_per_day}/day${s.duration_days ? ` for ${s.duration_days} days` : ''}`

/** One resolved line. Click to expand its ingredients and parsed sig. */
export const BrandMatch = ({ resolved, sig }: { resolved: ResolvedBrand; sig: Sig }) => {
  const [open, setOpen] = useState(false)
  const unmatched = resolved.brand === null
  return (
    <li className="match" data-open={open}>
      <button className="match__row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="match__names">
          {resolved.raw} <span className="matches__arrow">→</span> <strong>{unmatched ? 'No match found' : resolved.brand}</strong>
        </span>
        <span className="num matches__conf">{pct(resolved.confidence)}</span>
        {(unmatched || resolved.confidence < REVIEW_BELOW) && <span className="chip chip--review">Check match</span>}
        {resolved.flags.map((f) => (
          <FlagBadge key={f} flag={f} />
        ))}
      </button>
      {open && (
        <dl className="match__detail">
          <dt>Contains</dt>
          <dd>
            {resolved.ingredients.length === 0
              ? 'Unknown'
              : resolved.ingredients.map((i) => `${titleCase(i.id)} ${mg(i.mg)} mg${i.per_volume_ml ? ` per ${i.per_volume_ml} mL` : ''}`).join(', ')}
          </dd>
          <dt>Form</dt>
          <dd>{titleCase(resolved.form)}</dd>
          <dt>Taken</dt>
          <dd>{sigText(sig)}</dd>
        </dl>
      )}
    </li>
  )
}
