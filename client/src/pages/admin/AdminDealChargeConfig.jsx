import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { EmptyState } from '../../components/common/EmptyState.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { DealListSkeleton } from '../../components/deals/LoadingSkeleton.jsx'
import {
  listDealChargeConfigs,
  updateDealChargeConfig,
} from '../../services/deal.service.js'
import { fetchAdminAuditLogs } from '../../services/admin.service.js'
import { formatDealAmount } from '../../utils/dealHelpers.js'

function validateConfigDraft(draft) {
  const errors = {}
  const value = Number(draft.value)
  if (draft.value.trim() === '' || Number.isNaN(value) || value < 0) {
    errors.value = 'Value must be a valid positive number.'
  }
  if (draft.chargeType === 'PERCENTAGE' && value > 100) {
    errors.value = 'Percentage cannot exceed 100%.'
  }
  return errors
}

export function AdminDealChargeConfig() {
  const [configs, setConfigs] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  
  // Edit Dialog Draft State
  const [draftValue, setDraftValue] = useState('')
  const [draftType, setDraftType] = useState('PERCENTAGE')
  const [fieldErrors, setFieldErrors] = useState({})
  
  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const data = await fetchAdminAuditLogs({
        resource: 'deal_charge_config',
        limit: 10
      })
      setAuditLogs(data?.logs || [])
    } catch {
      // Keep silent on logs load errors
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listDealChargeConfigs()
      setConfigs(Array.isArray(data?.configs) ? data.configs : [])
      await loadLogs()
    } catch (err) {
      setConfigs([])
      setError(err.message || 'Failed to load deal charge configs')
    } finally {
      setLoading(false)
    }
  }, [loadLogs])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = (config) => {
    setEditing(config)
    setDraftValue(String(config.value ?? '0'))
    setDraftType(config.chargeType || 'PERCENTAGE')
    setFieldErrors({})
    setConfirmOpen(false)
  }

  const handleReview = (e) => {
    e.preventDefault()
    const nextErrors = validateConfigDraft({ value: draftValue, chargeType: draftType })
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    setSaving(true)
    try {
      const payload = {
        chargeType: draftType,
        value: Number(draftValue),
        currency: editing.currency || 'INR',
        displayName: editing.displayName || null,
        isActive: true,
      }
      await updateDealChargeConfig(editing.id, payload)
      toast.success('Deal charge setting updated and synced successfully')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  const getCardGradient = (planKey) => {
    if (planKey === 'MONTHLY') return 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
    if (planKey === 'ANNUAL') return 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
    return 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }} className="dealPage">
      <div>
        <h2 className="panelTitle" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Deal Charge Settings</h2>
        <p className="panelSub" style={{ color: '#4b5563', marginTop: '0.25rem' }}>Define deal transaction percentages based purely on subscription tier.</p>
      </div>

      {error ? <ErrorState title="Could not load configs" message={error} onRetry={load} /> : null}
      {loading ? <DealListSkeleton rows={3} /> : null}

      {!loading && !error && !configs.length ? (
        <EmptyState title="No charge configs" description="Default configurations could not be loaded." />
      ) : null}

      {/* Primary Settings Cards Grid */}
      {!loading && !error && configs.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {configs.map((config) => {
            const displayVal = config.chargeType === 'PERCENTAGE' ? `${config.value}%` : formatDealAmount(config.value, config.currency)
            
            return (
              <div 
                key={config.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  hover: { transform: 'translateY(-4px)' }
                }}
              >
                {/* Header Band */}
                <div style={{ background: getCardGradient(config.planKey), padding: '1.5rem', color: '#fff' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.625rem', borderRadius: '20px' }}>
                    {config.audience} PLAN
                  </span>
                  <h3 style={{ margin: '0.75rem 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{config.displayName}</h3>
                </div>

                {/* Content Details */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Transaction Fee</span>
                    <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827' }}>{displayVal}</span>
                  </div>

                  <hr style={{ border: 0, borderTop: '1px solid #f3f4f6', margin: 0 }} />

                  {/* Settings KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Subscribers</span>
                      <strong style={{ fontSize: '1.125rem', color: '#1f2937' }}>{config.subscribersCount ?? 0}</strong>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Pending Deals</span>
                      <strong style={{ fontSize: '1.125rem', color: '#1f2937' }}>{config.pendingDealsCount ?? 0}</strong>
                    </div>
                  </div>

                  <hr style={{ border: 0, borderTop: '1px solid #f3f4f6', margin: 0 }} />

                  {/* Metadata Footer */}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span>Last updated: {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'System Seed'}</span>
                    {config.updatedBy ? (
                      <span>By: <strong>{config.updatedBy.email}</strong> ({config.updatedBy.companyName || 'Admin'})</span>
                    ) : (
                      <span>By: System</span>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                  <button 
                    onClick={() => startEdit(config)}
                    style={{ 
                      width: '100%',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px',
                      padding: '0.625rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✏️ Edit Charge Setting
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Edit Overlay Form Modal */}
      {editing ? (
        <div className="modalOverlay" onClick={() => setEditing(null)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ borderRadius: '16px', maxWidth: '480px' }}>
            <h3 className="modal__title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Update Deal Charge Setting</h3>
            <p className="panelSub" style={{ marginTop: '0.25rem', marginBottom: '1.5rem', color: '#6b7280' }}>
              Modify rates for subscribers on the <strong>{editing.displayName} ({editing.planKey})</strong> tier.
            </p>

            <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label className="b2bField" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Charge Calculation Type</span>
                <select
                  className="b2bSelect"
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Fee (Fixed)</option>
                </select>
              </label>

              <label className="b2bField" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  {draftType === 'PERCENTAGE' ? 'Percentage Rate (%)' : `Fee Amount (${editing.currency || 'INR'})`}
                </span>
                <input
                  type="number"
                  className="b2bInput"
                  step="0.01"
                  min="0"
                  max={draftType === 'PERCENTAGE' ? '100' : undefined}
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  placeholder="e.g. 7.5"
                />
                {fieldErrors.value ? (
                  <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 500 }}>⚠️ {fieldErrors.value}</span>
                ) : null}
              </label>

              <div className="modal__footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btnOutline" onClick={() => setEditing(null)} style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  Cancel
                </button>
                <button type="submit" className="btnPrimary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#111827', color: '#fff', border: 0 }}>
                  Review & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Double Confirmation Modal */}
      {confirmOpen && editing ? (
        <div className="modalOverlay" onClick={() => setConfirmOpen(false)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ borderRadius: '16px', maxWidth: '420px', padding: '1.5rem' }}>
            <h3 className="modal__title" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Confirm Configuration Update
            </h3>
            <p style={{ margin: '1rem 0 1.5rem', color: '#374151', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Are you sure you want to update the <strong>{editing.displayName}</strong> charge settings to 
              <strong> {draftValue}{draftType === 'PERCENTAGE' ? '%' : ` ${editing.currency || 'INR'}`}</strong>? 
              <br /><br />
              This will automatically update the transaction charges for all subsequent new and unpaid deals using this plan tier.
            </p>
            <div className="modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btnOutline" onClick={() => setConfirmOpen(false)} disabled={saving} style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
                Cancel
              </button>
              <button type="button" className="btnPrimary" onClick={handleConfirmSave} disabled={saving} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#dc2626', color: '#fff', border: 0 }}>
                {saving ? 'Updating…' : 'Confirm Sync'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Audit History Log trail */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Recent Audit History</h3>
        
        {logsLoading ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>Loading audit trails…</div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '1rem', color: '#9ca3af', textAlign: 'center' }}>No recent updates recorded.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Plan Tier</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Previous Value</th>
                  <th style={{ padding: '0.75rem 1rem' }}>New Value</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Editor Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const meta = log.meta || {}
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#374151' }}>
                        {meta.planKey} ({meta.audience})
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#b91c1c' }}>{meta.previousValue}%</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#15803d', fontWeight: 700 }}>{meta.newValue}%</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>{log.actor?.email || 'System'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default AdminDealChargeConfig
