import { useNavigate } from 'react-router-dom'

export function PaymentCancelledNotice({ onTryAgain, backTo, backLabel = 'Back' }) {
  const navigate = useNavigate()

  return (
    <div className="stateBox stateBox--info paymentCancelled" role="status" aria-live="polite">
      <div className="stateBox__icon" aria-hidden>ℹ️</div>
      <h3 className="stateBox__title">Payment Cancelled</h3>
      <p className="stateBox__desc">
        Your payment was cancelled.
        <br />
        No amount has been charged.
        <br />
        You may try again whenever you&apos;re ready.
      </p>
      <div className="stateBox__actions paymentCancelled__actions">
        {onTryAgain ? (
          <button type="button" className="btn btn--primary" onClick={onTryAgain}>
            Try Again
          </button>
        ) : null}
        {backTo ? (
          <button type="button" className="btnOutline" onClick={() => navigate(backTo)}>
            {backLabel}
          </button>
        ) : null}
        <button type="button" className="btnOutline" onClick={() => navigate(-1)}>
          Return to Previous Page
        </button>
      </div>
    </div>
  )
}
