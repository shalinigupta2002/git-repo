export function ProfileField({ label, field }) {
  const isPlaceholder = field?.display === 'Will be synced from Main Portal'
  const isMuted =
    field?.display === 'No User ID assigned'
    || field?.display === 'Pending verification'

  return (
    <div className="profileField">
      <dt className="profileField__label">{label}</dt>
      <dd
        className={
          isPlaceholder
            ? 'profileField__value profileField__value--placeholder'
            : isMuted
              ? 'profileField__value profileField__value--muted'
              : 'profileField__value'
        }
      >
        {field?.display ?? '—'}
      </dd>
    </div>
  )
}
