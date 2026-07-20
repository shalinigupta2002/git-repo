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
  
  // Seller 3 Tiers
  const [sellerMonthly, setSellerMonthly] = useState(initial.sellerMonthly || DEFAULT_MARKETING_PRICING.sellerMonthly)
  const [sellerAnnual, setSellerAnnual] = useState(initial.sellerAnnual || DEFAULT_MARKETING_PRICING.sellerAnnual)
  const [sellerLifetime, setSellerLifetime] = useState(initial.sellerLifetime || DEFAULT_MARKETING_PRICING.sellerLifetime)

  // Buyer 3 Tiers
  const [buyerMonthly, setBuyerMonthly] = useState(initial.buyerMonthly || DEFAULT_MARKETING_PRICING.buyerMonthly)
  const [buyerAnnual, setBuyerAnnual] = useState(initial.buyerAnnual || DEFAULT_MARKETING_PRICING.buyerAnnual)
  const [buyerLifetime, setBuyerLifetime] = useState(initial.buyerLifetime || DEFAULT_MARKETING_PRICING.buyerLifetime)

  // Both 3 Tiers
  const [bothMonthly, setBothMonthly] = useState(initial.bothMonthly || DEFAULT_MARKETING_PRICING.bothMonthly)
  const [bothAnnual, setBothAnnual] = useState(initial.bothAnnual || DEFAULT_MARKETING_PRICING.bothAnnual)
  const [bothLifetime, setBothLifetime] = useState(initial.bothLifetime || DEFAULT_MARKETING_PRICING.bothLifetime)

  const [savedFlash, setSavedFlash] = useState(false)

  function onSave(e) {
    e.preventDefault()
    saveMarketingPricing({
      sellerMonthly,
      sellerAnnual,
      sellerLifetime,
      buyerMonthly,
      buyerAnnual,
      buyerLifetime,
      bothMonthly,
      bothAnnual,
      bothLifetime,
      // Fallback legacy links
      buyerOneTime: buyerAnnual,
      sellerMonth: sellerMonthly,
      bothStandardMonth: bothMonthly,
      bothLifetimeLifetime: bothLifetime,
      bothLifetimeMonth: bothMonthly,
      bothStandardLifetime: bothAnnual,
    })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  function onReset() {
    if (!window.confirm('Reset all 9 plan prices to built-in defaults?')) return
    resetMarketingPricing()
    const d = DEFAULT_MARKETING_PRICING
    setSellerMonthly(d.sellerMonthly)
    setSellerAnnual(d.sellerAnnual)
    setSellerLifetime(d.sellerLifetime)
    setBuyerMonthly(d.buyerMonthly)
    setBuyerAnnual(d.buyerAnnual)
    setBuyerLifetime(d.buyerLifetime)
    setBothMonthly(d.bothMonthly)
    setBothAnnual(d.bothAnnual)
    setBothLifetime(d.bothLifetime)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <section className="panel" style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <div className="panelHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="panelTitle" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Subscription Plans V2 Master Admin</h2>
          <p className="panelSub" style={{ color: '#64748b' }}>
            Manage pricing, badges, and display configurations for all 9 subscription plans shown on the public <Link to="/pricing" target="_blank">/pricing</Link> page.
          </p>
        </div>
        <Link className="btnOutline" to="/pricing" target="_blank" rel="noreferrer" style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}>
          🔗 Preview /pricing Page
        </Link>
      </div>

      <form className="form" onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* SELLER PLANS GROUP */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏪 Seller Subscription Plans (3 Tiers)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Seller Monthly</div>
              <input className="input" value={sellerMonthly} onChange={(e) => setSellerMonthly(e.target.value)} placeholder="₹999" />
              <p className="hint">Plan key: <code>SELLER_MONTHLY</code> (Deal Charge: 4%)</p>
            </label>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Seller Annual (Popular)</div>
              <input className="input" value={sellerAnnual} onChange={(e) => setSellerAnnual(e.target.value)} placeholder="₹9,999" />
              <p className="hint">Plan key: <code>SELLER_ANNUAL</code> (Deal Charge: 3%)</p>
            </label>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Seller Lifetime (Value)</div>
              <input className="input" value={sellerLifetime} onChange={(e) => setSellerLifetime(e.target.value)} placeholder="₹49,999" />
              <p className="hint">Plan key: <code>SELLER_LIFETIME</code> (Deal Charge: 2%)</p>
            </label>
          </div>
        </div>

        {/* BUYER PLANS GROUP */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛍️ Buyer Subscription Plans (3 Tiers)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Buyer Monthly</div>
              <input className="input" value={buyerMonthly} onChange={(e) => setBuyerMonthly(e.target.value)} placeholder="₹999" />
              <p className="hint">Plan key: <code>BUYER_MONTHLY</code> (Deal Charge: 5%)</p>
            </label>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Buyer Annual (Popular)</div>
              <input className="input" value={buyerAnnual} onChange={(e) => setBuyerAnnual(e.target.value)} placeholder="₹9,999" />
              <p className="hint">Plan key: <code>BUYER_ANNUAL</code> (Deal Charge: 4%)</p>
            </label>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Buyer Lifetime (Value)</div>
              <input className="input" value={buyerLifetime} onChange={(e) => setBuyerLifetime(e.target.value)} placeholder="₹49,999" />
              <p className="hint">Plan key: <code>BUYER_LIFETIME</code> (Deal Charge: 3%)</p>
            </label>
          </div>
        </div>

        {/* BOTH PLANS GROUP */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚡ Both (Buyer + Seller Dual Access)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Both Monthly</div>
              <input className="input" value={bothMonthly} onChange={(e) => setBothMonthly(e.target.value)} placeholder="₹1,699" />
              <p className="hint">Plan key: <code>BOTH_MONTHLY</code> (Deal Charge: 3.5%)</p>
            </label>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Both Annual</div>
              <input className="input" value={bothAnnual} onChange={(e) => setBothAnnual(e.target.value)} placeholder="₹16,999" />
              <p className="hint">Plan key: <code>BOTH_ANNUAL</code> (Deal Charge: 2.5%)</p>
            </label>
            <label className="field">
              <div className="fieldLabel" style={{ fontWeight: 700 }}>Both Lifetime</div>
              <input className="input" value={bothLifetime} onChange={(e) => setBothLifetime(e.target.value)} placeholder="₹79,999" />
              <p className="hint">Plan key: <code>BOTH_LIFETIME</code> (Deal Charge: 1.5%)</p>
            </label>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" className="btn btn--primary" style={{ padding: '0.875rem 2rem', borderRadius: '12px', fontWeight: 800, background: '#0f172a', color: '#fff' }}>
            Save Plan Master Configurations
          </button>
          <button type="button" className="btnOutline" onClick={onReset} style={{ padding: '0.875rem 1.5rem', borderRadius: '12px' }}>
            Reset to Defaults
          </button>

          {savedFlash ? (
            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem' }}>
              ✓ All 9 Master Plans Updated Successfully!
            </span>
          ) : null}
        </div>
      </form>
    </section>
  )
}
