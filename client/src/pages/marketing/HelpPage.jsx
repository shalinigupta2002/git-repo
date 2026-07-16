import { Link } from 'react-router-dom'
import { HomeMarketingNav } from '../../components/common/HomeMarketingNav.jsx'

const faqs = [
  {
    q: 'How do buyers browse products?',
    a: 'Browse the catalog, save items to your wishlist, and manage orders from your buyer dashboard.',
  },
  {
    q: 'How do sellers list products?',
    a: 'Add products with SKU, category, pricing, and stock. Listings appear in the marketplace catalog for buyers.',
  },
  {
    q: 'Can I use both buyer and seller roles?',
    a: 'Yes. You can activate buyer access once, then choose a seller plan (1 month or lifetime) for full access.',
  },
  {
    q: 'Where can I see pricing?',
    a: 'Visit the pricing page to see buyer one-time payment and seller plan options.',
  },
]

export function HelpPage() {
  return (
    <div className="subPage subPage--help">
      <HomeMarketingNav tagline="Help & contact" />

      <main className="subMain helpMain">
        <header className="helpHero">
          <h1 className="subHero__title helpHero__title">Help &amp; Contact</h1>
        </header>

        <section className="helpGrid" aria-label="Support overview">
          <article className="helpCard helpCard--primary">
            <h2 className="helpCard__title">Talk to us</h2>
            <p className="helpCard__body">
              Reach the marketplace team for account, billing, and onboarding questions.
            </p>
            <ul className="helpCard__list">
              <li>
                <span className="helpCard__label">Email</span>
                <span className="helpCard__value">support@b2b-marketplace.example</span>
              </li>
              <li>
                <span className="helpCard__label">Response time</span>
                <span className="helpCard__value">Within 1 business day</span>
              </li>
              <li>
                <span className="helpCard__label">Hours</span>
                <span className="helpCard__value">Mon–Fri · 9:00–18:00 (IST)</span>
              </li>
            </ul>
            <div className="helpCard__actions">
              <Link className="btn btn--primary helpCard__btn" to="/contact">
                Open contact form
              </Link>
              <Link className="btn btn--ghost helpCard__btn" to="/pricing">
                View pricing
              </Link>
            </div>
          </article>

          <article className="helpCard helpCard--buyers">
            <h2 className="helpCard__title">Buyer help</h2>
            <p className="helpCard__body">
              Help with catalog browsing, orders, and buyer access.
            </p>
            <ul className="helpPills">
              <li>Browsing products</li>
              <li>Wishlist</li>
              <li>Order status</li>
            </ul>
            <p className="helpCard__foot">
              Already a buyer? Start in your{' '}
              <Link to="/buyer/dashboard" className="helpLink">
                buyer dashboard
              </Link>
              .
            </p>
          </article>

          <article className="helpCard helpCard--sellers">
            <h2 className="helpCard__title">Seller help</h2>
            <p className="helpCard__body">
              Help with catalog, listings, and seller subscriptions.
            </p>
            <ul className="helpPills">
              <li>Listing products</li>
              <li>Managing inventory</li>
              <li>Managing plans</li>
            </ul>
            <p className="helpCard__foot">
              New seller? Review the{' '}
              <Link to="/pricing" className="helpLink">
                plans &amp; pricing
              </Link>
              .
            </p>
          </article>
        </section>

        <section className="helpFaq" aria-label="Frequently asked questions">
          <div className="helpFaq__head">
            <h2 className="helpFaq__title">Frequently asked questions</h2>
            <p className="helpFaq__lead">
              Short answers to the most common questions about how the marketplace works.
            </p>
          </div>
          <div className="helpFaq__grid">
            {faqs.map((f) => (
              <article key={f.q} className="helpFaq__item">
                <h3 className="helpFaq__q">{f.q}</h3>
                <p className="helpFaq__a">{f.a}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

