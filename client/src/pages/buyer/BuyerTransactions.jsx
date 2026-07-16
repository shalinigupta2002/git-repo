import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SellerIdentity } from '../../components/common/SellerIdentity.jsx'
import { listOrders } from '../../services/order.service.js'

const STATUS_COLORS = {
  PENDING: 'b2bBadge--amber',
  CONFIRMED: 'b2bBadge--blue',
  SHIPPED: 'b2bBadge--blue',
  DELIVERED: 'b2bBadge--green',
  CANCELLED: 'b2bBadge--grey',
}

function formatAmount(v, currency = 'INR') {
  const num = Number(v)
  if (!Number.isFinite(num)) return String(v ?? '')
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${currency} ${num.toFixed(2)}`
  }
}

export function BuyerTransactions() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 100, scope: 'buyer' }
      if (statusFilter) params.status = statusFilter
      const data = await listOrders(params)
      setOrders(Array.isArray(data?.orders) ? data.orders : [])
    } catch (e) {
      setError(e.message || 'Failed to load deals')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Your deals</h2>
          <p className="panelSub">
            {orders.length} deal{orders.length === 1 ? '' : 's'} from accepted quotations.{' '}
            <Link to="/buyer/products">Browse more products →</Link>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="b2bSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button type="button" className="btnOutline" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? <div className="errorBox" style={{ margin: '12px 0' }}>{error}</div> : null}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Deal #</th>
              <th>Seller</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="tableEmpty">Loading deals…</td></tr>
            ) : orders.length ? (
              orders.map((o) => (
                <tr key={o.id}>
                  <td><code>{o.orderNumber}</code></td>
                  <td>
                    <SellerIdentity seller={o.seller} sellerId={o.sellerId} compact />
                  </td>
                  <td>
                    <div>{o.items?.length || 0} line{(o.items?.length || 0) === 1 ? '' : 's'}</div>
                    {o.items?.length ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {o.items.slice(0, 2).map((i) => i.product?.name).filter(Boolean).join(', ')}
                        {o.items.length > 2 ? '…' : ''}
                      </div>
                    ) : null}
                  </td>
                  <td>{formatAmount(o.totalAmount)}</td>
                  <td>
                    <span className={`b2bBadge ${STATUS_COLORS[o.status] || ''}`}>{o.status}</span>
                  </td>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="tableEmpty">
                No deals yet. <Link to="/buyer/products">Browse products</Link> and send an RFQ to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
