import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api.js'
import { throwFriendly } from '../../utils/apiError.js'
import { fetchAdminStats } from '../../services/admin.service.js'

const STATUS_COLORS = {
  PENDING: 'b2bBadge--amber',
  CONFIRMED: 'b2bBadge--blue',
  SHIPPED: 'b2bBadge--blue',
  DELIVERED: 'b2bBadge--green',
  CANCELLED: 'b2bBadge--grey',
  APPROVED: 'b2bBadge--green',
  REJECTED: 'b2bBadge--grey',
  UNREAD: 'b2bBadge--amber',
  READ: 'b2bBadge--blue',
  REPLIED: 'b2bBadge--green',
}

const CHART_DAYS = 30

async function fetchAdminData(path, params = {}) {
  try {
    const { data } = await api.get(path, { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
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

function formatShortDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildDailySeries(users, days = CHART_DAYS) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - i))
    return { date, key: date.toISOString().slice(0, 10), count: 0, label: '' }
  })

  const map = Object.fromEntries(buckets.map((b) => [b.key, b]))

  for (const user of users) {
    if (!user?.createdAt) continue
    const key = new Date(user.createdAt).toISOString().slice(0, 10)
    if (map[key]) map[key].count += 1
  }

  return buckets.map((b) => ({
    ...b,
    label: b.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }))
}

