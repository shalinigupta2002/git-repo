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
  { id: 'both', label: 'Both', badge: 'Best Value' },
]

function FeatureComparisonTable({ activeRole }) {
  const isSeller = activeRole === 'seller'
  const isBoth = activeRole === 'both'

  const dealFeeMonthly = isSeller ? '4.0%' : isBoth ? '3.5%' : '5.0%'
  const dealFeeAnnual = isSeller ? '3.0%' : isBoth ? '2.5%' : '4.0%'
  const dealFeeLifetime = isSeller ? '2.0%' : isBoth ? '1.5%' : '3.0%'

  return (
    <div className="featureComparisonTable" style={{ marginTop: '3rem', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', textAlign: 'center' }}>
        Plan Feature Matrix & Comparison
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', marginBottom: '2rem' }}>
        Compare features, limits, and platform transaction fees across subscription tiers.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '1rem', color: '#334155', fontWeight: 700, width: '35%' }}>Feature / Benefit</th>
              <th style={{ padding: '1rem', color: '#2563eb', fontWeight: 800, textAlign: 'center' }}>Monthly Tier</th>
              <th style={{ padding: '1rem', color: '#16a34a', fontWeight: 800, textAlign: 'center' }}>Annual Tier (Save 20%)</th>
              <th style={{ padding: '1rem', color: '#9333ea', fontWeight: 800, textAlign: 'center' }}>Lifetime Tier (One-Time)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b' }}>Billing Cycle</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Monthly Auto-Renewal</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Billed Annually</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9333ea' }}>One-Time Payment</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b' }}>Platform Deal Charge Rate</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 700 }}>{dealFeeMonthly}</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{dealFeeAnnual}</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 800, color: '#9333ea' }}>{dealFeeLifetime}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b' }}>RFQ & Catalog Access</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Unlimited</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Unlimited</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Unlimited</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b' }}>Supplier Contact Unlocking</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>✓ Upon Dual Payment</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>✓ Upon Dual Payment</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>✓ Upon Dual Payment</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b' }}>Support SLA</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Standard Email</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Priority Response</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9333ea' }}>VIP 24/7 Dedicated Account Manager</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b' }}>Profile Badge</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Standard Member</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Verified Member</td>
              <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9333ea' }}>Lifetime VIP Member</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PricingCard3D({ title, price, period, description, features, dealFee, badge, isPopular, isActive, loading, onSubscribe }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        border: isPopular ? '2px solid #2563eb' : '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: isPopular ? '0 20px 40px -15px rgba(37, 99, 235, 0.25)' : '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        position: 'relative',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: 'pointer',
        transform: 'translateY(0)',
      }}
      className="card3D"
    >
      {badge ? (
        <span
          style={{
            position: 'absolute',
            top: '-14px',
            right: '24px',
            background: isPopular ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '0.35rem 1rem',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {badge}
        </span>
      ) : null}

      <div>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>{title}</h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem', minHeight: '2.5rem' }}>{description}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{price}</span>
          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>{period}</span>
        </div>

        <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '0.625rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Deal Charge Rate:</span>
          <strong style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 800 }}>{dealFee}</strong>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #f1f5f9', margin: '0 0 1.5rem' }} />

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {features.map((feat, idx) => (
            <li key={idx} style={{ fontSize: '0.875rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '1.1rem' }}>✓</span> {feat}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={isActive || loading}
        onClick={onSubscribe}
        style={{
          width: '100%',
          padding: '0.875rem 1.5rem',
          borderRadius: '14px',
          fontWeight: 800,
          fontSize: '0.95rem',
          border: 0,
          background: isActive
            ? '#e2e8f0'
            : isPopular
            ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: isActive ? '#64748b' : '#ffffff',
          cursor: isActive ? 'default' : 'pointer',
          boxShadow: isActive ? 'none' : '0 10px 20px -5px rgba(15, 23, 42, 0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        {isActive ? 'Current Plan Active' : loading ? 'Opening Payment…' : 'Subscribe Now →'}
      </button>
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

  const [activePlan, setActivePlan] = useState('buyer')

  const hasBuyer = useAppSelector(selectHasBuyerSubscription)
  const hasSeller = useAppSelector(selectHasSellerSubscription)
  const buyerPlanType = useAppSelector(selectBuyerPlanType)
  const sellerPlanType = useAppSelector(selectSellerPlanType)

  const buyerMonthlyActive = hasBuyer && buyerPlanType === 'BUYER_MONTHLY'
  const buyerAnnualActive = hasBuyer && (buyerPlanType === 'BUYER_ANNUAL' || buyerPlanType === 'BUYER_STANDARD')
  const buyerLifetimeActive = hasBuyer && buyerPlanType === 'BUYER_LIFETIME'

  const sellerMonthlyActive = hasSeller && (sellerPlanType === 'SELLER_MONTHLY' || sellerPlanType === 'SELLER_MONTH')
  const sellerAnnualActive = hasSeller && sellerPlanType === 'SELLER_ANNUAL'
  const sellerLifetimeActive = hasSeller && sellerPlanType === 'SELLER_LIFETIME'

  const openRazorpay = useCallback(
    (planKey) => {
      if (!isAuthenticated) {
        setPendingCheckout(planKey)
        setIntendedRoute('/pricing')
        navigate('/login', { state: { from: { pathname: '/pricing' } } })
        return
      }
      startCheckout({
        plan: planKey,
        user,
        onSuccess: () => {
          toast.success('Subscription activated successfully!')
          if (planKey.startsWith('SELLER_')) navigate('/seller/dashboard')
          else if (planKey.startsWith('BOTH_')) navigate('/buyer/dashboard')
          else navigate('/buyer/dashboard')
        },
        onError: (msg) => toast.error(msg),
      })
    },
    [isAuthenticated, navigate, startCheckout, user],
  )

  useEffect(() => {
    if (isAuthenticated) dispatch(loadSubscriptionStatus())
  }, [dispatch, isAuthenticated])

  useEffect(() => {
    document.documentElement.classList.add(PRICING_PAGE_HTML_CLASS)
    return () => document.documentElement.classList.remove(PRICING_PAGE_HTML_CLASS)
  }, [])

  return (
    <div className="subPage subPage--pricing" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '4rem' }}>
      <HomeMarketingNav tagline="Plans & Pricing V2" />

      <main className="subMain pricingPlans" style={{ maxWidth: '1240px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <header className="pricingPlans__header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2563eb', background: '#eff6ff', padding: '0.35rem 1rem', borderRadius: '20px' }}>
            Subscription Master V2
          </span>
          <h1 style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a', margin: '1rem 0 0.5rem', letterSpacing: '-0.02em' }}>
            Choose your plan
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
            Choose the subscription tier that matches your business model. Dynamic deal charges apply automatically.
          </p>
        </header>

        {/* Role Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          {PLAN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activePlan === tab.id}
              onClick={() => setActivePlan(tab.id)}
              style={{
                padding: '0.875rem 1.75rem',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '1rem',
                border: 0,
                cursor: 'pointer',
                background: activePlan === tab.id ? '#0f172a' : '#ffffff',
                color: activePlan === tab.id ? '#ffffff' : '#475569',
                boxShadow: activePlan === tab.id ? '0 10px 25px -5px rgba(15, 23, 42, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {tab.label}
              {tab.badge ? (
                <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 3D Pricing Grid (3 Plans per role) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {activePlan === 'buyer' ? (
            <>
              <PricingCard3D
                title="Buyer Monthly"
                price={marketingPricing.buyerMonthly || formatInr(amounts.buyerMonthly)}
                period="/ month"
                description="Flexible monthly procurement membership for active buyers."
                dealFee="5.0%"
                features={['Unlimited RFQs', 'Multi-Seller Compare', 'Standard Support', 'Monthly Cancel Anytime']}
                isActive={buyerMonthlyActive}
                loading={loadingPlan === 'BUYER_MONTHLY'}
                onSubscribe={() => openRazorpay('BUYER_MONTHLY')}
              />
              <PricingCard3D
                title="Buyer Annual"
                price={marketingPricing.buyerAnnual || formatInr(amounts.buyerAnnual)}
                period="/ year"
                description="Annual procurement access with reduced platform deal fees."
                dealFee="4.0%"
                badge="Most Popular"
                isPopular
                features={['Unlimited RFQs', 'Reduced Deal Charge (4%)', 'Priority Seller Response', 'Verified Buyer Badge']}
                isActive={buyerAnnualActive}
                loading={loadingPlan === 'BUYER_ANNUAL' || loadingPlan === 'BUYER_STANDARD'}
                onSubscribe={() => openRazorpay('BUYER_ANNUAL')}
              />
              <PricingCard3D
                title="Buyer Lifetime"
                price={marketingPricing.buyerLifetime || formatInr(amounts.buyerLifetime)}
                period="one-time"
                description="Permanent buyer access with the lowest transaction charges."
                dealFee="3.0%"
                badge="Best Value"
                features={['Permanent Lifetime Access', 'Lowest Buyer Fee (3%)', 'VIP Support SLA', 'Zero Renewal Fees']}
                isActive={buyerLifetimeActive}
                loading={loadingPlan === 'BUYER_LIFETIME'}
                onSubscribe={() => openRazorpay('BUYER_LIFETIME')}
              />
            </>
          ) : null}

          {activePlan === 'seller' ? (
            <>
              <PricingCard3D
                title="Seller Monthly"
                price={marketingPricing.sellerMonthly || formatInr(amounts.sellerMonthly)}
                period="/ month"
                description="Monthly seller tools for catalog listings and order management."
                dealFee="4.0%"
                features={['Unlimited Listings', 'RFQ Inquiries', 'Standard Support', 'Monthly Billing']}
                isActive={sellerMonthlyActive}
                loading={loadingPlan === 'SELLER_MONTHLY' || loadingPlan === 'SELLER_MONTH'}
                onSubscribe={() => openRazorpay('SELLER_MONTHLY')}
              />
              <PricingCard3D
                title="Seller Annual"
                price={marketingPricing.sellerAnnual || formatInr(amounts.sellerAnnual)}
                period="/ year"
                description="Annual seller access with priority search placement & lower fees."
                dealFee="3.0%"
                badge="Most Popular"
                isPopular
                features={['Unlimited Listings', 'Lower Deal Charge (3%)', 'Priority Search Boost', 'Verified Seller Badge']}
                isActive={sellerAnnualActive}
                loading={loadingPlan === 'SELLER_ANNUAL'}
                onSubscribe={() => openRazorpay('SELLER_ANNUAL')}
              />
              <PricingCard3D
                title="Seller Lifetime"
                price={marketingPricing.sellerLifetime || formatInr(amounts.sellerLifetime)}
                period="one-time"
                description="Permanent seller access with zero recurring fees and lowest rate."
                dealFee="2.0%"
                badge="Best Value"
                features={['Permanent Lifetime Access', 'Lowest Seller Fee (2%)', 'VIP Supplier Badge', 'Zero Renewal Fees']}
                isActive={sellerLifetimeActive}
                loading={loadingPlan === 'SELLER_LIFETIME'}
                onSubscribe={() => openRazorpay('SELLER_LIFETIME')}
              />
            </>
          ) : null}

          {activePlan === 'both' ? (
            <>
              <PricingCard3D
                title="Both Monthly"
                price={marketingPricing.bothMonthly || formatInr(amounts.bothMonthly)}
                period="/ month"
                description="Full dual marketplace access on flexible monthly terms."
                dealFee="3.5%"
                features={['Dual Buying & Selling', 'Combined Dashboard', 'Standard Support', 'Monthly Cancel Anytime']}
                loading={loadingPlan === 'BOTH_MONTHLY' || loadingPlan === 'BOTH_STANDARD_MONTH'}
                onSubscribe={() => openRazorpay('BOTH_MONTHLY')}
              />
              <PricingCard3D
                title="Both Annual"
                price={marketingPricing.bothAnnual || formatInr(amounts.bothAnnual)}
                period="/ year"
                description="Full dual membership for 1 year at a bundled discount."
                dealFee="2.5%"
                badge="Most Popular"
                isPopular
                features={['Full Marketplace Access', 'Reduced Deal Charge (2.5%)', 'Priority Support', 'Bundled Discount']}
                loading={loadingPlan === 'BOTH_ANNUAL'}
                onSubscribe={() => openRazorpay('BOTH_ANNUAL')}
              />
              <PricingCard3D
                title="Both Lifetime"
                price={marketingPricing.bothLifetime || formatInr(amounts.bothLifetime)}
                period="one-time"
                description="Ultimate one-time dual membership for permanent marketplace access."
                dealFee="1.5%"
                badge="Ultimate Value"
                features={['Permanent Lifetime Dual Access', 'Lowest Deal Charge (1.5%)', 'VIP Marketplace Badge', 'Zero Renewal Fees']}
                loading={loadingPlan === 'BOTH_LIFETIME' || loadingPlan === 'BOTH_LIFETIME_LIFETIME'}
                onSubscribe={() => openRazorpay('BOTH_LIFETIME')}
              />
            </>
          ) : null}
        </div>

        {/* Feature Comparison Table */}
        <FeatureComparisonTable activeRole={activePlan} />

        <footer style={{ marginTop: '4rem', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#64748b', fontWeight: 600, textDecoration: 'none' }}>← Back to Home</Link>
        </footer>
      </main>
    </div>
  )
}
