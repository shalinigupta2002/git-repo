import { useState } from 'react'
import { PaymentStatusBadge } from './PaymentStatusBadge.jsx'
import { PayDealChargeButton } from './PayDealChargeButton.jsx'
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
          <button type="button" className="btnPrimary dealActionBtn dealActionBtn--pay" onClick={onConfirm} disabled={loading}>
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
          <h3 className="panelTitle">Platform Deal Charge</h3>
          <p className="panelSub">Secure test payment · Complete sandbox payment to unlock contact details.</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="b2bBadge b2bBadge--blue" style={{ fontSize: 11 }}>Test Mode</span>
          <PaymentStatusBadge status={payment?.paymentStatus || 'PENDING'} />
        </div>
      </div>

      <div className="paymentCard__grid">
        <div>
          <div className="paymentCard__label">Deal Charge</div>
          <div className="paymentCard__value">{formatDealAmount(chargeAmount, currency)}</div>
        </div>
        <div>
          <div className="paymentCard__label">Currency</div>
          <div className="paymentCard__value">{currency}</div>
        </div>
        <div>
          <div className="paymentCard__label">Payment Reference</div>
          <div className="paymentCard__value"><code>{payment?.paymentReference || '—'}</code></div>
        </div>
        <div>
          <div className="paymentCard__label">Paid At</div>
          <div className="paymentCard__value">{formatDealDate(payment?.paidAt)}</div>
        </div>
      </div>

      {paymentSuccess || payment?.paymentStatus === 'SUCCESS' ? (
        <div className="stateBox stateBox--success" role="status">
          <div className="stateBox__title">Payment Received Successfully</div>
          <p className="stateBox__desc">
            {waiting
              ? 'Waiting for seller payment before contact details unlock.'
              : deal?.contactUnlockStatus === 'UNLOCKED'
                ? 'Contact Details Unlocked. Business Continues Offline.'
                : 'Your deal charge has been recorded.'}
          </p>
        </div>
      ) : null}

      {canPay ? (
        <div className="paymentCard__actions">
          <PayDealChargeButton
            onClick={() => setConfirmOpen(true)}
            loading={paying}
            disabled={paying}
            size="lg"
          >
            Proceed To Pay Deal Charge
          </PayDealChargeButton>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Proceed To Pay Deal Charge"
        message={`Complete test payment of ${formatDealAmount(chargeAmount, currency)} for the platform deal charge?`}
        confirmLabel="Open Payment Window"
        loading={paying}
        onConfirm={handleConfirmPay}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}
