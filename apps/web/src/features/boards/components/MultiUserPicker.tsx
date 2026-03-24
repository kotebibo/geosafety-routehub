'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUsers } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import { Search, X, Check } from 'lucide-react'
import { calculatePopupPosition } from './BoardTable/cells/usePopupPosition'

// Color palette for avatars
const AVATAR_COLORS = [
  '#6161ff',
  '#00c875',
  '#fdab3d',
  '#e2445c',
  '#0073ea',
  '#a25ddc',
  '#ff642e',
  '#00d2d2',
  '#784bd1',
  '#579bfc',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface MultiUserPickerProps {
  value: string[] // Array of selected user IDs
  onChange: (userIds: string[]) => void
  onClose: () => void
  placeholder?: string
  triggerRect?: DOMRect | null
}

export function MultiUserPicker({
  value,
  onChange,
  onClose,
  placeholder = 'ძებნა...',
  triggerRect,
}: MultiUserPickerProps) {
  const [search, setSearch] = useState('')
  const { users, loading } = useUsers()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Calculate position from trigger rect
  useEffect(() => {
    if (triggerRect) {
      const pos = calculatePopupPosition({
        triggerRect,
        popupWidth: 300,
        popupHeight: 400,
      })
      setPosition(pos)
    }
  }, [triggerRect])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const filteredUsers =
    users?.filter(user => {
      const name = (user.full_name || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const searchLower = search.toLowerCase()
      return name.includes(searchLower) || email.includes(searchLower)
    }) || []

  // Get selected users for display
  const selectedUsers = users?.filter(u => value.includes(u.id)) || []

  const getInitials = (fullName?: string | null) => {
    if (!fullName) return '?'
    const parts = fullName.trim().split(/\s+/)
    const first = parts[0]?.charAt(0) || ''
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : ''
    return (first + last).toUpperCase() || '?'
  }

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter(id => id !== userId))
    } else {
      onChange([...value, userId])
    }
  }

  const removeUser = (userId: string) => {
    onChange(value.filter(id => id !== userId))
  }

  const clearAll = () => {
    onChange([])
  }

  const content = (
    <div
      ref={containerRef}
      className={cn(
        triggerRect ? 'fixed z-[9999]' : 'absolute top-0 left-0 z-50',
        'w-[300px] bg-bg-primary rounded-lg shadow-xl border border-border-light overflow-hidden'
      )}
      style={triggerRect ? { top: position.top, left: position.left } : undefined}
    >
      {/* Header with selected count */}
      <div className="px-3 py-2 bg-bg-secondary border-b border-border-light flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">არჩეულია: {value.length}</span>
        {value.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            გასუფთავება
          </button>
        )}
      </div>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <div className="px-3 py-2 border-b border-border-light flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {selectedUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs"
            >
              <div
                className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-semibold"
                style={{ backgroundColor: getAvatarColor(user.id) }}
              >
                {getInitials(user.full_name)}
              </div>
              <span className="max-w-[100px] truncate">{user.full_name || 'Unknown'}</span>
              <button
                onClick={() => removeUser(user.id)}
                className="w-4 h-4 rounded-full hover:bg-blue-100 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="p-2 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border-light rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* User List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            მომხმარებლები არ მოიძებნა
          </div>
        ) : (
          <div className="py-1">
            {filteredUsers.map(user => {
              const isSelected = value.includes(user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-bg-hover transition-colors',
                    isSelected && 'bg-blue-50 hover:bg-blue-50'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-border-medium hover:border-blue-400'
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>

                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: getAvatarColor(user.id) }}
                  >
                    {getInitials(user.full_name)}
                  </div>

                  {/* Name and Email */}
                  <div className="flex-1 text-left overflow-hidden">
                    <div
                      className={cn(
                        'font-medium truncate',
                        isSelected ? 'text-blue-700' : 'text-text-primary'
                      )}
                    >
                      {user.full_name || 'Unknown'}
                    </div>
                    {user.email && (
                      <div className="text-xs text-text-tertiary truncate">{user.email}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with Done button */}
      <div className="px-3 py-2 bg-bg-secondary border-t border-border-light">
        <button
          onClick={onClose}
          className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
        >
          დასრულება
        </button>
      </div>
    </div>
  )

  // Use portal when trigger rect is provided
  if (triggerRect && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}
