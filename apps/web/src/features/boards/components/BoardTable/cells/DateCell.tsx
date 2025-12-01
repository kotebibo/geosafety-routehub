import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import type { CellRendererProps } from '../types'

export function DateCell({ value, onEdit }: CellRendererProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')

  const formatDate = (dateString: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
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
        type="date"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn(
          'w-full h-full min-h-[36px] px-2',
          'bg-white border-2 border-[#6161ff] rounded',
          'text-[#323338] text-sm',
          'focus:outline-none'
        )}
      />
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'w-full h-full min-h-[36px] px-2',
        'flex items-center gap-2',
        'text-sm',
        'cursor-pointer hover:bg-[#f0f3ff]'
      )}
    >
      <Calendar className="w-4 h-4 text-[#9699a6] flex-shrink-0" />
      {value ? (
        <span className="text-[#323338]">{formatDate(value)}</span>
      ) : (
        <span className="text-[#9699a6]">Set date</span>
      )}
    </div>
  )
}
