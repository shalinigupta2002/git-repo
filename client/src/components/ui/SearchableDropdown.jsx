import { useEffect, useRef, useState } from 'react'

/**
 * Premium searchable dropdown select component.
 * Supports search query filtering, keyboard arrow navigation, and new custom text values.
 */
export function SearchableDropdown({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  allowCustom = false,
  required = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Map option structure if list contains raw strings or objects
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt }
    return { value: opt.value ?? opt.id ?? '', label: opt.label ?? opt.name ?? '' }
  })

  // Sync display text when value changes
  useEffect(() => {
    if (value) {
      const match = normalizedOptions.find((opt) => opt.value === value)
      setSearch(match ? match.label : value)
    } else {
      setSearch('')
    }
  }, [value, options])

  // Filter options based on search input
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  // If allowCustom is enabled and there is search text, add custom option
  const hasExactMatch = normalizedOptions.some(
    (opt) => opt.label.toLowerCase() === search.toLowerCase()
  )
  const showCustomOption = allowCustom && search.trim() && !hasExactMatch

  const dropdownList = [...filteredOptions]
  if (showCustomOption) {
    dropdownList.push({ value: search.trim(), label: `Use custom: "${search.trim()}"`, isCustom: true })
  }

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (value) {
          const match = normalizedOptions.find((opt) => opt.value === value)
          setSearch(match ? match.label : value)
        } else {
          setSearch('')
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [value, options])

  function selectOption(opt) {
    onChange(opt.value)
    setSearch(opt.isCustom ? opt.value : opt.label)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(e) {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        setHighlightedIndex((prev) => (prev + 1) % dropdownList.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        setHighlightedIndex((prev) => (prev - 1 + dropdownList.length) % dropdownList.length)
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < dropdownList.length) {
        e.preventDefault()
        selectOption(dropdownList[highlightedIndex])
      } else if (isOpen && showCustomOption) {
        e.preventDefault()
        selectOption({ value: search.trim(), label: search.trim(), isCustom: true })
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="b2bSearchDropdown" ref={containerRef}>
      <div className="b2bSearchDropdown__inputWrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="b2bInput b2bSearchDropdown__input"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)
            if (!e.target.value) {
              onChange('')
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          autoComplete="off"
        />
        <span className="b2bSearchDropdown__arrow" aria-hidden>
          ▼
        </span>
      </div>

      {isOpen && !disabled && dropdownList.length > 0 && (
        <ul className="b2bSearchDropdown__menu" role="listbox">
          {dropdownList.map((opt, index) => {
            const isSelected = opt.value === value
            const isHighlighted = index === highlightedIndex
            return (
              <li
                key={opt.value + '-' + index}
                role="option"
                aria-selected={isSelected}
                className={`b2bSearchDropdown__item${isSelected ? ' is-selected' : ''}${isHighlighted ? ' is-highlighted' : ''}${opt.isCustom ? ' is-custom' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(opt)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
      
      <style>{`
        .b2bSearchDropdown {
          position: relative;
          width: 100%;
        }
        .b2bSearchDropdown__inputWrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .b2bSearchDropdown__input {
          padding-right: 2rem !important;
        }
        .b2bSearchDropdown__arrow {
          position: absolute;
          right: 0.75rem;
          font-size: 0.65rem;
          color: #9ca3af;
          pointer-events: none;
        }
        .b2bSearchDropdown__menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 9999;
          margin: 4px 0 0;
          padding: 4px 0;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          max-height: 200px;
          overflow-y: auto;
          list-style: none;
        }
        .b2bSearchDropdown__item {
          padding: 8px 12px;
          font-size: 0.875rem;
          color: #1f2937;
          cursor: pointer;
          transition: background 0.15s;
        }
        .b2bSearchDropdown__item.is-highlighted {
          background: #f3f4f6;
        }
        .b2bSearchDropdown__item.is-selected {
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 600;
        }
        .b2bSearchDropdown__item.is-custom {
          color: #4f46e5;
          font-style: italic;
          border-top: 1px solid #f3f4f6;
        }
      `}</style>
    </div>
  )
}
