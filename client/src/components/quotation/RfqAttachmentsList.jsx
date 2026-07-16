import { resolveUploadUrl } from '../../utils/uploadUrl.js'
import { formatFileSize } from '../../utils/rfqAttachmentRules.js'

function isImageAttachment(item) {
  const mime = String(item?.mimeType || '').toLowerCase()
  return mime.startsWith('image/')
}

export function RfqAttachmentsList({ attachments = [], className = '' }) {
  if (!attachments?.length) return null

  return (
    <ul className={`rfqAttachmentsList ${className}`.trim()}>
      {attachments.map((item, index) => {
        const href = resolveUploadUrl(item.url)
        const image = isImageAttachment(item)
        return (
          <li key={`${item.url}-${index}`} className="rfqAttachmentsList__item">
            {image ? (
              <a href={href} target="_blank" rel="noreferrer noopener" className="rfqAttachmentsList__thumbLink">
                <img src={href} alt={item.name || 'Attachment'} className="rfqAttachmentsList__thumb" />
              </a>
            ) : null}
            <a href={href} target="_blank" rel="noreferrer noopener" className="rfqAttachmentsList__link">
              {item.name || 'Attachment'}
            </a>
            {item.sizeBytes ? (
              <span className="rfqAttachmentsList__size">{formatFileSize(item.sizeBytes)}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
