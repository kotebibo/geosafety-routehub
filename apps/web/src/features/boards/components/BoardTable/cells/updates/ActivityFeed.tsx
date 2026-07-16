'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { History, Clock } from 'lucide-react'
import { formatTimeAgo } from '@/lib/formatTime'

import { getActivityIcon } from './helpers'

import type { ItemUpdate } from '@/types/board'
import type { UpdatesVariant } from './types'

interface ActivityFeedProps {
  variant: UpdatesVariant
  activities: ItemUpdate[]
  loading: boolean
}

// Panel variant: localized description with inline value pills
function renderActivityDescription(update: ItemUpdate, t: ReturnType<typeof useTranslations>) {
  const fieldName =
    update.metadata?.displayName ||
    update.column_name_ka ||
    update.column_name ||
    update.field_name ||
    'field'

  const valuePill = (val: string, variant: 'old' | 'new') => (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mx-0.5',
        variant === 'old' ? 'bg-red-50 text-red-700 line-through' : 'bg-green-50 text-green-700'
      )}
    >
      {val || '-'}
    </span>
  )

  switch (update.update_type) {
    case 'created':
      return <span>{t('boards.updates.activity.created')}</span>
    case 'status_changed':
      return (
        <span>
          {t('boards.updates.activity.changedField')}{' '}
          <strong className="text-text-primary">{fieldName}</strong>{' '}
          {valuePill(update.old_value || '-', 'old')}
          {' → '}
          {valuePill(update.new_value || '-', 'new')}
        </span>
      )
    case 'assigned':
      return (
        <span>{update.content || t('boards.updates.activity.assignedField', { fieldName })}</span>
      )
    case 'reassigned':
      return (
        <span>{update.content || t('boards.updates.activity.reassignedField', { fieldName })}</span>
      )
    case 'comment': {
      const text = update.content?.substring(0, 80) || ''
      return (
        <span>
          {t('boards.updates.activity.commented')}{' '}
          <span className="italic text-text-tertiary">
            "{text}
            {(update.content?.length || 0) > 80 ? '...' : ''}"
          </span>
        </span>
      )
    }
    case 'moved_to_board':
      return (
        <span>
          {t('boards.updates.activity.movedToBoard')}{' '}
          {update.target_board_name && (
            <strong className="text-text-primary">{update.target_board_name}</strong>
          )}
        </span>
      )
    case 'updated':
      if (update.old_value && update.new_value) {
        // Try to clean up JSON-stringified values
        let oldDisplay = update.old_value
        let newDisplay = update.new_value
        try {
          oldDisplay = JSON.parse(oldDisplay)
        } catch {
          /* keep as-is */
        }
        try {
          newDisplay = JSON.parse(newDisplay)
        } catch {
          /* keep as-is */
        }
        if (typeof oldDisplay !== 'string') oldDisplay = String(oldDisplay)
        if (typeof newDisplay !== 'string') newDisplay = String(newDisplay)

        return (
          <span>
            {t('boards.updates.activity.changedField')}{' '}
            <strong className="text-text-primary">{fieldName}</strong>{' '}
            {valuePill(oldDisplay, 'old')}
            {' → '}
            {valuePill(newDisplay, 'new')}
          </span>
        )
      }
      if (update.new_value) {
        let newDisplay = update.new_value
        try {
          newDisplay = JSON.parse(newDisplay)
        } catch {
          /* keep as-is */
        }
        if (typeof newDisplay !== 'string') newDisplay = String(newDisplay)
        return (
          <span>
            {t('boards.updates.activity.setField')}{' '}
            <strong className="text-text-primary">{fieldName}</strong>{' '}
            {valuePill(newDisplay, 'new')}
          </span>
        )
      }
      return (
        <span>
          {t('boards.updates.activity.updatedField')}{' '}
          <strong className="text-text-primary">{fieldName}</strong>
        </span>
      )
    default:
      return (
        <span>
          {update.content || t('boards.updates.activity.updatedFieldFallback', { fieldName })}
        </span>
      )
  }
}

