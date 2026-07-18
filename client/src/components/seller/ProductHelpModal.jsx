export function ProductHelpModal({ open, onClose }) {
  if (!open) return null

  return (
    <div className="helpModalOverlay" onClick={onClose} role="presentation">
      <div
        className="helpModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-help-title"
      >
        <div className="helpModal__head">
          <div>
            <p className="helpModal__eyebrow">Seller guide</p>
            <h2 id="product-help-title" className="helpModal__title">How to use product listing</h2>
          </div>
          <button type="button" className="helpModal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="helpModal__body">
          <section className="helpModal__section">
            <h3>Creating products</h3>
            <ul>
              <li>Use a clear product name buyers can search for (brand + model + spec).</li>
              <li>Pick the correct category and subcategory — buyers filter by these.</li>
              <li>Set MOQ and price in INR; keep MOQ realistic for B2B buyers.</li>
            </ul>
          </section>

          <section className="helpModal__section">
            <h3>Product images</h3>
            <ul>
              <li>Upload at least one sharp photo on a plain background.</li>
              <li>Recommended size: 800×800 px or larger, JPG/PNG/WebP under 5 MB.</li>
              <li>Show the actual product — avoid watermarks and misleading stock photos.</li>
            </ul>
          </section>

          <section className="helpModal__section">
            <h3>Pricing tips</h3>
            <ul>
              <li>List your wholesale unit price; buyers expect bulk pricing on B2B.</li>
              <li>Keep pricing competitive within your category.</li>
              <li>Update prices when costs change so RFQs stay accurate.</li>
            </ul>
          </section>

          <section className="helpModal__section">
            <h3>Category best practices</h3>
            <ul>
              <li>If a category is missing, submit a category request — admin approval adds it instantly.</li>
              <li>Deleted categories disappear from the form; update affected products promptly.</li>
              <li>Accurate categories improve catalog visibility and RFQ matching.</li>
            </ul>
          </section>
        </div>

        <div className="helpModal__foot">
          <button type="button" className="btn btn--primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
