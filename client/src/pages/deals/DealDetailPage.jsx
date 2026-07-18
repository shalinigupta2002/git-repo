import { Link, useParams } from 'react-router-dom'
import { ContactCard } from '../../components/deals/ContactCard.jsx'
import { DealDetailSkeleton } from '../../components/deals/LoadingSkeleton.jsx'
import { DealSummary } from '../../components/deals/DealSummary.jsx'
import { DealTimeline } from '../../components/deals/DealTimeline.jsx'
import { PaymentCard } from '../../components/deals/PaymentCard.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { useDeal } from '../../hooks/useDeal.js'
import {
  formatDealAmount,
  getCounterparty,
  getDealPayment,
  getMyDealCharge,
} from '../../utils/dealHelpers.js'

function InfoSection({ title, children }) {
  return (
    <section className="panel panel--nested dealSection">
      <h3 className="panelTitle">{title}</h3>
      {children}
    </section>
  )
}

function ProductSnapshot({ product, quantity, unitPrice, currency }) {
  if (!product) return null

  return (
    <dl className="dealInfoGrid">
      <div><dt>Product</dt><dd>{product.productName || '—'}</dd></div>
      <div><dt>SKU</dt><dd>{product.productSku || '—'}</dd></div>
      <div><dt>Brand</dt><dd>{product.productBrand || '—'}</dd></div>
      <div><dt>Category</dt><dd>{product.productCategory || '—'}</dd></div>
      <div><dt>UOM</dt><dd>{product.productUom || '—'}</dd></div>
      <div><dt>MOQ</dt><dd>{product.productMoq ?? '—'}</dd></div>
      <div><dt>Vendor code</dt><dd>{product.vendorProductCode || '—'}</dd></div>
      <div><dt>Quantity</dt><dd>{quantity ?? '—'}</dd></div>
      <div><dt>Unit price</dt><dd>{formatDealAmount(unitPrice, currency)}</dd></div>
    </dl>
  )
}

export function DealDetailPage({
  role,
  listPath,
  counterpartyTitle,
  showPayment = false,
  showAdminExtras = false,
}) {
  const { dealId } = useParams()
  const {
    deal,
    loading,
    paying,
    error,
    paymentSuccess,
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
          title="Deal not found"
          message={error || 'This deal could not be loaded.'}
          onRetry={load}
        />
        <p style={{ marginTop: '1rem' }}>
          <Link to={listPath}>← Back to deals</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="panel dealPage">
      <div className="panelHeader">
        <div>
          <p className="panelSub"><Link to={listPath}>← Back to deals</Link></p>
          <h2 className="panelTitle">Deal {deal.dealNumber}</h2>
          <p className="panelSub">{deal.product?.productName}</p>
        </div>
        <button type="button" className="btnOutline" onClick={load}>
          Refresh
        </button>
      </div>

      <DealSummary deal={deal} viewerRole={role} />

      <div className="dealDetailGrid">
        <InfoSection title="RFQ information">
          <dl className="dealInfoGrid">
            <div><dt>RFQ number</dt><dd>{deal.quoteRequest?.rfqNumber || '—'}</dd></div>
            <div><dt>RFQ status</dt><dd>{deal.quoteRequest?.status || '—'}</dd></div>
            <div><dt>RFQ group</dt><dd>{deal.rfqGroupId || '—'}</dd></div>
          </dl>
        </InfoSection>

        <InfoSection title="Quotation information">
          <dl className="dealInfoGrid">
            <div><dt>Deal amount</dt><dd>{formatDealAmount(deal.totalAmount, deal.currency)}</dd></div>
            <div><dt>Buyer charge</dt><dd>{formatDealAmount(deal.buyerDealCharge, deal.currency)}</dd></div>
            <div><dt>Seller charge</dt><dd>{formatDealAmount(deal.sellerDealCharge, deal.currency)}</dd></div>
          </dl>
        </InfoSection>
      </div>

      <InfoSection title="Product snapshot">
        <ProductSnapshot
          product={deal.product}
          quantity={deal.quantity}
          unitPrice={deal.unitPrice}
          currency={deal.currency}
        />
      </InfoSection>

      {showPayment ? (
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

      <ContactCard
        deal={deal}
        counterparty={counterparty}
        title={counterpartyTitle}
      />

      {showAdminExtras ? (
        <ContactCard
          deal={deal}
          counterparty={deal.seller}
          title="Seller contact"
        />
      ) : null}

      {showAdminExtras ? (
        <>
          <InfoSection title="Charge configuration used">
            <div className="dealDetailGrid">
              <div>
                <h4 className="dealSection__subtitle">Buyer config</h4>
                <dl className="dealInfoGrid">
                  <div><dt>Plan</dt><dd>{deal.buyerChargeConfig?.displayName || deal.buyerChargeConfig?.planKey || '—'}</dd></div>
                  <div><dt>Type</dt><dd>{deal.buyerChargeConfig?.chargeType || '—'}</dd></div>
                  <div><dt>Value</dt><dd>{deal.buyerChargeConfig?.value ?? '—'}</dd></div>
                </dl>
              </div>
              <div>
                <h4 className="dealSection__subtitle">Seller config</h4>
                <dl className="dealInfoGrid">
                  <div><dt>Plan</dt><dd>{deal.sellerChargeConfig?.displayName || deal.sellerChargeConfig?.planKey || '—'}</dd></div>
                  <div><dt>Type</dt><dd>{deal.sellerChargeConfig?.chargeType || '—'}</dd></div>
                  <div><dt>Value</dt><dd>{deal.sellerChargeConfig?.value ?? '—'}</dd></div>
                </dl>
              </div>
            </div>
          </InfoSection>

          <InfoSection title="Payments">
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {(deal.payments || []).map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payerRole}</td>
                      <td>{payment.paymentStatus}</td>
                      <td>{formatDealAmount(payment.amount, payment.currency)}</td>
                      <td><code>{payment.paymentReference}</code></td>
                      <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoSection>
        </>
      ) : null}

      <InfoSection title="Timeline">
        <DealTimeline events={deal.events} />
      </InfoSection>
    </section>
  )
}
