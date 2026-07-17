import React, { useState, useRef, useEffect, memo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { CellRendererProps } from '../types'
import { calculatePopupPosition } from './usePopupPosition'
import { OverflowTooltip } from './OverflowTooltip'
import { getColorInfo, resolveStatusOptions } from '../../../constants/statusColors'

// Lazy load the heavy editor component (~10KB) - only loaded when user clicks "Edit Labels"
const StatusLabelEditor = lazy(() =>
  import('./StatusLabelEditor').then(m => ({ default: m.StatusLabelEditor }))
)

export const StatusCell = memo(function StatusCell({
  value,
  column,
  onEdit,
  onEditStart,
}: CellRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get status options from column config or use defaults
  const statusOptions = resolveStatusOptions(column)

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
      // Estimate actual popup height: 36px per option + 55px for padding/divider/footer
      const estimatedHeight = Math.min(statusOptions.length * 36 + 55, 350)
      const position = calculatePopupPosition({
        triggerRect: buttonRef.current.getBoundingClientRect(),
        popupWidth: 160,
        popupHeight: estimatedHeight,
      })
      setDropdownPosition(position)
    }
    if (!isOpen) {
      onEditStart?.()
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
        <OverflowTooltip text={currentOption?.label} className="truncate px-1 block">
          {currentOption?.label || 'Select'}
        </OverflowTooltip>
      </button>

      {/* Dropdown Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              'fixed z-[9999]',
              'bg-bg-primary rounded-lg',
              'border border-border-light',
              'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
              'p-1.5 min-w-[140px]'
            )}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {/* Status Options - Full Width Colored Rows */}
            <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto">
              {statusOptions.map(option => {
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
            <div className="border-t border-border-light my-2" />

            {/* Footer - Edit Labels */}
            <button
              onClick={handleOpenEditor}
              className={cn(
                'w-full px-2 py-1.5 text-xs text-text-tertiary',
                'hover:bg-bg-hover rounded',
                'flex items-center gap-1.5',
                'transition-colors'
              )}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit Labels
            </button>
          </div>,
          document.body
        )}

      {/* Status Label Editor Modal - Lazy loaded */}
      {showEditor && (
        <Suspense fallback={null}>
          <StatusLabelEditor
            isOpen={showEditor}
            onClose={() => setShowEditor(false)}
            column={column}
            currentOptions={statusOptions}
          />
        </Suspense>
      )}
    </div>
  )
})
