import { Link } from 'react-router-dom'
import { DealStatusBadge } from './DealStatusBadge.jsx'
import { PayDealChargeButton } from './PayDealChargeButton.jsx'
import {
  formatDealAmount,
  formatDealDate,
  getCounterparty,
  getCounterpartyCity,
  getMyDealCharge,
  isDealContactUnlocked,
  canPayDealCharge,
  isWaitingForCounterpartyPayment,
} from '../../utils/dealHelpers.js'

export function DealCard({ deal, viewerRole = 'BUYER', detailPath }) {
  const counterparty = getCounterparty(deal, viewerRole)
  const charge = getMyDealCharge(deal, viewerRole)
  const city = getCounterpartyCity(counterparty)
  const unlocked = isDealContactUnlocked(deal)
  const canPay = canPayDealCharge(deal, viewerRole)
  const waiting = isWaitingForCounterpartyPayment(deal, viewerRole)

  return (
    <article className="dealCard">
      <div className="dealCard__head">
        <div>
          <div className="dealCard__number"><code>{deal.dealNumber}</code></div>
          <div className="dealCard__product">{deal.product?.productName || 'Product'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <DealStatusBadge deal={deal} role={viewerRole} />
          {unlocked ? (
            <span className="b2bBadge b2bBadge--green" style={{ fontSize: 10 }}>Contact Unlocked</span>
          ) : waiting ? (
            <span className="b2bBadge b2bBadge--blue" style={{ fontSize: 10 }}>Waiting For Seller</span>
          ) : (
            <span className="b2bBadge b2bBadge--amber" style={{ fontSize: 10 }}>Deal Charge Pending</span>
          )}
        </div>
      </div>

      <dl className="dealCard__meta">
        <div>
          <dt>{viewerRole === 'BUYER' ? 'Seller ID' : 'Buyer ID'}</dt>
          <dd>{counterparty?.portalUserId || '—'}</dd>
        </div>
        <div>
          <dt>City</dt>
          <dd>{city || '—'}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatDealAmount(deal.totalAmount, deal.currency)}</dd>
        </div>
        <div>
          <dt>Platform Deal Charge</dt>
          <dd>{formatDealAmount(charge, deal.currency)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDealDate(deal.createdAt)}</dd>
        </div>
      </dl>

      {detailPath ? (
        <div className="dealCard__actions">
          {canPay ? (
            <PayDealChargeButton to={detailPath} />
          ) : waiting ? (
            <span className="dealActionStatus dealActionStatus--waiting">Payment Completed · Waiting For Seller</span>
          ) : (
            <Link to={detailPath} className="btnOutline btnOutline--sm">
              View Order Details
            </Link>
          )}
        </div>
      ) : null}
    </article>
  )
}
