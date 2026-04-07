'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Activity,
  Clock,
  User as UserIcon,
  Edit2,
  Trash2,
  CheckCircle,
  ArrowRightLeft,
  Columns,
} from 'lucide-react'
import { formatTimeAgo } from '@/lib/formatTime'
import type { ItemUpdate } from '@/types/board'

// Activity item icons and colors based on update type
const UPDATE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  created: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-color-success',
    bg: 'bg-color-success/10',
  },
  updated: {
    icon: <Edit2 className="w-4 h-4" />,
    color: 'text-color-info',
    bg: 'bg-color-info/10',
  },
  status_changed: {
    icon: <Activity className="w-4 h-4" />,
    color: 'text-purple-600',
    bg: 'bg-purple-600/10',
  },
  assigned: {
    icon: <UserIcon className="w-4 h-4" />,
    color: 'text-color-warning',
    bg: 'bg-color-warning/10',
  },
  reassigned: {
    icon: <UserIcon className="w-4 h-4" />,
    color: 'text-color-warning',
    bg: 'bg-color-warning/10',
  },
  comment: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-purple-600',
    bg: 'bg-purple-600/10',
  },
  completed: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-color-success',
    bg: 'bg-color-success/10',
  },
  deleted: {
    icon: <Trash2 className="w-4 h-4" />,
    color: 'text-color-error',
    bg: 'bg-color-error/10',
  },
  column_changed: {
    icon: <Columns className="w-4 h-4" />,
    color: 'text-color-info',
    bg: 'bg-color-info/10',
  },
  moved_to_board: {
    icon: <ArrowRightLeft className="w-4 h-4" />,
    color: 'text-color-warning',
    bg: 'bg-color-warning/10',
  },
}

// Use shared formatTimeAgo from @/lib/formatTime (imported above)

// Format update message based on type
function formatUpdateMessage(update: ItemUpdate): string {
  // Use resolved column name if available, fall back to field_name or column_id
  const columnDisplayName = update.column_name || update.field_name || update.column_id

  switch (update.update_type) {
    case 'created':
      return 'created this item'
    case 'updated':
      return columnDisplayName ? `updated ${columnDisplayName}` : 'made changes'
    case 'status_changed':
      return `changed status from "${update.old_value}" to "${update.new_value}"`
    case 'assigned':
      return update.content || 'assigned someone'
    case 'reassigned':
      return update.content || 'reassigned someone'
    case 'comment':
      return 'added a comment'
    case 'completed':
      return 'marked as complete'
    case 'deleted':
      return 'deleted something'
    case 'column_changed':
      if (columnDisplayName) {
        if (update.old_value && update.new_value) {
          return `changed ${columnDisplayName}`
        } else if (update.new_value) {
          return `set ${columnDisplayName}`
        } else {
          return `cleared ${columnDisplayName}`
        }
      }
      return 'updated a field'
    case 'moved_to_board':
      if (update.source_board_name && update.target_board_name) {
        return `moved from "${update.source_board_name}" to "${update.target_board_name}"`
      }
      return 'moved to another board'
    default:
      return 'made an update'
  }
}

interface ActivityTabProps {
  updates: ItemUpdate[]
  isLoading: boolean
  itemCreatedAt: string
}

export function ActivityTab({ updates, isLoading, itemCreatedAt }: ActivityTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (updates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No activity yet</p>
          <p className="text-xs text-text-tertiary mt-1">Changes to this item will appear here</p>
        </div>

        {/* Item creation info */}
        <CreationInfo createdAt={itemCreatedAt} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border-light" />

        {updates.map(update => {
          const config = UPDATE_TYPE_CONFIG[update.update_type] || UPDATE_TYPE_CONFIG.updated
          return (
            <div key={update.id} className="relative flex items-start gap-4 pb-6">
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                  config.bg,
                  config.color
                )}
              >
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 bg-bg-secondary rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-text-primary text-sm">
                      {update.user_name || 'Someone'}
                    </span>
                    <span className="text-text-secondary text-sm ml-1">
                      {formatUpdateMessage(update)}
                    </span>
                  </div>
                  <span className="text-xs text-text-tertiary whitespace-nowrap">
                    {formatTimeAgo(update.created_at ?? '')}
                  </span>
                </div>

                {/* Show old/new values for field changes */}
                {update.field_name && update.old_value && update.new_value && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded line-through">
                      {update.old_value}
                    </span>
                    <span className="text-text-tertiary">→</span>
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                      {update.new_value}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Item creation info */}
      <CreationInfo createdAt={itemCreatedAt} />
    </div>
  )
}

function CreationInfo({ createdAt }: { createdAt: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-bg-secondary rounded-lg mt-4 border border-border-light">
      <div className="w-8 h-8 rounded-full bg-monday-primary flex items-center justify-center flex-shrink-0">
        <Clock className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-text-primary">
          <span className="font-medium">Item created</span>
        </p>
        <p className="text-xs text-text-tertiary mt-1">{new Date(createdAt).toLocaleString()}</p>
      </div>
    </div>
  )
}
