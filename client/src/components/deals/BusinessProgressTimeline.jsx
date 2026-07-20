import { getDealPayment, isDealContactUnlocked } from '../../utils/dealHelpers.js'

const STEPS = [
  { id: 'accepted', label: 'Quotation Accepted' },
  { id: 'buyer', label: 'Buyer Payment' },
  { id: 'seller', label: 'Seller Payment' },
  { id: 'unlock', label: 'Contact Unlocked' },
  { id: 'offline', label: 'Business Continues Offline' },
]

function getStepState(deal, stepId) {
  const buyerPaid = getDealPayment(deal, 'BUYER')?.paymentStatus === 'SUCCESS'
  const sellerPaid = getDealPayment(deal, 'SELLER')?.paymentStatus === 'SUCCESS'
  const unlocked = isDealContactUnlocked(deal)

  switch (stepId) {
    case 'accepted':
      return 'complete'
    case 'buyer':
      return buyerPaid ? 'complete' : 'current'
    case 'seller':
      if (!buyerPaid) return 'upcoming'
      return sellerPaid ? 'complete' : 'current'
    case 'unlock':
      if (!buyerPaid || !sellerPaid) return 'upcoming'
      return unlocked ? 'complete' : 'current'
    case 'offline':
      return unlocked ? 'complete' : 'upcoming'
    default:
      return 'upcoming'
  }
}

export function BusinessProgressTimeline({ deal, className = '' }) {
  return (
    <ol className={`businessProgress ${className}`.trim()} aria-label="Business progress">
      {STEPS.map((step, index) => {
        const state = getStepState(deal, step.id)
        return (
          <li
            key={step.id}
            className={`businessProgress__step businessProgress__step--${state}`}
          >
            <span className="businessProgress__marker" aria-hidden />
            {index < STEPS.length - 1 ? <span className="businessProgress__line" aria-hidden /> : null}
            <span className="businessProgress__label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
