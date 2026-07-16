import { Link, useLocation, useNavigate } from 'react-router-dom'
import { HomeMarketingNav } from '../../components/common/HomeMarketingNav.jsx'
import heroArt from '../../assets/home-hero.svg'
import { MarketingFooter } from '../../components/common/MarketingFooter.jsx'

const everyoneBenefits = [
  {
    title: 'The Unique Proposition',
    text: 'A platform where buyers and sellers meet and trade freely as per agreed T&C between both.',
  },
  {
    title: 'Fair Portal Fees',
    text: 'Transparent fees based on the plan you choose. No other charges.',
  },
  {
    title: 'Value Supply Chain Network',
    text: 'Access verified customers, suppliers, and service providers.',
  },
  {
    title: 'Seamless Procurement',
    text: 'Compare products, request quotations, and track seller responses.',
  },
  {
    title: 'Competitive Pricing',
    text: 'Discover the best deals through transparent pricing and supplier competition.',
  },
  {
    title: 'Business Growth Opportunities',
    text: 'Expand your reach, connect with new parties, and trade in new markets.',
  },
]

const heroTrustPoints = [
  'Verified B2B network',
  'Transparent portal fees',
  'Secure Razorpay checkout',
]

export function SubscriptionPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const locked = location.state?.reason === 'subscription'
  const lockedPath = location.state?.lockedPath
  const lockedForBuyer =
    typeof lockedPath === 'string' && lockedPath.startsWith('/buyer')

  return (
    <div className="subPage homeLanding">
      <HomeMarketingNav />

      <main className="subMain homeLanding__main">
        {locked ? (
          <div className="subBanner" role="status">
            Subscribe to unlock{' '}
            <strong>{lockedForBuyer ? 'buyer' : 'seller'}</strong> features, or
            choose a plan on the{' '}
            <Link to="/pricing">pricing plans</Link>.
          </div>
        ) : null}

        <section className="homeLanding__hero">
          <div className="homeLanding__heroGrid">
            <div className="homeLanding__heroCopy">
              <p className="homeLanding__eyebrow">B2B marketplace</p>
              <h1 className="homeLanding__heroTitle">
                Procurement and quotations, built for serious trade
              </h1>
              <p className="homeLanding__heroLead">
                Connect, source, and grow with our comprehensive B2B marketplace designed to bring
                buyers and suppliers together on a single, powerful platform. Whether you&apos;re
                looking for quality products, reliable vendors, or new business opportunities, our
                marketplace makes procurement faster, smarter, and more efficient.
              </p>

              <div className="homeLanding__heroCta">
                <button
                  type="button"
                  className="btn btn--primary homeLanding__heroBtnPrimary"
                  onClick={() => navigate('/pricing')}
                >
                  View plans &amp; pricing
                </button>
                <Link to="/products" className="btn btn--ghost homeLanding__heroBtnSecondary">
                  Browse catalog
                </Link>
              </div>

              <ul className="homeLanding__heroTrust" aria-label="Platform highlights">
                {heroTrustPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="homeLanding__heroVisual" aria-hidden>
              <div className="homeLanding__heroVisualFrame">
                <img
                  className="homeLanding__heroImg"
                  src={heroArt}
                  alt=""
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="homeLanding__section homeLanding__section--everyone">
          <div className="homeLanding__sectionHead">
            <h2 className="homeLanding__sectionTitle">Why Choose Our Marketplace?</h2>
            <p className="homeLanding__sectionIntro">
              Built for wholesale trade with fair fees, structured quotations, and a network
              you can trust—whether you buy, sell, or both.
            </p>
          </div>
          <ul className="homeLanding__benefits">
            {everyoneBenefits.map((b, index) => (
              <li key={b.title} className="homeLanding__benefitCard">
                <span className="homeLanding__benefitIndex">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="homeLanding__benefitBody">
                  <h3 className="homeLanding__benefitTitle">{b.title}</h3>
                  <p className="homeLanding__benefitText">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="homeLanding__ctaBand">
          <div className="homeLanding__ctaInner">
            <div className="homeLanding__ctaCopy">
              <p className="homeLanding__ctaEyebrow">Get started</p>
              <h2 className="homeLanding__ctaTitle">Ready to choose a plan?</h2>
              <p className="homeLanding__ctaText">
                Compare buyer, seller, and combined access—then complete checkout to unlock
                your dashboards.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary homeLanding__subscribeBtnLarge"
              onClick={() => navigate('/pricing')}
            >
              View pricing
            </button>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
