'use client'

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react'
import { HighlightText } from '@/shared/components/HighlightText'
import { OverflowTooltip } from './OverflowTooltip'
import { PhoneEntryPopup } from './PhoneEntryPopup'
import type { PhoneEntry } from './PhoneEntryPopup'

interface PhoneCellProps {
  value?: string | string[] | PhoneEntry[] | null
  onEdit?: (value: PhoneEntry[]) => void
  readOnly?: boolean
  onEditStart?: () => void
  highlightQuery?: string
}

// Format Georgian phone number
function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  const digits = phone.replace(/\D/g, '')

  if (digits.length === 9 && digits.startsWith('5')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  if (digits.length === 12 && digits.startsWith('995')) {
    return `+995 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  }

  return phone
}

// Normalize any legacy format to PhoneEntry[]
function normalizePhones(value: string | string[] | PhoneEntry[] | null | undefined): PhoneEntry[] {
  if (!value) return []

  // Already PhoneEntry[] — check first element has 'number' key
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    'number' in value[0]
  ) {
    return value as PhoneEntry[]
  }

  // string[] — wrap each as PhoneEntry with empty name
  if (Array.isArray(value)) {
    return (value as string[]).filter(Boolean).map(v => ({ name: '', number: v }))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'object' && 'number' in parsed[0]) {
          return parsed as PhoneEntry[]
        }
        return parsed.filter(Boolean).map((v: string) => ({ name: '', number: v }))
      }
    } catch {
      // Not JSON
    }
    return [{ name: '', number: trimmed }]
  }

  return []
}

// Display label for a phone entry: "Name (formatted)" or just "formatted"
function displayLabel(entry: PhoneEntry): string {
  if (entry.name) return entry.name
  return formatPhoneNumber(entry.number)
}

export function PhoneCell({
  value,
  onEdit,
  readOnly = false,
  onEditStart,
  highlightQuery,
}: PhoneCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const phones = normalizePhones(value)

  const handleOpen = () => {
    if (readOnly) return
    onEditStart?.()
    setIsOpen(true)
  }

  const handleSave = (entries: PhoneEntry[]) => {
    onEdit?.(entries)
  }

  const firstPhone = phones[0]
  const firstDisplay = firstPhone ? displayLabel(firstPhone) : ''

  if (readOnly && phones.length === 0) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-text-tertiary text-sm">-</div>
    )
  }

  if (readOnly && firstPhone) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <a
          href={`tel:${firstPhone.number}`}
          className="text-sm text-blue-500 hover:underline truncate"
          onClick={e => e.stopPropagation()}
          title={
            firstPhone.name
              ? `${firstPhone.name}: ${formatPhoneNumber(firstPhone.number)}`
              : undefined
          }
        >
          {firstDisplay}
        </a>
        {phones.length > 1 && (
          <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
            +{phones.length - 1}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[36px]">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left',
          !readOnly && 'hover:bg-bg-hover cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        {firstPhone ? (
          <>
            <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <OverflowTooltip
              text={
                firstPhone.name
                  ? `${firstPhone.name}: ${formatPhoneNumber(firstPhone.number)}`
                  : formatPhoneNumber(firstPhone.number)
              }
              className="text-sm text-text-primary truncate block"
            >
              {highlightQuery ? (
                <HighlightText text={firstDisplay} query={highlightQuery} />
              ) : (
                firstDisplay
              )}
            </OverflowTooltip>
            {phones.length > 1 && (
              <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
                +{phones.length - 1}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-text-tertiary">Add phone...</span>
        )}
      </button>

      {isOpen && (
        <PhoneEntryPopup
          entries={phones}
          onSave={handleSave}
          onClose={() => setIsOpen(false)}
          triggerRef={buttonRef}
          formatPhone={formatPhoneNumber}
        />
      )}
    </div>
  )
}