// Modal variant: plain English description
function getActivityDescription(update: ItemUpdate, t: ReturnType<typeof useTranslations>) {
  const fieldName =
    update.metadata?.displayName || update.column_name || update.field_name || 'field'
  switch (update.update_type) {
    case 'created':
      return t('boards.updates.activity.modal.created')
    case 'status_changed':
      return t('boards.updates.activity.modal.statusChanged', {
        fieldName,
        oldValue: update.old_value || '-',
        newValue: update.new_value || '-',
      })
    case 'assigned':
      return update.content || t('boards.updates.activity.modal.assigned', { fieldName })
    case 'reassigned':
      return update.content || t('boards.updates.activity.modal.reassigned', { fieldName })
    case 'comment':
      return t('boards.updates.activity.modal.commented', {
        text: `${update.content?.substring(0, 60) || ''}${(update.content?.length || 0) > 60 ? '...' : ''}`,
      })
    case 'updated':
      if (update.old_value && update.new_value) {
        return t('boards.updates.activity.modal.updatedFromTo', {
          fieldName,
          oldValue: update.old_value,
          newValue: update.new_value,
        })
      }
      if (update.new_value) {
        return t('boards.updates.activity.modal.setTo', { fieldName, newValue: update.new_value })
      }
      return t('boards.updates.activity.modal.updated', { fieldName })
    default:
      return update.content || t('boards.updates.activity.modal.updated', { fieldName })
  }
}

export function ActivityFeed({ variant, activities, loading }: ActivityFeedProps) {
  const t = useTranslations()
  const isPanel = variant === 'panel'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className={
            isPanel
              ? 'w-7 h-7 border-2 border-monday-primary border-t-transparent rounded-full animate-spin'
              : 'w-8 h-8 border-3 border-monday-primary border-t-transparent rounded-full animate-spin'
          }
        />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className={cn(
            'rounded-full bg-border-light flex items-center justify-center',
            isPanel ? 'w-16 h-16 mb-3' : 'w-20 h-20 mb-4'
          )}
        >
          <History className={cn('text-border-medium', isPanel ? 'w-8 h-8' : 'w-10 h-10')} />
        </div>
        <span
          className={cn('font-medium text-text-primary mb-1', isPanel ? 'text-base' : 'text-lg')}
        >
          {isPanel
            ? t('boards.updates.activity.emptyTitlePanel')
            : t('boards.updates.activity.emptyTitleModal')}
        </span>
        <span className="text-sm text-text-secondary">
          {isPanel
            ? t('boards.updates.activity.emptyDescriptionPanel')
            : t('boards.updates.activity.emptyDescriptionModal')}
        </span>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border-light" />

      <div className="space-y-0">
        {activities.map(activity => (
          <div
            key={activity.id}
            className={cn('relative flex items-start gap-4 py-3 pl-2', isPanel && 'group/activity')}
          >
            {/* Timeline dot */}
            <div
              className={cn(
                'relative z-10 rounded-full bg-bg-primary border-2 border-border-light flex items-center justify-center flex-shrink-0',
                isPanel
                  ? 'w-8 h-8 group-hover/activity:border-monday-primary/30 transition-colors'
                  : 'w-7 h-7'
              )}
            >
              {getActivityIcon(activity.update_type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className={cn('text-sm', isPanel && 'leading-relaxed')}>
                <span
                  className={cn('text-text-primary', isPanel ? 'font-semibold' : 'font-medium')}
                >
                  {activity.user_name ||
                    (isPanel
                      ? t('boards.updates.activity.systemUserPanel')
                      : t('boards.updates.activity.systemUserModal'))}
                </span>{' '}
                <span className="text-text-secondary">
                  {isPanel
                    ? renderActivityDescription(activity, t)
                    : getActivityDescription(activity, t)}
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center mt-1 text-xs text-text-tertiary',
                  isPanel ? 'gap-1.5' : 'gap-1'
                )}
              >
                <Clock className="w-3 h-3" />
                {formatTimeAgo(activity.created_at ?? '')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
