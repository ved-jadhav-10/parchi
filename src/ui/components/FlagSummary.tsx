import type { Flag, ResolvedBrand } from '../../engine/contracts'
import { brandLabel } from '../lib/resolved'
import { FlagBadge } from './BrandMatch'
import { Card } from './Card'

const SHOWN: Flag[] = ['banned_fdc', 'nsq', 'lasa', 'discontinued']

/**
 * Brand flags (banned combination, failed batch, look-alike name, discontinued) on the lines of an order, so they are seen without
 * opening each line under Brand matches. Renders nothing when no line carries one.
 */
export const FlagSummary = ({ lines }: { lines: { resolved: ResolvedBrand }[] }) => {
  const flagged = lines.map((l) => ({ name: brandLabel(l.resolved), flags: l.resolved.flags.filter((f) => SHOWN.includes(f)) })).filter((l) => l.flags.length > 0)
  if (flagged.length === 0) return null
  return (
    <Card title="Check before dispensing" icon="shield" description="Flags on the brands themselves, apart from the dose and interaction alerts. Open Brand matches for the detail.">
      <ul className="flags">
        {flagged.map((l, i) => (
          <li key={`${l.name}-${i}`}>
            <strong>{l.name}</strong>
            {l.flags.map((f) => (
              <FlagBadge key={f} flag={f} />
            ))}
          </li>
        ))}
      </ul>
    </Card>
  )
}
