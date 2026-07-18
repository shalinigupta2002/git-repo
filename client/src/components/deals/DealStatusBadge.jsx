import { DEAL_STATUS_BADGE, DEAL_STATUS_LABELS } from '../../utils/dealHelpers.js'

export function DealStatusBadge({ status, className = '' }) {
  const label = DEAL_STATUS_LABELS[status] || status || 'Unknown'
  const tone = DEAL_STATUS_BADGE[status] || 'b2bBadge--grey'

  return (
    <span className={`b2bBadge ${tone} ${className}`.trim()}>
      {label}
    </span>
  )
}
