export function DealListSkeleton({ rows = 4 }) {
  return (
    <div className="dealSkeleton" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="dealSkeleton__row">
          <div className="dealSkeleton__block dealSkeleton__block--lg" />
          <div className="dealSkeleton__block" />
          <div className="dealSkeleton__block" />
          <div className="dealSkeleton__block dealSkeleton__block--sm" />
        </div>
      ))}
    </div>
  )
}

export function DealDetailSkeleton() {
  return (
    <div className="dealSkeleton dealSkeleton--detail" aria-hidden>
      <div className="dealSkeleton__block dealSkeleton__block--xl" />
      <div className="dealSkeleton__grid">
        <div className="dealSkeleton__block dealSkeleton__block--lg" />
        <div className="dealSkeleton__block dealSkeleton__block--lg" />
        <div className="dealSkeleton__block dealSkeleton__block--lg" />
      </div>
    </div>
  )
}
