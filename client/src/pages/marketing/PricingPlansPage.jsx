import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HomeMarketingNav } from '../../components/common/HomeMarketingNav.jsx'
import { formatInr, getPlanAmounts, useMarketingPricing } from '../../utils/marketingPricing.js'
import { useAppSelector, useAppDispatch } from '../../hooks/redux.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout.js'
import { setIntendedRoute } from '../../utils/authStorage.js'
import {
  selectHasBuyerSubscription,
  selectHasSellerSubscription,
  selectBuyerPlanType,
  selectSellerPlanType,
  loadSubscriptionStatus,
} from '../../store/slices/subscriptionSlice.js'
import {
  bothBundlePlanId,
  dashboardAfterBothComplete,
} from '../../utils/bothSubscribeFlow.js'
import { setPendingCheckout, takePendingCheckout } from '../../utils/pendingCheckout.js'

const PRICING_PAGE_HTML_CLASS = 'isPricingPlansPage'

const PLAN_TABS = [
  { id: 'buyer', label: 'Buyer' },
  { id: 'seller', label: 'Seller' },
  { id: 'both', label: 'Both', badge: 'Best value' },
]

function PlanTierChoice({
  name,
  value,
  title,
  priceLabel,
  priceMeta,
  checked,
  onChange,
  disabled,
  activeBadge,
}) {
  return (
    <label
      className={`pricingPlans__tier pricingPlans__tier--selectable${checked ? ' pricingPlans__tier--selected' : ''}${disabled ? ' pricingPlans__tier--disabled' : ''}`}
    >
      <input
        type="radio"
        className="pricingPlans__tierInput"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="pricingPlans__tierCheck" aria-hidden>
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="currentColor"
            />
          </svg>
        ) : null}
      </span>
      <span className="pricingPlans__tierName">{title}</span>
      <span className="pricingPlans__tierPrice">
        <strong className="pricingPlans__tierAmount">{priceLabel}</strong>
        {priceMeta ? <span className="pricingPlans__tierMeta">{priceMeta}</span> : null}
      </span>
      {activeBadge ? <span className="pricingPlans__tierActiveBadge">{activeBadge}</span> : null}
    </label>
  )
}

