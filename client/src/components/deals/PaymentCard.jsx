import { useState } from 'react'
import { PaymentStatusBadge } from './PaymentStatusBadge.jsx'
import {
  formatDealAmount,
  formatDealDate,
  isWaitingForCounterpartyPayment,
} from '../../utils/dealHelpers.js'

function ConfirmDialog({ open, title, message, confirmLabel, loading, onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="modalOverlay" onClick={onCancel} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-pay-dialog-title"
      >
        <h3 id="deal-pay-dialog-title" className="modal__title">{title}</h3>
        <p style={{ margin: '0 0 1rem', color: '#374151', lineHeight: 1.5 }}>{message}</p>
        <div className="modal__footer">
          <button type="button" className="btnOutline" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btnPrimary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PaymentCard({
  deal,
  viewerRole,
  payment,
  chargeAmount,
  onPay,
  paying = false,
  paymentSuccess = false,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canPay = Boolean(
    payment
    && payment.paymentStatus === 'PENDING'
    && deal?.status !== 'CANCELLED'
    && deal?.status !== 'COMPLETED',
  )
  const waiting = isWaitingForCounterpartyPayment(deal, viewerRole)
  const currency = payment?.currency || deal?.currency || 'INR'

  async function handleConfirmPay() {
    try {
      await onPay?.()
      setConfirmOpen(false)
    } catch {
      setConfirmOpen(false)
    }
  }

  return (
    <section className="paymentCard panel panel--nested">
      <div className="panelHeader">
        <div>
          <h3 className="panelTitle">Deal charge payment</h3>
          <p className="panelSub">Dummy payment gateway — no real money is charged.</p>
        </div>
        <PaymentStatusBadge status={payment?.paymentStatus || 'PENDING'} />
      </div>

      <div className="paymentCard__grid">
        <div>
          <div className="paymentCard__label">Charge</div>
          <div className="paymentCard__value">{formatDealAmount(chargeAmount, currency)}</div>
        </div>
        <div>
          <div className="paymentCard__label">Currency</div>
          <div className="paymentCard__value">{currency}</div>
        </div>
        <div>
          <div className="paymentCard__label">Reference</div>
          <div className="paymentCard__value"><code>{payment?.paymentReference || '—'}</code></div>
        </div>
        <div>
          <div className="paymentCard__label">Paid at</div>
          <div className="paymentCard__value">{formatDealDate(payment?.paidAt)}</div>
        </div>
      </div>

      {paymentSuccess || payment?.paymentStatus === 'SUCCESS' ? (
        <div className="stateBox stateBox--success" role="status">
          <div className="stateBox__title">Payment successful</div>
          <p className="stateBox__desc">
            {waiting
              ? 'Waiting for the counterparty to pay their deal charge before contacts unlock.'
              : deal?.contactUnlockStatus === 'UNLOCKED'
                ? 'Both parties have paid. Contact details are now unlocked.'
                : 'Your deal charge has been recorded.'}
          </p>
        </div>
      ) : null}

      {canPay ? (
        <div className="paymentCard__actions">
          <button
            type="button"
            className="btnPrimary"
            onClick={() => setConfirmOpen(true)}
            disabled={paying}
          >
            Pay deal charge
          </button>
        </div>
      ) : null}

      {waiting ? (
        <p className="paymentCard__hint" role="status">
          Your payment is complete. Waiting for the counterparty payment.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm deal charge payment"
        message={`Pay ${formatDealAmount(chargeAmount, currency)} using the dummy payment gateway?`}
        confirmLabel="Confirm payment"
        loading={paying}
        onConfirm={handleConfirmPay}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}
