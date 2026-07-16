import { Spinner } from './Spinner.jsx'

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="pageLoader" role="status" aria-live="polite">
      <Spinner size="lg" />
      <p className="pageLoader__text">{label}</p>
    </div>
  )
}
