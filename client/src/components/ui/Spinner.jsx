/**
 * @param {{ size?: 'sm' | 'md' | 'lg', className?: string }} props
 */
export function Spinner({ size = 'md', className = '' }) {
  const map = { sm: 'spinner--sm', md: '', lg: 'spinner--lg' }
  return <span className={`spinner ${map[size]} ${className}`.trim()} aria-hidden />
}
