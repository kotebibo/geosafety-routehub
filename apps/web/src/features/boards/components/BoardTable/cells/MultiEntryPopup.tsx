'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Plus, X, Phone, Mail, Type } from 'lucide-react'
import { calculatePopupPosition } from './usePopupPosition'

interface MultiEntryPopupProps {
  entries: string[]
  onSave: (entries: string[]) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  placeholder?: string
  inputType?: 'tel' | 'email' | 'text'
  validate?: (value: string) => boolean
  title?: string
  formatDisplay?: (value: string) => string
  getHref?: (value: string) => string
}

const ICON_BY_TYPE = {
  tel: Phone,
  email: Mail,
  text: Type,
}

export function MultiEntryPopup({
  entries,
  onSave,
  onClose,
  triggerRef,
  placeholder = 'Add entry...',
  inputType = 'text',
  validate,
  title = 'Entries',
  formatDisplay,
  getHref,
}: MultiEntryPopupProps) {
  const [localEntries, setLocalEntries] = useState<string[]>(entries)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const EntryIcon = ICON_BY_TYPE[inputType] || Type

  useEffect(() => {
    if (triggerRef.current) {
      const pos = calculatePopupPosition({
        triggerRect: triggerRef.current.getBoundingClientRect(),
        popupWidth: 340,
        popupHeight: 320,
      })
      setPosition(pos)
    }
  }, [triggerRef])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onSave(localEntries)
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [localEntries, onSave, onClose, triggerRef])

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    if (validate && !validate(trimmed)) {
      setError(inputType === 'email' ? 'არასწორი ელ-ფოსტის ფორმატი' : 'არასწორი ფორმატი')
      return
    }

    if (localEntries.includes(trimmed)) {
      setError('უკვე დამატებულია')
      return
    }

    setLocalEntries([...localEntries, trimmed])
    setInputValue('')
    setError('')
    inputRef.current?.focus()
  }

  const handleRemove = (index: number) => {
    setLocalEntries(localEntries.filter((_, i) => i !== index))
  }

  const handleCopy = async (entry: string, index: number) => {
    try {
      await navigator.clipboard.writeText(entry)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      // Fallback silently
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    } else if (e.key === 'Escape') {
      onSave(localEntries)
      onClose()
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={popupRef}
      className={cn(
        'fixed z-[9999]',
        'bg-bg-primary rounded-lg',
        'border border-border-light',
        'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
        'p-3 w-[340px]'
      )}
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {localEntries.length > 0 && (
            <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full">
              {localEntries.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            onSave(localEntries)
            onClose()
          }}
          className="p-1 rounded hover:bg-bg-hover transition-colors"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Entry List */}
      {localEntries.length > 0 ? (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto mb-3">
          {localEntries.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border-light bg-bg-secondary group"
            >
              <EntryIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              {getHref ? (
                <a
                  href={getHref(entry)}
                  className="flex-1 text-sm text-blue-600 hover:underline truncate"
                  onClick={e => e.stopPropagation()}
                >
                  {formatDisplay ? formatDisplay(entry) : entry}
                </a>
              ) : (
                <span className="flex-1 text-sm text-text-primary truncate">
                  {formatDisplay ? formatDisplay(entry) : entry}
                </span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(entry, index)}
                  className="px-1.5 py-0.5 rounded text-[11px] text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  {copiedIndex === index ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => handleRemove(index)}
                  className="p-0.5 rounded hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-text-tertiary hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-4 mb-3 text-center rounded-md border border-dashed border-border-light">
          <EntryIcon className="w-5 h-5 text-text-tertiary mx-auto mb-1.5" />
          <p className="text-xs text-text-tertiary">
            {inputType === 'email' ? 'ელ-ფოსტა არ არის დამატებული' : 'ნომერი არ არის დამატებული'}
          </p>
        </div>
      )}

      {/* Add Input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={inputType}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-8 px-2.5 text-sm border border-border-light rounded-md focus:outline-none focus:border-monday-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className={cn(
            'h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors',
            inputValue.trim()
              ? 'bg-monday-primary text-white hover:bg-monday-primary-hover'
              : 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>,
    document.body
  )
}
