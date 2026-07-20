import { Link } from 'react-router-dom'
import { Spinner } from '../ui/Spinner.jsx'

function PayIcon() {
  return (
    <svg className="payDealChargeBtn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

export function PayDealChargeButton({
  to,
  onClick,
  loading = false,
  disabled = false,
  size = 'md',
  children = 'Pay Deal Charge',
}) {
  const className = [
    'payDealChargeBtn',
    `payDealChargeBtn--${size}`,
    loading ? 'payDealChargeBtn--loading' : '',
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {loading ? <Spinner size="sm" /> : <PayIcon />}
      <span>{loading ? 'Processing…' : children}</span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className} aria-disabled={disabled || loading ? true : undefined}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {content}
    </button>
  )
}
