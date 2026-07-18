import {
  describeTimelineEvent,
  formatDealDate,
  sortTimelineEvents,
} from '../../utils/dealHelpers.js'

export function DealTimeline({ events = [], className = '' }) {
  const rows = sortTimelineEvents(events)

  if (!rows.length) {
    return (
      <div className={`dealTimeline dealTimeline--empty ${className}`.trim()}>
        <p className="dealTimeline__empty">No timeline events yet.</p>
      </div>
    )
  }

  return (
    <ol className={`dealTimeline ${className}`.trim()} aria-label="Deal timeline">
      {rows.map((event, index) => {
        const { label, detail } = describeTimelineEvent(event)
        const isLast = index === rows.length - 1

        return (
          <li key={event.id || `${event.eventType}-${event.createdAt}`} className="dealTimeline__item">
            <div className="dealTimeline__marker" aria-hidden />
            {!isLast ? <div className="dealTimeline__line" aria-hidden /> : null}
            <div className="dealTimeline__content">
              <div className="dealTimeline__title">{label}</div>
              <div className="dealTimeline__meta">
                <time dateTime={event.createdAt}>{formatDealDate(event.createdAt)}</time>
                {detail ? <span>{detail}</span> : null}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
