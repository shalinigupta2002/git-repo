import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { EmptyState } from '../../components/common/EmptyState.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { DealListSkeleton } from '../../components/deals/LoadingSkeleton.jsx'
import {
  listDealChargeConfigs,
  updateDealChargeConfig,
} from '../../services/deal.service.js'
import { formatDealAmount } from '../../utils/dealHelpers.js'

function validateConfigDraft(draft) {
  const errors = {}
  const value = Number(draft.value)
  if (!Number.isFinite(value) || value < 0) {
    errors.value = 'Value must be zero or greater.'
  }
  if (draft.chargeType === 'PERCENTAGE' && value > 100) {
    errors.value = 'Percentage cannot exceed 100.'
  }
  if (draft.currency && draft.currency.trim().length !== 3) {
    errors.currency = 'Currency must be a 3-letter code.'
  }
  return errors
}

function EditConfigDialog({ config, open, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    chargeType: 'PERCENTAGE',
    value: '0',
    currency: 'INR',
    displayName: '',
    isActive: true,
  })
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    setDraft({
      chargeType: config.chargeType || 'PERCENTAGE',
      value: String(config.value ?? '0'),
      currency: config.currency || 'INR',
      displayName: config.displayName || '',
      isActive: Boolean(config.isActive),
    })
    setErrors({})
    setConfirmOpen(false)
  }, [config])

  if (!open || !config) return null

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateConfigDraft(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setConfirmOpen(true)
  }

  async function handleConfirmSave() {
    setSaving(true)
    try {
      const payload = {
        chargeType: draft.chargeType,
        value: Number(draft.value),
        currency: draft.currency.trim().toUpperCase(),
        displayName: draft.displayName.trim() || null,
        isActive: draft.isActive,
      }
      const data = await updateDealChargeConfig(config.id, payload)
      toast.success('Deal charge configuration updated')
      onSaved?.(data?.config)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to update configuration')
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="modalOverlay" onClick={onClose} role="presentation">
        <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
          <h3 className="modal__title">Edit deal charge config</h3>
          <p className="panelSub" style={{ marginTop: 0 }}>
            {config.audience} · {config.planKey}
          </p>

          <form onSubmit={handleSubmit} className="modal__form">
            <label className="b2bField">
              <span>Display name</span>
              <input
                className="b2bInput"
                value={draft.displayName}
                onChange={(event) => setDraft((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </label>

            <label className="b2bField">
              <span>Charge type</span>
              <select
                className="b2bSelect"
                value={draft.chargeType}
                onChange={(event) => setDraft((prev) => ({ ...prev, chargeType: event.target.value }))}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat</option>
              </select>
            </label>

            <label className="b2bField">
              <span>Value</span>
              <input
                className="b2bInput"
                type="number"
                min="0"
                step="0.01"
                value={draft.value}
                onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
              />
              {errors.value ? <span className="fieldError">{errors.value}</span> : null}
            </label>

            <label className="b2bField">
              <span>Currency</span>
              <input
                className="b2bInput"
                maxLength={3}
                value={draft.currency}
                onChange={(event) => setDraft((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
              />
              {errors.currency ? <span className="fieldError">{errors.currency}</span> : null}
            </label>

            <label className="b2bCheckbox">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Active
            </label>

            <div className="modal__footer">
              <button type="button" className="btnOutline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btnPrimary">Review changes</button>
            </div>
          </form>
        </div>
      </div>

      {confirmOpen ? (
        <div className="modalOverlay" onClick={() => setConfirmOpen(false)} role="presentation">
          <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="modal__title">Confirm update</h3>
            <p style={{ margin: '0 0 1rem', color: '#374151' }}>
              Save changes to {config.displayName || config.planKey}?
            </p>
            <div className="modal__footer">
              <button type="button" className="btnOutline" onClick={() => setConfirmOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btnPrimary" onClick={handleConfirmSave} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function AdminDealChargeConfig() {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listDealChargeConfigs()
      setConfigs(Array.isArray(data?.configs) ? data.configs : [])
    } catch (err) {
      setConfigs([])
      setError(err.message || 'Failed to load deal charge configs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function formatConfigValue(config) {
    if (config.chargeType === 'PERCENTAGE') return `${config.value}%`
    return formatDealAmount(config.value, config.currency)
  }

  return (
    <section className="panel dealPage">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Deal charge configuration</h2>
          <p className="panelSub">Manage buyer and seller deal charge rules by subscription plan.</p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <ErrorState title="Could not load configs" message={error} onRetry={load} /> : null}
      {loading ? <DealListSkeleton rows={3} /> : null}

      {!loading && !error && !configs.length ? (
        <EmptyState title="No charge configs" description="Seed data may be missing on this environment." />
      ) : null}

      {!loading && !error && configs.length ? (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Audience</th>
                <th>Plan</th>
                <th>Display name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Active</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id}>
                  <td>{config.audience}</td>
                  <td><code>{config.planKey}</code></td>
                  <td>{config.displayName || '—'}</td>
                  <td>{config.chargeType}</td>
                  <td>{formatConfigValue(config)}</td>
                  <td>{config.isActive ? 'Yes' : 'No'}</td>
                  <td>{config.updatedAt ? new Date(config.updatedAt).toLocaleString() : '—'}</td>
                  <td>
                    <button type="button" className="btnOutline btnOutline--sm" onClick={() => setEditing(config)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <EditConfigDialog
        config={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          if (!saved?.id) {
            load()
            return
          }
          setConfigs((prev) => prev.map((row) => (row.id === saved.id ? saved : row)))
        }}
      />
    </section>
  )
}
