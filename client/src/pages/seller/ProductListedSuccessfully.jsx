import { Link } from 'react-router-dom'

export function ProductListedSuccessfully() {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Product listed successfully</h2>
          <p className="panelSub">
            Your product is live in the marketplace catalog. Buyers can discover and view it.
          </p>
        </div>
      </div>

      <div className="b2bSuccessBanner" style={{ marginTop: 12 }}>
        <div className="b2bSuccessBanner__icon" aria-hidden>
          ✓
        </div>
        <div>
          <h2 className="b2bSuccessBanner__title">Listing published</h2>
          <p className="b2bSuccessBanner__text">
            Your product is now visible to buyers in the marketplace catalog.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/seller/add-product" className="btn btn--ghost">
          Add another product
        </Link>
        <Link to="/seller/products" className="btn btn--primary">
          View my listings
        </Link>
      </div>
    </section>
  )
}
