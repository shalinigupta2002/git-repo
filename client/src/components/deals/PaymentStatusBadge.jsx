import { PAYMENT_STATUS_BADGE } from '../../utils/dealHelpers.js'

const PAYMENT_STATUS_LABELS = Object.freeze({
  PENDING: 'Pending',
  SUCCESS: 'Paid',
  FAILED: 'Failed',
})

export function PaymentStatusBadge({ status, className = '' }) {
  const label = PAYMENT_STATUS_LABELS[status] || status || 'Unknown'
  const tone = PAYMENT_STATUS_BADGE[status] || 'b2bBadge--grey'

  return (
    <span className={`b2bBadge ${tone} ${className}`.trim()}>
      {label}
    </span>
  )
}
