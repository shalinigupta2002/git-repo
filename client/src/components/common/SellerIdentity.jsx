import { getSellerCity, getSellerId } from '../../utils/sellerDisplay.js'

export function SellerIdentity({
  seller,
  sellerId,
  city,
  className = '',
  compact = false,
  showLabel = true,
  showId = true,
}) {
  const id = getSellerId({ seller, sellerId }) || '—'
  const sellerCity = getSellerCity({ seller, city, sellerCity: city }) || '—'

  if (compact) {
    return (
      <span className={`sellerIdentity sellerIdentity--compact ${className}`.trim()}>
        {showId ? (
          <>
            <span className="sellerIdentity__item">
              {showLabel ? 'Seller ID: ' : null}
              <code className="sellerIdentity__code">{id}</code>
            </span>
            <span className="sellerIdentity__dot" aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span className="sellerIdentity__item">
          {showLabel ? 'City: ' : null}
          <strong>{sellerCity}</strong>
        </span>
      </span>
    )
  }

  return (
    <dl className={`sellerIdentity ${className}`.trim()}>
      <div className="sellerIdentity__row">
        <dt>Seller ID</dt>
        <dd><code className="sellerIdentity__code">{id}</code></dd>
      </div>
      <div className="sellerIdentity__row">
        <dt>City</dt>
        <dd>{sellerCity}</dd>
      </div>
    </dl>
  )
}
