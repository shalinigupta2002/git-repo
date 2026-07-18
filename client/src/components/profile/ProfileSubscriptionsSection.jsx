import { ProfileField } from './ProfileField.jsx'

const SUBSCRIPTION_FIELDS = [
  { key: 'plan', label: 'Plan' },
  { key: 'status', label: 'Status' },
  { key: 'startDate', label: 'Start date' },
  { key: 'expiryDate', label: 'Expiry date' },
]

export function SubscriptionCard({ title, subscription, accent = 'blue' }) {
  if (!subscription) return null

  return (
    <article className={`subscriptionCard subscriptionCard--${accent}`}>
      <header className="subscriptionCard__head">
        <h3 className="subscriptionCard__title">{title}</h3>
      </header>
      <dl className="subscriptionCard__grid">
        {SUBSCRIPTION_FIELDS.map(({ key, label }) => (
          <ProfileField key={key} label={label} field={subscription[key]} />
        ))}
      </dl>
    </article>
  )
}

export function ProfileSubscriptionsSection({ subscriptions }) {
  const buyer = subscriptions?.buyer ?? null
  const seller = subscriptions?.seller ?? null

  if (!buyer && !seller) {
    return (
      <section className="profileCard profileCard--subscriptions panel">
        <div className="profileCard__head">
          <h2 className="profileCard__title">Marketplace subscriptions</h2>
          <p className="profileCard__sub">Active buyer and seller plans for this account.</p>
        </div>
        <p className="profileEmptyState">No marketplace subscriptions yet.</p>
      </section>
    )
  }

  return (
    <section className="profileCard profileCard--subscriptions panel">
      <div className="profileCard__head">
        <h2 className="profileCard__title">Marketplace subscriptions</h2>
        <p className="profileCard__sub">Active buyer and seller plans for this account.</p>
      </div>

      <div className={`profileSubscriptionCards${buyer && seller ? ' profileSubscriptionCards--dual' : ''}`}>
        <SubscriptionCard title="Buyer subscription" subscription={buyer} accent="blue" />
        <SubscriptionCard title="Seller subscription" subscription={seller} accent="amber" />
      </div>
    </section>
  )
}
