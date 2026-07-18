import { DealStatusBadge } from './DealStatusBadge.jsx'
import { PaymentStatusBadge } from './PaymentStatusBadge.jsx'
import {
  formatDealAmount,
  formatDealDate,
  getDealPayment,
  isDealContactUnlocked,
} from '../../utils/dealHelpers.js'

export function DealSummary({ deal, viewerRole = 'BUYER' }) {
  if (!deal) return null

  const buyerPayment = getDealPayment(deal, 'BUYER')
  const sellerPayment = getDealPayment(deal, 'SELLER')

  return (
    <div className="dealSummary">
      <div className="dealSummary__grid">
        <div>
          <div className="dealSummary__label">Deal number</div>
          <div className="dealSummary__value"><code>{deal.dealNumber}</code></div>
        </div>
        <div>
          <div className="dealSummary__label">Status</div>
          <div className="dealSummary__value"><DealStatusBadge status={deal.status} /></div>
        </div>
        <div>
          <div className="dealSummary__label">Deal amount</div>
          <div className="dealSummary__value">{formatDealAmount(deal.totalAmount, deal.currency)}</div>
        </div>
        <div>
          <div className="dealSummary__label">Buyer charge</div>
          <div className="dealSummary__value">{formatDealAmount(deal.buyerDealCharge, deal.currency)}</div>
        </div>
        <div>
          <div className="dealSummary__label">Seller charge</div>
          <div className="dealSummary__value">{formatDealAmount(deal.sellerDealCharge, deal.currency)}</div>
        </div>
        <div>
          <div className="dealSummary__label">Contact unlock</div>
          <div className="dealSummary__value">
            {isDealContactUnlocked(deal) ? (
              <span className="b2bBadge b2bBadge--green">Unlocked</span>
            ) : (
              <span className="b2bBadge b2bBadge--amber">Locked</span>
            )}
          </div>
        </div>
        <div>
          <div className="dealSummary__label">Buyer payment</div>
          <div className="dealSummary__value">
            <PaymentStatusBadge status={buyerPayment?.paymentStatus || 'PENDING'} />
          </div>
        </div>
        <div>
          <div className="dealSummary__label">Seller payment</div>
          <div className="dealSummary__value">
            <PaymentStatusBadge status={sellerPayment?.paymentStatus || 'PENDING'} />
          </div>
        </div>
        <div>
          <div className="dealSummary__label">Created</div>
          <div className="dealSummary__value">{formatDealDate(deal.createdAt)}</div>
        </div>
        {viewerRole !== 'ADMIN' ? null : (
          <>
            <div>
              <div className="dealSummary__label">Buyer</div>
              <div className="dealSummary__value">{deal.buyer?.portalUserId || deal.buyerId}</div>
            </div>
            <div>
              <div className="dealSummary__label">Seller</div>
              <div className="dealSummary__value">{deal.seller?.portalUserId || deal.sellerId}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
