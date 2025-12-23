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
} from 'lucide-react'
import type { ItemUpdate } from '@/types/board'

// Activity item icons and colors based on update type
const UPDATE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  created: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100' },
  updated: { icon: <Edit2 className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100' },
  status_changed: { icon: <Activity className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-100' },
  assigned: { icon: <UserIcon className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-100' },
  reassigned: { icon: <UserIcon className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-100' },
  comment: { icon: <MessageSquare className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  completed: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100' },
  deleted: { icon: <Trash2 className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-100' },
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Format update message based on type
function formatUpdateMessage(update: ItemUpdate): string {
  switch (update.update_type) {
    case 'created':
      return 'created this item'
    case 'updated':
      return update.field_name ? `updated ${update.field_name}` : 'made changes'
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
          <p className="text-xs text-text-tertiary mt-1">
            Changes to this item will appear here
          </p>
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

        {updates.map((update) => {
          const config = UPDATE_TYPE_CONFIG[update.update_type] || UPDATE_TYPE_CONFIG.updated
          return (
            <div key={update.id} className="relative flex items-start gap-4 pb-6">
              {/* Icon */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                config.bg, config.color
              )}>
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
                    {formatRelativeTime(update.created_at)}
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
        <p className="text-xs text-text-tertiary mt-1">
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