function PlanCheckoutBar({ total, onSubscribe, loading, disabled, currentPlan, subscribeLabel = 'Subscribe now' }) {
  return (
    <div className="pricingPlans__checkout">
      <div className="pricingPlans__checkoutPanel">
        <div className="pricingPlans__total">
          <span className="pricingPlans__totalLabel">Total payable</span>
          <strong className="pricingPlans__totalAmount">{total > 0 ? formatInr(total) : '—'}</strong>
        </div>
        {disabled && currentPlan ? (
          <span className="pricingPlans__currentPlanBtn">Current plan</span>
        ) : (
          <button
            type="button"
            className="btn btn--primary pricingPlans__checkoutBtn"
            onClick={onSubscribe}
            disabled={loading || disabled}
          >
            {loading ? 'Opening payment…' : subscribeLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function RolePlanOptions({
  name,
  annual,
  lifetime,
  selected,
  onSelect,
  annualDisabled,
  lifetimeDisabled,
  annualActive,
  lifetimeActive,
}) {
  return (
    <div className="pricingPlans__tierGrid">
      <PlanTierChoice
        name={name}
        value="annual"
        title="Annual"
        priceLabel={annual.label}
        priceMeta={annual.meta}
        checked={selected === 'annual'}
        onChange={() => onSelect('annual')}
        disabled={annualDisabled}
        activeBadge={annualActive ? 'Active' : null}
      />
      <PlanTierChoice
        name={name}
        value="lifetime"
        title="Lifetime"
        priceLabel={lifetime.label}
        priceMeta={lifetime.meta}
        checked={selected === 'lifetime'}
        onChange={() => onSelect('lifetime')}
        disabled={lifetimeDisabled}
        activeBadge={lifetimeActive ? 'Active' : null}
      />
    </div>
  )
}

function PlanTabs({ active, onChange }) {
  return (
    <div className="pricingPlans__tabs" role="tablist" aria-label="Plan type">
      {PLAN_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`pricingPlans__tab${active === tab.id ? ' pricingPlans__tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.badge ? <span className="pricingPlans__tabBadge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function PricingPlansPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const marketingPricing = useMarketingPricing()
  const amounts = useMemo(() => getPlanAmounts(marketingPricing), [marketingPricing])
  const { user, isAuthenticated } = useAuth()
  const { startCheckout, loadingPlan } = useRazorpayCheckout()

  const [activePlan, setActivePlan] = useState(null)
  const [buyerTier, setBuyerTier] = useState(null)
  const [sellerTier, setSellerTier] = useState(null)
  const [bothBuyerTier, setBothBuyerTier] = useState(null)
  const [bothSellerTier, setBothSellerTier] = useState(null)

  const hasBuyer = useAppSelector(selectHasBuyerSubscription)
  const hasSeller = useAppSelector(selectHasSellerSubscription)
  const buyerPlanType = useAppSelector(selectBuyerPlanType)
  const sellerPlanType = useAppSelector(selectSellerPlanType)

  const buyerAnnualActive = hasBuyer && buyerPlanType === 'BUYER_STANDARD'
  const buyerLifetimeActive = hasBuyer && buyerPlanType === 'BUYER_LIFETIME'
  const sellerAnnualActive = hasSeller && sellerPlanType === 'SELLER_MONTH'
  const sellerLifeActive = hasSeller && sellerPlanType === 'SELLER_LIFETIME'

  const buyerTotal = buyerTier === 'lifetime' ? amounts.buyerLifetime : buyerTier === 'annual' ? amounts.buyerAnnual : 0
  const sellerTotal = sellerTier === 'lifetime' ? amounts.sellerLifetime : sellerTier === 'annual' ? amounts.sellerAnnual : 0
  
  const bothTotal = useMemo(() => {
    if (!bothBuyerTier || !bothSellerTier) return 0
    if (bothBuyerTier === 'lifetime' && bothSellerTier === 'lifetime') {
      return amounts.bothLifetimeLifetime
    }
    if (bothBuyerTier === 'lifetime' && bothSellerTier === 'annual') {
      return amounts.bothLifetimeMonth
    }
    if (bothBuyerTier === 'annual' && bothSellerTier === 'lifetime') {
      return amounts.bothStandardLifetime
    }
    return amounts.bothStandardMonth
  }, [bothBuyerTier, bothSellerTier, amounts])

  const bothBundlePlan = bothBundlePlanId({
    sellerPlan: bothSellerTier === 'lifetime' ? 'lifetime' : 'month',
    buyerPlan: bothBuyerTier === 'lifetime' ? 'lifetime' : 'standard',
  })

  const bothCurrentPlan = Boolean(
    bothBuyerTier && bothSellerTier &&
    (bothBuyerTier === 'annual' ? buyerAnnualActive : buyerLifetimeActive) &&
    (bothSellerTier === 'annual' ? sellerAnnualActive : sellerLifeActive)
  )

  const bothBuyerSideActive =
    bothBuyerTier === 'annual' ? buyerAnnualActive : bothBuyerTier === 'lifetime' ? buyerLifetimeActive : false
  const bothSellerSideActive =
    bothSellerTier === 'annual' ? sellerAnnualActive : bothSellerTier === 'lifetime' ? sellerLifeActive : false

  const bothSubscribeLabel =
    bothBuyerSideActive && !bothSellerSideActive
      ? 'Add seller access'
      : bothSellerSideActive && !bothBuyerSideActive
        ? 'Add buyer access'
        : 'Subscribe now'

  const goToLoginForPricing = useCallback(
    (razorpayPlan) => {
      setPendingCheckout(razorpayPlan)
      setIntendedRoute('/pricing')
      navigate('/login', { state: { from: { pathname: '/pricing' } } })
    },
    [navigate],
  )

  const navigateAfterCheckout = useCallback(
    (razorpayPlan) => {
      if (razorpayPlan.startsWith('BOTH_')) {
        toast.success('Full access activated — you can buy and sell now!')
        navigate(dashboardAfterBothComplete(user?.role), { replace: true })
        return
      }
      if (razorpayPlan.startsWith('SELLER_')) {
        toast.success('Seller subscription activated!')
        navigate('/seller/dashboard', { replace: true })
        return
      }
      toast.success('Buyer access activated!')
      navigate('/buyer/dashboard', { replace: true })
    },
    [navigate, user?.role],
  )

  const openRazorpay = useCallback(
    (razorpayPlan) => {
      startCheckout({
        plan: razorpayPlan,
        user,
        onSuccess: () => navigateAfterCheckout(razorpayPlan),
        onError: (msg) => toast.error(msg),
      })
    },
    [navigateAfterCheckout, startCheckout, user],
  )

  const payBothBundle = useCallback(
    ({ sellerPlan, buyerPlan }) => {
      const bundlePlan = bothBundlePlanId({
        sellerPlan,
        buyerPlan: buyerPlan === 'lifetime' ? 'lifetime' : 'standard',
      })
      if (!isAuthenticated) {
        goToLoginForPricing(bundlePlan)
        return
      }
      openRazorpay(bundlePlan)
    },
    [goToLoginForPricing, isAuthenticated, openRazorpay],
  )

  const handleBothSubscribe = useCallback(() => {
    if (bothCurrentPlan) {
      toast('You already have buyer and seller access for this combination.', { icon: 'ℹ️' })
      return
    }
    payBothBundle({
      sellerPlan: bothSellerTier === 'lifetime' ? 'lifetime' : 'month',
      buyerPlan: bothBuyerTier === 'lifetime' ? 'lifetime' : 'standard',
    })
  }, [bothBuyerTier, bothCurrentPlan, bothSellerTier, payBothBundle])

  const payBuyerPlan = useCallback(
    (_plan, { lifetime = false, bothOpts } = {}) => {
      if (bothOpts) {
        payBothBundle(bothOpts)
        return
      }
      const razorpayPlan = lifetime ? 'BUYER_LIFETIME' : 'BUYER_STANDARD'
      if (!isAuthenticated) {
        goToLoginForPricing(razorpayPlan)
        return
      }
      if (user?.role !== 'BUYER' && user?.role !== 'ADMIN') {
        toast.error('Sign in with a buyer account to purchase buyer plans.')
        navigate('/login')
        return
      }
      openRazorpay(razorpayPlan)
    },
    [goToLoginForPricing, isAuthenticated, navigate, openRazorpay, payBothBundle, user?.role],
  )

  const paySellerPlan = useCallback(
    (plan, { bothOpts } = {}) => {
      if (bothOpts) {
        payBothBundle(bothOpts)
        return
      }
      const razorpayPlan = plan === 'lifetime' ? 'SELLER_LIFETIME' : 'SELLER_MONTH'
      if (!isAuthenticated) {
        goToLoginForPricing(razorpayPlan)
        return
      }
      if (user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
        toast.error('Sign in with a seller account to purchase seller plans.')
        navigate('/login')
        return
      }
      openRazorpay(razorpayPlan)
    },
    [goToLoginForPricing, isAuthenticated, navigate, openRazorpay, payBothBundle, user?.role],
  )

  const resumedCheckout = useRef(false)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(loadSubscriptionStatus())
    }
  }, [dispatch, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !user || resumedCheckout.current) return
    const pendingPlan = takePendingCheckout()
    if (!pendingPlan) return
    resumedCheckout.current = true
    openRazorpay(pendingPlan)
  }, [isAuthenticated, openRazorpay, user])

  useEffect(() => {
    document.documentElement.classList.add(PRICING_PAGE_HTML_CLASS)
    return () => document.documentElement.classList.remove(PRICING_PAGE_HTML_CLASS)
  }, [])

  const buyerPlans = {
    annual: { label: marketingPricing.buyerOneTime, meta: '/ year' },
    lifetime: { label: marketingPricing.buyerLifetime, meta: ' one-time' },
  }
  const sellerPlans = {
    annual: { label: marketingPricing.sellerMonth, meta: '/ year' },
    lifetime: { label: marketingPricing.sellerLifetime, meta: ' one-time' },
  }

  const planCopy = {
    buyer: 'Browse products, buy from sellers, and manage orders from your buyer dashboard.',
    seller: 'List products for free and unlock seller tools for orders, chat, and transactions.',
    both: 'One account for buying and selling — full marketplace access on a single subscription.',
  }

  return (
    <div className="subPage subPage--pricing">
      <HomeMarketingNav tagline="Plans & pricing" />

      <main className="subMain pricingPlans pricingPlans--singleScreen">
        <header className="pricingPlans__header pricingPlans__header--compact">
          <p className="pricingPlans__eyebrow">Subscription</p>
          <h1 className="pricingPlans__title">Choose your plan</h1>
          <p className="pricingPlans__subtitle">
            {planCopy[activePlan] || 'Procure suppliers, list items, or unlock full access to buy and sell together.'}
          </p>
        </header>

        <PlanTabs active={activePlan} onChange={setActivePlan} />

        <section className="pricingPlans__panel" aria-live="polite">
          {!activePlan ? (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-h)', marginBottom: 8 }}>
                Select a role to view plans
              </p>
              <p style={{ maxWidth: 400, margin: '0 auto', fontSize: 14 }}>
                Please choose <strong>Buyer</strong>, <strong>Seller</strong>, or <strong>Both</strong> above to customize your subscription and unlock marketplace features.
              </p>
            </div>
          ) : null}

          {activePlan === 'buyer' ? (
            <>
              <RolePlanOptions
                name="buyer-plan"
                annual={buyerPlans.annual}
                lifetime={buyerPlans.lifetime}
                selected={buyerTier}
                onSelect={setBuyerTier}
                annualDisabled={buyerAnnualActive}
                lifetimeDisabled={buyerLifetimeActive}
                annualActive={buyerAnnualActive}
                lifetimeActive={buyerLifetimeActive}
              />
              <PlanCheckoutBar
                total={buyerTotal}
                loading={loadingPlan === (buyerTier === 'lifetime' ? 'BUYER_LIFETIME' : 'BUYER_STANDARD')}
                disabled={!buyerTier || (buyerTier === 'annual' ? buyerAnnualActive : buyerLifetimeActive)}
                currentPlan={buyerTier === 'annual' ? buyerAnnualActive : buyerLifetimeActive}
                subscribeLabel={!buyerTier ? 'Select a plan tier' : 'Subscribe now'}
                onSubscribe={() =>
                  payBuyerPlan(buyerTier === 'lifetime' ? 'lifetime' : 'standard', {
                    lifetime: buyerTier === 'lifetime',
                  })
                }
              />
            </>
          ) : null}

          {activePlan === 'seller' ? (
            <>
              <RolePlanOptions
                name="seller-plan"
                annual={sellerPlans.annual}
                lifetime={sellerPlans.lifetime}
                selected={sellerTier}
                onSelect={setSellerTier}
                annualDisabled={sellerAnnualActive}
                lifetimeDisabled={sellerLifeActive}
                annualActive={sellerAnnualActive}
                lifetimeActive={sellerLifeActive}
              />
              <PlanCheckoutBar
                total={sellerTotal}
                loading={loadingPlan === (sellerTier === 'lifetime' ? 'SELLER_LIFETIME' : 'SELLER_MONTH')}
                disabled={!sellerTier || (sellerTier === 'annual' ? sellerAnnualActive : sellerLifeActive)}
                currentPlan={sellerTier === 'annual' ? sellerAnnualActive : sellerLifeActive}
                subscribeLabel={!sellerTier ? 'Select a plan tier' : 'Subscribe now'}
                onSubscribe={() => paySellerPlan(sellerTier === 'lifetime' ? 'lifetime' : 'month')}
              />
            </>
          ) : null}

          {activePlan === 'both' ? (
            <>
              <div className="pricingPlans__bothGroups pricingPlans__bothGroups--compact">
                <div className="pricingPlans__bothGroup">
                  <p className="pricingPlans__bothGroupLabel">Buyer</p>
                  <RolePlanOptions
                    name="both-buyer-plan"
                    annual={buyerPlans.annual}
                    lifetime={buyerPlans.lifetime}
                    selected={bothBuyerTier}
                    onSelect={setBothBuyerTier}
                    annualDisabled={buyerAnnualActive}
                    lifetimeDisabled={buyerLifetimeActive}
                    annualActive={buyerAnnualActive}
                    lifetimeActive={buyerLifetimeActive}
                  />
                </div>
                <div className="pricingPlans__bothGroup">
                  <p className="pricingPlans__bothGroupLabel">Seller</p>
                  <RolePlanOptions
                    name="both-seller-plan"
                    annual={sellerPlans.annual}
                    lifetime={sellerPlans.lifetime}
                    selected={bothSellerTier}
                    onSelect={setBothSellerTier}
                    annualDisabled={sellerAnnualActive}
                    lifetimeDisabled={sellerLifeActive}
                    annualActive={sellerAnnualActive}
                    lifetimeActive={sellerLifeActive}
                  />
                </div>
              </div>
              <PlanCheckoutBar
                total={bothTotal}
                loading={loadingPlan === bothBundlePlan}
                disabled={!bothBuyerTier || !bothSellerTier || bothCurrentPlan}
                currentPlan={bothCurrentPlan}
                subscribeLabel={!bothBuyerTier || !bothSellerTier ? 'Select both tiers' : bothSubscribeLabel}
                onSubscribe={handleBothSubscribe}
              />
            </>
          ) : null}
        </section>

        <footer className="pricingPlans__foot">
          <Link to="/" className="pricingPlans__homeLink">← Back to home</Link>
        </footer>
      </main>
    </div>
  )
}
