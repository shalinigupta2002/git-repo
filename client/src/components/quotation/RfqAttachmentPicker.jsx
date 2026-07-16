import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  RFQ_ATTACHMENT_ACCEPT,
  RFQ_MAX_FILES,
  formatFileSize,
  validateRfqFile,
} from '../../utils/rfqAttachmentRules.js'
import { uploadRfqAttachments } from '../../services/quoteRequest.service.js'

export function RfqAttachmentPicker({ value = [], onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handlePick(event) {
    const picked = Array.from(event.target.files || [])
    event.target.value = ''
    if (!picked.length) return

    const remaining = RFQ_MAX_FILES - value.length
    if (remaining <= 0) {
      toast.error(`Maximum ${RFQ_MAX_FILES} attachments allowed.`)
      return
    }

    const batch = picked.slice(0, remaining)
    for (const file of batch) {
      const error = validateRfqFile(file)
      if (error) {
        toast.error(error)
        return
      }
    }

    setUploading(true)
    setProgress(0)
    try {
      const uploaded = await uploadRfqAttachments(batch, setProgress)
      onChange?.([...value, ...(uploaded || [])])
      toast.success(`${batch.length} file${batch.length === 1 ? '' : 's'} uploaded.`)
    } catch (error) {
      toast.error(error?.message || 'Upload failed.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function removeAt(index) {
    onChange?.(value.filter((_, i) => i !== index))
  }

  return (
    <div className="rfqAttachments">
      <div className="rfqAttachments__head">
        <span className="fieldLabel">Attachments (optional)</span>
        <span className="panelSub">
          PNG, JPG, PDF, DOC, DOCX, XLS, XLSX · max {RFQ_MAX_FILES} files
        </span>
      </div>

      {value.length ? (
        <ul className="rfqAttachments__list">
          {value.map((item, index) => (
            <li key={`${item.url}-${index}`} className="rfqAttachments__item">
              <span className="rfqAttachments__name">{item.name}</span>
              <span className="rfqAttachments__size">{formatFileSize(item.sizeBytes)}</span>
              <button
                type="button"
                className="rfqAttachments__remove"
                disabled={disabled || uploading}
                onClick={() => removeAt(index)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {value.length < RFQ_MAX_FILES ? (
        <>
          <input
            ref={inputRef}
            type="file"
            className="rfqAttachments__input"
            accept={RFQ_ATTACHMENT_ACCEPT}
            multiple
            disabled={disabled || uploading}
            onChange={handlePick}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? `Uploading ${progress}%…` : 'Add attachment'}
          </button>
          {uploading ? (
            <div className="rfqAttachments__progress" role="progressbar" aria-valuenow={progress}>
              <div className="rfqAttachments__progressBar" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
