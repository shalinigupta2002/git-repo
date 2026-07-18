import {
  buildCounterpartyProfile,
  isDealContactUnlocked,
} from '../../utils/dealHelpers.js'
import { maskCounterpartyProfile } from '../../utils/counterpartyProfile.js'

function Field({ label, value }) {
  return (
    <div className="contactCard__field">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

export function ContactCard({ deal, counterparty, title = 'Counterparty contact' }) {
  const unlocked = isDealContactUnlocked(deal)
  const profile = maskCounterpartyProfile(buildCounterpartyProfile(counterparty), {
    contactUnlockStatus: deal?.contactUnlockStatus,
  })

  return (
    <section className="contactCard panel panel--nested">
      <div className="panelHeader">
        <div>
          <h3 className="panelTitle">{title}</h3>
          <p className="panelSub">
            {unlocked
              ? 'Contact details are unlocked for this deal.'
              : 'Only portal user ID and city are visible until both deal charges are paid.'}
          </p>
        </div>
        <span className={`b2bBadge ${unlocked ? 'b2bBadge--green' : 'b2bBadge--amber'}`}>
          {unlocked ? 'Unlocked' : 'Locked'}
        </span>
      </div>

      <dl className="contactCard__grid">
        <Field label="Portal user ID" value={profile.portalUserId} />
        <Field label="City" value={profile.city} />
        {unlocked ? (
          <>
            <Field label="Company name" value={profile.companyName} />
            <Field label="Contact person" value={profile.contactPerson} />
            <Field label="Phone" value={profile.phone} />
            <Field label="Email" value={profile.email} />
            <Field label="GST" value={profile.gst} />
            <Field label="Address" value={[profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ') || null} />
            <Field label="State" value={profile.state} />
            <Field label="Postal code" value={profile.postalCode} />
          </>
        ) : null}
      </dl>
    </section>
  )
}