function RegistrationChart({ title, subtitle, series, accent }) {
  const max = Math.max(1, ...series.map((s) => s.count))
  const total = series.reduce((sum, s) => sum + s.count, 0)
  const chartW = 640
  const chartH = 180
  const padX = 8
  const padY = 12
  const barGap = 4
  const barW = (chartW - padX * 2 - barGap * (series.length - 1)) / series.length

  return (
    <section className="panel adminOverview__chartPanel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">{title}</h2>
          <p className="panelSub">
            {subtitle} · {total} new in the last {CHART_DAYS} days
          </p>
        </div>
      </div>
      <div className="adminOverview__chartBody">
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 28}`}
          className="adminOverview__chartSvg"
          role="img"
          aria-label={`${title} for the last ${CHART_DAYS} days`}
        >
          {series.map((point, i) => {
            const h = point.count ? Math.max(6, (point.count / max) * (chartH - padY * 2)) : 4
            const x = padX + i * (barW + barGap)
            const y = chartH - padY - h
            return (
              <g key={point.key}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={point.count ? accent : '#e2e8f0'}
                  opacity={point.count ? 1 : 0.55}
                >
                  <title>{`${point.label}: ${point.count} registration${point.count === 1 ? '' : 's'}`}</title>
                </rect>
                {(i === 0 || i === series.length - 1 || i % 5 === 0) && (
                  <text
                    x={x + barW / 2}
                    y={chartH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

function DashboardCard({ title, subtitle, countLabel, count, linkTo, linkLabel, children }) {
  return (
    <section className="panel adminOverview__card">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">{title}</h2>
          <p className="panelSub">{subtitle}</p>
        </div>
        {countLabel ? (
          <div className="adminOverview__countPill" aria-label={countLabel}>
            <span className="adminOverview__countPillValue">{count}</span>
            <span className="adminOverview__countPillLabel">{countLabel}</span>
          </div>
        ) : null}
      </div>
      <div className="adminOverview__cardBody">{children}</div>
      {linkTo ? (
        <div className="adminOverview__cardFooter">
          <Link to={linkTo} className="metricCard__link">
            {linkLabel}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

export function AdminOverviewDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [buyers, setBuyers] = useState([])
  const [sellers, setSellers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categoryRequests, setCategoryRequests] = useState([])
  const [pendingCategoryCount, setPendingCategoryCount] = useState(0)
  const [messages, setMessages] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [
        statsData,
        buyersData,
        sellersData,
        txData,
        pendingReqData,
        allReqData,
        unreadData,
        msgData,
      ] = await Promise.all([
        fetchAdminStats(),
        fetchAdminData('/admin/buyers', { limit: 500, page: 1 }),
        fetchAdminData('/admin/sellers', { limit: 500, page: 1 }),
        fetchAdminData('/admin/transactions', { limit: 8, page: 1 }),
        fetchAdminData('/admin/category-requests', { status: 'PENDING', limit: 5, page: 1 }),
        fetchAdminData('/admin/category-requests', { limit: 5, page: 1 }),
        fetchAdminData('/admin/messages/unread-count'),
        fetchAdminData('/admin/messages', { status: 'UNREAD', limit: 5, page: 1 }),
      ])

      setStats(statsData)
      setBuyers(buyersData?.buyers ?? [])
      setSellers(sellersData?.sellers ?? [])
      setTransactions(txData?.transactions ?? [])
      setCategoryRequests(allReqData?.requests ?? [])
      setPendingCategoryCount(pendingReqData?.pagination?.total ?? pendingReqData?.requests?.length ?? 0)
      setUnreadMessages(unreadData?.count ?? 0)
      setMessages(msgData?.messages ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const buyerSeries = useMemo(() => buildDailySeries(buyers), [buyers])
  const sellerSeries = useMemo(() => buildDailySeries(sellers), [sellers])

  const latestCategoryRequest = categoryRequests[0]
  const pendingTotal = pendingCategoryCount + unreadMessages

  return (
    <div className="adminOverview">
      <style>{`
        .adminOverview {
          display: grid;
          gap: 20px;
        }
        .adminOverview__hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .adminOverview__heroTitle {
          margin: 0 0 6px;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-h);
          letter-spacing: -0.02em;
        }
        .adminOverview__heroSub {
          margin: 0;
          font-size: 14px;
          color: var(--text);
        }
        .adminOverview__metrics {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (min-width: 900px) {
          .adminOverview__metrics {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        .adminOverview__charts {
          display: grid;
          gap: 16px;
        }
        @media (min-width: 960px) {
          .adminOverview__charts {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .adminOverview__chartBody {
          padding: 12px 16px 8px;
        }
        .adminOverview__chartSvg {
          width: 100%;
          height: auto;
          display: block;
        }
        .adminOverview__cards {
          display: grid;
          gap: 16px;
        }
        @media (min-width: 960px) {
          .adminOverview__cards {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .adminOverview__card {
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .adminOverview__cardBody {
          padding: 0 16px 12px;
          flex: 1;
        }
        .adminOverview__cardFooter {
          padding: 0 16px 16px;
          border-top: 1px solid var(--border);
          margin-top: auto;
          padding-top: 12px;
        }
        .adminOverview__countPill {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 72px;
          padding: 8px 12px;
          border-radius: var(--radius-lg);
          background: var(--accent-soft);
          border: 1px solid var(--accent-border);
        }
        .adminOverview__countPillValue {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-h);
          line-height: 1;
        }
        .adminOverview__countPillLabel {
          margin-top: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .adminOverview__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .adminOverview__listItem {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: #f8fafc;
        }
        .adminOverview__listItemTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .adminOverview__listTitle {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-h);
          line-height: 1.35;
        }
        .adminOverview__listMeta {
          margin: 6px 0 0;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .adminOverview__summary {
          margin: 0;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--tint-amber, #fffbeb);
          border: 1px solid #fde68a;
          font-size: 13px;
          color: #92400e;
          line-height: 1.45;
        }
        .adminOverview__empty {
          margin: 0;
          padding: 20px 12px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }
        .adminOverview__miniTable {
          width: 100%;
          border-collapse: collapse;
        }
        .adminOverview__miniTable th,
        .adminOverview__miniTable td {
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          font-size: 12px;
          text-align: left;
          vertical-align: top;
        }
        .adminOverview__miniTable th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 600;
        }
        .adminOverview__miniTable tr:last-child td {
          border-bottom: none;
        }
      `}</style>

      <div className="adminOverview__hero">
        <div>
          <h1 className="adminOverview__heroTitle">Overview Dashboard</h1>
          <p className="adminOverview__heroSub">
            Platform activity, registrations, and items needing your attention.
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      <div className="adminOverview__metrics">
        <div className="metricCard metricCard--blue">
          <div className="metricCard__label">Buyers</div>
          <div className="metricCard__value">
            {loading ? '…' : (stats?.buyers ?? 0)}
          </div>
          <p className="metricCard__hint">Registered buyer accounts</p>
        </div>
        <div className="metricCard metricCard--green">
          <div className="metricCard__label">Sellers</div>
          <div className="metricCard__value">
            {loading ? '…' : (stats?.sellers ?? 0)}
          </div>
          <p className="metricCard__hint">Active seller accounts</p>
        </div>
        <div className="metricCard metricCard--purple">
          <div className="metricCard__label">Orders</div>
          <div className="metricCard__value">
            {loading ? '…' : (stats?.orders ?? 0)}
          </div>
          <p className="metricCard__hint">Total platform orders</p>
        </div>
        <div className="metricCard">
          <div className="metricCard__label">Revenue</div>
          <div className="metricCard__value">
            {loading ? '…' : formatAmount(stats?.revenue)}
          </div>
          <p className="metricCard__hint">Confirmed, shipped & delivered</p>
        </div>
      </div>

      <div className="adminOverview__charts">
        <RegistrationChart
          title="New Sellers"
          subtitle="Daily seller registrations"
          series={sellerSeries}
          accent="#10b981"
        />
        <RegistrationChart
          title="New Buyers"
          subtitle="Daily buyer registrations"
          series={buyerSeries}
          accent="#3b82f6"
        />
      </div>

      <div className="adminOverview__cards">
        <DashboardCard
          title="Category Requests"
          subtitle="Recent seller category submissions"
          countLabel="Pending"
          count={loading ? '…' : pendingCategoryCount}
          linkTo="/admin/category-requests"
          linkLabel="View all requests →"
        >
          {latestCategoryRequest ? (
            <>
              <p className="adminOverview__summary">
                Latest: <strong>{latestCategoryRequest.categoryName}</strong>
                {' '}from {latestCategoryRequest.seller?.companyName || latestCategoryRequest.seller?.email || 'Unknown seller'}
                {' '}· {formatDateTime(latestCategoryRequest.createdAt)}
              </p>
              <ul className="adminOverview__list" style={{ marginTop: 12 }}>
                {categoryRequests.slice(0, 4).map((req) => (
                  <li key={req.id} className="adminOverview__listItem">
                    <div className="adminOverview__listItemTop">
                      <p className="adminOverview__listTitle">{req.categoryName}</p>
                      <span className={`b2bBadge ${STATUS_COLORS[req.status] || ''}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="adminOverview__listMeta">
                      {req.seller?.companyName || req.seller?.email || '—'} · {formatShortDate(req.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="adminOverview__empty">
              {loading ? 'Loading requests…' : 'No category requests yet.'}
            </p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Recent Transactions"
          subtitle="Latest orders across the marketplace"
          linkTo="/admin/transactions"
          linkLabel="Open transaction reports →"
        >
          {transactions.length ? (
            <div className="tableWrap">
              <table className="adminOverview__miniTable">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td><code>{tx.orderNumber || tx.id?.slice(0, 8)}</code></td>
                      <td>{tx.buyer?.companyName || tx.buyer?.email || '—'}</td>
                      <td>{formatAmount(tx.totalAmount)}</td>
                      <td>
                        <span className={`b2bBadge ${STATUS_COLORS[tx.status] || ''}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td>{formatShortDate(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adminOverview__empty">
              {loading ? 'Loading transactions…' : 'No transactions recorded yet.'}
            </p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Pending Issues / Messages"
          subtitle="Unread support messages and pending requests"
          countLabel="Pending"
          count={loading ? '…' : pendingTotal}
          linkTo="/admin/messages"
          linkLabel="Open messages →"
        >
          <p className="adminOverview__summary" style={{ marginBottom: 12 }}>
            {unreadMessages} unread message{unreadMessages === 1 ? '' : 's'}
            {' · '}
            {pendingCategoryCount} pending category request{pendingCategoryCount === 1 ? '' : 's'}
          </p>
          {messages.length ? (
            <ul className="adminOverview__list">
              {messages.map((msg) => (
                <li key={msg.id} className="adminOverview__listItem">
                  <div className="adminOverview__listItemTop">
                    <p className="adminOverview__listTitle">{msg.subject || 'No subject'}</p>
                    <span className={`b2bBadge ${STATUS_COLORS[msg.status] || ''}`}>
                      {msg.status}
                    </span>
                  </div>
                  <p className="adminOverview__listMeta">
                    {msg.sender?.companyName || msg.sender?.email || 'Unknown user'}
                    {' · '}
                    {msg.sender?.role || 'USER'}
                    {' · '}
                    {formatDateTime(msg.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adminOverview__empty">
              {loading ? 'Loading messages…' : 'No unread messages — you are all caught up.'}
            </p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
