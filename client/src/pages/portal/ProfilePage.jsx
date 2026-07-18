import { useEffect, useState } from 'react'
import { fetchProfileView } from '../../services/profile.service.js'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { ProfileInformationSection } from '../../components/profile/ProfileInformationSection.jsx'
import { ProfileSubscriptionsSection } from '../../components/profile/ProfileSubscriptionsSection.jsx'
import { ManageProfileButton } from '../../components/profile/ManageProfileButton.jsx'

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
    <div className="profilePage">
      <header className="profilePage__header">
        <div>
          <p className="profilePage__eyebrow">Account</p>
          <h1 className="profilePage__title">Profile</h1>
          <p className="profilePage__sub">
            Your business identity and marketplace subscriptions. Profile details are managed in
            Main Portal and shown here read-only.
          </p>
        </div>
        <ManageProfileButton
          manageProfileUrl={profile?.manageProfileUrl}
          mainPortalIntegrated={profile?.mainPortalIntegrated}
        />
      </header>

      {loading ? (
        <div className="panel profilePage__loading">
          <Spinner />
        </div>
      ) : null}

      {error ? (
        <div className="panel profilePage__error">
          <p className="formError">{error}</p>
        </div>
      ) : null}

      {!loading && !error && profile ? (
        <div className="profilePage__stack">
          {!profile.mainPortalIntegrated ? (
            <div className="profilePortalNotice panel">
              <strong>Main Portal integration pending.</strong>{' '}
              Unavailable fields show placeholders until profile data is synced from Main Portal.
            </div>
          ) : null}

          <ProfileInformationSection profileInformation={profile.profileInformation} />
          <ProfileSubscriptionsSection subscriptions={profile.subscriptions} />
        </div>
      ) : null}
    </div>
  )
}
