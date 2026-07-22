import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PaymentCancelledNotice } from '../../components/common/PaymentCancelledNotice.jsx'
import { useMarketingPricing } from '../../utils/marketingPricing.js'
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectUser } from '../../store/slices/authSlice.js'

export function SellerPricing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bothFlow = searchParams.get('flow') === 'both'
  const initialPlan = searchParams.get('plan') === 'lifetime' ? 'lifetime' : 'month'
  const [plan, setPlan] = useState(initialPlan)
  const { sellerMonth, sellerLifetime } = useMarketingPricing()
  const user = useAppSelector(selectUser)
  const { startCheckout, loading } = useRazorpayCheckout()
  const [paymentCancelled, setPaymentCancelled] = useState(false)

  const rzpPlan = plan === 'month' ? 'SELLER_MONTH' : 'SELLER_LIFETIME'
  const planSummary =
    plan === 'month'
      ? `${sellerMonth} for 1 month`
      : `${sellerLifetime} lifetime access`

  function onSuccess() {
    toast.success('Seller subscription activated!')
    if (bothFlow) {
      navigate('/buyer/dashboard', { replace: true })
    } else {
      navigate('/seller/dashboard', { replace: true })
    }
  }

  function handleSubscribe() {
    setPaymentCancelled(false)
    startCheckout({
      plan: rzpPlan,
      user,
      onSuccess,
      onCancelled: () => setPaymentCancelled(true),
      onError: (msg) => toast.error(msg),
    })
  }

  if (paymentCancelled) {
    return (
      <section className="panel">
        <PaymentCancelledNotice
          onTryAgain={handleSubscribe}
          backTo="/pricing"
          backLabel="Back"
        />
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Seller pricing</h2>
          <p className="panelSub">
            {bothFlow
              ? 'Step 2 of 2: choose a seller plan (1 month or lifetime), then complete payment.'
              : 'Pick a seller plan—monthly access or lifetime—then complete payment to unlock the seller dashboard.'}
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={() => navigate('/pricing')}>
          Back
        </button>
      </div>

      <div className="workflowBody">
        <p className="panelSub" style={{ margin: '0 auto 16px', maxWidth: 560, textAlign: 'center' }}>
          Select a plan:
        </p>
        <div className="subBenefitGrid sellerPricing__grid" style={{ maxWidth: 720, margin: '0 auto' }}>
          <button
            type="button"
            className={`subBenefitCard subBenefitCard--selectable ${plan === 'month' ? 'subBenefitCard--selected' : ''}`}
            onClick={() => setPlan('month')}
            aria-pressed={plan === 'month'}
          >
            <h3 className="subBenefitCard__title">1 month</h3>
            <p className="subBenefitCard__text">
              Full seller tools for 30 days: catalog, chat, and transactions. Renew or
              switch to lifetime later.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong>{sellerMonth}</strong>
              <span className="sellerPricing__period"> / month</span>
            </p>
          </button>
          <button
            type="button"
            className={`subBenefitCard subBenefitCard--selectable ${plan === 'lifetime' ? 'subBenefitCard--selected' : ''}`}
            onClick={() => setPlan('lifetime')}
            aria-pressed={plan === 'lifetime'}
          >
            <h3 className="subBenefitCard__title">Lifetime</h3>
            <p className="subBenefitCard__text">
              Pay once for ongoing seller access with the same features—no monthly renewal.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong>{sellerLifetime}</strong>
              <span className="sellerPricing__period"> one-time</span>
            </p>
          </button>
        </div>

        <div style={{ maxWidth: 480, margin: '22px auto 0', display: 'grid', gap: 10 }}>
          <p className="hint" style={{ textAlign: 'center', margin: 0 }}>
            Selected: <strong>{planSummary}</strong>
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? 'Opening payment…' : 'Pay & subscribe'}
          </button>
        </div>
      </div>
    </section>
  )
}
