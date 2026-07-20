import { useNavigate } from 'react-router-dom'

export function BackNavButton({
  fallback = '/buyer/dashboard',
  label = '← Back',
  className = 'backNavBtn',
}) {
  const navigate = useNavigate()

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallback)
  }

  return (
    <button type="button" className={className} onClick={handleBack}>
      {label}
    </button>
  )
}
