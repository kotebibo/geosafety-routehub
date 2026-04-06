'use client'

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Mail } from 'lucide-react'
import { OverflowTooltip } from './OverflowTooltip'
import { MultiEntryPopup } from './MultiEntryPopup'

interface EmailCellProps {
  value?: string | string[] | null
  onEdit?: (value: string[]) => void
  readOnly?: boolean
  onEditStart?: () => void
  highlightQuery?: string
}

// Normalize value to string array (backward compat)
function normalizeEmails(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      // Not JSON
    }
    return [trimmed]
  }
  return []
}

// Basic email validation
function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function EmailCell({ value, onEdit, readOnly = false, onEditStart }: EmailCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const emails = normalizeEmails(value)

  const handleOpen = () => {
    if (readOnly) return
    onEditStart?.()
    setIsOpen(true)
  }

  const handleSave = (entries: string[]) => {
    onEdit?.(entries)
  }

  if (readOnly && emails.length === 0) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-text-tertiary text-sm">-</div>
    )
  }

  if (readOnly && emails.length > 0) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <a
          href={`mailto:${emails[0]}`}
          className="text-sm text-blue-500 hover:underline truncate"
          onClick={e => e.stopPropagation()}
        >
          {emails[0]}
        </a>
        {emails.length > 1 && (
          <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
            +{emails.length - 1}
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
        {emails.length > 0 ? (
          <>
            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <OverflowTooltip text={emails[0]} className="text-sm text-text-primary truncate block">
              {emails[0]}
            </OverflowTooltip>
            {emails.length > 1 && (
              <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
                +{emails.length - 1}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-text-tertiary">Add email...</span>
        )}
      </button>

      {isOpen && (
        <MultiEntryPopup
          entries={emails}
          onSave={handleSave}
          onClose={() => setIsOpen(false)}
          triggerRef={buttonRef}
          placeholder="Enter email address..."
          inputType="email"
          validate={validateEmail}
          title="Email Addresses"
          getHref={v => `mailto:${v}`}
        />
      )}
    </div>
  )
}
