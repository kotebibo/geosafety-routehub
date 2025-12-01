'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useInspectors } from '@/hooks/useInspectors'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'

interface UserPickerProps {
  value?: string | null
  onChange: (userId: string | null) => void
  onClose: () => void
  placeholder?: string
}

export function UserPicker({ value, onChange, onClose, placeholder = 'Search people...' }: UserPickerProps) {
  const [search, setSearch] = useState('')
  const { inspectors, loading } = useInspectors()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredInspectors = inspectors?.filter((inspector) => {
    const fullName = `${inspector.first_name || ''} ${inspector.last_name || ''}`.toLowerCase()
    const email = (inspector.email || '').toLowerCase()
    const searchLower = search.toLowerCase()
    return fullName.includes(searchLower) || email.includes(searchLower)
  }) || []

  const selectedInspector = inspectors?.find(i => i.id === value)

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const getFullName = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown'
  }

  return (
    <div className="absolute top-0 left-0 w-full min-w-[280px] bg-white rounded-md shadow-lg border border-border-light z-50 overflow-hidden">
      {/* Search Input */}
      <div className="p-2 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-border-light rounded focus:outline-none focus:border-monday-primary"
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
        ) : filteredInspectors.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No people found
          </div>
        ) : (
          <div className="py-1">
            {filteredInspectors.map((inspector) => (
              <button
                key={inspector.id}
                onClick={() => {
                  onChange(inspector.id)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                  value === inspector.id && 'bg-bg-selected'
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-monday-primary text-white flex items-center justify-center text-xs font-semibold">
                  {getInitials(inspector.first_name, inspector.last_name)}
                </div>

                {/* Name and Email */}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="font-medium text-text-primary truncate">
                    {getFullName(inspector.first_name, inspector.last_name)}
                  </div>
                  {inspector.email && (
                    <div className="text-xs text-text-tertiary truncate">
                      {inspector.email}
                    </div>
                  )}
                </div>

                {/* Selected Indicator */}
                {value === inspector.id && (
                  <svg className="w-5 h-5 text-monday-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
