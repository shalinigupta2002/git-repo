import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { SubscribeFeatureAlert } from '../components/common/SubscribeFeatureAlert.jsx'
import { useAppSelector } from '../hooks/redux.js'
import { selectHasSellerSubscription } from '../store/slices/subscriptionSlice.js'
import { isSellerFreePath, SELLER_SUBSCRIBE_MESSAGE } from '../utils/sellerSubscription.js'

const STEPS = [
  { id: 'add', label: 'Add product', to: '/seller/add-product' },
  { id: 'listed', label: 'Listed', to: '/seller/product-listed' },
  { id: 'buyers', label: 'Buyers history', to: '/seller/manage-buyer' },
  { id: 'quotations', label: 'Quotations', to: '/seller/quotations' },
]

export function SellerWorkflowChrome({
  title,
  subtitle,
  activeStepId,
  children,
  prevTo,
  prevLabel = 'Back',
  nextTo,
  nextLabel = 'Continue',
  fullWidth = false,
  showStepper = true,
}) {
  const navigate = useNavigate()
  const hasSellerSub = useAppSelector(selectHasSellerSubscription)
  const [subscribeAlertOpen, setSubscribeAlertOpen] = useState(false)
  const steps = STEPS
  const activeIndex = steps.findIndex((s) => s.id === activeStepId)

  function renderStep(step, i) {
    const done = activeIndex > i
    const active = step.id === activeStepId
    const locked = !hasSellerSub && !isSellerFreePath(step.to)
    const className = active
      ? 'swStep swStep--active'
      : done
        ? 'swStep swStep--done'
        : locked
          ? 'swStep swStep--locked'
          : 'swStep'

    if (locked) {
      return (
        <button
          type="button"
          className={className}
          onClick={() => setSubscribeAlertOpen(true)}
          aria-label={`${step.label} — subscription required`}
        >
          <span className="swStep__num">{String(i + 1)}</span>
          <span className="swStep__label">{step.label}</span>
        </button>
      )
    }

    return (
      <Link to={step.to} className={className}>
        <span className="swStep__num">{done ? '✓' : String(i + 1)}</span>
        <span className="swStep__label">{step.label}</span>
      </Link>
    )
  }

  return (
    <div className={fullWidth ? 'swChrome swChrome--full' : 'swChrome'}>
      <div className="swChrome__head">
        <div>
          <h1 className="swChrome__title">{title}</h1>
          {subtitle ? <p className="swChrome__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      {showStepper ? (
        <nav className="swStepper" aria-label="Seller workflow steps">
          <ol className="swStepper__list">
            {steps.map((step, i) => (
              <li key={step.id} className="swStepper__item">
                {renderStep(step, i)}
                {i < steps.length - 1 ? (
                  <span className="swStepper__sep" aria-hidden />
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="swChrome__body">{children}</div>

      <div className="swChrome__footer">
        {prevTo ? (
          <Link className="btn btn--ghost" to={prevTo}>
            {prevLabel}
          </Link>
        ) : (
          <span />
        )}
        {nextTo ? (
          <Link className="btn btn--primary" to={nextTo}>
            {nextLabel}
          </Link>
        ) : (
          <span />
        )}
      </div>

      <SubscribeFeatureAlert
        open={subscribeAlertOpen}
        title="Subscribe to unlock seller features"
        message={SELLER_SUBSCRIBE_MESSAGE}
        onClose={() => setSubscribeAlertOpen(false)}
        onSubscribe={() => {
          setSubscribeAlertOpen(false)
          navigate('/pricing')
        }}
      />
    </div>
  )
}
