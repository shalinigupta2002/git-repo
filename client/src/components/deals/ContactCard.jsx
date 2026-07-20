import {
  buildCounterpartyProfile,
  isDealContactUnlocked,
} from '../../utils/dealHelpers.js'
import { maskCounterpartyProfile } from '../../utils/counterpartyProfile.js'

function Field({ label, value, reveal = false }) {
  return (
    <div className={`contactCard__field${reveal ? ' contactCard__field--reveal' : ''}`}>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

export function ContactCard({ deal, counterparty, title = 'Supplier Contact' }) {
  const unlocked = isDealContactUnlocked(deal)
  const profile = maskCounterpartyProfile(buildCounterpartyProfile(counterparty), {
    contactUnlockStatus: deal?.contactUnlockStatus,
  })

  return (
    <section className={`contactCard panel panel--nested${unlocked ? ' contactCard--unlocked' : ''}`}>
      <div className="panelHeader">
        <div>
          <h3 className="panelTitle">{title}</h3>
          <p className="panelSub">
            {unlocked
              ? 'Contact Details Unlocked. Business Continues Offline.'
              : 'Before unlock, only Seller ID and city are visible.'}
          </p>
        </div>
        <span className={`b2bBadge ${unlocked ? 'b2bBadge--green' : 'b2bBadge--amber'}`}>
          {unlocked ? 'Contact Details Unlocked' : 'Locked'}
        </span>
      </div>

      <dl className="contactCard__grid">
        <Field label="Seller ID" value={profile.portalUserId} />
        <Field label="City" value={profile.city} />
        {unlocked ? (
          <div className="contactCard__reveal">
            <Field label="Company Name" value={profile.companyName} reveal />
            <Field label="Owner Name" value={profile.contactPerson} reveal />
            <Field label="Phone" value={profile.phone} reveal />
            <Field label="Email" value={profile.email} reveal />
            <Field label="GST" value={profile.gst} reveal />
            <Field label="Website" value={profile.website} reveal />
            <Field
              label="Address"
              value={[profile.addressLine1, profile.addressLine2, profile.state, profile.postalCode].filter(Boolean).join(', ') || null}
              reveal
            />
            <Field label="Business Description" value={profile.businessDescription} reveal />
          </div>
        ) : null}
      </dl>
    </section>
  )
}
