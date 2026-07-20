import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasActiveBuyerSubscription } from '../../utils/buyerSubscription.js'
import { listOrders } from '../../services/order.service.js'
import { fetchRfqStats } from '../../services/quoteRequest.service.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectPortalUserId } from '../../store/slices/subscriptionSlice.js'
import { UserIdDisplay, ProfileLinkHint } from '../../components/common/MarketplaceIdDisplay.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'

function formatAmount(v, currency = 'INR') {
  const num = Number(v)
  if (!Number.isFinite(num)) return String(v ?? '')
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `${currency} ${num.toFixed(0)}`
  }
}

export function BuyerDashboard() {
  const hasSub = hasActiveBuyerSubscription()
  const { user } = useAuth()
  const portalUserId = useAppSelector(selectPortalUserId) ?? user?.portalUserId
  const [stats, setStats] = useState({ total: 0, active: 0, spend: 0, unlocked: 0, paidCharges: 0, loading: true, error: '' })
  const [rfqStats, setRfqStats] = useState(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [orderData, rfqData] = await Promise.all([
          listOrders({ limit: 100, scope: 'buyer' }),
          fetchRfqStats({ viewAs: 'buyer' }).catch(() => null),
        ])
        const orders = orderData?.orders || []
        const activeStatuses = new Set(['PENDING', 'CONFIRMED', 'SHIPPED'])
        const active = orders.filter((o) => activeStatuses.has(o.status)).length
        const unlocked = orders.filter((o) => o.contactUnlockStatus === 'UNLOCKED').length
        const paidCharges = orders.filter((o) => {
          const p = o.payments?.find((pay) => pay.payerRole === 'BUYER')
          return p?.paymentStatus === 'SUCCESS'
        }).length
        const spend = orders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
        if (!alive) return
        setStats({ total: orders.length, active, spend, unlocked, paidCharges, loading: false, error: '' })
        setRfqStats(rfqData?.stats || null)
      } catch (e) {
        if (!alive) return
        setStats((prev) => ({ ...prev, loading: false, error: e.message || 'Failed to load' }))
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <div className="sellerDashboard">
      <div className="sellerDashboard__pageTitle">
        <h1 className="sellerDashboard__greeting">
          Welcome, {user?.companyName || user?.email || 'buyer'}!
        </h1>
        <p className="sellerDashboard__sub">
          Here’s what’s happening with your procurement today.
        </p>
      </div>

      {(() => {
        const myRfqs = rfqStats?.myRfqs ?? 0
        const sellerResponses = rfqStats?.sellerResponses ?? 0
        const accepted = (rfqStats?.accepted ?? 0) + stats.total
        const hasPaidCharge = stats.paidCharges > 0
        const hasUnlocked = stats.unlocked > 0

        const getBadge = (state) => {
          if (state === 'COMPLETED') return <span className="b2bBadge b2bBadge--green" style={{ fontSize: 10 }}>✔ Completed</span>
          if (state === 'CURRENT') return <span className="b2bBadge b2bBadge--blue" style={{ fontSize: 10 }}>➡ Current Step</span>
          return <span className="b2bBadge b2bBadge--grey" style={{ fontSize: 10 }}>○ Pending</span>
        }

        const step1State = myRfqs > 0 ? 'COMPLETED' : 'CURRENT'
        const step2State = sellerResponses > 0 || accepted > 0 ? 'COMPLETED' : myRfqs > 0 ? 'CURRENT' : 'PENDING'
        const step3State = accepted > 0 ? 'COMPLETED' : sellerResponses > 0 ? 'CURRENT' : 'PENDING'
        const step4State = hasPaidCharge || hasUnlocked ? 'COMPLETED' : accepted > 0 ? 'CURRENT' : 'PENDING'
        const step5State = hasUnlocked ? 'CURRENT' : 'PENDING'

        return (
          <div className="panel" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '1px solid #dbeafe' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>Next Action</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', color: 'var(--text-h)' }}>Your Buyer Journey Workflow</h3>
              </div>
              <span className="b2bBadge b2bBadge--blue">B2B Deal Facilitation</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: '#ffffff', border: step1State === 'CURRENT' ? '2px solid var(--accent)' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Step 1</span>
                  {getBadge(step1State)}
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>Browse Products</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Explore supplier catalog &amp; select items.</p>
                <Link to="/products" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>Browse products →</Link>
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: '#ffffff', border: step2State === 'CURRENT' ? '2px solid var(--accent)' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Step 2</span>
                  {getBadge(step2State)}
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>RFQs &amp; Quotations</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Create RFQs and compare seller quotations.</p>
                <Link to="/buyer/quotations" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>Open workspace →</Link>
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: '#ffffff', border: step3State === 'CURRENT' ? '2px solid var(--accent)' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Step 3</span>
                  {getBadge(step3State)}
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>Accept Quotation</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Accept one seller and create your order.</p>
                <Link to="/buyer/quotations?tab=quotations" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>Seller Quotations →</Link>
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: '#ffffff', border: step4State === 'CURRENT' ? '2px solid var(--accent)' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Step 4</span>
                  {getBadge(step4State)}
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>Pay Deal Charge</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Pay platform deal charge.</p>
                <Link to="/buyer/deals" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>My Orders →</Link>
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: '#ffffff', border: step5State === 'CURRENT' ? '2px solid var(--accent)' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Step 5</span>
                  {getBadge(step5State)}
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>Contact Unlocked</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Supplier details revealed to deal offline.</p>
                <Link to="/buyer/deals" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>View Contacts →</Link>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="panel panel--flush">
        <div className="sellerDashboard__grid">
          <div className="metricCard metricCard--blue">
            <div className="metricCard__label">Subscription</div>
            <div className="metricCard__value">{hasSub ? 'Active' : 'Not active'}</div>
            <UserIdDisplay portalUserId={portalUserId} />
            {!hasSub ? (
              <Link to="/" className="metricCard__link">Get subscription →</Link>
            ) : (
              <ProfileLinkHint />
            )}
          </div>

          <div className="metricCard metricCard--purple">
            <div className="metricCard__label">RFQs &amp; quotations</div>
            <div className="metricCard__value">{rfqStats?.myRfqs ?? (hasSub ? 'Active' : 'Preview')}</div>
            <Link to="/buyer/quotations" className="metricCard__link">
              Open quotation center →
            </Link>
            {rfqStats ? (
              <p className="metricCard__hint">
                {rfqStats.pending} waiting · {rfqStats.sellerResponses} responses
              </p>
            ) : null}
          </div>

          <div className="metricCard metricCard--green">
            <div className="metricCard__label">Total spend</div>
            <div className={`metricCard__value${stats.loading ? ' metricCard__value--loading' : ''}`}>
              {stats.loading ? <Spinner size="sm" /> : formatAmount(stats.spend)}
            </div>
            <p className="metricCard__hint">
              <Link to="/buyer/deals">View my orders →</Link>
            </p>
          </div>

          <div className="metricCard metricCard--blue">
            <div className="metricCard__label">Active orders</div>
            <div className={`metricCard__value${stats.loading ? ' metricCard__value--loading' : ''}`}>
              {stats.loading ? <Spinner size="sm" /> : stats.active}
            </div>
            <p className="metricCard__hint">
              {stats.loading ? null : `${stats.total} total order${stats.total === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        {stats.error ? (
          <p className="dashError" role="alert">
            {stats.error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
