import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { CellRendererProps } from '../types'
import { StatusLabelEditor } from './StatusLabelEditor'

export interface StatusOption {
  key: string
  label: string
  color: string
}

// Monday.com color palette
export const MONDAY_COLORS: Record<string, { hex: string; text: string }> = {
  // Greens
  grass_green: { hex: '#00C875', text: '#FFFFFF' },
  done_green: { hex: '#00C875', text: '#FFFFFF' },
  bright_green: { hex: '#9CD326', text: '#FFFFFF' },
  saladish: { hex: '#CAB641', text: '#FFFFFF' },
  // Yellows/Oranges
  egg_yolk: { hex: '#FFCB00', text: '#323338' },
  working_orange: { hex: '#FDAB3D', text: '#FFFFFF' },
  dark_orange: { hex: '#FF642E', text: '#FFFFFF' },
  // Reds/Pinks
  peach: { hex: '#FFADAD', text: '#323338' },
  sunset: { hex: '#FF7575', text: '#FFFFFF' },
  stuck_red: { hex: '#E2445C', text: '#FFFFFF' },
  dark_red: { hex: '#BB3354', text: '#FFFFFF' },
  sofia_pink: { hex: '#FF158A', text: '#FFFFFF' },
  lipstick: { hex: '#FF5AC4', text: '#FFFFFF' },
  bubble: { hex: '#FAA1F1', text: '#323338' },
  // Purples
  purple: { hex: '#A25DDC', text: '#FFFFFF' },
  dark_purple: { hex: '#784BD1', text: '#FFFFFF' },
  berry: { hex: '#7E3B8A', text: '#FFFFFF' },
  dark_indigo: { hex: '#401694', text: '#FFFFFF' },
  indigo: { hex: '#5559DF', text: '#FFFFFF' },
  // Blues
  navy: { hex: '#225091', text: '#FFFFFF' },
  bright_blue: { hex: '#579BFC', text: '#FFFFFF' },
  dark_blue: { hex: '#0086C0', text: '#FFFFFF' },
  aquamarine: { hex: '#4ECCC6', text: '#FFFFFF' },
  chili_blue: { hex: '#66CCFF', text: '#323338' },
  river: { hex: '#68A1BD', text: '#FFFFFF' },
  // Grays
  winter: { hex: '#9AADBD', text: '#FFFFFF' },
  explosive: { hex: '#C4C4C4', text: '#323338' },
  american_gray: { hex: '#808080', text: '#FFFFFF' },
  blackish: { hex: '#333333', text: '#FFFFFF' },
}

// Legacy color mapping (for backwards compatibility)
const LEGACY_COLOR_MAP: Record<string, string> = {
  gray: 'explosive',
  blue: 'bright_blue',
  green: 'grass_green',
  yellow: 'egg_yolk',
  orange: 'working_orange',
  red: 'stuck_red',
  purple: 'purple',
  pink: 'sofia_pink',
}

// Default status options if column config doesn't specify
const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { key: 'not_started', label: 'Not Started', color: 'explosive' },
  { key: 'working_on_it', label: 'Working on it', color: 'working_orange' },
  { key: 'stuck', label: 'Stuck', color: 'stuck_red' },
  { key: 'done', label: 'Done', color: 'grass_green' },
]

function getColorInfo(colorKey: string): { hex: string; text: string } {
  // Check if it's a legacy color name
  const mappedColor = LEGACY_COLOR_MAP[colorKey]
  if (mappedColor && MONDAY_COLORS[mappedColor]) {
    return MONDAY_COLORS[mappedColor]
  }
  // Check if it's a Monday color key
  if (MONDAY_COLORS[colorKey]) {
    return MONDAY_COLORS[colorKey]
  }
  // Default fallback
  return MONDAY_COLORS.explosive
}

export function StatusCell({ value, column, onEdit }: CellRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get status options from column config or use defaults
  let statusOptions: StatusOption[] = DEFAULT_STATUS_OPTIONS

  if (column.config?.options) {
    if (Array.isArray(column.config.options)) {
      // Array format - map to StatusOption format
      statusOptions = column.config.options.map((opt: any) => ({
        key: opt.key || opt.label.toLowerCase().replace(/\s+/g, '_'),
        label: opt.label,
        color: opt.color,
      }))
    } else {
      // Object format - convert to array
      statusOptions = Object.entries(column.config.options).map(([key, opt]: [string, any]) => ({
        key,
        label: opt.label,
        color: opt.color,
      }))
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = (newValue: string) => {
    if (onEdit) {
      onEdit(newValue)
    }
    setIsOpen(false)
  }

  const handleOpenEditor = () => {
    setIsOpen(false)
    setShowEditor(true)
  }

  const currentStatusKey = (value as string) || statusOptions[0]?.key
  const currentOption = statusOptions.find(opt => opt.key === currentStatusKey) || statusOptions[0]
  const currentColor = currentOption ? getColorInfo(currentOption.color) : getColorInfo('explosive')

  return (
    <div className="relative w-full h-full min-h-[36px] flex items-center">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'w-full h-full min-h-[36px] flex items-center justify-center',
          'text-center hover:brightness-95',
          'focus:outline-none transition-all',
          'text-sm font-medium'
        )}
        style={{
          backgroundColor: currentColor.hex,
          color: currentColor.text,
        }}
      >
        {currentOption?.label || 'Select'}
      </button>

      {/* Dropdown Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
            'fixed z-[9999]',
            'bg-white rounded-lg',
            'border border-gray-200',
            'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
            'p-1.5 min-w-[140px]'
          )}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {/* Status Options - Full Width Colored Rows */}
          <div className="flex flex-col gap-1">
            {statusOptions.map((option) => {
              const colorInfo = getColorInfo(option.color)
              const isSelected = option.key === currentStatusKey
              return (
                <button
                  key={option.key}
                  onClick={() => handleSelect(option.key)}
                  className={cn(
                    'w-full h-8 rounded text-sm font-medium',
                    'transition-all hover:brightness-95',
                    'focus:outline-none',
                    isSelected && 'ring-2 ring-offset-1 ring-gray-400'
                  )}
                  style={{
                    backgroundColor: colorInfo.hex,
                    color: colorInfo.text,
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-2" />

          {/* Footer - Edit Labels */}
          <button
            onClick={handleOpenEditor}
            className={cn(
              'w-full px-2 py-1.5 text-xs text-gray-500',
              'hover:bg-gray-100 rounded',
              'flex items-center gap-1.5',
              'transition-colors'
            )}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Labels
          </button>
        </div>,
        document.body
      )}

      {/* Status Label Editor Modal */}
      <StatusLabelEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        column={column}
        currentOptions={statusOptions}
      />
    </div>
  )
}
