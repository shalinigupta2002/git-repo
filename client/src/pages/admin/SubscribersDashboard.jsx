import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { fetchAdminSubscribers, fetchAdminSubscriberStats } from '../../services/admin.service.js'
import { EmptyState } from '../../components/common/EmptyState.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { DealListSkeleton } from '../../components/deals/LoadingSkeleton.jsx'

export function SubscribersDashboard() {
  const [stats, setStats] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statsError, setStatsError] = useState('')

  // Filters
  const [role, setRole] = useState('ALL') // ALL, BUYER, SELLER, BOTH
  const [status, setStatus] = useState('ALL') // ALL, ACTIVE, EXPIRED, CANCELLED
  const [planType, setPlanType] = useState('ALL') // ALL, MONTHLY, ANNUAL, LIFETIME
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const limit = 15

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError('')
    try {
      const data = await fetchAdminSubscriberStats()
      setStats(data)
    } catch (err) {
      setStatsError(err.message || 'Failed to load subscriber stats')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadSubscribers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        limit,
        role,
        status,
        planType,
        search: search.trim()
      }
      const data = await fetchAdminSubscribers(params)
      setSubscribers(data?.subscribers || [])
      setTotalPages(data?.pagination?.totalPages || 1)
      setTotalItems(data?.pagination?.total || 0)
    } catch (err) {
      setSubscribers([])
      setError(err.message || 'Failed to load subscribers list')
    } finally {
      setLoading(false)
    }
  }, [page, role, status, planType, search])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadSubscribers()
  }, [loadSubscribers])

  const handleCardClick = (targetRole) => {
    setRole(prev => prev === targetRole ? 'ALL' : targetRole)
    setPage(1)
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusChange = (e) => {
    setStatus(e.target.value)
    setPage(1)
  }

  const handlePlanTypeChange = (e) => {
    setPlanType(e.target.value)
    setPage(1)
  }

  // Format subscription string beautifully
  const formatSubscription = (sub) => {
    if (!sub) return '—'
    const cleanPlanName = sub.plan
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
    return `${cleanPlanName} (${sub.type})`
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (!subscribers.length) {
      toast.error('No data available to export')
      return
    }

    const headers = ['Email', 'Company', 'Role', 'Status', 'Buyer Plan', 'Buyer Expiry', 'Seller Plan', 'Seller Expiry', 'Created At']
    const rows = subscribers.map(s => [
      s.email,
      s.companyName || '—',
      s.role,
      s.buyerSubscription?.status || s.sellerSubscription?.status || 'INACTIVE',
      s.buyerSubscription ? formatSubscription(s.buyerSubscription) : 'None',
      s.buyerSubscription?.expiresAt ? new Date(s.buyerSubscription.expiresAt).toLocaleDateString() : 'N/A',
      s.sellerSubscription ? formatSubscription(s.sellerSubscription) : 'None',
      s.sellerSubscription?.expiresAt ? new Date(s.sellerSubscription.expiresAt).toLocaleDateString() : 'N/A',
      new Date(s.createdAt).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `subscribers_report_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV report exported successfully!')
  }

  return (
    <div className="dealPage" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Subscribers Dashboard</h1>
        <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>Monitor and manage active, expired, and bundled subscription plans across the B2B marketplace.</p>
      </div>

      {/* KPI Stats Cards */}
      {statsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="dashboard-card-skeleton" style={{ height: '140px', background: '#f3f4f6', borderRadius: '12px' }} />
          <div className="dashboard-card-skeleton" style={{ height: '140px', background: '#f3f4f6', borderRadius: '12px' }} />
          <div className="dashboard-card-skeleton" style={{ height: '140px', background: '#f3f4f6', borderRadius: '12px' }} />
        </div>
      ) : statsError ? (
        <ErrorState title="Stats unavailable" message={statsError} onRetry={loadStats} />
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Buyers Card */}
          <div 
            onClick={() => handleCardClick('BUYER')}
            style={{ 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: role === 'BUYER' ? '2.5px solid #2563eb' : '1px solid #bfdbfe',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: role === 'BUYER' ? '0 10px 15px -3px rgba(37, 99, 235, 0.15)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
              transform: role === 'BUYER' ? 'translateY(-2px)' : 'none'
            }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buyers</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>₹{parseFloat(stats.buyers.revenue).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a', marginTop: '0.5rem' }}>{stats.buyers.total}</div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#1e40af' }}>
              <span>🟢 <strong>{stats.buyers.active}</strong> Active</span>
              <span>🔴 <strong>{stats.buyers.expired}</strong> Expired</span>
            </div>
          </div>

          {/* Sellers Card */}
          <div 
            onClick={() => handleCardClick('SELLER')}
            style={{ 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
              border: role === 'SELLER' ? '2.5px solid #7c3aed' : '1px solid #e9d5ff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: role === 'SELLER' ? '0 10px 15px -3px rgba(124, 58, 237, 0.15)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
              transform: role === 'SELLER' ? 'translateY(-2px)' : 'none'
            }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sellers</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7e22ce' }}>₹{parseFloat(stats.sellers.revenue).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#581c87', marginTop: '0.5rem' }}>{stats.sellers.total}</div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b21a8' }}>
              <span>🟢 <strong>{stats.sellers.active}</strong> Active</span>
              <span>🔴 <strong>{stats.sellers.expired}</strong> Expired</span>
            </div>
          </div>

          {/* Unified Both Card */}
          <div 
            onClick={() => handleCardClick('BOTH')}
            style={{ 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: role === 'BOTH' ? '2.5px solid #16a34a' : '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: role === 'BOTH' ? '0 10px 15px -3px rgba(22, 163, 74, 0.15)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
              transform: role === 'BOTH' ? 'translateY(-2px)' : 'none'
            }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bundles</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>₹{parseFloat(stats.both.revenue).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#14532d', marginTop: '0.5rem' }}>{stats.both.total}</div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#166534' }}>
              <span>🟢 <strong>{stats.both.active}</strong> Active</span>
              <span>🔴 <strong>{stats.both.expired}</strong> Expired</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Control filters bar */}
      <div 
        style={{ 
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', flex: 1, maxHeight: '44px', minWidth: '320px' }}>
          <input
            style={{ 
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              width: '100%',
              maxWidth: '300px',
              outline: 'none',
              transition: 'border 0.2s'
            }}
            placeholder="Search name, company, email…"
            value={search}
            onChange={handleSearchChange}
          />

          <select
            style={{ 
              padding: '0.625rem 1.5rem 0.625rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              background: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
            value={status}
            onChange={handleStatusChange}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            style={{ 
              padding: '0.625rem 1.5rem 0.625rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              background: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
            value={planType}
            onChange={handlePlanTypeChange}
          >
            <option value="ALL">All Plan Types</option>
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            <option value="LIFETIME">Lifetime</option>
          </select>
        </div>

        <button 
          onClick={handleExportCSV}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          className="btn-dark"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <DealListSkeleton rows={5} />
      ) : error ? (
        <ErrorState title="Failed to fetch data" message={error} onRetry={loadSubscribers} />
      ) : subscribers.length === 0 ? (
        <EmptyState title="No subscribers found" description="Try adjusting your filters or search terms." />
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600 }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Subscriber</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Company</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Role</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Buyer Sub</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Seller Sub</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Start Date</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(sub => {
                  const activeSub = sub.buyerSubscription || sub.sellerSubscription
                  const isBothActive = sub.buyerSubscription?.status === 'ACTIVE' && sub.sellerSubscription?.status === 'ACTIVE'
                  
                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s', hover: { background: '#f9fafb' } }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#111827' }}>{sub.email.split('@')[0]}</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b21a8' }}>{sub.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#374151', fontWeight: 500 }}>{sub.companyName || '—'}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span 
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            background: sub.role === 'BUYER' ? '#eff6ff' : '#faf5ff',
                            color: sub.role === 'BUYER' ? '#1d4ed8' : '#7e22ce'
                          }}
                        >
                          {sub.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#4b5563' }}>
                        {sub.buyerSubscription ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{formatSubscription(sub.buyerSubscription)}</span>
                            <span style={{ fontSize: '0.75rem', color: sub.buyerSubscription.status === 'ACTIVE' ? '#16a34a' : '#ef4444' }}>{sub.buyerSubscription.status}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#4b5563' }}>
                        {sub.sellerSubscription ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{formatSubscription(sub.sellerSubscription)}</span>
                            <span style={{ fontSize: '0.75rem', color: sub.sellerSubscription.status === 'ACTIVE' ? '#16a34a' : '#ef4444' }}>{sub.sellerSubscription.status}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span 
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            background: isBothActive ? '#dcfce7' : (activeSub?.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2'),
                            color: isBothActive ? '#15803d' : (activeSub?.status === 'ACTIVE' ? '#15803d' : '#b91c1c')
                          }}
                        >
                          {isBothActive ? 'ACTIVE (BOTH)' : (activeSub?.status || 'INACTIVE')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#4b5563' }}>
                        {activeSub?.startsAt ? new Date(activeSub.startsAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#4b5563' }}>
                        {activeSub?.expiresAt ? new Date(activeSub.expiresAt).toLocaleDateString() : 'Lifetime'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{totalItems}</strong> entries)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  style={{ 
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    fontSize: '0.875rem',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    opacity: page === 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  style={{ 
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    fontSize: '0.875rem',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    opacity: page === totalPages ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
export default SubscribersDashboard
