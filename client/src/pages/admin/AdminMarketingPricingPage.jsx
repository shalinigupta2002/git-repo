import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DEFAULT_MARKETING_PRICING,
  getMarketingPricing,
  resetMarketingPricing,
  saveMarketingPricing,
} from '../../utils/marketingPricing.js'

export function AdminMarketingPricingPage() {
  const initial = useMemo(() => getMarketingPricing(), [])
  const [buyerOneTime, setBuyerOneTime] = useState(initial.buyerOneTime)
  const [buyerLifetime, setBuyerLifetime] = useState(initial.buyerLifetime)
  const [sellerMonth, setSellerMonth] = useState(initial.sellerMonth)
  const [sellerLifetime, setSellerLifetime] = useState(initial.sellerLifetime)
  const [bothStandardMonth, setBothStandardMonth] = useState(initial.bothStandardMonth)
  const [bothLifetimeLifetime, setBothLifetimeLifetime] = useState(initial.bothLifetimeLifetime)
  const [bothLifetimeMonth, setBothLifetimeMonth] = useState(initial.bothLifetimeMonth)
  const [bothStandardLifetime, setBothStandardLifetime] = useState(initial.bothStandardLifetime)
  const [savedFlash, setSavedFlash] = useState(false)

  function onSave(e) {
    e.preventDefault()
    saveMarketingPricing({
      buyerOneTime,
      buyerLifetime,
      sellerMonth,
      sellerLifetime,
      bothStandardMonth,
      bothLifetimeLifetime,
      bothLifetimeMonth,
      bothStandardLifetime,
    })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  function onReset() {
    if (!window.confirm('Reset all prices to built-in defaults?')) return
    resetMarketingPricing()
    const d = DEFAULT_MARKETING_PRICING
    setBuyerOneTime(d.buyerOneTime)
    setBuyerLifetime(d.buyerLifetime)
    setSellerMonth(d.sellerMonth)
    setSellerLifetime(d.sellerLifetime)
    setBothStandardMonth(d.bothStandardMonth)
    setBothLifetimeLifetime(d.bothLifetimeLifetime)
    setBothLifetimeMonth(d.bothLifetimeMonth)
    setBothStandardLifetime(d.bothStandardLifetime)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Marketing pricing</h2>
          <p className="panelSub">
            Edit amounts shown on the public <Link to="/pricing">pricing plans</Link> page and on
            buyer/seller checkout screens. Values are saved in this browser (
            <strong>localStorage</strong>) until you connect a server-side catalog.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btnOutline" to="/pricing" target="_blank" rel="noreferrer">
            Open pricing page
          </Link>
        </div>
      </div>

      <div className="workflowBody" style={{ maxWidth: 560 }}>
        <form className="form form--tight" onSubmit={onSave}>
          <label className="field">
            <div className="fieldLabel">Buyer — standard (Monthly tier on /pricing)</div>
            <input
              className="input"
              value={buyerOneTime}
              onChange={(e) => setBuyerOneTime(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.buyerOneTime}
              autoComplete="off"
              aria-describedby="admin-pricing-buyer-hint"
            />
            <p id="admin-pricing-buyer-hint" className="hint" style={{ marginTop: 6 }}>
              Used for the Buyer “Monthly” column, buyer checkout (standard), and the “Both” monthly
              bundle (buyer fee + seller monthly).
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Buyer — lifetime</div>
            <input
              className="input"
              value={buyerLifetime}
              onChange={(e) => setBuyerLifetime(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.buyerLifetime}
              autoComplete="off"
              aria-describedby="admin-pricing-buyer-lifetime-hint"
            />
            <p id="admin-pricing-buyer-lifetime-hint" className="hint" style={{ marginTop: 6 }}>
              Used for the Buyer “Lifetime” column, buyer checkout when lifetime is selected, and
              the “Both” lifetime bundle (buyer fee + seller lifetime).
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Seller — monthly</div>
            <input
              className="input"
              value={sellerMonth}
              onChange={(e) => setSellerMonth(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.sellerMonth}
              autoComplete="off"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Seller plan billed monthly (e.g. include ₹ or currency symbol).
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Seller — lifetime</div>
            <input
              className="input"
              value={sellerLifetime}
              onChange={(e) => setSellerLifetime(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.sellerLifetime}
              autoComplete="off"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              One-time seller lifetime plan amount.
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Both — standard + monthly</div>
            <input
              className="input"
              value={bothStandardMonth}
              onChange={(e) => setBothStandardMonth(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.bothStandardMonth}
              autoComplete="off"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Both standard (buyer) and monthly (seller) bundle plan.
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Both — lifetime + lifetime</div>
            <input
              className="input"
              value={bothLifetimeLifetime}
              onChange={(e) => setBothLifetimeLifetime(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.bothLifetimeLifetime}
              autoComplete="off"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Both lifetime buyer and lifetime seller bundle plan.
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Both — buyer lifetime + seller monthly</div>
            <input
              className="input"
              value={bothLifetimeMonth}
              onChange={(e) => setBothLifetimeMonth(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.bothLifetimeMonth}
              autoComplete="off"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Mixed bundle plan: Buyer lifetime and Seller monthly.
            </p>
          </label>

          <label className="field">
            <div className="fieldLabel">Both — buyer standard + seller lifetime</div>
            <input
              className="input"
              value={bothStandardLifetime}
              onChange={(e) => setBothStandardLifetime(e.target.value)}
              placeholder={DEFAULT_MARKETING_PRICING.bothStandardLifetime}
              autoComplete="off"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Mixed bundle plan: Buyer standard and Seller lifetime.
            </p>
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <button type="submit" className="btn btn--primary">
              Save prices
            </button>
            <button type="button" className="btnOutline" onClick={onReset}>
              Reset to defaults
            </button>
          </div>

          {savedFlash ? (
            <p className="hint" role="status" style={{ marginTop: 12, color: 'var(--accent, #2563eb)' }}>
              Saved. Refresh the pricing page if it was already open.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  )
}
