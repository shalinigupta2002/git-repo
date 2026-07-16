import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMarketingPricing } from '../../utils/marketingPricing.js'
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectUser } from '../../store/slices/authSlice.js'
import { bothFlowSellerPath } from '../../utils/bothSubscribeFlow.js'

export function BuyerPricing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bothFlow = searchParams.get('flow') === 'both'
  const sellerPlan = searchParams.get('sellerPlan')
  const buyerPlanLifetime = searchParams.get('buyerPlan') === 'lifetime'
  const { buyerOneTime, buyerLifetime } = useMarketingPricing()
  const user = useAppSelector(selectUser)
  const { startCheckout, loading } = useRazorpayCheckout()

  const useLifetimeBuyerFee =
    buyerPlanLifetime || (bothFlow && sellerPlan === 'lifetime')
  const displayBuyerPrice = useLifetimeBuyerFee ? buyerLifetime : buyerOneTime
  const rzpPlan = useLifetimeBuyerFee ? 'BUYER_LIFETIME' : 'BUYER_STANDARD'

  function onSuccess() {
    toast.success('Buyer access activated!')
    if (bothFlow) {
      const sellerFlow = sellerPlan === 'lifetime' ? 'lifetime' : 'month'
      const onSubscribePath = window.location.pathname.startsWith('/subscribe/')
      const sellerStep = bothFlowSellerPath({ sellerPlan: sellerFlow })
      navigate(onSubscribePath ? sellerStep : `/buyer/pricing/both-seller?plan=${sellerFlow}`, {
        replace: true,
      })
    } else {
      navigate('/buyer/dashboard', { replace: true })
    }
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
          <h2 className="panelTitle">Buyer pricing</h2>
          <p className="panelSub">
            {bothFlow
              ? `Step 1 of 2: pay the one-time buyer fee, then you'll choose a seller plan (1 month or lifetime).`
              : 'One-time payment unlocks buyer access—catalog, wishlist, and your procurement dashboard.'}
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={() => navigate('/pricing')}>
          Back
        </button>
      </div>

      <div className="workflowBody">
        <div
          className="subBenefitCard buyerPricing__oneTime"
          style={{ maxWidth: 520, margin: '0 auto' }}
        >
          <h3 className="subBenefitCard__title">
            {useLifetimeBuyerFee ? 'Buyer access — lifetime' : 'Buyer access — one-time payment'}
          </h3>
          <p className="subBenefitCard__text">
            Pay once to activate buyer features: browse suppliers, save wishlists, manage orders,
            and manage orders. No recurring buyer subscription.
          </p>
          <p className="buyerPricing__price">
            <strong>{displayBuyerPrice}</strong>
            <span className="buyerPricing__priceNote">
              {useLifetimeBuyerFee ? ' lifetime' : ' one-time'}
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
            {loading ? 'Opening payment…' : 'Pay & subscribe'}
          </button>
        </div>
      </div>
    </section>
  )
}
