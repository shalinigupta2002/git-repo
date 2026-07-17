import { useEffect, useState } from 'react'
import { fetchProfileView } from '../../services/profile.service.js'
import { Spinner } from '../../components/ui/Spinner.jsx'

function ProfileField({ label, field }) {
  const isPlaceholder = field?.display === 'Will be synced from Main Portal'
  const isUnassigned = field?.display === 'No Marketplace ID Assigned'

  return (
    <div className="profileField">
      <dt className="profileField__label">{label}</dt>
      <dd
        className={
          isPlaceholder
            ? 'profileField__value profileField__value--placeholder'
            : isUnassigned
              ? 'profileField__value profileField__value--muted'
              : 'profileField__value'
        }
      >
        {field?.display ?? '—'}
      </dd>
    </div>
  )
}

function WorkspaceProfileSection({ title, section }) {
  if (!section) return null

  return (
    <section className="panel profileSection">
      <h2 className="profileSection__title">{title}</h2>
      <dl className="profileSection__grid">
        <ProfileField label="Marketplace ID" field={section.marketplaceId} />
        <ProfileField label="Subscription plan" field={section.subscriptionPlan} />
        <ProfileField label="Subscription status" field={section.subscriptionStatus} />
        <ProfileField label="City" field={section.city} />
        <ProfileField label="Company name" field={section.companyName} />
        <ProfileField label="Email" field={section.email} />
        <ProfileField label="Phone" field={section.phone} />
      </dl>
    </section>
  )
}

export function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchProfileView()
      .then((data) => {
        if (!alive) return
        setProfile(data)
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setError(e.message || 'Failed to load profile')
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  return (
    <div className="sellerDashboard profilePage">
      <div className="sellerDashboard__pageTitle">
        <h1 className="sellerDashboard__greeting">Account profile</h1>
        <p className="sellerDashboard__sub">
          Read-only view. Profile, KYC, company details, and addresses will be synced from the Main
          Portal when integration is complete. This marketplace does not store or edit profile data.
        </p>
      </div>

      {loading ? (
        <div className="panel" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </div>
      ) : null}

      {error ? (
        <div className="panel" style={{ padding: 24 }}>
          <p className="formError">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="panel profileNotice">
            <p>
              <strong>Main Portal integration:</strong>{' '}
              {profile?.mainPortalIntegrated
                ? 'Connected — profile data is sourced from Main Portal.'
                : 'Pending — unavailable fields show “Will be synced from Main Portal”. No profile forms are shown here by design.'}
            </p>
          </div>

          <WorkspaceProfileSection title="Buyer workspace" section={profile?.buyer} />
          <WorkspaceProfileSection title="Seller workspace" section={profile?.seller} />
        </>
      ) : null}
    </div>
  )
}
