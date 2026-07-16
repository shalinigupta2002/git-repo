/**
 * Generic empty-state panel — use when a list/grid has loaded successfully
 * but has zero items. Pair with `ErrorState` for failure cases.
 */
export function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <div className={`stateBox stateBox--empty ${className}`} role="status" aria-live="polite">
      <div className="stateBox__icon" aria-hidden>
        {icon}
      </div>
      <h3 className="stateBox__title">{title}</h3>
      {description ? <p className="stateBox__desc">{description}</p> : null}
      {action ? <div className="stateBox__actions">{action}</div> : null}
    </div>
  )
}
