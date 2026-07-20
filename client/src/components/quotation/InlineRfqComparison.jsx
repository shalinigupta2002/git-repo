import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Spinner } from '../ui/Spinner.jsx'
import {
  acceptQuote,
  getRfqGroupComparison,
  rejectQuote,
} from '../../services/quoteRequest.service.js'
import { getPortalUserId } from '../../utils/sellerDisplay.js'
import {
  formatQuotationDate,
  formatQuoteMoney,
  getQuoteStatusDisplay,
  isBuyerQuotationActionable,
  isQuoteExpired,
} from '../../utils/quotationHelpers.js'
import { AcceptConfirmModal, OrderCreatedModal } from './AcceptQuotationModals.jsx'
import { BackNavButton } from '../common/BackNavButton.jsx'

function StatusBadge({ status, expired = false }) {
  const { label, badge } = getQuoteStatusDisplay(status, { expired, mode: 'buyer' })
  return <span className={`b2bBadge ${badge}`}>{label}</span>
}

export function InlineRfqComparison({
  rfqGroupId,
  hasFullAccess,
  onSubscribeRequired,
  onAccepted,
  onBack,
}) {
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [group, setGroup] = useState(null)
  const [confirmRequest, setConfirmRequest] = useState(null)
  const [successPayload, setSuccessPayload] = useState(null)

  const loadGroup = useCallback(async () => {
    if (!rfqGroupId) return
    setLoading(true)
    try {
      const data = await getRfqGroupComparison(rfqGroupId)
      setGroup(data?.group || null)
    } catch (error) {
      toast.error(error?.message || 'Failed to load quotation comparison')
      setGroup(null)
    } finally {
      setLoading(false)
    }
  }, [rfqGroupId])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  async function executeAccept(quotationId) {
    setBusyId(quotationId)
    try {
      const data = await acceptQuote(quotationId)
      setConfirmRequest(null)
      setSuccessPayload(data)
      await loadGroup()
      onAccepted?.(data)
    } catch (error) {
      toast.error(error?.message || 'Could not accept quotation.')
    } finally {
      setBusyId('')
    }
  }

  async function handleReject(quotationId) {
    if (!hasFullAccess) {
      onSubscribeRequired?.()
      return
    }
    setBusyId(quotationId)
    try {
      await rejectQuote(quotationId)
      toast.success('Quotation rejected.')
      await loadGroup()
    } catch (error) {
      toast.error(error?.message || 'Could not reject quotation.')
    } finally {
      setBusyId('')
    }
  }

  if (loading) {
    return (
      <div className="rfqWs__card rfqWsBlock" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Spinner />
        <p style={{ margin: 0 }}>Loading seller quotations…</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="rfqWsCenter__empty rfqWs__card">
        <h2>RFQ group unavailable</h2>
        <button type="button" className="btn btn--ghost" onClick={onBack}>Back to list</button>
      </div>
    )
  }

  const comparison = group.comparison || group.quotations || []

  return (
    <>
      <section className="rfqWsHero rfqWs__card">
        <div className="rfqWsCenter__nav">
          <BackNavButton fallback="/buyer/dashboard" label="← Back" className="rfqWsCenter__navBtn" />
          {onBack ? (
            <button type="button" className="rfqWsCenter__navBtn" onClick={onBack}>← RFQ list</button>
          ) : null}
        </div>
        <div className="rfqWsHero__head">
          <div>
            <p className="rfqWsHero__eyebrow">{group.rfqNumber || group.rfqRef}</p>
            <h2 className="rfqWsHero__title">{group.productTitle}</h2>
            <p className="rfqWsHero__sub">Compare {group.sellerCount} seller quotation{group.sellerCount === 1 ? '' : 's'}</p>
            <dl className="rfqWsHero__meta">
              <div className="rfqWsHero__metaItem"><dt>Quantity</dt><dd>{group.quantity}</dd></div>
              <div className="rfqWsHero__metaItem"><dt>Sellers</dt><dd>{group.sellerCount}</dd></div>
              <div className="rfqWsHero__metaItem"><dt>Created</dt><dd>{formatQuotationDate(group.createdAt)}</dd></div>
            </dl>
          </div>
          <StatusBadge status={group.aggregateStatus} expired={group.hasExpiredQuotation} />
        </div>
      </section>

      <section className="rfqWsBlock rfqWs__card">
        <h3 className="rfqWsBlock__title">Seller quotations</h3>
        <p className="rfqWsNextAction__text" style={{ marginBottom: '1rem' }}>Compare offers and accept the best quotation.</p>
        <div className="rfqWsComparisonTableWrap">
          <table className="rfqWsComparisonTable">
            <thead>
              <tr>
                <th>Seller</th>
                <th>City</th>
                <th>Price</th>
                <th>Delivery</th>
                <th>Valid until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => {
                const quotationId = row.quotationId || row.id
                const status = row.status
                const expired = row.expired || row.buyerDisplayStatus === 'EXPIRED' || (
                  status === 'RESPONDED' && isQuoteExpired({ quoteValidUntil: row.validity || row.quoteValidUntil })
                ) || status === 'NOT_SELECTED'
                const canAct = hasFullAccess
                  && status === 'RESPONDED'
                  && !expired
                  && !row.actionsLocked
                  && isBuyerQuotationActionable({ status, expired, actionsLocked: row.actionsLocked })

                return (
                  <tr key={quotationId}>
                    <td><code>{getPortalUserId(row) || '—'}</code></td>
                    <td>{row.sellerCity || '—'}</td>
                    <td>{formatQuoteMoney(row.finalUnitPrice || row.sellerUnitPrice, row.currency || row.sellerCurrency || 'INR')}</td>
                    <td>{row.deliveryTime || row.freightNote || '—'}</td>
                    <td>{formatQuotationDate(row.validity || row.quoteValidUntil)}</td>
                    <td><StatusBadge status={status} expired={expired} /></td>
                    <td>
                      {canAct ? (
                        <div className="rfqWsComparisonTable__actions">
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={Boolean(busyId)}
                            onClick={() => setConfirmRequest({ id: quotationId, productTitle: group.productTitle })}
                          >
                            {busyId === quotationId ? <Spinner size="sm" /> : 'Accept'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={Boolean(busyId)}
                            onClick={() => handleReject(quotationId)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="panelSub">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!comparison.length ? (
            <p className="rfqWsNextAction__text" style={{ padding: '1.5rem 0' }}>Waiting for seller quotations.</p>
          ) : null}
        </div>
      </section>

      <AcceptConfirmModal
        open={Boolean(confirmRequest)}
        request={confirmRequest}
        busy={Boolean(busyId)}
        onConfirm={() => executeAccept(confirmRequest?.id)}
        onCancel={() => setConfirmRequest(null)}
      />

      <OrderCreatedModal
        open={Boolean(successPayload)}
        order={successPayload?.order}
        deal={successPayload?.deal}
        onGoToOrders={() => {
          setSuccessPayload(null)
          window.location.href = '/buyer/deals'
        }}
      />
    </>
  )
}
