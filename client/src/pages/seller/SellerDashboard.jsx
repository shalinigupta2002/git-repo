import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts } from '../../services/product.service.js'
import { listOrders } from '../../services/order.service.js'
import { fetchRfqStats } from '../../services/quoteRequest.service.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectHasSellerSubscription, selectSubscription, selectSellerMarketplaceId } from '../../store/slices/subscriptionSlice.js'
import { MarketplaceIdDisplay, ProfileLinkHint } from '../../components/common/MarketplaceIdDisplay.jsx'
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

export function SellerDashboard() {
  const hasSub = useAppSelector(selectHasSellerSubscription)
  const subscriptionStatus = useAppSelector(selectSubscription).status
  const sellerMarketplaceId = useAppSelector(selectSellerMarketplaceId)
  const { user } = useAuth()
  const displaySellerId = sellerMarketplaceId ?? user?.sellerMarketplaceId
  const [stats, setStats] = useState({
    products: 0,
    openOrders: 0,
    revenue: 0,
    loading: true,
    error: '',
  })
  const [rfqStats, setRfqStats] = useState(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [prodData, orderData, rfqData] = await Promise.all([
          listProducts({ mine: true, limit: 100, includeInactive: true }),
          listOrders({ limit: 100, scope: 'seller' }),
          fetchRfqStats({ viewAs: 'seller' }).catch(() => null),
        ])
        const products = prodData?.products || []
        const orders = orderData?.orders || []
        const openStatuses = new Set(['PENDING', 'CONFIRMED', 'SHIPPED'])
        const openOrders = orders.filter((o) => openStatuses.has(o.status)).length
        const revenue = orders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
        if (!alive) return
        setStats({
          products: products.filter((p) => p.isActive).length,
          openOrders,
          revenue,
          loading: false,
          error: '',
        })
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
          Welcome, {user?.companyName || user?.email || 'seller'}!
        </h1>
        <p className="sellerDashboard__sub">
          List products for free. Subscribe to unlock transactions, quotations, and advanced seller tools.
        </p>
      </div>

      <div className="panel panel--flush">
        <div className="sellerDashboard__grid">
          <div className="metricCard metricCard--blue">
            <div className="metricCard__label">Subscription</div>
            <div className="metricCard__value">
              {subscriptionStatus === 'loading' || subscriptionStatus === 'idle' ? (
                <Spinner size="sm" />
              ) : hasSub ? (
                'Active'
              ) : (
                'Not active'
              )}
            </div>
            {subscriptionStatus !== 'loading' && subscriptionStatus !== 'idle' && !hasSub ? (
              <Link to="/pricing" className="metricCard__link">Get subscription →</Link>
            ) : null}
            <MarketplaceIdDisplay marketplaceId={displaySellerId} label="Seller ID" />
            {subscriptionStatus !== 'loading' && subscriptionStatus !== 'idle' && hasSub ? (
              <ProfileLinkHint />
            ) : null}
          </div>
          <div className="metricCard metricCard--amber">
            <div className="metricCard__label">RFQs &amp; quotations</div>
            <div className="metricCard__value">{rfqStats?.incoming ?? (hasSub ? 'Inbox open' : 'Preview')}</div>
            <Link to="/seller/quotations" className="metricCard__link">
              Open quotation center →
            </Link>
            {rfqStats ? (
              <p className="metricCard__hint">
                {rfqStats.pendingResponses} pending · {rfqStats.responded} responded
              </p>
            ) : null}
          </div>
          <div className="metricCard metricCard--purple">
            <div className="metricCard__label">Open deals</div>
            <div className={`metricCard__value${stats.loading ? ' metricCard__value--loading' : ''}`}>
              {stats.loading ? <Spinner size="sm" /> : stats.openOrders}
            </div>
            <p className="metricCard__hint">
              <Link to="/seller/transactions">Manage deals →</Link>
            </p>
          </div>
          <div className="metricCard metricCard--green">
            <div className="metricCard__label">Products live</div>
            <div className={`metricCard__value${stats.loading ? ' metricCard__value--loading' : ''}`}>
              {stats.loading ? <Spinner size="sm" /> : stats.products}
            </div>
            <p className="metricCard__hint">
              <Link to="/seller/products" className="metricCard__link">
                Open list products →
              </Link>
            </p>
          </div>
          <div className="metricCard metricCard--blue">
            <div className="metricCard__label">Revenue booked</div>
            <div className={`metricCard__value${stats.loading ? ' metricCard__value--loading' : ''}`}>
              {stats.loading ? <Spinner size="sm" /> : formatAmount(stats.revenue)}
            </div>
            <p className="metricCard__hint">Excludes cancelled deals.</p>
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
