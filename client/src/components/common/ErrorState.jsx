/**
 * Generic error-state panel with a retry affordance. Pass `onRetry` to
 * re-trigger the failed fetch; the component handles a `busy` state so the
 * retry button can be disabled during the re-attempt.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this right now. Please try again.',
  onRetry,
  retrying = false,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div className={`stateBox stateBox--error ${className}`} role="alert">
      <div className="stateBox__icon" aria-hidden>
        ⚠️
      </div>
      <h3 className="stateBox__title">{title}</h3>
      {message ? <p className="stateBox__desc">{message}</p> : null}
      {onRetry ? (
        <div className="stateBox__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : retryLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
