import { Link } from 'react-router-dom'

export function MarketingFooter() {
  return (
    <footer className="mkFooter">
      <div className="mkFooter__inner">
        <div className="mkFooter__cols" role="navigation" aria-label="Footer links">
          <div className="mkFooter__col">
            <div className="mkFooter__title">Marketplace</div>
            <Link className="mkFooter__link" to="/pricing">
              Pricing plans
            </Link>
            <Link className="mkFooter__link" to="/subscribe">
              Choose access
            </Link>
          </div>

          <div className="mkFooter__col">
            <div className="mkFooter__title">Help & Contact</div>
            <Link className="mkFooter__link" to="/contact">
              Help & contact
            </Link>
            <span className="mkFooter__meta">Response: 24–48 business hours</span>
          </div>

          <div className="mkFooter__col">
            <div className="mkFooter__title">Policies</div>
            <Link className="mkFooter__link" to="/terms">
              Terms and Conditions
            </Link>
            <Link className="mkFooter__link" to="/privacy-policy">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <div className="mkFooter__bottom">
        <div className="mkFooter__bottomInner">
          <span>© {new Date().getFullYear()} All rights reserved.</span>
          <span className="mkFooter__dot" aria-hidden>
            ·
          </span>
          <span className="mkFooter__muted">Built for wholesale workflows</span>
        </div>
      </div>
    </footer>
  )
}
