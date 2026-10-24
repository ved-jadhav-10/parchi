import { STATUS_LABEL, STATUS_TIER } from '../history/labels'
import type { OrderStatus } from '../history/types'
import { Icon } from './Icons'

/** The suggested status as icon + words + colour, borrowed from the tiers. "Clear" is neutral: it never means safe. */
export const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className="tier-badge" data-tier={STATUS_TIER[status]}>
    <Icon name={STATUS_TIER[status]} size={14} />
    {STATUS_LABEL[status]}
  </span>
)
