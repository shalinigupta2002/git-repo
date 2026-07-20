import { Link } from 'react-router-dom'
import { PayDealChargeButton } from './PayDealChargeButton.jsx'
import {
  canPayDealCharge,
  isDealContactUnlocked,
  isWaitingForCounterpartyPayment,
} from '../../utils/dealHelpers.js'

export function DealListAction({ deal, viewerRole = 'BUYER', detailPath }) {
  const unlocked = isDealContactUnlocked(deal)
  const canPay = canPayDealCharge(deal, viewerRole)
  const waiting = isWaitingForCounterpartyPayment(deal, viewerRole)

  if (canPay) {
    return <PayDealChargeButton to={detailPath} size="sm" />
  }

  if (waiting) {
    return (
      <span className="dealActionStatus dealActionStatus--waiting" role="status">
        Payment Completed · Waiting For Seller
      </span>
    )
  }

  return (
    <Link to={detailPath} className="btnOutline btnOutline--sm">
      View Order Details
    </Link>
  )
}
