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
  const [stats, setStats] = useState({ total: 0, active: 0, spend: 0, loading: true, error: '' })
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
        const spend = orders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
        if (!alive) return
        setStats({ total: orders.length, active, spend, loading: false, error: '' })
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
              <Link to="/buyer/transactions">View transactions →</Link>
            </p>
          </div>

          <div className="metricCard metricCard--blue">
            <div className="metricCard__label">Active deals</div>
            <div className={`metricCard__value${stats.loading ? ' metricCard__value--loading' : ''}`}>
              {stats.loading ? <Spinner size="sm" /> : stats.active}
            </div>
            <p className="metricCard__hint">
              {stats.loading ? null : `${stats.total} total deal${stats.total === 1 ? '' : 's'}`}
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
