import React, { useState, useRef, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { HighlightText } from '@/shared/components/HighlightText'
import { OverflowTooltip } from './OverflowTooltip'
import type { CellRendererProps } from '../types'

export const NumberCell = memo(function NumberCell({ value, onEdit, column, onEditStart, highlightQuery }: CellRendererProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value?.toString() || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return null

    // Check if column config has formatting options
    const config = column?.config || {}
    if (config.format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: config.currency || 'USD',
      }).format(num)
    }

    if (config.format === 'percentage') {
      return `${num}%`
    }

    return new Intl.NumberFormat('en-US').format(num)
  }

  const handleSave = () => {
    const numValue = parseFloat(editValue)
    if (!isNaN(numValue) && numValue !== value && onEdit) {
      onEdit(numValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value?.toString() || '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-full min-h-[36px] px-2',
          'bg-white border-2 border-[#6161ff] rounded',
          'text-[#323338] text-sm text-right',
          'focus:outline-none'
        )}
      />
    )
  }

  return (
    <div
      onClick={() => {
        setIsEditing(true)
        onEditStart?.()
      }}
      className={cn(
        'w-full h-full min-h-[36px] px-2',
        'flex items-center justify-end',
        'text-sm',
        'cursor-pointer hover:bg-[#f0f3ff]'
      )}
    >
      {value !== null && value !== undefined ? (
        <OverflowTooltip text={String(formatNumber(value) ?? value)} className="text-[#323338] truncate block">
          {highlightQuery ? (
            <HighlightText text={String(formatNumber(value) ?? value)} query={highlightQuery} />
          ) : (
            formatNumber(value)
          )}
        </OverflowTooltip>
      ) : (
        <span className="text-[#9699a6]">-</span>
      )}
    </div>
  )
})
