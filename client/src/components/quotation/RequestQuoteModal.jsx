import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createQuoteRequest } from '../../services/quoteRequest.service.js'
import { SellerIdentity } from '../common/SellerIdentity.jsx'
import { formatProductPrice } from '../../utils/formatPrice.js'
import { sanitizeQuoteRequestAttachments } from '../../utils/quoteRequestPayload.js'
import { RfqAttachmentPicker } from './RfqAttachmentPicker.jsx'

export function RequestQuoteModal({
  open,
  product,
  products = [],
  onClose,
  onSuccess,
}) {
  const [quantity, setQuantity] = useState(1)
  const [targetPrice, setTargetPrice] = useState('')
  const [message, setMessage] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [attachments, setAttachments] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const selectedProducts = useMemo(() => {
    if (products?.length) return products
    return product ? [product] : []
  }, [product, products])

  const primaryProduct = selectedProducts[0] || null

  const sellerListings = useMemo(
    () => selectedProducts.filter((item) => item?.source === 'seller' && item?.id),
    [selectedProducts],
  )

  useEffect(() => {
    if (!open || !primaryProduct) return
    const highestMoq = sellerListings.reduce(
      (max, item) => Math.max(max, Number(item.moq) || 1),
      1,
    )
    setQuantity(Math.max(1, highestMoq))
    setTargetPrice('')
    setMessage('')
    setDeliveryLocation('')
    setExpectedDeliveryDate('')
    setAttachments([])
    setSubmitting(false)
  }, [open, primaryProduct, sellerListings])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !primaryProduct) return null

  async function handleSubmit(event) {
    event.preventDefault()

    const requirement = message.trim()
    if (!requirement) {
      toast.error('Requirement description is required.')
      return
    }
    if (!deliveryLocation.trim()) {
      toast.error('Delivery location is required.')
      return
    }
    if (!expectedDeliveryDate) {
      toast.error('Expected delivery date is required.')
      return
    }
    if (!sellerListings.length) {
      toast.error('At least one seller listing is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        productTitle: primaryProduct.title || primaryProduct.name || 'Product',
        productCategory: primaryProduct.category?.name || primaryProduct.categoryName || undefined,
        brandName: primaryProduct.brandName || primaryProduct.brand?.name || undefined,
        quantity: Math.max(1, Number(quantity) || 1),
        targetPrice: targetPrice === '' ? undefined : Number(targetPrice),
        message: requirement,
        deliveryLocation: deliveryLocation.trim(),
        expectedDeliveryDate,
        attachments: sanitizeQuoteRequestAttachments(attachments),
      }

      if (sellerListings.length > 1) {
        payload.productEntries = sellerListings.map((item) => ({ productId: item.id }))
      } else {
        payload.productId = sellerListings[0].id
      }

      const data = await createQuoteRequest(payload)
      const count = data?.group?.requests?.length || 1
      toast.success(
        count > 1
          ? `RFQ sent to ${count} sellers.`
          : 'RFQ sent to the seller.',
      )
      onSuccess?.(data)
      onClose?.()
    } catch (error) {
      toast.error(error?.message || 'Could not send RFQ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="featureAlertOverlay" role="presentation" onClick={onClose}>
      <div
        className="quoteModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rfqModalTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="quoteModal__head">
          <div>
            <p className="quoteModal__eyebrow">Request quotation</p>
            <h2 id="rfqModalTitle" className="quoteModal__title">
              {primaryProduct.title || primaryProduct.name}
            </h2>
          </div>
          <button type="button" className="quoteModal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="quoteModal__productMeta">
          <span>List price: {formatProductPrice(primaryProduct.price, primaryProduct.currency || 'INR')}</span>
          {primaryProduct.moq ? <span>MOQ: {primaryProduct.moq}</span> : null}
          {sellerListings.length > 1 ? (
            <span>{sellerListings.length} sellers selected</span>
          ) : sellerListings[0]?.seller ? (
            <SellerIdentity seller={sellerListings[0].seller} compact showLabel />
          ) : null}
        </div>

        {sellerListings.length > 1 ? (
          <div className="quoteModal__sellerList">
            {sellerListings.map((item) => (
              <SellerIdentity key={item.id} seller={item.seller} compact showLabel />
            ))}
          </div>
        ) : null}

        <form className="quoteModal__form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="fieldLabel">Quantity</span>
            <input
              type="number"
              min={1}
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="fieldLabel">Requirement description</span>
            <textarea
              className="input"
              rows={4}
              maxLength={1000}
              placeholder="Describe specs, quality requirements, packaging, or other details…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="fieldLabel">Delivery location</span>
            <input
              type="text"
              className="input"
              maxLength={500}
              placeholder="City, state, or full delivery address"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="fieldLabel">Expected delivery date</span>
            <input
              type="date"
              className="input"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              required
            />
          </label>

          <RfqAttachmentPicker value={attachments} onChange={setAttachments} disabled={submitting} />

          <label className="field">
            <span className="fieldLabel">Indicative Budget (Optional)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              placeholder="Optional — informational only, non-binding"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </label>

          <div className="quoteModal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting
                ? 'Sending…'
                : sellerListings.length > 1
                  ? `Send RFQ to ${sellerListings.length} sellers`
                  : 'Send RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
