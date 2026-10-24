import { STATUS_LABEL, STATUS_SHORT, STATUS_TIER } from '../history/labels'
import type { OrderStatus } from '../history/types'
import { Icon } from './Icons'

/**
 * The suggested status as icon + words + colour, borrowed from the tiers. "No alerts" is neutral: it never means safe.
 * `compact` shows the short form where the row is narrow and the full label where it fits; screen readers always get the full label.
 */
export const StatusBadge = ({ status, compact }: { status: OrderStatus; compact?: boolean }) => (
  <span className="tier-badge" data-tier={STATUS_TIER[status]} data-compact={compact || undefined}>
    <Icon name={STATUS_TIER[status]} size={14} />
    {compact ? (
      <>
        <span className="tier-badge__short" aria-hidden="true">
          {STATUS_SHORT[status]}
        </span>
        <span className="tier-badge__long">{STATUS_LABEL[status]}</span>
      </>
    ) : (
      STATUS_LABEL[status]
    )}
  </span>
)
