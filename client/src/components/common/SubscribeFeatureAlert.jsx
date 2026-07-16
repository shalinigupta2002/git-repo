import { useEffect } from 'react'

export function SubscribeFeatureAlert({
  open,
  title = 'Subscription required',
  message,
  onClose,
  onSubscribe,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="featureAlertOverlay" role="presentation" onClick={onClose}>
      <div
        className="featureAlert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="featureAlertTitle"
        aria-describedby="featureAlertMessage"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="featureAlert__icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 id="featureAlertTitle" className="featureAlert__title">
          {title}
        </h2>
        <p id="featureAlertMessage" className="featureAlert__message">
          {message}
        </p>
        <div className="featureAlert__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Not now
          </button>
          <button type="button" className="btn btn--primary" onClick={onSubscribe}>
            View plans &amp; pricing
          </button>
        </div>
      </div>
    </div>
  )
}
