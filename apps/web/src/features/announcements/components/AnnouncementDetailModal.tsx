'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Clock, Megaphone, AlertTriangle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ka } from 'date-fns/locale'
import type { Announcement } from '@/types/announcement'

interface AnnouncementDetailModalProps {
  announcement: Announcement
  onClose: () => void
  onMarkRead: (id: string) => void
}

const PRIORITY = {
  urgent: { icon: AlertCircle, bg: 'bg-red-50', label: 'სასწრაფო', badge: 'bg-red-100 text-red-700' },
  important: { icon: AlertTriangle, bg: 'bg-amber-50', label: 'მნიშვნელოვანი', badge: 'bg-amber-100 text-amber-700' },
  normal: { icon: Megaphone, bg: 'bg-gray-50', label: '', badge: '' },
} as const

export function AnnouncementDetailModal({ announcement, onClose, onMarkRead }: AnnouncementDetailModalProps) {
  // Mark as read on open
  useEffect(() => {
    if (!announcement.is_read) {
      onMarkRead(announcement.id)
    }
  }, [announcement.id])

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const config = PRIORITY[announcement.priority] || PRIORITY.normal
  const Icon = config.icon

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 border-b ${config.bg}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-gray-700" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 mb-1.5">{announcement.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {announcement.author_name}
                  </span>
                  <span
                    className="flex items-center gap-1"
                    title={format(new Date(announcement.created_at), 'PPpp', { locale: ka })}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: ka })}
                  </span>
                  {announcement.priority !== 'normal' && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${config.badge}`}>
                      {config.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#6161FF] text-white text-sm font-medium rounded-lg hover:bg-[#4f4fd9] transition-colors"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
