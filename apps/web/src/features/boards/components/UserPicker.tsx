'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUsers } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import { calculatePopupPosition } from './BoardTable/cells/usePopupPosition'

interface UserPickerProps {
  value?: string | null
  onChange: (userId: string | null) => void
  onClose: () => void
  placeholder?: string
  triggerRect?: DOMRect | null
}

export function UserPicker({
  value,
  onChange,
  onClose,
  placeholder = 'Search people...',
  triggerRect,
}: UserPickerProps) {
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
        popupWidth: 280,
        popupHeight: 320,
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

  const selectedUser = users?.find(u => u.id === value)

  const getInitials = (fullName?: string | null) => {
    if (!fullName) return '?'
    const parts = fullName.trim().split(/\s+/)
    const first = parts[0]?.charAt(0) || ''
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : ''
    return (first + last).toUpperCase() || '?'
  }

  const content = (
    <div
      ref={containerRef}
      className={cn(
        triggerRect ? 'fixed z-[9999]' : 'absolute top-0 left-0 z-50',
        'min-w-[280px] bg-bg-primary rounded-md shadow-lg border border-border-light overflow-hidden'
      )}
      style={triggerRect ? { top: position.top, left: position.left } : undefined}
    >
      {/* Search Input */}
      <div className="p-2 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-2 py-1.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded focus:outline-none focus:border-monday-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Clear Selection */}
      {value && (
        <div className="px-2 py-1 border-b border-border-light">
          <button
            onClick={() => {
              onChange(null)
              onClose()
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover rounded transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear selection</span>
          </button>
        </div>
      )}

      {/* User List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">No people found</div>
        ) : (
          <div className="py-1">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  onChange(user.id)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                  value === user.id && 'bg-bg-selected'
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-monday-primary text-text-inverse flex items-center justify-center text-xs font-semibold">
                  {getInitials(user.full_name)}
                </div>

                {/* Name and Email */}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="font-medium text-text-primary truncate">
                    {user.full_name || 'Unknown'}
                  </div>
                  {user.email && (
                    <div className="text-xs text-text-tertiary truncate">{user.email}</div>
                  )}
                </div>

                {/* Selected Indicator */}
                {value === user.id && (
                  <svg
                    className="w-5 h-5 text-monday-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Use portal when trigger rect is provided (positioned relative to viewport)
  if (triggerRect && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  // Fallback to absolute positioning within parent
  return content
}
