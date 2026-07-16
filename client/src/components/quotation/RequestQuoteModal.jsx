import { useEffect, useMemo, useState } from 'react'

import toast from 'react-hot-toast'

import { createQuoteRequest } from '../../services/quoteRequest.service.js'

import { SellerIdentity } from '../common/SellerIdentity.jsx'

import { formatProductPrice } from '../../utils/formatPrice.js'

import { RfqAttachmentPicker } from './RfqAttachmentPicker.jsx'



export function RequestQuoteModal({

  open,

  product,

  products = [],

  sellerIds = [],

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



  const primaryProduct = product || products[0] || null



  const resolvedSellerIds = useMemo(() => {

    if (sellerIds?.length) return [...new Set(sellerIds.filter(Boolean))]

    if (product?.sellerId) return [product.sellerId]

    if (product?.seller?.id) return [product.seller.id]

    return products

      .map((item) => item.sellerId || item.seller?.id)

      .filter(Boolean)

      .filter((id, index, arr) => arr.indexOf(id) === index)

  }, [product, products, sellerIds])



  const distinctProductIds = useMemo(() => {
    const ids = new Set()
    if (product?.id) ids.add(String(product.id))
    for (const item of products) {
      if (item?.id) ids.add(String(item.id))
    }
    return [...ids]
  }, [product, products])



  const sellerPreview = useMemo(() => {

    if (resolvedSellerIds.length <= 1 && primaryProduct?.seller) {

      return [primaryProduct.seller]

    }

    return products

      .filter((item) => resolvedSellerIds.includes(item.sellerId || item.seller?.id))

      .map((item) => item.seller)

      .filter(Boolean)

  }, [primaryProduct, products, resolvedSellerIds])



  useEffect(() => {

    if (!open || !primaryProduct) return

    setQuantity(Math.max(1, Number(primaryProduct.moq) || 1))

    setTargetPrice('')

    setMessage('')

    setDeliveryLocation('')

    setExpectedDeliveryDate('')

    setAttachments([])

    setSubmitting(false)

  }, [open, primaryProduct])



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

    if (!resolvedSellerIds.length) {

      toast.error('At least one seller is required.')

      return

    }

    if (distinctProductIds.length > 1) {

      toast.error('Multi-product RFQ is not supported yet. This feature belongs to a future release.')

      return

    }

    setSubmitting(true)

    try {

      const payload = {

        productId: primaryProduct.source === 'seller' ? primaryProduct.id : undefined,

        catalogProductId: primaryProduct.source !== 'seller' ? primaryProduct.id : undefined,

        sellerIds: resolvedSellerIds.length > 1 ? resolvedSellerIds : undefined,

        sellerId: resolvedSellerIds.length === 1 ? resolvedSellerIds[0] : undefined,

        productTitle: primaryProduct.title || primaryProduct.name || 'Product',

        productCategory: primaryProduct.category?.name || primaryProduct.categoryName || undefined,

        brandName: primaryProduct.brandName || primaryProduct.brand || undefined,

        quantity: Math.max(1, Number(quantity) || 1),

        targetPrice: targetPrice === '' ? undefined : Number(targetPrice),

        message: requirement,

        deliveryLocation: deliveryLocation.trim(),

        expectedDeliveryDate,

        attachments: attachments.length ? attachments : undefined,

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

          {resolvedSellerIds.length > 1 ? (

            <span>{resolvedSellerIds.length} sellers selected</span>

          ) : sellerPreview[0] ? (

            <SellerIdentity seller={sellerPreview[0]} compact showLabel />

          ) : null}

        </div>



        {resolvedSellerIds.length > 1 ? (

          <div className="quoteModal__sellerList">

            {sellerPreview.map((seller) => (

              <SellerIdentity key={seller.id} seller={seller} compact showLabel />

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

            <span className="panelSub" style={{ display: 'block', marginTop: 6 }}>

              For seller reference only. This is not a negotiation offer and does not bind either party.

            </span>

          </label>



          <div className="quoteModal__actions">

            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>

              Cancel

            </button>

            <button type="submit" className="btn btn--primary" disabled={submitting}>

              {submitting ? 'Sending…' : resolvedSellerIds.length > 1 ? `Send RFQ to ${resolvedSellerIds.length} sellers` : 'Send RFQ'}

            </button>

          </div>

        </form>

      </div>

    </div>

  )

}


