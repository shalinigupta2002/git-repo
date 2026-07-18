import { ProfileField } from './ProfileField.jsx'

const MAIN_PORTAL_PLACEHOLDER = 'Will be synced from Main Portal'

const PROFILE_FIELDS = [
  { key: 'email', label: 'Email' },
  { key: 'mobileNumber', label: 'Mobile number' },
  { key: 'companyName', label: 'Company name' },
  { key: 'gstNumber', label: 'GST number' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'kycStatus', label: 'KYC status' },
]

function profileInitials(profileInformation) {
  const source =
    profileInformation?.fullName?.value
    || profileInformation?.companyName?.value
    || profileInformation?.email?.value
    || '?'

  const words = String(source).trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }
  return String(source).slice(0, 2).toUpperCase()
}

export function ProfileInformationSection({ profileInformation }) {
  if (!profileInformation) return null

  const photoUrl = profileInformation.profilePhoto?.value
  const initials = profileInitials(profileInformation)

  return (
    <section className="profileCard profileCard--information panel">
      <div className="profileCard__head">
        <h2 className="profileCard__title">Profile information</h2>
        <p className="profileCard__sub">Business details sourced from Main Portal.</p>
      </div>

      <div className="profileHero">
        <div className="profileHero__avatar" aria-hidden={!photoUrl}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className="profileHero__photo" />
          ) : (
            <span className="profileHero__initials">{initials}</span>
          )}
        </div>

        <div className="profileHero__summary">
          <p className="profileHero__name">
            {profileInformation.fullName?.display ?? MAIN_PORTAL_PLACEHOLDER}
          </p>
          <p className="profileHero__id">
            <span className="profileHero__idLabel">Portal User ID</span>
            <code className="profileHero__idValue">
              {profileInformation.portalUserId?.display ?? '—'}
            </code>
          </p>
        </div>
      </div>

      <dl className="profileFieldGrid">
        {PROFILE_FIELDS.map(({ key, label }) => (
          <ProfileField key={key} label={label} field={profileInformation[key]} />
        ))}
      </dl>
    </section>
  )
}
