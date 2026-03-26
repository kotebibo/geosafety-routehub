import React, { useState, useRef, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { HighlightText } from '@/shared/components/HighlightText'
import { OverflowTooltip } from './OverflowTooltip'
import type { CellRendererProps } from '../types'

export const TextCell = memo(function TextCell({
  value,
  onEdit,
  isEditing: externalIsEditing,
  onEditStart,
  highlightQuery,
}: CellRendererProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (externalIsEditing !== undefined) {
      setIsEditing(externalIsEditing)
    }
  }, [externalIsEditing])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setIsEditing(true)
    onEditStart?.()
  }

  const handleSave = () => {
    if (editValue !== value && onEdit) {
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

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-full min-h-[36px] px-2',
          'bg-bg-primary border-2 border-[#6161ff] rounded',
          'text-text-primary text-sm',
          'focus:outline-none'
        )}
      />
    )
  }

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        'w-full h-full min-h-[36px] flex items-center px-2',
        'text-sm',
        'cursor-pointer hover:bg-bg-hover'
      )}
    >
      <OverflowTooltip
        text={value ? String(value) : undefined}
        className="text-text-primary truncate block"
      >
        {value ? (
          highlightQuery ? (
            <HighlightText text={String(value)} query={highlightQuery} />
          ) : (
            value
          )
        ) : (
          <span className="text-text-tertiary">Empty</span>
        )}
      </OverflowTooltip>
    </div>
  )
})
