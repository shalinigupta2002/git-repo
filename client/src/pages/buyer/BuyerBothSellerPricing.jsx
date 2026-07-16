import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMarketingPricing } from '../../utils/marketingPricing.js'
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectUser } from '../../store/slices/authSlice.js'
import { selectHasBuyerSubscription } from '../../store/slices/subscriptionSlice.js'
import { hasActiveBuyerSubscription } from '../../utils/buyerSubscription.js'
import {
  bothFlowBuyerPath,
  dashboardAfterBothComplete,
} from '../../utils/bothSubscribeFlow.js'

/**
 * Step 2 of the "both" plan flow — lives under /buyer so BUYER accounts
 * are not blocked by the seller area role guard.
 */
export function BuyerBothSellerPricing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') === 'lifetime' ? 'lifetime' : 'month'
  const sellerPlan = searchParams.get('plan') === 'lifetime' ? 'lifetime' : 'month'
  const { sellerMonth, sellerLifetime } = useMarketingPricing()
  const user = useAppSelector(selectUser)
  const hasBuyerSub = useAppSelector(selectHasBuyerSubscription)
  const { startCheckout, loading } = useRazorpayCheckout()

  const onSubscribeCheckout = window.location.pathname.startsWith('/subscribe/')

  useEffect(() => {
    if (hasBuyerSub || hasActiveBuyerSubscription()) return
    toast.error('Complete the buyer payment first (step 1).')
    const buyerPlanParam = searchParams.get('buyerPlan')
    const buyerPlan =
      buyerPlanParam === 'lifetime' || buyerPlanParam === 'standard' ? buyerPlanParam : undefined
    const back = onSubscribeCheckout
      ? bothFlowBuyerPath({ sellerPlan, buyerPlan })
      : `/buyer/pricing?flow=both&sellerPlan=${sellerPlan}${buyerPlan ? `&buyerPlan=${buyerPlan}` : ''}`
    navigate(back, { replace: true })
  }, [hasBuyerSub, navigate, onSubscribeCheckout, sellerPlan, searchParams.get('buyerPlan')])

  const rzpPlan = plan === 'month' ? 'SELLER_MONTH' : 'SELLER_LIFETIME'
  const planSummary = useMemo(
    () =>
      plan === 'month'
        ? `${sellerMonth} for 1 month`
        : `${sellerLifetime} lifetime access`,
    [plan, sellerMonth, sellerLifetime],
  )

  function onSuccess() {
    toast.success('Full access activated — buyer and seller plans are active!')
    navigate(dashboardAfterBothComplete(user?.role), { replace: true })
  }

  function handleSubscribe() {
    startCheckout({
      plan: rzpPlan,
      user,
      onSuccess,
      onError: (msg) => toast.error(msg),
    })
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Seller plan — step 2 of 2</h2>
          <p className="panelSub">
            Your buyer fee is paid. Choose a seller plan and complete payment to unlock selling
            tools on this account.
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={() => navigate('/pricing')}>
          Back
        </button>
      </div>

      <div className="workflowBody">
        <p className="panelSub" style={{ margin: '0 auto 16px', maxWidth: 560, textAlign: 'center' }}>
          Selected plan: <strong>{planSummary}</strong>
        </p>
        <div
          className="subBenefitCard buyerPricing__oneTime"
          style={{ maxWidth: 520, margin: '0 auto' }}
        >
          <h3 className="subBenefitCard__title">
            {plan === 'lifetime' ? 'Seller access — lifetime' : 'Seller access — 1 month'}
          </h3>
          <p className="subBenefitCard__text">
            {plan === 'lifetime'
              ? 'Pay once for ongoing seller access: catalog, chat, and transactions.'
              : 'Full seller tools for 30 days. You can renew or upgrade to lifetime later.'}
          </p>
          <p className="buyerPricing__price">
            <strong>{plan === 'lifetime' ? sellerLifetime : sellerMonth}</strong>
            <span className="buyerPricing__priceNote">
              {plan === 'lifetime' ? ' lifetime' : ' / month'}
            </span>
          </p>
        </div>

        <div style={{ maxWidth: 480, margin: '22px auto 0', display: 'grid', gap: 10 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? 'Opening payment…' : 'Pay seller plan'}
          </button>
        </div>
      </div>
    </section>
  )
}
