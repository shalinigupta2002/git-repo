import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackNavButton } from '../../components/common/BackNavButton.jsx'
import { listOrders } from '../../services/order.service.js'
import { getDealPayment } from '../../utils/dealHelpers.js'

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

function statusLabel(status) {
  if (status === 'SUCCESS') return 'Paid'
  if (status === 'PENDING') return 'Pending'
  if (status === 'FAILED') return 'Failed'
  if (status === 'REFUNDED') return 'Refunded'
  return status || 'Pending'
}

export function BuyerTransactions() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [selectedTx, setSelectedTx] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listOrders({ limit: 100, scope: 'buyer' })
      setOrders(Array.isArray(data?.orders) ? data.orders : [])
    } catch (e) {
      setError(e.message || 'Failed to load transactions')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const transactions = orders.map((o) => {
    const payment = o.payments?.find((p) => p.payerRole === 'BUYER') || getDealPayment(o, 'BUYER')
    const charge = o.buyerDealCharge || payment?.amount || 0
    return {
      id: payment?.id || `tx-${o.id}`,
      orderId: o.orderNumber || o.dealNumber || o.id,
      dealId: o.id,
      amount: charge,
      currency: payment?.currency || o.currency || 'INR',
      status: payment?.paymentStatus || 'PENDING',
      txRef: payment?.paymentReference || '—',
      razorpayPaymentId: payment?.providerPaymentId || null,
      razorpayOrderId: payment?.providerOrderId || null,
      paymentMethod: payment?.provider === 'razorpay' ? 'Secure Payment (Test Mode)' : 'Platform Deal Charge',
      createdAt: payment?.paidAt || o.createdAt,
      timeline: o.events || [],
    }
  })

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Paid') return tx.status === 'SUCCESS'
    if (activeTab === 'Pending') return tx.status === 'PENDING'
    if (activeTab === 'Failed') return tx.status === 'FAILED'
    if (activeTab === 'Refunded') return tx.status === 'REFUNDED'
    return true
  })

  return (
    <section className="panel" data-testid="buyer-transactions-page">
      <div className="panelHeader">
        <div>
          <BackNavButton fallback="/buyer/dashboard" label="← Back" className="backNavBtn backNavBtn--inline" />
          <h2 className="panelTitle">Transactions</h2>
          <p className="panelSub">
            Platform deal charge transaction records · {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="transactionTabs">
        {['All', 'Pending', 'Paid', 'Failed', 'Refunded'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn ${activeTab === tab ? 'btnPrimary' : 'btnOutline'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? <div className="errorBox" style={{ margin: '12px 0' }}>{error}</div> : null}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Order ID</th>
              <th>Deal Charge</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="tableEmpty">Loading transactions…</td></tr>
            ) : filteredTransactions.length ? (
              filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td><code>{tx.txRef}</code></td>
                  <td><Link to={`/buyer/deals/${tx.dealId}`}><code>{tx.orderId}</code></Link></td>
                  <td style={{ fontWeight: 700 }}>{formatAmount(tx.amount, tx.currency)}</td>
                  <td>{tx.paymentMethod}</td>
                  <td>
                    <span className={`b2bBadge ${tx.status === 'SUCCESS' ? 'b2bBadge--green' : tx.status === 'FAILED' ? 'b2bBadge--red' : 'b2bBadge--amber'}`}>
                      {statusLabel(tx.status)}
                    </span>
                  </td>
                  <td>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btnOutline btnOutline--sm"
                      onClick={() => setSelectedTx(tx)}
                      disabled={tx.status !== 'SUCCESS'}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="tableEmpty">
                No transactions found. <Link to="/buyer/deals">Go To My Orders</Link> to pay deal charges.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTx ? (
        <div className="modalOverlay" onClick={() => setSelectedTx(null)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h3 className="modal__title">Transaction Details</h3>
            <button type="button" className="backNavBtn backNavBtn--inline" onClick={() => setSelectedTx(null)}>
              ← Back
            </button>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: 13 }}>
              Payment Reference: <code>{selectedTx.txRef}</code>
            </p>

            <dl className="dealInfoGrid" style={{ gap: 12, marginBottom: 20 }}>
              <div><dt>Transaction ID</dt><dd><code>{selectedTx.id}</code></dd></div>
              <div><dt>Order ID</dt><dd><code>{selectedTx.orderId}</code></dd></div>
              <div><dt>Deal Charge</dt><dd style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{formatAmount(selectedTx.amount, selectedTx.currency)}</dd></div>
              <div><dt>Status</dt><dd><span className="b2bBadge b2bBadge--green">{statusLabel(selectedTx.status)}</span></dd></div>
              <div><dt>Payment Method</dt><dd>{selectedTx.paymentMethod}</dd></div>
              <div><dt>Payment Date</dt><dd>{selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : '—'}</dd></div>
              <div><dt>Payment ID</dt><dd><code>{selectedTx.razorpayPaymentId || '—'}</code></dd></div>
              <div><dt>Order ID</dt><dd><code>{selectedTx.razorpayOrderId || '—'}</code></dd></div>
            </dl>

            <div className="panel panel--nested" style={{ marginBottom: 16 }}>
              <h4 className="panelTitle" style={{ fontSize: 14 }}>Timeline</h4>
              <ul className="transactionTimeline">
                <li>Transaction created · {selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : '—'}</li>
                {selectedTx.status === 'SUCCESS' ? <li>Payment completed successfully</li> : null}
              </ul>
            </div>

            <div className="receiptPlaceholder">
              <strong>Receipt</strong>
              <p>Coming Soon</p>
            </div>

            <div className="modal__footer">
              <button type="button" className="btnPrimary" onClick={() => setSelectedTx(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
