'use client'

import { useState, memo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MyWorkItemRow } from './MyWorkItem'
import type { MyWorkItem } from '@/services/my-work.service'
import type { DateGroup } from '../hooks/useMyWork'

interface MyWorkDateGroupProps {
  group: DateGroup
  items: MyWorkItem[]
  onStatusChange: (itemId: string, status: string) => void
  onDateChange: (itemId: string, dateColumnId: string | null, date: string | null) => void
}

const GROUP_CONFIG: Record<DateGroup, { label: string; labelKa: string; color: string }> = {
  overdue: { label: 'Past Due', labelKa: 'ვადაგასული', color: 'bg-red-500' },
  today: { label: 'Today', labelKa: 'დღეს', color: 'bg-yellow-500' },
  this_week: { label: 'This Week', labelKa: 'ამ კვირაში', color: 'bg-blue-500' },
  next_week: { label: 'Next Week', labelKa: 'მომავალ კვირაში', color: 'bg-indigo-500' },
  later: { label: 'Later', labelKa: 'მოგვიანებით', color: 'bg-gray-400' },
  no_date: { label: 'No Date', labelKa: 'თარიღის გარეშე', color: 'bg-gray-300' },
}

export const MyWorkDateGroup = memo(function MyWorkDateGroup({
  group,
  items,
  onStatusChange,
  onDateChange,
}: MyWorkDateGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const config = GROUP_CONFIG[group]

  if (items.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-bg-hover transition-colors rounded-t-lg"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
        <div className={cn('w-2 h-2 rounded-full', config.color)} />
        <span className="text-sm font-semibold text-text-primary">{config.label}</span>
        <span className="text-xs text-text-tertiary ml-1">({items.length})</span>
      </button>

      {!isCollapsed && (
        <div className="bg-bg-primary border border-border-light rounded-lg overflow-hidden">
          {items.map(item => (
            <MyWorkItemRow
              key={item.item_id}
              item={item}
              onStatusChange={onStatusChange}
              onDateChange={onDateChange}
            />
          ))}
        </div>
      )}
    </div>
  )
})
