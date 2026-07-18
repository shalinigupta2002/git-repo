import { Link } from 'react-router-dom'
import { DealStatusBadge } from './DealStatusBadge.jsx'
import {
  formatDealAmount,
  formatDealDate,
  getCounterparty,
  getCounterpartyCity,
  getMyDealCharge,
} from '../../utils/dealHelpers.js'

export function DealCard({ deal, viewerRole = 'BUYER', detailPath }) {
  const counterparty = getCounterparty(deal, viewerRole)
  const charge = getMyDealCharge(deal, viewerRole)
  const city = getCounterpartyCity(counterparty)

  return (
    <article className="dealCard">
      <div className="dealCard__head">
        <div>
          <div className="dealCard__number"><code>{deal.dealNumber}</code></div>
          <div className="dealCard__product">{deal.product?.productName || 'Product'}</div>
        </div>
        <DealStatusBadge status={deal.status} />
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
          <dt>Platform Charge</dt>
          <dd>{formatDealAmount(charge, deal.currency)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDealDate(deal.createdAt)}</dd>
        </div>
      </dl>

      {detailPath ? (
        <div className="dealCard__actions">
          <Link to={detailPath} className="btnOutline btnOutline--sm">
            View
          </Link>
        </div>
      ) : null}
    </article>
  )
}
