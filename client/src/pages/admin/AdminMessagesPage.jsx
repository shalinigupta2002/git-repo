import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAdminMessages,
  adminMarkMessageRead,
  adminReplyToMessage,
} from '../../services/contact.service.js'
import { ContactMessageAttachments } from '../../components/common/ContactMessageAttachments.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  UNREAD:  { label: 'Unread',  dot: '#f59e0b', bg: '#fef9c3', color: '#854d0e' },
  READ:    { label: 'Read',    dot: '#3b82f6', bg: '#dbeafe', color: '#1e40af' },
  REPLIED: { label: 'Replied', dot: '#22c55e', bg: '#dcfce7', color: '#15803d' },
}

const ROLE_CFG = {
  BUYER:  { label: 'Buyer',  bg: '#dbeafe', color: '#1e40af' },
  SELLER: { label: 'Seller', bg: '#f0fdf4', color: '#15803d' },
  ADMIN:  { label: 'Admin',  bg: '#ede9fe', color: '#5b21b6' },
}

function StatusPill({ status }) {
  const c = STATUS_CFG[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'.28rem',
      padding:'.22rem .65rem', borderRadius:'999px',
      fontSize:'.72rem', fontWeight:700,
      background:c.bg, color:c.color, whiteSpace:'nowrap',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
      {c.label}
    </span>
  )
}

