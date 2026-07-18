import { useEffect, useState } from 'react'
import {
  getProductDisplayImageSrc,
  getProductImagePlaceholder,
  resolveProductImageUrl,
} from '../../utils/productImage.js'

/**
 * Renders a product image with deterministic placeholder fallback.
 * Never uses random external placeholder services.
 */
export function ProductImage({
  product,
  src,
  productId,
  alt = '',
  className,
  loading,
  decoding,
  placeholderSize,
  ...rest
}) {
  const id = productId || product?.id || 'product'
  const resolved = src ?? resolveProductImageUrl(product)
  const placeholder = getProductImagePlaceholder(id, placeholderSize)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [resolved, id])

  const displaySrc = !resolved || failed
    ? placeholder
    : resolved

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}

export { getProductDisplayImageSrc }
