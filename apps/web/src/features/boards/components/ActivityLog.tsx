'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  History,
  RefreshCw,
  Undo2,
  X,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'

export interface ItemUpdate {
  id: string
  item_type: 'route' | 'company' | 'inspector' | 'inspection' | 'board_item'
  item_id: string
  user_id?: string
  user_name?: string
  update_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'reassigned' | 'comment' | 'completed'
  field_name?: string
  old_value?: string
  new_value?: string
  content?: string
  metadata?: Record<string, any>
  created_at: string
}

interface ActivityLogProps {
  updates: ItemUpdate[]
  isLoading?: boolean
  onRefresh?: () => void
  onRollback?: (update: ItemUpdate) => void
  showRollback?: boolean
  maxHeight?: string
  className?: string
}

// Format value for display (handle JSON, objects, etc.)
function formatValue(value: string | undefined | null): string {
  if (value === null || value === undefined || value === '') {
    return '(empty)'
  }

  // Try to parse as JSON for objects
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object') {
      // Handle status objects like { label: 'Done', color: '#00c875' }
      if (parsed.label) return parsed.label
      if (parsed.text) return parsed.text
      if (parsed.name) return parsed.name
      return JSON.stringify(parsed)
    }
    return String(parsed)
  } catch {
    // Not JSON, return as-is
    return value
  }
}

// Get update type label
function getUpdateTypeLabel(type: ItemUpdate['update_type']): string {
  switch (type) {
    case 'created': return 'Created'
    case 'updated': return 'Updated'
    case 'deleted': return 'Deleted'
    case 'status_changed': return 'Status Changed'
    case 'assigned': return 'Assigned'
    case 'reassigned': return 'Reassigned'
    case 'comment': return 'Comment'
    case 'completed': return 'Completed'
    default: return 'Changed'
  }
}

// Get update type color
function getUpdateTypeColor(type: ItemUpdate['update_type']): string {
  switch (type) {
    case 'created': return 'bg-green-100 text-green-700'
    case 'updated': return 'bg-blue-100 text-blue-700'
    case 'deleted': return 'bg-red-100 text-red-700'
    case 'status_changed': return 'bg-purple-100 text-purple-700'
    case 'assigned':
    case 'reassigned': return 'bg-orange-100 text-orange-700'
    case 'completed': return 'bg-green-100 text-green-700'
    case 'comment': return 'bg-gray-100 text-gray-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export function ActivityLog({
  updates,
  isLoading = false,
  onRefresh,
  onRollback,
  showRollback = false,
  maxHeight = '400px',
  className,
}: ActivityLogProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <History className="w-5 h-5 text-gray-400 animate-pulse" />
          <span className="font-medium text-gray-600">Loading activity...</span>
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (updates.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-8 text-center', className)}>
        <History className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 font-medium text-lg">No activity yet</p>
        <p className="text-gray-400 text-sm mt-1">Changes to board items will appear here</p>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-800">Activity History</span>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">
            {updates.length} changes
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Table - scrolls both horizontally and vertically */}
      <div className="flex-1 overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-36">Time</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-32">User</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-28">Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-32">Column</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Old Value</th>
              <th className="text-center px-2 py-2 w-8"></th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">New Value</th>
              {showRollback && (
                <th className="text-center px-4 py-2 font-medium text-gray-600 w-20">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {updates.map((update) => {
              const canRollback = showRollback &&
                onRollback &&
                update.field_name &&
                update.old_value !== undefined &&
                update.update_type !== 'created' &&
                update.update_type !== 'deleted'

              return (
                <tr
                  key={update.id}
                  className={cn(
                    'hover:bg-blue-50/50 transition-colors',
                    hoveredRow === update.id && 'bg-blue-50/50'
                  )}
                  onMouseEnter={() => setHoveredRow(update.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Time */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{format(new Date(update.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700 truncate block max-w-[120px]" title={update.user_name}>
                      {update.user_name || 'System'}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                      getUpdateTypeColor(update.update_type)
                    )}>
                      {getUpdateTypeLabel(update.update_type)}
                    </span>
                  </td>

                  {/* Column */}
                  <td className="px-4 py-3">
                    <span className="text-gray-700 font-medium">
                      {update.metadata?.displayName || update.field_name || '-'}
                    </span>
                  </td>

                  {/* Old Value */}
                  <td className="px-4 py-3">
                    {update.old_value ? (
                      <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded text-xs max-w-[150px] truncate" title={formatValue(update.old_value)}>
                        {formatValue(update.old_value)}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  {/* Arrow */}
                  <td className="px-2 py-3 text-center">
                    {(update.old_value || update.new_value) && update.update_type !== 'created' && update.update_type !== 'deleted' ? (
                      <ArrowRight className="w-4 h-4 text-gray-400 inline" />
                    ) : null}
                  </td>

                  {/* New Value */}
                  <td className="px-4 py-3">
                    {update.new_value ? (
                      <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs max-w-[150px] truncate" title={formatValue(update.new_value)}>
                        {formatValue(update.new_value)}
                      </span>
                    ) : update.content ? (
                      <span className="text-gray-600 text-xs truncate block max-w-[150px]" title={update.content}>
                        {update.content}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  {/* Rollback Action */}
                  {showRollback && (
                    <td className="px-4 py-3 text-center">
                      {canRollback ? (
                        <button
                          onClick={() => onRollback?.(update)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                            hoveredRow === update.id
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                          )}
                          title="Undo this change"
                        >
                          <Undo2 className="w-3 h-3" />
                          Undo
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Sidebar panel version
interface ActivityLogPanelProps extends Omit<ActivityLogProps, 'maxHeight' | 'className'> {
  isOpen: boolean
  onClose: () => void
}

export function ActivityLogPanel({
  isOpen,
  onClose,
  ...props
}: ActivityLogPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-[600px] max-w-[95vw] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Activity Log</h2>
              <p className="text-xs text-gray-500">Track all changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          <ActivityLog
            {...props}
            maxHeight="calc(100vh - 100px)"
            className="h-full"
          />
        </div>
      </div>
    </>
  )
}

export default ActivityLog
