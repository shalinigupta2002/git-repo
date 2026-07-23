import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BUYER_DASHBOARD_PATH,
  SELLER_DASHBOARD_PATH,
} from '../../utils/portalNav.js'
import { WORKSPACE } from '../../utils/activeWorkspace.js'

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const WORKSPACE_OPTIONS = Object.freeze([
  { workspace: WORKSPACE.BUYER, label: 'Buyer workspace', to: BUYER_DASHBOARD_PATH },
  { workspace: WORKSPACE.SELLER, label: 'Seller workspace', to: SELLER_DASHBOARD_PATH },
])

export function WorkspaceSwitcher({ activeWorkspace, onSwitch }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const currentLabel =
    WORKSPACE_OPTIONS.find((option) => option.workspace === activeWorkspace)?.label ??
    'Select workspace'

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function selectWorkspace(option) {
    setOpen(false)
    if (option.workspace === activeWorkspace) return
    onSwitch(option.workspace)
    navigate(option.to)
  }

  return (
    <div
      ref={rootRef}
      className={['workspaceSwitcher', open ? 'workspaceSwitcher--open' : ''].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="workspaceSwitcher__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{currentLabel}</span>
        <ChevronIcon />
      </button>
      <div className="workspaceSwitcher__panel" role="menu">
        {WORKSPACE_OPTIONS.map((option) => (
          <button
            key={option.workspace}
            type="button"
            role="menuitem"
            className={[
              'workspaceSwitcher__item',
              option.workspace === activeWorkspace ? 'workspaceSwitcher__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => selectWorkspace(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
