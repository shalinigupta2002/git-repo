import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppSelector } from '../../hooks/redux.js'
import { selectUser } from '../../store/slices/authSlice.js'
import {
  sendContactMessage,
  fetchMyContactMessages,
  markContactReplyRead,
  markAllContactRepliesRead,
  sendContactFollowUp,
} from '../../services/contact.service.js'
import { ContactMessageAttachments } from '../../components/common/ContactMessageAttachments.jsx'
import { ContactThreadReplyBox, ContactThreadTimeline } from '../../components/common/ContactThreadView.jsx'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'
const MAX_IMAGES = 5
const MAX_VIDEOS = 2

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  UNREAD:  { label: 'Awaiting response', dot: '#f59e0b', bg: '#fef9c3', color: '#854d0e' },
  READ:    { label: 'Seen by admin',     dot: '#3b82f6', bg: '#dbeafe', color: '#1e40af' },
  REPLIED: { label: 'Replied',           dot: '#22c55e', bg: '#dcfce7', color: '#15803d' },
}

function StatusPill({ status }) {
  const c = STATUS_CFG[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'.28rem',
      padding:'.2rem .6rem', borderRadius:'999px',
      fontSize:'.72rem', fontWeight:700,
      background:c.bg, color:c.color,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
      {c.label}
    </span>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function AdminIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function MessageThread({ msg, onMarkRead, onRefresh, user }) {
  const [open, setOpen] = useState(msg.status === 'REPLIED' && !msg.replyRead)
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hasUnreadReply  = msg.status === 'REPLIED' && !msg.replyRead
  const thread = msg.thread?.length ? msg.thread : null

  async function handleFollowUp(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSubmitting(true)
    try {
      await sendContactFollowUp(msg.id, { message: reply.trim() })
      toast.success('Reply sent')
      setReply('')
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`msgThread supportTicket${hasUnreadReply ? ' msgThread--unread' : ''}`}>
      <button
        type="button"
        className="msgThread__head"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <div className="msgThread__headLeft">
          {hasUnreadReply && <span className="msgDot" aria-label="New reply" />}
          <div className="msgThread__subject">{msg.subject}</div>
          <StatusPill status={msg.status} />
        </div>
        <div className="msgThread__headRight">
          <span className="msgThread__date">
            {new Date(msg.updatedAt || msg.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
          <span className={`msgChevron${open ? ' msgChevron--open' : ''}`} aria-hidden>›</span>
        </div>
      </button>

      {open && (
        <div className="msgThread__body supportTicket__body">
          {thread ? (
            <ContactThreadTimeline thread={thread} user={user} />
          ) : (
            <>
              <div className="msgBubble msgBubble--sender">
                <div className="msgBubble__content">
                  <div className="msgBubble__text">{msg.message}</div>
                  <ContactMessageAttachments attachments={msg.attachments} />
                </div>
              </div>
              {msg.adminReply ? (
                <div className="msgBubble msgBubble--admin">
                  <div className="msgBubble__content">
                    <div className="msgBubble__text msgBubble__text--admin">{msg.adminReply}</div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {hasUnreadReply ? (
            <button type="button" className="msgMarkReadBtn" onClick={() => onMarkRead(msg.id)}>
              <CheckIcon /> Mark admin reply as read
            </button>
          ) : null}

          <ContactThreadReplyBox
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onSubmit={handleFollowUp}
            submitting={submitting}
            placeholder="Reply to admin — conversation stays open until resolved"
          />
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function ContactAdminPage() {
  const user = useAppSelector(selectUser)
  const [messages,   setMessages]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [subject,    setSubject]    = useState('')
  const [body,       setBody]       = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [videoFiles, setVideoFiles] = useState([])
  const [unread,     setUnread]     = useState([])
  const formRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [imageFiles],
  )
  const videoPreviews = useMemo(
    () => videoFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [videoFiles],
  )

  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => URL.revokeObjectURL(item.url))
      videoPreviews.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [imagePreviews, videoPreviews])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMyContactMessages()
      const list = data.messages || []
      setMessages(list)
      setUnread(list.filter((m) => m.status === 'REPLIED' && !m.replyRead))
    } catch (err) {
      toast.error(err.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleImagePick(e) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    setImageFiles((prev) => {
      const room = MAX_IMAGES - prev.length
      if (room <= 0) {
        toast.error(`You can attach up to ${MAX_IMAGES} images.`)
        return prev
      }
      return [...prev, ...picked.slice(0, room)]
    })
  }

  function handleVideoPick(e) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    setVideoFiles((prev) => {
      const room = MAX_VIDEOS - prev.length
      if (room <= 0) {
        toast.error(`You can attach up to ${MAX_VIDEOS} videos.`)
        return prev
      }
      return [...prev, ...picked.slice(0, room)]
    })
  }

  function removeImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function removeVideo(index) {
    setVideoFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setSubmitting(true)
    try {
      await sendContactMessage({
        subject: subject.trim(),
        message: body.trim(),
        images: imageFiles,
        videos: videoFiles,
      })
      toast.success('Message sent to admin!')
      setSubject('')
      setBody('')
      setImageFiles([])
      setVideoFiles([])
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkRead(id) {
    try {
      await markContactReplyRead(id)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read')
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllContactRepliesRead()
      toast.success('All replies marked as read')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read')
    }
  }

  const initials = (user?.companyName || user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <section className="caPage">

      {/* ── Unread reply banner ─────────────────────────────────────────── */}
      {unread.length > 0 && (
        <div className="caBanner">
          <span className="caBanner__icon"><BellIcon /></span>
          <div className="caBanner__body">
            <strong>{unread.length} new repl{unread.length > 1 ? 'ies' : 'y'} from admin</strong>
            <span>Open the thread below to read the admin&apos;s response.</span>
          </div>
          <button type="button" className="caBanner__cta" onClick={handleMarkAllRead}>
            <CheckIcon /> Mark all as read
          </button>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="caHero">
        <div className="caHero__iconWrap">
          <AdminIcon />
        </div>
        <div>
          <h1 className="caHero__title">Contact Admin</h1>
          <p className="caHero__sub">
            Have a question, issue or suggestion? Send a direct message to the admin team. 
            You&apos;ll receive a reply here and can track the conversation.
          </p>
        </div>
      </div>

      <div className="caLayout">
        {/* ── Compose form ────────────────────────────────────────────────── */}
        <div className="caCompose">
          <div className="caCompose__header">
            <div className="caCompose__avatar">{initials}</div>
            <div>
              <div className="caCompose__name">{user?.companyName || user?.email}</div>
              <div className="caCompose__role">{user?.role}</div>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSend} className="caForm">
            <div className="caField">
              <label className="caLabel" htmlFor="ca-subject">
                Subject <span className="caReq">*</span>
              </label>
              <input
                id="ca-subject"
                className="caInput"
                type="text"
                placeholder="e.g. Issue with product listing"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={300}
                required
              />
            </div>

            <div className="caField">
              <label className="caLabel" htmlFor="ca-body">
                Message <span className="caReq">*</span>
              </label>
              <textarea
                id="ca-body"
                className="caInput caTextarea"
                rows={6}
                placeholder="Describe your query, issue or feedback in detail…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                required
              />
              <p className="caHint">{body.length} / 5000</p>
            </div>

            <div className="caField">
              <span className="caLabel">Attachments</span>
              <p className="caAttachHint">Optional — add screenshots or a short video to explain your issue.</p>
              <div className="caAttachActions">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  hidden
                  onChange={handleImagePick}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  multiple
                  hidden
                  onChange={handleVideoPick}
                />
                <button
                  type="button"
                  className="caAttachBtn"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageFiles.length >= MAX_IMAGES}
                >
                  Add image
                </button>
                <button
                  type="button"
                  className="caAttachBtn"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoFiles.length >= MAX_VIDEOS}
                >
                  Add video
                </button>
              </div>
              <p className="caAttachMeta">
                {imageFiles.length}/{MAX_IMAGES} images · {videoFiles.length}/{MAX_VIDEOS} videos
              </p>

              {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
                <div className="caAttachPreviewGrid">
                  {imagePreviews.map((item, index) => (
                    <div key={`${item.file.name}-${index}`} className="caAttachPreview caAttachPreview--image">
                      <img src={item.url} alt={item.file.name} />
                      <button type="button" className="caAttachPreview__remove" onClick={() => removeImage(index)} aria-label={`Remove ${item.file.name}`}>
                        ×
                      </button>
                      <span className="caAttachPreview__name">{item.file.name}</span>
                    </div>
                  ))}
                  {videoPreviews.map((item, index) => (
                    <div key={`${item.file.name}-${index}`} className="caAttachPreview caAttachPreview--video">
                      <video src={item.url} controls preload="metadata" />
                      <button type="button" className="caAttachPreview__remove" onClick={() => removeVideo(index)} aria-label={`Remove ${item.file.name}`}>
                        ×
                      </button>
                      <span className="caAttachPreview__name">{item.file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="caSendBtn"
              disabled={submitting || !subject.trim() || !body.trim()}
            >
              {submitting
                ? <><span className="caSpinner" aria-hidden /> Sending…</>
                : <><SendIcon /> Send message</>
              }
            </button>
          </form>
        </div>

        {/* ── Message history ──────────────────────────────────────────────── */}
        <div className="caHistory">
          <div className="caHistory__header">
            <h2 className="caHistory__title">My Messages</h2>
            <span className="caHistory__badge">{messages.length}</span>
          </div>

          {loading ? (
            <div className="caEmpty">
              <span className="caSpinnerLg" aria-label="Loading" />
              <p>Loading your messages…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="caEmpty">
              <span style={{ fontSize:'2.5rem', opacity:.35 }}>💬</span>
              <p className="caEmpty__title">No messages yet</p>
              <p className="caEmpty__sub">Send your first message using the form.</p>
            </div>
          ) : (
            <div className="caThreadList">
              {messages.map((m) => (
                <MessageThread key={m.id} msg={m} user={user} onMarkRead={handleMarkRead} onRefresh={load} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .caPage { display:flex; flex-direction:column; gap:1.5rem; }

        /* Banner */
        .caBanner {
          display:flex; align-items:center; gap:.875rem;
          background:linear-gradient(135deg,#fefce8,#fef9c3);
          border:1px solid #fde047; border-radius:.75rem;
          padding:.875rem 1.125rem; box-shadow:0 1px 4px rgba(234,179,8,.15);
        }
        .caBanner__icon  { color:#ca8a04; flex-shrink:0; display:flex; align-items:center; }
        .caBanner__body  { flex:1; display:flex; flex-direction:column; gap:.1rem; }
        .caBanner__body strong { font-size:.88rem; color:#713f12; }
        .caBanner__body span  { font-size:.8rem;  color:#92400e; }
        .caBanner__cta {
          display:inline-flex; align-items:center; gap:.35rem;
          background:#fff; border:1px solid #fde047; border-radius:.45rem;
          padding:.375rem .8rem; font-size:.8rem; font-weight:600; color:#854d0e;
          cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .15s;
        }
        .caBanner__cta:hover { background:#fef9c3; }

        /* Hero */
        .caHero {
          display:flex; align-items:flex-start; gap:1rem;
          background:linear-gradient(135deg,#eff6ff,#eef2ff);
          border:1px solid #c7d2fe; border-radius:.875rem; padding:1.25rem 1.5rem;
        }
        .caHero__iconWrap {
          width:48px; height:48px; border-radius:.625rem; flex-shrink:0;
          background:linear-gradient(135deg,#4f46e5,#6366f1); color:#fff;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 12px rgba(99,102,241,.35);
        }
        .caHero__title { margin:0 0 .3rem; font-size:1.25rem; font-weight:800; color:#1e1b4b; }
        .caHero__sub   { margin:0; font-size:.85rem; color:#4338ca; line-height:1.65; }

        /* Layout */
        .caLayout { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; align-items:start; }
        @media(max-width:768px) { .caLayout { grid-template-columns:1fr; } }

        /* Compose card */
        .caCompose {
          background:#fff; border:1px solid #e5e7eb; border-radius:.875rem;
          box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden;
        }
        .caCompose__header {
          display:flex; align-items:center; gap:.75rem;
          padding:1rem 1.25rem; background:#f9fafb; border-bottom:1px solid #e5e7eb;
        }
        .caCompose__avatar {
          width:38px; height:38px; border-radius:50%; flex-shrink:0;
          background:linear-gradient(135deg,#4f46e5,#818cf8); color:#fff;
          display:flex; align-items:center; justify-content:center;
          font-weight:700; font-size:.875rem;
        }
        .caCompose__name { font-weight:700; font-size:.9rem; color:#111827; }
        .caCompose__role { font-size:.75rem; color:#9ca3af; text-transform:uppercase; letter-spacing:.05em; }

        /* Form */
        .caForm    { display:flex; flex-direction:column; gap:1rem; padding:1.25rem; }
        .caField   { display:flex; flex-direction:column; gap:.35rem; }
        .caLabel   { font-size:.82rem; font-weight:600; color:#374151; }
        .caReq     { color:#ef4444; }
        .caHint    { margin:.15rem 0 0; font-size:.73rem; color:#d1d5db; text-align:right; }
        .caInput {
          width:100%; padding:.6rem .85rem; border:1px solid #d1d5db;
          border-radius:.5rem; font-size:.875rem; color:#111827;
          background:#fff; outline:none; box-sizing:border-box;
          transition:border-color .15s, box-shadow .15s;
        }
        .caInput:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        .caTextarea { resize:vertical; min-height:140px; font-family:inherit; line-height:1.6; }
        .caAttachHint { margin:0; font-size:.78rem; color:#6b7280; line-height:1.5; }
        .caAttachActions { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.35rem; }
        .caAttachBtn {
          display:inline-flex; align-items:center; justify-content:center;
          padding:.5rem .9rem; border:1px dashed #c7d2fe; border-radius:.5rem;
          background:#f8fafc; color:#4338ca; font-size:.82rem; font-weight:600;
          cursor:pointer; transition:background .15s, border-color .15s;
        }
        .caAttachBtn:hover:not(:disabled) { background:#eef2ff; border-color:#818cf8; }
        .caAttachBtn:disabled { opacity:.45; cursor:not-allowed; }
        .caAttachMeta { margin:.35rem 0 0; font-size:.72rem; color:#9ca3af; }
        .caAttachPreviewGrid {
          display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));
          gap:.65rem; margin-top:.75rem;
        }
        .caAttachPreview {
          position:relative; border:1px solid #e5e7eb; border-radius:.55rem;
          overflow:hidden; background:#f9fafb;
        }
        .caAttachPreview img,
        .caAttachPreview video {
          display:block; width:100%; aspect-ratio:1; object-fit:cover; background:#e5e7eb;
        }
        .caAttachPreview--video video { aspect-ratio:16/10; object-fit:contain; }
        .caAttachPreview__name {
          display:block; padding:.35rem .45rem; font-size:.68rem; color:#6b7280;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .caAttachPreview__remove {
          position:absolute; top:4px; right:4px; width:22px; height:22px;
          border:none; border-radius:999px; background:rgba(15,23,42,.72); color:#fff;
          font-size:14px; line-height:1; cursor:pointer;
        }
        .caSendBtn {
          display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
          background:linear-gradient(135deg,#4f46e5,#6366f1); color:#fff;
          border:none; border-radius:.55rem; padding:.7rem 1.5rem;
          font-size:.9rem; font-weight:700; cursor:pointer; letter-spacing:.01em;
          box-shadow:0 2px 10px rgba(99,102,241,.4);
          transition:opacity .15s, transform .1s; width:100%;
        }
        .caSendBtn:hover:not(:disabled)  { opacity:.9; transform:translateY(-1px); }
        .caSendBtn:active:not(:disabled) { transform:translateY(0); }
        .caSendBtn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .caSpinner {
          display:inline-block; width:14px; height:14px; border-radius:50%;
          border:2px solid rgba(255,255,255,.4); border-top-color:#fff;
          animation:caSpin .6s linear infinite;
        }
        @keyframes caSpin { to { transform:rotate(360deg); } }

        /* History card */
        .caHistory {
          background:#fff; border:1px solid #e5e7eb; border-radius:.875rem;
          box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden;
          max-height:700px; display:flex; flex-direction:column;
        }
        .caHistory__header {
          display:flex; align-items:center; gap:.5rem;
          padding:1rem 1.25rem; border-bottom:1px solid #f3f4f6; flex-shrink:0;
        }
        .caHistory__title { margin:0; font-size:1rem; font-weight:700; color:#111827; }
        .caHistory__badge {
          background:#f3f4f6; color:#6b7280; border-radius:999px;
          padding:.15rem .6rem; font-size:.75rem; font-weight:700;
        }
        .caThreadList { overflow-y:auto; flex:1; }
        .caEmpty {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:3rem 1rem; text-align:center; gap:.5rem; flex:1;
        }
        .caEmpty__title { margin:0; font-weight:700; color:#374151; font-size:.95rem; }
        .caEmpty__sub   { margin:0; font-size:.82rem; color:#9ca3af; }
        .caSpinnerLg {
          width:30px; height:30px; border-radius:50%;
          border:3px solid #e5e7eb; border-top-color:#6366f1;
          animation:caSpin .8s linear infinite;
        }

        /* Thread */
        .msgThread { border-bottom:1px solid #f3f4f6; }
        .msgThread:last-child { border-bottom:none; }
        .msgThread--unread { background:#fefce8; }
        .msgThread__head {
          display:flex; align-items:center; justify-content:space-between;
          width:100%; padding:.875rem 1.25rem; background:transparent;
          border:none; cursor:pointer; gap:.75rem; text-align:left;
          transition:background .1s;
        }
        .msgThread__head:hover { background:#f9fafb; }
        .msgThread--unread .msgThread__head:hover { background:#fef9c3; }
        .msgThread__headLeft  { display:flex; align-items:center; gap:.5rem; flex:1; min-width:0; }
        .msgThread__headRight { display:flex; align-items:center; gap:.5rem; flex-shrink:0; }
        .msgThread__subject { font-weight:600; font-size:.875rem; color:#111827; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .msgThread__date { font-size:.75rem; color:#9ca3af; }
        .msgDot {
          width:9px; height:9px; border-radius:50%; background:#f59e0b;
          flex-shrink:0; box-shadow:0 0 0 3px rgba(245,158,11,.2);
        }
        .msgChevron { font-size:1.1rem; color:#9ca3af; transition:transform .2s; display:inline-block; }
        .msgChevron--open { transform:rotate(90deg); }

        /* Thread body */
        .msgThread__body { padding:.75rem 1.25rem 1.25rem; display:flex; flex-direction:column; gap:.875rem; }

        /* Bubbles */
        .msgBubble { display:flex; gap:.75rem; align-items:flex-start; }
        .msgBubble--admin { flex-direction:row-reverse; }
        .msgBubble__avatar {
          width:36px; height:36px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-weight:700; font-size:.8rem; color:#fff;
        }
        .msgBubble__avatar--sender { background:linear-gradient(135deg,#4f46e5,#818cf8); }
        .msgBubble__avatar--admin  { background:linear-gradient(135deg,#0ea5e9,#6366f1); }
        .msgBubble__content { max-width:85%; display:flex; flex-direction:column; gap:.35rem; }
        .msgBubble--admin .msgBubble__content { align-items:flex-end; }
        .msgBubble__meta { display:flex; align-items:center; gap:.45rem; flex-wrap:wrap; }
        .msgBubble--admin .msgBubble__meta { flex-direction:row-reverse; }
        .msgBubble__name  { font-size:.8rem; font-weight:700; color:#111827; }
        .msgBubble__role  {
          font-size:.68rem; font-weight:600; padding:.1rem .45rem;
          border-radius:.25rem; background:#f0fdf4; color:#166534;
          text-transform:uppercase; letter-spacing:.04em;
        }
        .msgBubble__time  { font-size:.72rem; color:#9ca3af; }
        .msgBubble__text {
          background:#f9fafb; border:1px solid #e5e7eb; border-radius:.625rem;
          padding:.65rem .9rem; font-size:.875rem; color:#374151; line-height:1.65;
          word-break:break-word;
        }
        .msgBubble__text--admin {
          background:linear-gradient(135deg,#eff6ff,#eef2ff);
          border-color:#c7d2fe; color:#1e1b4b;
        }
        .msgMarkReadBtn {
          display:inline-flex; align-items:center; gap:.3rem;
          background:#f0fdf4; border:1px solid #86efac; border-radius:.4rem;
          padding:.25rem .65rem; font-size:.75rem; font-weight:600; color:#15803d;
          cursor:pointer; transition:background .15s; align-self:flex-end;
        }
        .msgMarkReadBtn:hover { background:#dcfce7; }
        .msgWaiting {
          display:inline-flex; align-items:center; gap:.5rem;
          padding:.55rem .9rem; border-radius:.5rem;
          background:#f9fafb; border:1px dashed #d1d5db;
          font-size:.82rem; color:#9ca3af; font-style:italic;
        }
        .msgWaiting__dot {
          width:8px; height:8px; border-radius:50%; background:#d1d5db;
          animation:caPulse 1.5s ease-in-out infinite;
        }
        @keyframes caPulse {
          0%,100% { opacity:.4; transform:scale(.9); }
          50%      { opacity:1;  transform:scale(1.1); }
        }
      `}</style>
    </section>
  )
}
