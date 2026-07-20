import { DEAL_STATUS_BADGE, DEAL_STATUS_LABELS, getRoleVisibleStatus } from '../../utils/dealHelpers.js'

export function DealStatusBadge({ status, deal, role = 'BUYER', className = '' }) {
  const label = deal ? getRoleVisibleStatus(deal, role) : (DEAL_STATUS_LABELS[status] || status || 'Unknown')
  const statusKey = deal?.status || status
  const tone = label === 'Contact Unlocked' ? 'b2bBadge--green' : (DEAL_STATUS_BADGE[statusKey] || 'b2bBadge--grey')

  return (
    <span className={`b2bBadge ${tone} ${className}`.trim()}>
      {label}
    </span>
  )
}
