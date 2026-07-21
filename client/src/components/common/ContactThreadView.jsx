import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ContactMessageAttachments } from './ContactMessageAttachments.jsx'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const MAX_REPLY_IMAGES = 5

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
            {entry.body ? <div className="supportBubble__text">{entry.body}</div> : null}
            <ContactMessageAttachments attachments={entry.attachments} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Fixed bottom reply composer for an open ticket — text + optional image attachments. */
export function ContactThreadReplyBox({
  value,
  onChange,
  onSubmit,
  submitting,
  placeholder,
  allowImages = true,
}) {
  const [imageFiles, setImageFiles] = useState([])
  const imageInputRef = useRef(null)

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [imageFiles],
  )

  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [imagePreviews])

  function handleImagePick(event) {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!picked.length) return
    setImageFiles((prev) => {
      const room = MAX_REPLY_IMAGES - prev.length
      if (room <= 0) {
        toast.error(`You can attach up to ${MAX_REPLY_IMAGES} images per message.`)
        return prev
      }
      return [...prev, ...picked.slice(0, room)]
    })
  }

  function removeImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed && imageFiles.length === 0) return
    await onSubmit({ message: trimmed, images: imageFiles })
    setImageFiles([])
  }

  const canSend = Boolean(value.trim() || imageFiles.length)

  return (
    <form className="supportReplyBox" onSubmit={handleSubmit}>
      <textarea
        className="supportReplyBox__input"
        rows={3}
        value={value}
        onChange={onChange}
        placeholder={placeholder || 'Write your reply…'}
        maxLength={5000}
      />

      {allowImages && imagePreviews.length > 0 ? (
        <div className="supportReplyBox__previews">
          {imagePreviews.map((item, index) => (
            <div key={`${item.file.name}-${index}`} className="supportReplyBox__preview">
              <img src={item.url} alt={item.file.name} />
              <button
                type="button"
                className="supportReplyBox__previewRemove"
                onClick={() => removeImage(index)}
                aria-label={`Remove ${item.file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="supportReplyBox__foot">
        <div className="supportReplyBox__left">
          <span className="supportReplyBox__count">{value.length} / 5000</span>
          {allowImages ? (
            <>
              <input
                ref={imageInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                hidden
                onChange={handleImagePick}
              />
              <button
                type="button"
                className="supportReplyBox__attachBtn"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageFiles.length >= MAX_REPLY_IMAGES}
              >
                Add image
              </button>
            </>
          ) : null}
        </div>
        <button type="submit" className="btn btn--primary" disabled={submitting || !canSend}>
          {submitting ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  )
}