function RoleChip({ role }) {
  const c = ROLE_CFG[role] || { label: role, bg:'#f3f4f6', color:'#374151' }
  return (
    <span style={{
      padding:'.15rem .5rem', borderRadius:'.3rem',
      fontSize:'.7rem', fontWeight:700, letterSpacing:'.04em',
      background:c.bg, color:c.color, textTransform:'uppercase',
    }}>
      {c.label}
    </span>
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

// ─── Reply modal ──────────────────────────────────────────────────────────────

function ReplyModal({ msg, onClose, onReplied }) {
  const [reply,   setReply]   = useState(msg.adminReply || '')
  const [saving,  setSaving]  = useState(false)
  const textRef = useRef(null)

  useEffect(() => { textRef.current?.focus() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSaving(true)
    try {
      await adminReplyToMessage(msg.id, reply.trim())
      toast.success('Reply sent!')
      onReplied()
    } catch (err) {
      toast.error(err.message || 'Failed to send reply')
    } finally {
      setSaving(false)
    }
  }

  const senderInitials = (msg.sender?.companyName || msg.sender?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="amOverlay" onClick={onClose}>
      <div className="amModal" onClick={(e) => e.stopPropagation()}>
        <div className="amModal__header">
          <div className="amModal__titleRow">
            <h3 className="amModal__title">Reply to Message</h3>
            <button type="button" className="amModal__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="amModal__senderRow">
            <div className="amMiniAvatar">{senderInitials}</div>
            <div>
              <span className="amModal__senderName">{msg.sender?.companyName || msg.sender?.email}</span>
              <RoleChip role={msg.sender?.role} />
            </div>
          </div>
        </div>

        {/* Original message */}
        <div className="amModal__orig">
          <div className="amModal__origLabel">Original message</div>
          <div className="amModal__origSubject">{msg.subject}</div>
          <div className="amModal__origBody">{msg.message}</div>
          <ContactMessageAttachments attachments={msg.attachments} />
          <div className="amModal__origDate">
            {new Date(msg.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="amModal__form">
          <div className="caField">
            <label className="caLabel" htmlFor="admin-reply">Your reply <span className="caReq">*</span></label>
            <textarea
              id="admin-reply"
              ref={textRef}
              className="caInput caTextarea"
              rows={5}
              placeholder="Type your reply here…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={5000}
              required
              style={{ resize:'vertical', minHeight:'120px' }}
            />
            <p className="caHint">{reply.length} / 5000</p>
          </div>
          <div className="amModal__foot">
            <button type="submit" className="amReplyBtn" disabled={saving || !reply.trim()}>
              {saving ? <><span className="caSpinner" aria-hidden /> Sending…</> : <><SendIcon /> Send reply</>}
            </button>
            <button type="button" className="amCancelBtn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>

      <style>{`
        .amOverlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
        .amModal { background:#fff; border-radius:.875rem; width:min(560px,96vw); max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.22); display:flex; flex-direction:column; }
        .amModal__header { padding:1.25rem 1.5rem .875rem; border-bottom:1px solid #e5e7eb; }
        .amModal__titleRow { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:.75rem; }
        .amModal__title { margin:0; font-size:1.05rem; font-weight:800; color:#111827; }
        .amModal__close { background:none; border:none; font-size:1rem; color:#9ca3af; cursor:pointer; padding:.25rem; line-height:1; border-radius:.25rem; }
        .amModal__close:hover { background:#f3f4f6; color:#374151; }
        .amModal__senderRow { display:flex; align-items:center; gap:.625rem; }
        .amModal__senderName { font-weight:600; font-size:.875rem; color:#111827; margin-right:.4rem; }
        .amMiniAvatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#818cf8); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.78rem; flex-shrink:0; }
        .amModal__orig { margin:1rem 1.5rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:.625rem; padding:.875rem 1rem; }
        .amModal__origLabel { font-size:.72rem; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-bottom:.4rem; }
        .amModal__origSubject { font-weight:700; font-size:.9rem; color:#111827; margin-bottom:.35rem; }
        .amModal__origBody { font-size:.875rem; color:#374151; line-height:1.65; white-space:pre-wrap; word-break:break-word; }
        .amModal__origDate { font-size:.73rem; color:#9ca3af; margin-top:.5rem; }
        .amModal__form { padding:0 1.5rem 1.5rem; display:flex; flex-direction:column; gap:.875rem; }
        .amModal__foot { display:flex; gap:.625rem; align-items:center; }
        .amReplyBtn { display:inline-flex; align-items:center; gap:.4rem; background:linear-gradient(135deg,#4f46e5,#6366f1); color:#fff; border:none; border-radius:.5rem; padding:.65rem 1.35rem; font-size:.875rem; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.35); transition:opacity .15s; }
        .amReplyBtn:hover:not(:disabled) { opacity:.9; }
        .amReplyBtn:disabled { opacity:.5; cursor:not-allowed; }
        .amCancelBtn { background:none; border:1px solid #e5e7eb; border-radius:.5rem; padding:.65rem 1.1rem; font-size:.82rem; font-weight:500; color:#6b7280; cursor:pointer; }
        .amCancelBtn:hover { background:#f9fafb; }
      `}</style>
    </div>
  )
}

// ─── Message row (expandable) ─────────────────────────────────────────────────

function MessageRow({ msg, onAction }) {
  const [open, setOpen] = useState(false)
  const senderInitials  = (msg.sender?.companyName || msg.sender?.email || 'U').slice(0, 2).toUpperCase()
  const isUnread        = msg.status === 'UNREAD'

  async function handleOpen() {
    setOpen((p) => !p)
    if (isUnread && !open) {
      try { await adminMarkMessageRead(msg.id) } catch { /* silent */ }
    }
  }

  return (
    <div className={`amRow${isUnread ? ' amRow--unread' : ''}`}>
      <button type="button" className="amRow__head" onClick={handleOpen} aria-expanded={open}>
        <div className="amRow__sender">
          <div className="amAvatar">{senderInitials}</div>
          <div className="amRow__senderInfo">
            <span className="amRow__senderName">{msg.sender?.companyName || msg.sender?.email}</span>
            <RoleChip role={msg.sender?.role} />
          </div>
        </div>
        <div className="amRow__subject">
          {isUnread && <span className="amUnreadDot" aria-label="Unread" />}
          {msg.subject}
        </div>
        <div className="amRow__right">
          <StatusPill status={msg.status} />
          <span className="amRow__date">
            {new Date(msg.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
          </span>
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && (
        <div className="amRow__body">
          <div className="amRow__msg">{msg.message}</div>
          <ContactMessageAttachments attachments={msg.attachments} className="amRow__attachments" />
          {msg.adminReply && (
            <div className="amRow__reply">
              <div className="amRow__replyLabel">Your reply</div>
              <div className="amRow__replyText">{msg.adminReply}</div>
              <div className="amRow__replyDate">
                Sent {msg.repliedAt ? new Date(msg.repliedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
              </div>
            </div>
          )}
          <div className="amRow__actions">
            <button type="button" className="amReplyBtnSm" onClick={() => onAction('reply', msg)}>
              <SendIcon /> {msg.adminReply ? 'Edit reply' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function AdminMessagesPage() {
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('ALL')
  const [replying,  setReplying]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminMessages(filter !== 'ALL' ? filter : undefined)
      setMessages(data.messages || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  function handleAction(type, msg) {
    if (type === 'reply') setReplying(msg)
  }

  const unreadCount  = messages.filter((m) => m.status === 'UNREAD').length
  const repliedCount = messages.filter((m) => m.status === 'REPLIED').length

  return (
    <section className="amPage">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="amPageHeader">
        <div className="amPageHeader__left">
          <h2 className="panelTitle">Messages from Users</h2>
          <p className="panelSub">View and reply to messages sent by buyers and sellers.</p>
        </div>
        <div className="amPageHeader__stats">
          <div className="amStat"><span className="amStat__n">{messages.length}</span><span className="amStat__l">Total</span></div>
          <div className="amStat amStat--yellow"><span className="amStat__n">{unreadCount}</span><span className="amStat__l">Unread</span></div>
          <div className="amStat amStat--green"><span className="amStat__n">{repliedCount}</span><span className="amStat__l">Replied</span></div>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="amFilters">
        {['ALL', 'UNREAD', 'READ', 'REPLIED'].map((s) => (
          <button
            key={s}
            type="button"
            className={`amFilter${filter === s ? ' amFilter--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'ALL' ? 'All messages' : STATUS_CFG[s]?.label || s}
            {s === 'UNREAD' && unreadCount > 0 && (
              <span className="amFilter__badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div className="amList">
        {loading ? (
          <div className="amEmpty">
            <span className="amSpinnerLg" aria-label="Loading" />
            <p>Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="amEmpty">
            <span style={{ fontSize:'2.5rem', opacity:.35 }}>📭</span>
            <p className="amEmpty__title">No messages found</p>
            <p className="amEmpty__sub">
              {filter === 'UNREAD' ? 'No unread messages — you\'re all caught up!' : 'No messages in this category.'}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageRow key={m.id} msg={m} onAction={handleAction} />
          ))
        )}
      </div>

      {replying && (
        <ReplyModal
          msg={replying}
          onClose={() => setReplying(null)}
          onReplied={() => { setReplying(null); load() }}
        />
      )}

      <style>{`
        .amPage { display:flex; flex-direction:column; gap:1.25rem; }

        /* Header */
        .amPageHeader { display:flex; align-items:flex-start; justify-content:space-between; gap:1.25rem; flex-wrap:wrap; }
        .amPageHeader__left { flex:1; }
        .amPageHeader__stats { display:flex; gap:.625rem; }
        .amStat { background:#fff; border:1px solid #e5e7eb; border-radius:.6rem; padding:.5rem .875rem; text-align:center; min-width:68px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .amStat__n { display:block; font-size:1.35rem; font-weight:800; color:#1f2937; }
        .amStat__l { display:block; font-size:.7rem; color:#9ca3af; font-weight:500; }
        .amStat--yellow .amStat__n { color:#d97706; }
        .amStat--green  .amStat__n { color:#16a34a; }

        /* Filters */
        .amFilters { display:flex; gap:.375rem; flex-wrap:wrap; }
        .amFilter {
          display:inline-flex; align-items:center; gap:.375rem;
          padding:.4rem .875rem; border-radius:.45rem; border:1px solid #e5e7eb;
          background:transparent; cursor:pointer; font-size:.82rem; font-weight:600;
          color:#6b7280; transition:all .15s;
        }
        .amFilter:hover { background:#f9fafb; color:#374151; }
        .amFilter--active { background:#4f46e5; color:#fff; border-color:#4f46e5; }
        .amFilter__badge {
          background:#ef4444; color:#fff; border-radius:999px;
          padding:.05rem .45rem; font-size:.68rem; font-weight:800;
        }

        /* List container */
        .amList { background:#fff; border:1px solid #e5e7eb; border-radius:.875rem; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.06); }

        /* Row */
        .amRow { border-bottom:1px solid #f3f4f6; }
        .amRow:last-child { border-bottom:none; }
        .amRow--unread { background:#fefce8; }
        .amRow__head {
          display:grid; grid-template-columns:220px 1fr auto;
          align-items:center; gap:1rem; width:100%; padding:.9rem 1.25rem;
          background:transparent; border:none; cursor:pointer; text-align:left;
          transition:background .1s;
        }
        .amRow__head:hover { background:#f9fafb; }
        .amRow--unread .amRow__head:hover { background:#fef9c3; }
        .amRow__sender { display:flex; align-items:center; gap:.625rem; }
        .amAvatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#818cf8); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.78rem; flex-shrink:0; }
        .amRow__senderInfo { display:flex; flex-direction:column; gap:.2rem; min-width:0; }
        .amRow__senderName { font-weight:700; font-size:.82rem; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .amRow__subject { font-size:.875rem; font-weight:500; color:#374151; display:flex; align-items:center; gap:.45rem; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .amRow__right { display:flex; align-items:center; gap:.625rem; flex-shrink:0; }
        .amRow__date { font-size:.75rem; color:#9ca3af; white-space:nowrap; }
        .amUnreadDot { width:9px; height:9px; border-radius:50%; background:#f59e0b; flex-shrink:0; box-shadow:0 0 0 3px rgba(245,158,11,.2); }

        /* Row body */
        .amRow__body { padding:.5rem 1.25rem 1.25rem 1.25rem; padding-left:calc(1.25rem + 34px + .625rem); display:flex; flex-direction:column; gap:.875rem; }
        .amRow__msg { font-size:.875rem; color:#374151; line-height:1.7; white-space:pre-wrap; word-break:break-word; background:#f9fafb; border:1px solid #e5e7eb; border-radius:.5rem; padding:.75rem 1rem; }
        .amRow__reply { background:linear-gradient(135deg,#eff6ff,#eef2ff); border:1px solid #c7d2fe; border-radius:.5rem; padding:.75rem 1rem; display:flex; flex-direction:column; gap:.35rem; }
        .amRow__replyLabel { font-size:.7rem; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:.06em; }
        .amRow__replyText  { font-size:.875rem; color:#1e1b4b; line-height:1.65; white-space:pre-wrap; word-break:break-word; }
        .amRow__replyDate  { font-size:.73rem; color:#818cf8; }
        .amRow__actions { display:flex; gap:.5rem; }
        .amReplyBtnSm {
          display:inline-flex; align-items:center; gap:.35rem;
          background:linear-gradient(135deg,#4f46e5,#6366f1); color:#fff;
          border:none; border-radius:.45rem; padding:.45rem 1rem;
          font-size:.8rem; font-weight:700; cursor:pointer;
          box-shadow:0 2px 6px rgba(99,102,241,.3); transition:opacity .15s;
        }
        .amReplyBtnSm:hover { opacity:.9; }

        /* Empty */
        .amEmpty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3.5rem 1rem; gap:.5rem; text-align:center; }
        .amEmpty__title { margin:0; font-weight:700; color:#374151; font-size:.95rem; }
        .amEmpty__sub   { margin:0; font-size:.82rem; color:#9ca3af; }
        .amSpinnerLg { width:30px; height:30px; border-radius:50%; border:3px solid #e5e7eb; border-top-color:#6366f1; animation:amSpin .8s linear infinite; }
        @keyframes amSpin { to { transform:rotate(360deg); } }

        /* Shared form helpers from ContactAdminPage */
        .caField { display:flex; flex-direction:column; gap:.35rem; }
        .caLabel { font-size:.82rem; font-weight:600; color:#374151; }
        .caReq   { color:#ef4444; }
        .caHint  { margin:.15rem 0 0; font-size:.73rem; color:#d1d5db; text-align:right; }
        .caInput { width:100%; padding:.6rem .85rem; border:1px solid #d1d5db; border-radius:.5rem; font-size:.875rem; color:#111827; background:#fff; outline:none; box-sizing:border-box; transition:border-color .15s, box-shadow .15s; }
        .caInput:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        .caTextarea { resize:vertical; font-family:inherit; line-height:1.6; }
        .caSpinner { display:inline-block; width:13px; height:13px; border-radius:50%; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; animation:amSpin .6s linear infinite; }

        @media(max-width:640px) {
          .amRow__head { grid-template-columns:1fr auto; }
          .amRow__sender { display:none; }
          .amRow__body { padding-left:1.25rem; }
          .amPageHeader { flex-direction:column; }
        }
      `}</style>
    </section>
  )
}
