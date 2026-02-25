'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ka } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notification'

const TYPE_ICONS: Record<NotificationType, string> = {
  board_shared: '📋',
  assignment_changed: '👤',
  route_updated: '🗺️',
  item_mention: '@',
  item_comment: '💬',
  announcement_new: '📢',
}

const TYPE_COLORS: Record<NotificationType, string> = {
  board_shared: 'bg-blue-100 text-blue-700',
  assignment_changed: 'bg-green-100 text-green-700',
  route_updated: 'bg-purple-100 text-purple-700',
  item_mention: 'bg-amber-100 text-amber-700',
  item_comment: 'bg-gray-100 text-gray-700',
  announcement_new: 'bg-indigo-100 text-indigo-700',
}

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllAsRead,
  } = useNotifications()

  // Calculate dropdown position when opened
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 8,
      left: rect.left,
    })
  }, [])

  useEffect(() => {
    if (isOpen) updatePosition()
  }, [isOpen, updatePosition])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    // Navigate based on type
    const { data } = notification
    switch (notification.type) {
      case 'board_shared':
        if (data.board_id) {
          router.push(`/boards/${data.board_id}`)
        }
        break
      case 'assignment_changed':
        router.push('/admin/assignments')
        break
      case 'route_updated':
        if (data.route_id) {
          router.push(`/routes/${data.route_id}`)
        } else {
          router.push('/routes/manage')
        }
        break
      case 'item_mention':
      case 'item_comment':
        if (data.board_id && data.item_id) {
          router.push(`/boards/${data.board_id}?item=${data.item_id}`)
        }
        break
      case 'announcement_new':
        router.push('/news')
        break
    }

    setIsOpen(false)
  }

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn('relative p-2 rounded-lg hover:bg-gray-100 transition-colors', className)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown via portal */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] overflow-hidden"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            maxHeight: `calc(100vh - ${dropdownPos.top + 16}px)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">შეტყობინებები</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4" />
                ყველას წაკითხვა
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>შეტყობინებები არ არის</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                    !notification.is_read && 'bg-blue-50/50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm',
                      TYPE_COLORS[notification.type]
                    )}
                  >
                    {TYPE_ICONS[notification.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ka,
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50 text-center">
              <button
                onClick={() => {
                  router.push('/settings?tab=notifications')
                  setIsOpen(false)
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ყველა შეტყობინების ნახვა
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
