import { useParams } from 'react-router-dom'
import { BackNavButton } from '../../components/common/BackNavButton.jsx'
import { BusinessProgressTimeline } from '../../components/deals/BusinessProgressTimeline.jsx'
import { ContactCard } from '../../components/deals/ContactCard.jsx'
import { DealDetailSkeleton } from '../../components/deals/LoadingSkeleton.jsx'
import { DealTimeline } from '../../components/deals/DealTimeline.jsx'
import { PaymentCard } from '../../components/deals/PaymentCard.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { PaymentCancelledNotice } from '../../components/common/PaymentCancelledNotice.jsx'
import { useDeal } from '../../hooks/useDeal.js'
import {
  formatDealAmount,
  formatDealDate,
  getCounterparty,
  getDealPayment,
  getMyDealCharge,
  isDealContactUnlocked,
  isWaitingForCounterpartyPayment,
  UNLOCKED_INFO_NOTICE,
} from '../../utils/dealHelpers.js'

function InfoSection({ title, children, className = '' }) {
  return (
    <section className={`panel panel--nested dealSection ${className}`.trim()}>
      <h3 className="panelTitle">{title}</h3>
      {children}
    </section>
  )
}

function PaymentHistory({ deal }) {
  const buyerPayment = getDealPayment(deal, 'BUYER')
  const sellerPayment = getDealPayment(deal, 'SELLER')

  return (
    <div className="paymentHistory">
      {[buyerPayment, sellerPayment].filter(Boolean).map((payment) => (
        <div key={payment.id} className="paymentHistory__row">
          <div>
            <strong>{payment.payerRole === 'BUYER' ? 'Buyer Payment' : 'Seller Payment'}</strong>
            <p className="panelSub"><code>{payment.paymentReference}</code></p>
          </div>
          <div className="paymentHistory__meta">
            <span className={`b2bBadge ${payment.paymentStatus === 'SUCCESS' ? 'b2bBadge--green' : 'b2bBadge--amber'}`}>
              {payment.paymentStatus === 'SUCCESS' ? 'Payment Completed' : 'Deal Charge Pending'}
            </span>
            <span>{formatDealDate(payment.paidAt || payment.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DealDetailPage({
  role,
  listPath,
  counterpartyTitle,
  showPayment = false,
}) {
  const { dealId } = useParams()
  const {
    deal,
    loading,
    paying,
    error,
    paymentSuccess,
    paymentCancelled,
    load,
    pay,
  } = useDeal(dealId, role)

  const counterparty = getCounterparty(deal, role)
  const myPayment = deal ? getDealPayment(deal, role) : null
  const chargeAmount = deal ? getMyDealCharge(deal, role) : null

  if (loading) {
    return (
      <section className="panel dealPage">
        <DealDetailSkeleton />
      </section>
    )
  }

  if (error || !deal) {
    return (
      <section className="panel dealPage">
        <ErrorState
          title="Order not found"
          message={error || 'This order could not be loaded.'}
          onRetry={load}
        />
        <p style={{ marginTop: '1rem' }}>
          <BackNavButton fallback={listPath} label="← Back" />
        </p>
      </section>
    )
  }

  const unlocked = isDealContactUnlocked(deal)
  const waiting = isWaitingForCounterpartyPayment(deal, role)
  const buyerPaid = getDealPayment(deal, 'BUYER')?.paymentStatus === 'SUCCESS'
  const sellerPaid = getDealPayment(deal, 'SELLER')?.paymentStatus === 'SUCCESS'

  return (
    <section className="panel dealPage">
      <div className="panelHeader">
        <div>
          <BackNavButton fallback={listPath} label="← Back" className="backNavBtn backNavBtn--inline" />
          <h2 className="panelTitle">Order {deal.dealNumber}</h2>
          <p className="panelSub">{deal.product?.productName}</p>
        </div>
        <button type="button" className="btnOutline" onClick={load}>
          Refresh
        </button>
      </div>

      <InfoSection title="Business Progress" className="dealSection--progress">
        <BusinessProgressTimeline deal={deal} />
      </InfoSection>

      <InfoSection title="Product Summary">
        <div className="dealProductSummary">
          <div className="dealProductSummary__image" aria-hidden>
            {(deal.product?.productName || 'P').slice(0, 1)}
          </div>
          <dl className="dealInfoGrid dealProductSummary__grid">
            <div><dt>Product Name</dt><dd>{deal.product?.productName || '—'}</dd></div>
            <div><dt>Order ID</dt><dd><code>{deal.dealNumber}</code></dd></div>
            <div><dt>RFQ ID</dt><dd>{deal.quoteRequest?.rfqNumber || '—'}</dd></div>
            <div><dt>Quantity</dt><dd>{deal.quantity ?? '—'}</dd></div>
            <div><dt>Quoted Unit Price</dt><dd>{formatDealAmount(deal.unitPrice, deal.currency)}</dd></div>
            <div><dt>Delivery Requirement</dt><dd>{deal.quoteRequest?.message || '—'}</dd></div>
            <div><dt>Expected Delivery</dt><dd>{deal.expectedDelivery ? formatDealDate(deal.expectedDelivery) : (deal.quoteRequest?.freightNote || 'Direct Supplier Delivery')}</dd></div>
          </dl>
        </div>
      </InfoSection>

      <InfoSection title="Quotation Summary">
        <dl className="dealInfoGrid">
          <div><dt>Seller ID</dt><dd>{counterparty?.portalUserId || '—'}</dd></div>
          <div><dt>Accepted Quote</dt><dd>{formatDealAmount(deal.unitPrice, deal.currency)}</dd></div>
          <div><dt>Line Total</dt><dd>{formatDealAmount(deal.totalAmount, deal.currency)}</dd></div>
          <div><dt>Delivery Timeline</dt><dd>{deal.quoteRequest?.freightNote || '—'}</dd></div>
          <div><dt>Platform Deal Charge</dt><dd>{formatDealAmount(chargeAmount, deal.currency)}</dd></div>
        </dl>
      </InfoSection>

      <InfoSection title="Payment Status">
        <div className="dealPaymentStatusGrid">
          <div className={`dealPaymentStatusCard${buyerPaid ? ' dealPaymentStatusCard--paid' : ''}`}>
            <span>Buyer Payment</span>
            <strong>{buyerPaid ? 'Payment Completed' : 'Deal Charge Pending'}</strong>
          </div>
          <div className={`dealPaymentStatusCard${sellerPaid ? ' dealPaymentStatusCard--paid' : ''}`}>
            <span>Seller Payment</span>
            <strong>{sellerPaid ? 'Payment Completed' : 'Deal Charge Pending'}</strong>
          </div>
        </div>
        <DealTimeline events={deal.events} />
        <PaymentHistory deal={deal} />
      </InfoSection>

      <InfoSection title="Action Panel">
        {paymentCancelled ? (
          <PaymentCancelledNotice
            onTryAgain={pay}
            backTo={listPath}
            backLabel="Back"
          />
        ) : null}

        {showPayment && myPayment?.paymentStatus === 'PENDING' && !paymentCancelled ? (
          <PaymentCard
            deal={deal}
            viewerRole={role}
            payment={myPayment}
            chargeAmount={chargeAmount}
            onPay={pay}
            paying={paying}
            paymentSuccess={paymentSuccess}
          />
        ) : null}

        {(paymentSuccess || myPayment?.paymentStatus === 'SUCCESS') && waiting ? (
          <div className="stateBox stateBox--success" role="status">
            <div className="stateBox__title">Payment Received Successfully</div>
            <p className="stateBox__desc">Waiting for seller payment before contact details unlock.</p>
          </div>
        ) : null}

        {unlocked ? (
          <div className="offlineNoticeCard">
            <svg className="offlineNoticeCard__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="offlineNoticeCard__title">{UNLOCKED_INFO_NOTICE.TITLE}</h4>
              <p className="offlineNoticeCard__desc">Business Continues Offline</p>
            </div>
          </div>
        ) : null}

        <ContactCard
          deal={deal}
          counterparty={counterparty}
          title={counterpartyTitle}
        />
      </InfoSection>
    </section>
  )
}
