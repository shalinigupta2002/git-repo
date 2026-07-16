import { parseContactAttachments, resolveUploadUrl } from '../../utils/uploadUrl.js'

export function ContactMessageAttachments({ attachments, className = '' }) {
  const items = parseContactAttachments(attachments)
  if (!items.length) return null

  return (
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
          <a
            key={key}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="caAttachments__item caAttachments__item--image"
          >
            <img src={src} alt={item.name || 'Attachment'} className="caAttachments__img" loading="lazy" />
            {item.name ? <span className="caAttachments__name">{item.name}</span> : null}
          </a>
        )
      })}
    </div>
  )
}
