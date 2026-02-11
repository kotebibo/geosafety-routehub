'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react'
import { HighlightText } from '@/shared/components/HighlightText'

interface PhoneCellProps {
  value?: string | null
  onEdit?: (value: string) => void
  readOnly?: boolean
  onEditStart?: () => void
  highlightQuery?: string
}

// Format Georgian phone number
function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Georgian mobile format: 5XX XXX XXX
  if (digits.length === 9 && digits.startsWith('5')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  // Georgian landline format: XXX XXX XXX
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  // With country code +995
  if (digits.length === 12 && digits.startsWith('995')) {
    return `+995 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  }

  // Return as is if format not recognized
  return phone
}

export function PhoneCell({ value, onEdit, readOnly = false, onEditStart, highlightQuery }: PhoneCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEditValue(value || '')
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (isEditing) {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          handleSave()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, editValue])

  const handleSave = () => {
    if (onEdit && editValue !== value) {
      onEdit(editValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value || '')
      setIsEditing(false)
    }
  }

  if (readOnly && !value) {
    return <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">-</div>
  }

  if (readOnly && value) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <Phone className="w-4 h-4 text-[#579bfc] flex-shrink-0" />
        <a
          href={`tel:${value}`}
          className="text-sm text-[#579bfc] hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {formatPhoneNumber(value)}
        </a>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div ref={containerRef} className="h-full min-h-[36px] flex items-center px-2">
        <input
          ref={inputRef}
          type="tel"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="Enter phone..."
          className="w-full h-7 px-2 text-sm border border-[#579bfc] rounded focus:outline-none focus:ring-1 focus:ring-[#579bfc]"
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[36px]">
      <button
        onClick={() => {
          if (!readOnly) {
            setIsEditing(true)
            onEditStart?.()
          }
        }}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left',
          !readOnly && 'hover:bg-[#f0f3ff] cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        {value ? (
          <>
            <Phone className="w-4 h-4 text-[#579bfc] flex-shrink-0" />
            <span className="text-sm text-[#323338] truncate">
              {highlightQuery ? (
                <HighlightText text={formatPhoneNumber(value)} query={highlightQuery} />
              ) : (
                formatPhoneNumber(value)
              )}
            </span>
          </>
        ) : (
          <span className="text-sm text-[#9699a6]">Add phone...</span>
        )}
      </button>
    </div>
  )
}
