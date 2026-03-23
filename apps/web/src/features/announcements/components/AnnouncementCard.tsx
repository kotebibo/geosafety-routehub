'use client'

import { formatDistanceToNow } from 'date-fns'
import { ka } from 'date-fns/locale'
import { Megaphone, AlertTriangle, AlertCircle, User, Clock, Trash2 } from 'lucide-react'
import type { Announcement } from '@/types/announcement'
import { Tooltip } from '@/shared/components/ui/tooltip'

interface AnnouncementCardProps {
  announcement: Announcement
  onClick: () => void
  onDelete?: (id: string) => void
}

const PRIORITY = {
  urgent: {
    icon: AlertCircle,
    border: 'border-red-200',
    bg: 'bg-red-50/60',
    badge: 'bg-red-100 text-red-700',
    iconColor: 'text-red-500 bg-red-100',
    label: 'სასწრაფო',
  },
  important: {
    icon: AlertTriangle,
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-500 bg-amber-100',
    label: 'მნიშვნელოვანი',
  },
  normal: {
    icon: Megaphone,
    border: 'border-border-light',
    bg: 'bg-bg-primary',
    badge: '',
    iconColor: 'text-monday-primary bg-monday-primary/10',
    label: '',
  },
} as const

export function AnnouncementCard({ announcement, onClick, onDelete }: AnnouncementCardProps) {
  const config = PRIORITY[announcement.priority] || PRIORITY.normal
  const Icon = config.icon

  return (
    <div
      className={`relative rounded-xl border p-5 transition-all hover:shadow-md ${config.border} ${config.bg} ${
        !announcement.is_read ? 'ring-2 ring-monday-primary/40' : ''
      }`}
    >
      {/* Unread dot */}
      {!announcement.is_read && !onDelete && (
        <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-monday-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-monday-primary" />
        </span>
      )}

      {/* Admin delete button */}
      {onDelete && (
        <Tooltip content="წაშლა" side="top" delayDuration={200}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onDelete(announcement.id)
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-tertiary hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Tooltip>
      )}

      <button type="button" onClick={onClick} className="w-full text-left cursor-pointer">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconColor}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-text-primary line-clamp-1">
                {announcement.title}
              </h3>
              {announcement.priority !== 'normal' && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full flex-shrink-0 ${config.badge}`}
                >
                  {config.label}
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
              {announcement.content}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {announcement.author_name || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(announcement.created_at), {
                  addSuffix: true,
                  locale: ka,
                })}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
