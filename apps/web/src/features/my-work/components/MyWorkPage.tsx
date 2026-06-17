'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import {
  useMyWorkItems,
  useGroupedMyWork,
  useUpdateMyWorkItemStatus,
  useUpdateMyWorkItemDate,
} from '../hooks/useMyWork'
import { MyWorkDateGroup } from './MyWorkDateGroup'
import type { DateGroup } from '../hooks/useMyWork'

const DATE_GROUP_ORDER: DateGroup[] = [
  'overdue',
  'today',
  'this_week',
  'next_week',
  'later',
  'no_date',
]

export function MyWorkPage() {
  const { user, loading: authLoading } = useAuth()
  const { data: items, isLoading } = useMyWorkItems(authLoading ? '' : user?.id || '')
  const grouped = useGroupedMyWork(items)
  const updateStatus = useUpdateMyWorkItemStatus()
  const updateDate = useUpdateMyWorkItemDate()

  const totalItems = items?.length || 0
  const loading = authLoading || isLoading

  const handleStatusChange = (itemId: string, status: string) => {
    updateStatus.mutate({ itemId, status })
  }

  const handleDateChange = (itemId: string, dateColumnId: string | null, date: string | null) => {
    updateDate.mutate({ itemId, dateColumnId, date })
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">My Work</h1>
            <p className="text-sm text-text-secondary">
              {loading
                ? 'Loading...'
                : totalItems === 0
                  ? 'No items assigned to you'
                  : `${totalItems} item${totalItems !== 1 ? 's' : ''} assigned to you`}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && totalItems === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mb-4">
              <ClipboardCheck className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">No work assigned</h3>
            <p className="text-sm text-text-secondary max-w-md">
              Items will appear here when you are assigned to them via a person column on any board.
            </p>
          </div>
        )}

        {/* Date groups */}
        {!loading && totalItems > 0 && (
          <div>
            {DATE_GROUP_ORDER.map(group => (
              <MyWorkDateGroup
                key={group}
                group={group}
                items={grouped[group]}
                onStatusChange={handleStatusChange}
                onDateChange={handleDateChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
