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
  if (!Number.isFinite(num)) return String(v ?? '—')
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

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TransactionReports() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }
      const data = await fetchAdminTransactions(params)
      const list = data?.transactions || (Array.isArray(data) ? data : [])
      setRows(list)
      setTotalPages(data?.pagination?.totalPages || 1)
      setTotalItems(data?.pagination?.total || list.length)
    } catch (err) {
      setError(err.message || 'Failed to load transactions')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const orderNum = (r.orderNumber || r.id || '').toLowerCase()
      const dealId = (r.dealId || r.deal?.dealNumber || '').toLowerCase()
      const buyer = (r.buyer?.companyName || r.buyer?.email || '').toLowerCase()
      const seller = (r.seller?.companyName || r.seller?.email || '').toLowerCase()
      return orderNum.includes(q) || dealId.includes(q) || buyer.includes(q) || seller.includes(q)
    })
  }, [rows, search])

  const totals = useMemo(() => {
    let delivered = 0
    let outstanding = 0
    for (const r of rows) {
      const n = Number(r.totalAmount) || 0
      if (['DELIVERED', 'SHIPPED', 'CONFIRMED'].includes(r.status)) delivered += n
      if (r.status === 'PENDING') outstanding += n
    }
    return { delivered, outstanding }
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Transaction Reports</h1>
          <p style={{ color: '#4b5563', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Unified view of all marketplace orders and transactions matching the Overview Dashboard.
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Transactions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: '0.25rem' }}>{totalItems}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirmed Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: '0.25rem' }}>{formatAmount(totals.delivered)}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Volume</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>{formatAmount(totals.outstanding)}</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '0.875rem 1.25rem', border: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', gap: '0.875rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Search Order #, Deal ID, Buyer, Seller…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem', width: '100%', maxWidth: '300px', outline: 'none' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.5rem 1.25rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      {/* Transactions Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Order / Tx ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Deal ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Buyer</th>
                <th style={{ padding: '0.75rem 1rem' }}>Seller</th>
                <th style={{ padding: '0.75rem 1rem' }}>Items</th>
                <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="tableEmpty">Loading transactions…</td></tr>
              ) : filteredRows.length ? (
                filteredRows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#111827', fontWeight: 600 }}>
                        {r.orderNumber || r.id?.slice(0, 8)}
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {r.dealNumber || r.dealId || r.deal?.dealNumber || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#374151', fontWeight: 500 }}>
                      {r.buyer?.companyName || r.buyer?.email || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                      {r.seller?.companyName || r.seller?.email || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                      {r.items?.length || 0}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#111827' }}>
                      {formatAmount(r.totalAmount)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`b2bBadge ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="tableEmpty">No transactions match your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <span style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{totalItems}</strong> total)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.8125rem', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.8125rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionReports
