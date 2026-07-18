import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAdminMessages,
  adminMarkMessageRead,
  adminReplyToMessage,
} from '../../services/contact.service.js'
import { ContactThreadReplyBox, ContactThreadTimeline } from '../../components/common/ContactThreadView.jsx'

const STATUS_CFG = {
  UNREAD:  { label: 'Open', dot: '#f59e0b', bg: '#fef9c3', color: '#854d0e' },
  READ:    { label: 'Waiting reply', dot: '#3b82f6', bg: '#dbeafe', color: '#1e40af' },
  REPLIED: { label: 'Replied', dot: '#22c55e', bg: '#dcfce7', color: '#15803d' },
}

function StatusPill({ status }) {
  const c = STATUS_CFG[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', color: '#374151' }
  return (
    <span className="supportStatusPill" style={{ background: c.bg, color: c.color }}>
      <span className="supportStatusPill__dot" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function lastPreview(msg) {
  const thread = msg.thread || []
  const last = thread[thread.length - 1]
  if (last?.body) return last.body
  if (msg.adminReply) return msg.adminReply
  return msg.message
}

export function AdminMessagesPage() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminMessages(filter !== 'ALL' ? filter : undefined)
      const list = data.messages || []
      setMessages(list)
      setSelectedId((prev) => (prev && list.some((m) => m.id === prev) ? prev : list[0]?.id ?? null))
    } catch (err) {
      toast.error(err.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((m) =>
      `${m.subject} ${m.sender?.companyName || ''} ${m.sender?.email || ''} ${lastPreview(m)}`.toLowerCase().includes(q),
    )
  }, [messages, search])

  const selected = filtered.find((m) => m.id === selectedId) || filtered[0] || null

  useEffect(() => {
    if (selected?.id && selected.status === 'UNREAD') {
      adminMarkMessageRead(selected.id).catch(() => {})
      setMessages((prev) => prev.map((m) => (m.id === selected.id ? { ...m, status: 'READ' } : m)))
    }
  }, [selected?.id, selected?.status])

  async function handleReply(e) {
    e.preventDefault()
    if (!selected || !reply.trim()) return
    setSubmitting(true)
    try {
      await adminReplyToMessage(selected.id, reply.trim())
      toast.success('Reply sent')
      setReply('')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  const unreadCount = messages.filter((m) => m.status === 'UNREAD').length

  return (
    <section className="supportDesk">
      <header className="supportDesk__header">
        <div>
          <h2 className="panelTitle">Support dashboard</h2>
          <p className="panelSub">Manage buyer and seller conversations in one place.</p>
        </div>
        <div className="supportDesk__stats">
          <span className="supportDesk__stat">{messages.length} total</span>
          <span className="supportDesk__stat supportDesk__stat--warn">{unreadCount} open</span>
        </div>
      </header>

      <div className="supportDesk__filters">
        {[
          ['ALL', 'All'],
          ['UNREAD', 'Open'],
          ['READ', 'Waiting reply'],
          ['REPLIED', 'Replied'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`supportDesk__filter${filter === value ? ' supportDesk__filter--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
            {value === 'UNREAD' && unreadCount > 0 ? <span className="supportDesk__badge">{unreadCount}</span> : null}
          </button>
        ))}
        <input
          type="search"
          className="supportDesk__search"
          placeholder="Search subject, customer, message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search conversations"
        />
      </div>

      <div className="supportDesk__layout">
        <aside className="supportDesk__list" aria-label="Conversation list">
          {loading ? (
            <div className="supportDesk__empty">Loading conversations…</div>
          ) : filtered.length === 0 ? (
            <div className="supportDesk__empty">No conversations match your filters.</div>
          ) : (
            filtered.map((msg) => {
              const active = selected?.id === msg.id
              const unread = msg.status === 'UNREAD'
              return (
                <button
                  key={msg.id}
                  type="button"
                  className={`supportDesk__item${active ? ' supportDesk__item--active' : ''}${unread ? ' supportDesk__item--unread' : ''}`}
                  onClick={() => setSelectedId(msg.id)}
                >
                  <div className="supportDesk__itemTop">
                    <strong>{msg.sender?.companyName || msg.sender?.email}</strong>
                    <StatusPill status={msg.status} />
                  </div>
                  <div className="supportDesk__itemSubject">{msg.subject}</div>
                  <div className="supportDesk__itemPreview">{lastPreview(msg)}</div>
                  <div className="supportDesk__itemDate">
                    {new Date(msg.updatedAt || msg.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              )
            })
          )}
        </aside>

        <div className="supportDesk__detail">
          {!selected ? (
            <div className="supportDesk__empty supportDesk__empty--detail">Select a conversation to view the thread.</div>
          ) : (
            <>
              <div className="supportDesk__detailHead">
                <div>
                  <h3 className="supportDesk__detailTitle">{selected.subject}</h3>
                  <p className="supportDesk__detailMeta">
                    {selected.sender?.companyName || selected.sender?.email}
                    {' · '}
                    {selected.sender?.role}
                    {' · '}
                    {selected.sender?.email}
                  </p>
                </div>
                <StatusPill status={selected.status} />
              </div>

              <div className="supportDesk__thread">
                <ContactThreadTimeline thread={selected.thread || []} user={selected.sender} />
              </div>

              <ContactThreadReplyBox
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onSubmit={handleReply}
                submitting={submitting}
                placeholder="Write a reply to the customer…"
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
