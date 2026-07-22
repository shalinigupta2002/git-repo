import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAdminSubscribers,
  fetchAdminSubscriberStats,
  updateAdminSubscriber,
  deactivateAdminSubscriber,
  reactivateAdminSubscriber,
} from '../../services/admin.service.js'
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

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({
    role: 'BUYER',
    buyerSubscriptionPlan: '',
    buyerSubscriptionStatus: '',
    sellerSubscriptionPlan: '',
    sellerSubscriptionStatus: '',
    expiresAt: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState(null)

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

  // Export to CSV of currently filtered subscribers
  const handleExportCSV = () => {
    if (!subscribers.length) {
      toast.error('No data available to export')
      return
    }

    const headers = ['User Name', 'User ID', 'Phone Number', 'Email', 'Role', 'Subscription Type', 'Status', 'Start Date', 'Expiry Date']
    const rows = subscribers.map(s => [
      s.userName || s.companyName || s.email.split('@')[0],
      s.userId || s.id,
      s.phone || '—',
      s.email,
      s.role,
      s.subscriptionType || 'No Active Subscription',
      s.status || 'INACTIVE',
      s.startsAt ? new Date(s.startsAt).toLocaleDateString('en-IN') : '—',
      s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('en-IN') : (s.status === 'ACTIVE' ? 'Lifetime' : '—')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `subscribers_report_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Filtered subscribers exported successfully!')
  }

  function openEditModal(subscriber) {
    setEditTarget(subscriber)
    setEditForm({
      role: subscriber.role || 'BUYER',
      buyerSubscriptionPlan: subscriber.buyerSubscription?.plan || '',
      buyerSubscriptionStatus: subscriber.buyerSubscription?.status || '',
      sellerSubscriptionPlan: subscriber.sellerSubscription?.plan || '',
      sellerSubscriptionStatus: subscriber.sellerSubscription?.status || '',
      expiresAt: subscriber.expiresAt ? new Date(subscriber.expiresAt).toISOString().slice(0, 16) : '',
    })
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editTarget) return
    setSavingEdit(true)
    try {
      const payload = {
        role: editForm.role,
        buyerSubscriptionPlan: editForm.buyerSubscriptionPlan || null,
        buyerSubscriptionStatus: editForm.buyerSubscriptionStatus || null,
        sellerSubscriptionPlan: editForm.sellerSubscriptionPlan || null,
        sellerSubscriptionStatus: editForm.sellerSubscriptionStatus || null,
        expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
      }
      await updateAdminSubscriber(editTarget.id, payload)
      toast.success('Subscriber updated')
      setEditTarget(null)
      loadSubscribers()
      loadStats()
    } catch (err) {
      toast.error(err.message || 'Failed to update subscriber')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeactivate(subscriber) {
    if (!window.confirm(`Deactivate ${subscriber.email}? They will be blocked from logging in.`)) return
    setDeactivatingId(subscriber.id)
    try {
      await deactivateAdminSubscriber(subscriber.id)
      toast.success('Subscriber deactivated')
      loadSubscribers()
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate subscriber')
    } finally {
      setDeactivatingId(null)
    }
  }

  async function handleReactivate(subscriber) {
    setDeactivatingId(subscriber.id)
    try {
      await reactivateAdminSubscriber(subscriber.id)
      toast.success('Subscriber reactivated')
      loadSubscribers()
    } catch (err) {
      toast.error(err.message || 'Failed to reactivate subscriber')
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <div className="subscribersDashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Subscribers Dashboard</h1>
        <p style={{ color: '#4b5563', marginTop: '0.25rem', fontSize: '0.875rem' }}>Monitor and manage user accounts, roles, and subscription status across the B2B marketplace.</p>
      </div>

      {/* KPI Stats Cards */}
      {statsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="dashboard-card-skeleton" style={{ height: '120px', background: '#f3f4f6', borderRadius: '12px' }} />
          <div className="dashboard-card-skeleton" style={{ height: '120px', background: '#f3f4f6', borderRadius: '12px' }} />
          <div className="dashboard-card-skeleton" style={{ height: '120px', background: '#f3f4f6', borderRadius: '12px' }} />
        </div>
      ) : statsError ? (
        <ErrorState title="Stats unavailable" message={statsError} onRetry={loadStats} />
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* Buyers Card */}
          <div 
            onClick={() => handleCardClick('BUYER')}
            style={{ 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: role === 'BUYER' ? '2px solid #2563eb' : '1px solid #bfdbfe',
              borderRadius: '14px',
              padding: '1.25rem',
              boxShadow: role === 'BUYER' ? '0 8px 12px -2px rgba(37, 99, 235, 0.15)' : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buyers</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d4ed8' }}>₹{parseFloat(stats.buyers.revenue).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', marginTop: '0.375rem' }}>{stats.buyers.total}</div>
            <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: '#1e40af' }}>
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
              border: role === 'SELLER' ? '2px solid #7c3aed' : '1px solid #e9d5ff',
              borderRadius: '14px',
              padding: '1.25rem',
              boxShadow: role === 'SELLER' ? '0 8px 12px -2px rgba(124, 58, 237, 0.15)' : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sellers</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7e22ce' }}>₹{parseFloat(stats.sellers.revenue).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#581c87', marginTop: '0.375rem' }}>{stats.sellers.total}</div>
            <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6b21a8' }}>
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
              border: role === 'BOTH' ? '2px solid #16a34a' : '1px solid #bbf7d0',
              borderRadius: '14px',
              padding: '1.25rem',
              boxShadow: role === 'BOTH' ? '0 8px 12px -2px rgba(22, 163, 74, 0.15)' : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bundles</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#15803d' }}>₹{parseFloat(stats.both.revenue).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#14532d', marginTop: '0.375rem' }}>{stats.both.total}</div>
            <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: '#166534' }}>
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
          padding: '1rem 1.25rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.875rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, alignItems: 'center' }}>
          <input
            style={{ 
              padding: '0.5rem 0.875rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              width: '100%',
              maxWidth: '280px',
              outline: 'none',
            }}
            placeholder="Search Name, User ID, Phone, Email…"
            value={search}
            onChange={handleSearchChange}
          />

          <select
            style={{ 
              padding: '0.5rem 1.25rem 0.5rem 0.75rem',
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
              padding: '0.5rem 1.25rem 0.5rem 0.75rem',
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
            gap: '0.375rem',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
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
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>User ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Phone Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Subscription Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Start Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Expiry Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(sub => {
                  const isActive = sub.status === 'ACTIVE'
                  const accountActive = sub.isActive !== false
                  
                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: accountActive ? 1 : 0.72 }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#111827' }}>
                        {sub.userName || sub.companyName || sub.email.split('@')[0]}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {sub.userId || sub.id?.slice(0, 8)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                        {sub.phone || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>
                        {sub.email}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span 
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: sub.role === 'BUYER' ? '#eff6ff' : '#faf5ff',
                            color: sub.role === 'BUYER' ? '#1d4ed8' : '#7e22ce'
                          }}
                        >
                          {sub.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#1f2937' }}>
                        {sub.subscriptionType || 'No Active Subscription'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span 
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {sub.status || 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                        {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                        {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (isActive ? 'Lifetime' : '—')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" className="btnOutline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => openEditModal(sub)}>
                            Edit
                          </button>
                          {accountActive ? (
                            <button
                              type="button"
                              className="btnOutline"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: '#b91c1c', borderColor: '#fecaca' }}
                              disabled={deactivatingId === sub.id}
                              onClick={() => handleDeactivate(sub)}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btnOutline"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: '#15803d', borderColor: '#bbf7d0' }}
                              disabled={deactivatingId === sub.id}
                              onClick={() => handleReactivate(sub)}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                        {!accountActive ? (
                          <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '0.25rem' }}>Account deactivated</div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <span style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{totalItems}</strong> entries)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  style={{ 
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    fontSize: '0.8125rem',
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
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    fontSize: '0.8125rem',
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
      {editTarget ? (
        <div className="modalOverlay" onClick={() => setEditTarget(null)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-subscriber-title">
            <h3 id="edit-subscriber-title" className="modal__title">Edit subscriber</h3>
            <p className="panelSub" style={{ marginTop: 0 }}>
              {editTarget.email} · {editTarget.userId || editTarget.id}
            </p>
            <form onSubmit={handleSaveEdit} className="b2bForm" style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
              <div>
                <label className="b2bLabel">Membership type (role)</label>
                <select className="b2bSelect" value={editForm.role} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </select>
              </div>
              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel">Buyer plan</label>
                  <select className="b2bSelect" value={editForm.buyerSubscriptionPlan} onChange={(e) => setEditForm((prev) => ({ ...prev, buyerSubscriptionPlan: e.target.value }))}>
                    <option value="">—</option>
                    <option value="BUYER_STANDARD">Buyer Standard</option>
                    <option value="BUYER_LIFETIME">Buyer Lifetime</option>
                    <option value="BOTH_STANDARD_MONTH">Both Standard + Month</option>
                    <option value="BOTH_LIFETIME_LIFETIME">Both Lifetime</option>
                    <option value="BOTH_LIFETIME_MONTH">Both Lifetime + Month</option>
                    <option value="BOTH_STANDARD_LIFETIME">Both Standard + Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="b2bLabel">Buyer status</label>
                  <select className="b2bSelect" value={editForm.buyerSubscriptionStatus} onChange={(e) => setEditForm((prev) => ({ ...prev, buyerSubscriptionStatus: e.target.value }))}>
                    <option value="">—</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel">Seller plan</label>
                  <select className="b2bSelect" value={editForm.sellerSubscriptionPlan} onChange={(e) => setEditForm((prev) => ({ ...prev, sellerSubscriptionPlan: e.target.value }))}>
                    <option value="">—</option>
                    <option value="SELLER_MONTH">Seller Month</option>
                    <option value="SELLER_LIFETIME">Seller Lifetime</option>
                    <option value="BOTH_STANDARD_MONTH">Both Standard + Month</option>
                    <option value="BOTH_LIFETIME_LIFETIME">Both Lifetime</option>
                    <option value="BOTH_LIFETIME_MONTH">Both Lifetime + Month</option>
                    <option value="BOTH_STANDARD_LIFETIME">Both Standard + Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="b2bLabel">Seller status</label>
                  <select className="b2bSelect" value={editForm.sellerSubscriptionStatus} onChange={(e) => setEditForm((prev) => ({ ...prev, sellerSubscriptionStatus: e.target.value }))}>
                    <option value="">—</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="b2bLabel">Expiry date</label>
                <input
                  type="datetime-local"
                  className="b2bInput"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
              <div className="modal__footer">
                <button type="button" className="btnOutline" onClick={() => setEditTarget(null)} disabled={savingEdit}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SubscribersDashboard
