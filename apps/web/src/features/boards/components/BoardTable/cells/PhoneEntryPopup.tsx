'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Plus, X, Phone } from 'lucide-react'
import { calculatePopupPosition } from './usePopupPosition'

export interface PhoneEntry {
  name: string
  number: string
}

interface PhoneEntryPopupProps {
  entries: PhoneEntry[]
  onSave: (entries: PhoneEntry[]) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  formatPhone: (phone: string) => string
}

// Basic phone validation: at least 5 digits
function validatePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 5
}

export function PhoneEntryPopup({
  entries,
  onSave,
  onClose,
  triggerRef,
  formatPhone,
}: PhoneEntryPopupProps) {
  const [localEntries, setLocalEntries] = useState<PhoneEntry[]>(entries)
  const [nameValue, setNameValue] = useState('')
  const [numberValue, setNumberValue] = useState('')
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (triggerRef.current) {
      const pos = calculatePopupPosition({
        triggerRect: triggerRef.current.getBoundingClientRect(),
        popupWidth: 360,
        popupHeight: 350,
      })
      setPosition(pos)
    }
  }, [triggerRef])

  useEffect(() => {
    nameInputRef.current?.focus()
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
    const trimmedNumber = numberValue.trim()
    const trimmedName = nameValue.trim()

    if (!trimmedNumber) {
      setError('ნომერი სავალდებულოა')
      return
    }

    if (!validatePhone(trimmedNumber)) {
      setError('არასწორი ტელეფონის ფორმატი')
      return
    }

    if (localEntries.some(e => e.number === trimmedNumber)) {
      setError('ეს ნომერი უკვე დამატებულია')
      return
    }

    setLocalEntries([...localEntries, { name: trimmedName, number: trimmedNumber }])
    setNameValue('')
    setNumberValue('')
    setError('')
    nameInputRef.current?.focus()
  }

  const handleRemove = (index: number) => {
    setLocalEntries(localEntries.filter((_, i) => i !== index))
  }

  const handleCopy = async (number: string, index: number) => {
    try {
      await navigator.clipboard.writeText(number)
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
        'p-3 w-[360px]'
      )}
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Phone Numbers</span>
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
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto mb-3">
          {localEntries.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border-light bg-bg-secondary"
            >
              <Phone className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {entry.name && (
                  <div className="text-xs text-text-secondary truncate">{entry.name}</div>
                )}
                <a
                  href={`tel:${entry.number}`}
                  className="text-sm text-blue-600 hover:underline truncate block"
                  onClick={e => e.stopPropagation()}
                >
                  {formatPhone(entry.number)}
                </a>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(entry.number, index)}
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
          <Phone className="w-5 h-5 text-text-tertiary mx-auto mb-1.5" />
          <p className="text-xs text-text-tertiary">ნომერი არ არის დამატებული</p>
        </div>
      )}

      {/* Add Inputs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={nameInputRef}
            type="text"
            value={nameValue}
            onChange={e => {
              setNameValue(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Name (optional)"
            className="flex-1 h-8 px-2.5 text-sm border border-border-light rounded-md focus:outline-none focus:border-monday-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="tel"
            value={numberValue}
            onChange={e => {
              setNumberValue(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Phone number"
            className="flex-1 h-8 px-2.5 text-sm border border-border-light rounded-md focus:outline-none focus:border-monday-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary"
          />
          <button
            onClick={handleAdd}
            disabled={!numberValue.trim()}
            className={cn(
              'h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors',
              numberValue.trim()
                ? 'bg-monday-primary text-white hover:bg-monday-primary-hover'
                : 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>,
    document.body
  )
}
