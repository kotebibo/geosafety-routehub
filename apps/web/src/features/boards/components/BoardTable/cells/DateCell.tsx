import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Calendar, AlertCircle, Clock } from 'lucide-react'
import type { CellRendererProps } from '../types'

type DateStatus = 'overdue' | 'today' | 'upcoming' | 'future' | 'none'

export function DateCell({ value, column, onEdit, onEditStart }: CellRendererProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')

  // Check if this is a "due date" type column (based on column name)
  const isDueDateColumn = useMemo(() => {
    const name = (column?.column_name || column?.column_id || '').toLowerCase()
    return name.includes('due') || name.includes('deadline') || name.includes('expir') ||
           name.includes('next') || name.includes('scheduled')
  }, [column])

  // Calculate date status for highlighting
  const dateStatus = useMemo((): DateStatus => {
    if (!value || !isDueDateColumn) return 'none'

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const targetDate = new Date(value)
    targetDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'overdue'
    if (diffDays === 0) return 'today'
    if (diffDays <= 7) return 'upcoming' // Within 7 days
    return 'future'
  }, [value, isDueDateColumn])

  const formatDate = (dateString: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const getStatusStyles = () => {
    switch (dateStatus) {
      case 'overdue':
        return {
          bg: 'bg-[#ffebeb]',
          text: 'text-[#d83a52]',
          icon: 'text-[#d83a52]',
          border: 'border-l-4 border-l-[#e2445c]',
        }
      case 'today':
        return {
          bg: 'bg-[#fff3cd]',
          text: 'text-[#856404]',
          icon: 'text-[#fdab3d]',
          border: 'border-l-4 border-l-[#fdab3d]',
        }
      case 'upcoming':
        return {
          bg: 'bg-[#fff8e6]',
          text: 'text-[#9a6700]',
          icon: 'text-[#fdab3d]',
          border: 'border-l-4 border-l-[#ffcb00]',
        }
      default:
        return {
          bg: '',
          text: 'text-[#323338]',
          icon: 'text-[#9699a6]',
          border: '',
        }
    }
  }

  const styles = getStatusStyles()

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

  const getIcon = () => {
    if (dateStatus === 'overdue') {
      return <AlertCircle className={cn('w-4 h-4 flex-shrink-0', styles.icon)} />
    }
    if (dateStatus === 'today' || dateStatus === 'upcoming') {
      return <Clock className={cn('w-4 h-4 flex-shrink-0', styles.icon)} />
    }
    return <Calendar className={cn('w-4 h-4 flex-shrink-0', styles.icon)} />
  }

  const getStatusLabel = () => {
    if (!isDueDateColumn) return null
    switch (dateStatus) {
      case 'overdue':
        return <span className="text-[10px] font-medium text-[#d83a52] ml-1">Overdue</span>
      case 'today':
        return <span className="text-[10px] font-medium text-[#856404] ml-1">Today</span>
      case 'upcoming':
        return <span className="text-[10px] font-medium text-[#9a6700] ml-1">Soon</span>
      default:
        return null
    }
  }

  return (
    <div
      onClick={() => {
        setIsEditing(true)
        onEditStart?.()
      }}
      className={cn(
        'w-full h-full min-h-[36px] px-2',
        'flex items-center gap-2',
        'text-sm',
        'cursor-pointer hover:bg-[#f0f3ff]',
        styles.bg,
        styles.border
      )}
    >
      {getIcon()}
      {value ? (
        <div className="flex items-center">
          <span className={styles.text}>{formatDate(value)}</span>
          {getStatusLabel()}
        </div>
      ) : (
        <span className="text-[#9699a6]">Set date</span>
      )}
    </div>
  )
}
