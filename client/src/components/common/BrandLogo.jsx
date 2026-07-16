const logoSrc = `${import.meta.env.BASE_URL}logo.png`

/**
 * Marketplace brand logo (served from `public/logo.png`).
 * @param {'sm' | 'md' | 'lg' | 'nav'} size
 */
export function BrandLogo({
  size = 'md',
  alt = 'B2B Marketplace',
  className = '',
}) {
  const sizeClass =
    size === 'sm'
      ? 'brandLogo--sm'
      : size === 'lg'
        ? 'brandLogo--lg'
        : size === 'nav'
          ? 'brandLogo--nav'
          : 'brandLogo--md'

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`brandLogo ${sizeClass} ${className}`.trim()}
      decoding="async"
    />
  )
}
