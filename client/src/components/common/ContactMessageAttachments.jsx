import { useState } from 'react'
import { parseContactAttachments, resolveUploadUrl } from '../../utils/uploadUrl.js'

export function ContactMessageAttachments({ attachments, className = '' }) {
  const items = parseContactAttachments(attachments)
  const [activePreview, setActivePreview] = useState(null)

  if (!items.length) return null

  return (
    <>
      <div className={`caAttachments${className ? ` ${className}` : ''}`}>
        {items.map((item, index) => {
          const src = resolveUploadUrl(item.url)
          const key = `${item.url || item.name || 'file'}-${index}`

          if (item.type === 'video') {
            return (
              <div key={key} className="caAttachments__item caAttachments__item--video">
                <video controls preload="metadata" className="caAttachments__video">
                  <source src={src} type={item.mimeType || 'video/mp4'} />
                  Your browser does not support video playback.
                </video>
                {item.name ? <span className="caAttachments__name">{item.name}</span> : null}
              </div>
            )
          }

          return (
            <div
              key={key}
              className="caAttachments__item caAttachments__item--image"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => setActivePreview({ src, name: item.name || 'attachment' })}
            >
              <img src={src} alt={item.name || 'Attachment'} className="caAttachments__img" loading="lazy" />
              {item.name ? <span className="caAttachments__name">{item.name}</span> : null}
            </div>
          )
        })}
      </div>

      {/* Lightbox Modal for Fullscreen Preview & Download */}
      {activePreview ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setActivePreview(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#111827',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                color: '#fff',
                fontSize: '0.875rem',
                gap: '1rem',
              }}
            >
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activePreview.name}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a
                  href={activePreview.src}
                  download={activePreview.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  📥 Download
                </a>
                <a
                  href={activePreview.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#374151',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  🔗 Open New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: '0 0.5rem',
                  }}
                  aria-label="Close preview"
                >
                  ×
                </button>
              </div>
            </div>
            <img
              src={activePreview.src}
              alt={activePreview.name}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
