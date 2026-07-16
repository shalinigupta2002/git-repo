import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAdminTransactions } from '../../services/admin.service.js'

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

export function TransactionReports() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const columns = useMemo(
    () => [
      { key: 'orderNumber', label: 'Order #' },
      { key: 'buyer', label: 'Buyer' },
      { key: 'seller', label: 'Seller' },
      { key: 'items', label: 'Items' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Date' },
    ],
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminTransactions()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load transactions')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totals = useMemo(() => {
    let delivered = 0
    let outstanding = 0
    for (const r of rows) {
      const n = Number(r.totalAmount) || 0
      if (r.status === 'DELIVERED' || r.status === 'SHIPPED' || r.status === 'CONFIRMED') delivered += n
      if (r.status === 'PENDING') outstanding += n
    }
    return { delivered, outstanding }
  }, [rows])

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Seller / Buyer Transaction Reports</h2>
          <p className="panelSub">
            {rows.length} transaction{rows.length === 1 ? '' : 's'} · Booked: {formatAmount(totals.delivered)} · Pending: {formatAmount(totals.outstanding)}
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (<th key={c.key}>{c.label}</th>))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="tableEmpty">Loading…</td></tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.orderNumber}</code></td>
                  <td>{r.buyer?.companyName || r.buyer?.email || '—'}</td>
                  <td>{r.seller?.companyName || r.seller?.email || '—'}</td>
                  <td>{r.items?.length || 0}</td>
                  <td>{formatAmount(r.totalAmount)}</td>
                  <td>
                    <span className={`b2bBadge ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                  </td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={columns.length} className="tableEmpty">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
