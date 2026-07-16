import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HomeMarketingNav } from '../../components/common/HomeMarketingNav.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout.js'
import { setIntendedRoute } from '../../utils/authStorage.js'
import {
  bothBundlePlanId,
  dashboardAfterBothComplete,
} from '../../utils/bothSubscribeFlow.js'

export function SubscribeOptionsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { startCheckout, loading } = useRazorpayCheckout()

  function subscribeAsBoth() {
    const bundlePlan = bothBundlePlanId({ sellerPlan: 'month', buyerPlan: 'standard' })
    if (!isAuthenticated) {
      setIntendedRoute('/subscribe')
      navigate('/login', { state: { from: { pathname: '/subscribe' } } })
      return
    }
    startCheckout({
      plan: bundlePlan,
      user,
      onSuccess: () => {
        toast.success('Full access activated — you can buy and sell now!')
        navigate(dashboardAfterBothComplete(user?.role), { replace: true })
      },
      onError: (msg) => toast.error(msg),
    })
  }

  return (
    <div className="subPage">
      <HomeMarketingNav tagline="Choose your access" />

      <main className="subMain homeSubscribe">
        <div className="homeSubscribe__intro">
          <p className="subEyebrow">Choose your plan</p>
          <h1 className="subHero__title">How do you want to use the marketplace?</h1>
          <p className="subHero__lead">
            Buyers pay once; sellers choose 1 month or lifetime. For both, one Razorpay
            payment unlocks every tool on your account.
          </p>
        </div>

        <div className="homeSubscribe__grid">
          <button
            type="button"
            className="homeSubscribe__card"
            onClick={() => navigate('/pricing')}
          >
            <span className="homeSubscribe__cardTag">Procurement</span>
            <h2 className="homeSubscribe__cardTitle">Subscribe as a buyer</h2>
            <p className="homeSubscribe__cardText">
              Source suppliers, browse the catalog, and manage orders in
              one place.
            </p>
            <span className="homeSubscribe__cardCta">Continue →</span>
          </button>

          <button
            type="button"
            className="homeSubscribe__card"
            onClick={() => navigate('/pricing')}
          >
            <span className="homeSubscribe__cardTag">Supply</span>
            <h2 className="homeSubscribe__cardTitle">Subscribe as a seller</h2>
            <p className="homeSubscribe__cardText">
              List products, manage listings, respond to RFQs, and track B2B deals.
            </p>
            <span className="homeSubscribe__cardCta">Continue →</span>
          </button>

          <button
            type="button"
            className="homeSubscribe__card homeSubscribe__card--both"
            onClick={subscribeAsBoth}
            disabled={loading}
          >
            <span className="homeSubscribe__cardTag homeSubscribe__cardTag--both">
              Full access
            </span>
            <h2 className="homeSubscribe__cardTitle">Subscribe as both</h2>
            <p className="homeSubscribe__cardText">
              Pay once with Razorpay and get buyer + seller access on the same account.
            </p>
            <span className="homeSubscribe__cardCta">
              {loading ? 'Opening payment…' : 'Pay & get full access →'}
            </span>
          </button>
        </div>

        <p className="homeSubscribe__foot">
          <Link to="/pricing">Compare all both plans</Link>
          {' · '}
          <Link to="/">Back to home</Link>
        </p>
      </main>
    </div>
  )
}
