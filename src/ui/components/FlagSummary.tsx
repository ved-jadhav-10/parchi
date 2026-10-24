import type { Flag, ResolvedBrand } from '../../engine/contracts'
import { brandLabel } from '../lib/resolved'
import { FlagBadge } from './BrandMatch'
import { Icon } from './Icons'

const SHOWN: Flag[] = ['banned_fdc', 'nsq', 'lasa', 'discontinued']

/**
 * Brand flags (banned combination, failed batch, look-alike name, discontinued) on the lines of an order, so they are seen without
 * opening each line under Brand matches. Renders nothing when no line carries one.
 */
export const FlagSummary = ({ lines }: { lines: { resolved: ResolvedBrand }[] }) => {
  const flagged = lines.map((l) => ({ name: brandLabel(l.resolved), flags: l.resolved.flags.filter((f) => SHOWN.includes(f)) })).filter((l) => l.flags.length > 0)
  if (flagged.length === 0) return null
  return (
    <div className="flagbar" role="note">
      <Icon name="shield" size={16} />
      <strong>Check before dispensing</strong>
      {flagged.map((l, i) => (
        <span key={`${l.name}-${i}`} className="flagbar__item">
          {l.name}
          {l.flags.map((f) => (
            <FlagBadge key={f} flag={f} />
          ))}
        </span>
      ))}
    </div>
  )
}
