'use client'

import { useState, memo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Calendar, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import {
  getColorInfo,
  DEFAULT_STATUS_OPTIONS,
} from '@/features/boards/components/BoardTable/cells/StatusCell'
import type { MyWorkItem as MyWorkItemType } from '@/services/my-work.service'

interface MyWorkItemProps {
  item: MyWorkItemType
  onStatusChange: (itemId: string, status: string) => void
  onDateChange: (itemId: string, dateColumnId: string | null, date: string | null) => void
}

type DateStatus = 'overdue' | 'today' | 'upcoming' | 'future' | 'none'

function getDateStatus(dateStr: string | null): DateStatus {
  if (!dateStr) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7) return 'upcoming'
  return 'future'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const MyWorkItemRow = memo(function MyWorkItemRow({
  item,
  onStatusChange,
  onDateChange,
}: MyWorkItemProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [editingDate, setEditingDate] = useState(false)

  const dateStatus = getDateStatus(item.item_due_date)

  const statusOption = DEFAULT_STATUS_OPTIONS.find(s => s.key === item.item_status)
  const statusColor = statusOption ? getColorInfo(statusOption.color) : null

  const dateStyles: Record<DateStatus, string> = {
    overdue: 'text-red-600 bg-red-50',
    today: 'text-yellow-700 bg-yellow-50',
    upcoming: 'text-amber-700 bg-amber-50',
    future: 'text-text-secondary',
    none: 'text-text-tertiary',
  }

  const dateIcons: Record<DateStatus, React.ReactNode> = {
    overdue: <AlertCircle className="w-3.5 h-3.5" />,
    today: <Clock className="w-3.5 h-3.5" />,
    upcoming: <Clock className="w-3.5 h-3.5" />,
    future: <Calendar className="w-3.5 h-3.5" />,
    none: <Calendar className="w-3.5 h-3.5" />,
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover border-b border-border-light last:border-b-0 transition-colors">
      {/* Board color indicator */}
      <div
        className="w-1 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: item.board_color || '#C4C4C4' }}
      />

      {/* Item name + board/group info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/boards/${item.board_id}`}
          className="text-sm font-medium text-text-primary hover:text-text-link transition-colors truncate block"
        >
          {item.item_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Link
            href={`/boards/${item.board_id}`}
            className="text-xs text-text-tertiary hover:text-text-link transition-colors flex items-center gap-1"
          >
            {item.board_name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
          </Link>
          {item.group_name && (
            <>
              <span className="text-xs text-text-tertiary">/</span>
              <span className="text-xs text-text-tertiary">{item.group_name}</span>
            </>
          )}
        </div>
      </div>

      {/* Status pill */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className="px-3 py-1 rounded text-xs font-medium min-w-[100px] text-center transition-opacity hover:opacity-80"
          style={{
            backgroundColor: statusColor?.hex || '#C4C4C4',
            color: statusColor?.text || '#323338',
          }}
        >
          {statusOption?.label || item.item_status || 'No status'}
        </button>

        {showStatusDropdown && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-bg-primary border border-border-light rounded-lg shadow-lg py-1 min-w-[140px]">
            {DEFAULT_STATUS_OPTIONS.map(opt => {
              const color = getColorInfo(opt.color)
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    onStatusChange(item.item_id, opt.key)
                    setShowStatusDropdown(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg-hover transition-colors"
                >
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color.hex }} />
                  <span className="text-text-primary">{opt.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Date */}
      <div className="flex-shrink-0 w-[110px]">
        {editingDate ? (
          <input
            type="date"
            defaultValue={item.item_due_date || ''}
            autoFocus
            onBlur={e => {
              onDateChange(item.item_id, item.date_column_id, e.target.value || null)
              setEditingDate(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onDateChange(
                  item.item_id,
                  item.date_column_id,
                  (e.target as HTMLInputElement).value || null
                )
                setEditingDate(false)
              }
              if (e.key === 'Escape') setEditingDate(false)
            }}
            className="w-full text-xs px-2 py-1 border border-indigo-500 rounded bg-bg-primary text-text-primary focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingDate(true)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs w-full',
              'hover:bg-bg-hover transition-colors',
              dateStyles[dateStatus]
            )}
          >
            {dateIcons[dateStatus]}
            <span>{item.item_due_date ? formatDate(item.item_due_date) : 'No date'}</span>
          </button>
        )}
      </div>
    </div>
  )
})
