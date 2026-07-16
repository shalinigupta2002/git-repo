import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { listOrders, updateOrderStatus } from '../../services/order.service.js'

const STATUS_COLORS = {
  PENDING: 'b2bBadge--amber',
  CONFIRMED: 'b2bBadge--blue',
  SHIPPED: 'b2bBadge--blue',
  DELIVERED: 'b2bBadge--green',
  CANCELLED: 'b2bBadge--grey',
}

const NEXT_STATUS = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
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

export function SellerTransactions() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 100, scope: 'seller' }
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

  async function advance(order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setUpdatingId(order.id)
    try {
      const { order: updated } = await updateOrderStatus(order.id, next)
      toast.success(`Deal ${updated.orderNumber} → ${updated.status}`)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)))
    } catch (e) {
      toast.error(e.message || 'Failed to update deal')
    } finally {
      setUpdatingId(null)
    }
  }

  async function cancel(order) {
    if (!window.confirm(`Cancel deal ${order.orderNumber}?`)) return
    setUpdatingId(order.id)
    try {
      const { order: updated } = await updateOrderStatus(order.id, 'CANCELLED')
      toast.success(`Deal ${updated.orderNumber} cancelled`)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)))
    } catch (e) {
      toast.error(e.message || 'Failed to cancel deal')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Seller deals</h2>
          <p className="panelSub">
            Deals from accepted quotations. {orders.length} deal{orders.length === 1 ? '' : 's'}.
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
              <th>Buyer</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="tableEmpty">Loading deals…</td></tr>
            ) : orders.length ? (
              orders.map((o) => {
                const next = NEXT_STATUS[o.status]
                return (
                  <tr key={o.id}>
                    <td><code>{o.orderNumber}</code></td>
                    <td>
                      <div>
                        Buyer ID: <code>{o.buyer?.id || o.buyerId || '—'}</code>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        City: {o.buyer?.city || '—'}
                      </div>
                    </td>
                    <td>{o.items?.length || 0}</td>
                    <td>{formatAmount(o.totalAmount)}</td>
                    <td>
                      <span className={`b2bBadge ${STATUS_COLORS[o.status] || ''}`}>{o.status}</span>
                    </td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {next ? (
                        <button
                          type="button"
                          className="btn btn--primary"
                          style={{ marginRight: 6 }}
                          disabled={updatingId === o.id}
                          onClick={() => advance(o)}
                        >
                          {updatingId === o.id ? '…' : `Mark ${next.toLowerCase()}`}
                        </button>
                      ) : null}
                      {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={updatingId === o.id}
                          onClick={() => cancel(o)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr><td colSpan={7} className="tableEmpty">No deals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
