import React, { useState, useMemo, memo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Calendar, ArrowRight } from 'lucide-react'
import type { CellRendererProps } from '../types'
import { calculatePopupPosition } from './usePopupPosition'

// Date range value structure
export interface DateRangeValue {
  start: string | null
  end: string | null
}

// Parse value to DateRangeValue
function parseDateRangeValue(value: any): DateRangeValue {
  if (!value) return { start: null, end: null }

  // Handle string format like "2025-01-01 to 2025-12-31"
  if (typeof value === 'string') {
    if (value.includes(' to ')) {
      const [start, end] = value.split(' to ').map(s => s.trim())
      return { start: start || null, end: end || null }
    }
    // Single date - use as start
    return { start: value, end: null }
  }

  // Handle object format { start, end }
  if (typeof value === 'object' && value !== null) {
    return {
      start: value.start || value.startDate || null,
      end: value.end || value.endDate || null,
    }
  }

  return { start: null, end: null }
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

// Format date for input
function formatDateForInput(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

export const DateRangeCell = memo(function DateRangeCell({ value, onEdit, onEditStart }: CellRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dateRange = useMemo(() => parseDateRangeValue(value), [value])
  const [editStart, setEditStart] = useState(formatDateForInput(dateRange.start))
  const [editEnd, setEditEnd] = useState(formatDateForInput(dateRange.end))

  // Update edit values when value changes
  useEffect(() => {
    const newRange = parseDateRangeValue(value)
    setEditStart(formatDateForInput(newRange.start))
    setEditEnd(formatDateForInput(newRange.end))
  }, [value])

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const position = calculatePopupPosition({
        triggerRect: buttonRef.current.getBoundingClientRect(),
        popupWidth: 280,
        popupHeight: 300,
      })
      setDropdownPosition(position)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        handleSave()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, editStart, editEnd])

  const handleOpen = () => {
    setIsOpen(true)
    onEditStart?.()
  }

  const handleSave = () => {
    const newValue: DateRangeValue = {
      start: editStart || null,
      end: editEnd || null,
    }

    // Only save if changed
    if (newValue.start !== dateRange.start || newValue.end !== dateRange.end) {
      onEdit?.(newValue)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setEditStart('')
    setEditEnd('')
    onEdit?.({ start: null, end: null })
    setIsOpen(false)
  }

  // Calculate duration in days
  const durationDays = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return null
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 ? diffDays : null
  }, [dateRange])

  // Display text
  const displayText = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return null

    const startText = formatDate(dateRange.start)
    const endText = formatDate(dateRange.end)

    if (startText && endText) {
      return `${startText} → ${endText}`
    }
    if (startText) {
      return `${startText} →`
    }
    if (endText) {
      return `→ ${endText}`
    }
    return null
  }, [dateRange])

  return (
    <div className="w-full h-full">
      {/* Display */}
      <div
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'w-full h-full min-h-[36px] px-2',
          'flex items-center gap-2',
          'text-sm cursor-pointer',
          'hover:bg-[#f0f3ff]'
        )}
      >
        <Calendar className="w-4 h-4 flex-shrink-0 text-[#9699a6]" />
        {displayText ? (
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[#323338] truncate">{displayText}</span>
            {durationDays !== null && (
              <span className="text-[10px] text-[#9699a6] flex-shrink-0">
                ({durationDays}d)
              </span>
            )}
          </div>
        ) : (
          <span className="text-[#9699a6]">Set dates</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          <div className="flex flex-col gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0073ea] focus:border-transparent"
              />
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                min={editStart || undefined}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0073ea] focus:border-transparent"
              />
            </div>

            {/* Duration display */}
            {editStart && editEnd && (
              <div className="text-center text-xs text-gray-500">
                {(() => {
                  const start = new Date(editStart)
                  const end = new Date(editEnd)
                  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  if (diffDays >= 0) {
                    return `Duration: ${diffDays} day${diffDays !== 1 ? 's' : ''}`
                  }
                  return <span className="text-red-500">End date must be after start date</span>
                })()}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs bg-[#0073ea] text-white rounded hover:bg-[#0060c7] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})
