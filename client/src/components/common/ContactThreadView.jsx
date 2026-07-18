import { ContactMessageAttachments } from './ContactMessageAttachments.jsx'

function formatWhen(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function bubbleName(entry, fallbackUser) {
  if (entry.isAdmin) return 'Admin'
  return entry.author?.companyName || entry.author?.email || fallbackUser?.companyName || fallbackUser?.email || 'You'
}

function bubbleInitials(entry, fallbackUser) {
  const name = bubbleName(entry, fallbackUser)
  return name.slice(0, 2).toUpperCase()
}

/** Renders chronological thread bubbles from API `thread` array. */
export function ContactThreadTimeline({ thread = [], user }) {
  if (!thread.length) return null

  return (
    <div className="supportThread">
      {thread.map((entry) => (
        <div
          key={entry.id}
          className={`supportBubble${entry.isAdmin ? ' supportBubble--admin' : ' supportBubble--user'}`}
        >
          <div className={`supportBubble__avatar${entry.isAdmin ? ' supportBubble__avatar--admin' : ''}`}>
            {bubbleInitials(entry, user)}
          </div>
          <div className="supportBubble__content">
            <div className="supportBubble__meta">
              <span className="supportBubble__name">{bubbleName(entry, user)}</span>
              <span className="supportBubble__time">{formatWhen(entry.createdAt)}</span>
            </div>
            <div className="supportBubble__text">{entry.body}</div>
            <ContactMessageAttachments attachments={entry.attachments} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Fixed bottom reply composer for an open ticket. */
export function ContactThreadReplyBox({ value, onChange, onSubmit, submitting, placeholder }) {
  return (
    <form className="supportReplyBox" onSubmit={onSubmit}>
      <textarea
        className="supportReplyBox__input"
        rows={3}
        value={value}
        onChange={onChange}
        placeholder={placeholder || 'Write your reply…'}
        maxLength={5000}
        required
      />
      <div className="supportReplyBox__foot">
        <span className="supportReplyBox__count">{value.length} / 5000</span>
        <button type="submit" className="btn btn--primary" disabled={submitting || !value.trim()}>
          {submitting ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  )
}
