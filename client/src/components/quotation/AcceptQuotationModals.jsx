import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function AcceptConfirmModal({ open, request, busy, onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="modalOverlay" onClick={onCancel} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accept-quote-title"
      >
        <h3 id="accept-quote-title" className="modal__title">Accept Quotation?</h3>
        <p style={{ margin: '0 0 1rem', color: '#374151', lineHeight: 1.6 }}>
          You are accepting the seller quotation for <strong>{request?.productTitle || 'this product'}</strong>.
          An order will be created and you will proceed to pay the platform deal charge.
        </p>
        <div className="modal__footer">
          <button type="button" className="btnOutline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btnPrimary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Accepting…' : 'Accept Quotation'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OrderCreatedModal({ open, order, deal, onGoToOrders }) {
  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => {
      onGoToOrders?.()
    }, 4000)
    return () => clearTimeout(timer)
  }, [open, onGoToOrders])

  if (!open) return null

  return (
    <div className="modalOverlay" role="presentation">
      <div className="modal orderSuccessModal" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
        <div className="orderSuccessModal__icon" aria-hidden>✓</div>
        <h3 id="order-success-title" className="modal__title">Order Created Successfully</h3>
        <p className="orderSuccessModal__desc">
          Your quotation has been accepted. Order{' '}
          <code>{order?.orderNumber || deal?.dealNumber || '—'}</code>{' '}
          is ready. Proceed to My Orders to pay the platform deal charge.
        </p>
        <div className="modal__footer orderSuccessModal__footer">
          <Link
            to="/buyer/deals"
            className="btnPrimary"
            onClick={onGoToOrders}
          >
            Go To My Orders
          </Link>
        </div>
        <p className="orderSuccessModal__hint">Redirecting automatically…</p>
      </div>
    </div>
  )
}
