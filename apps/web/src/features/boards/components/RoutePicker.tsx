'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRoutes } from '@/hooks/useRoutes'
import { cn } from '@/lib/utils'
import { Search, X, MapPin, Calendar } from 'lucide-react'

interface RoutePickerProps {
  value?: string | null
  onChange: (routeId: string | null) => void
  onClose: () => void
  placeholder?: string
}

const STATUS_COLORS: Record<string, string> = {
  planned: '#579bfc',
  in_progress: '#fdab3d',
  completed: '#00c875',
  cancelled: '#e2445c',
}

export function RoutePicker({ value, onChange, onClose, placeholder = 'Search routes...' }: RoutePickerProps) {
  const [search, setSearch] = useState('')
  const { routes, loading } = useRoutes()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredRoutes = routes?.filter((route) => {
    const name = (route.name || '').toLowerCase()
    const searchLower = search.toLowerCase()
    return name.includes(searchLower)
  }) || []

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  return (
    <div className="absolute top-0 left-0 w-full min-w-[300px] bg-white rounded-md shadow-lg border border-border-light z-50 overflow-hidden">
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

      {/* Route List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No routes found
          </div>
        ) : (
          <div className="py-1">
            {filteredRoutes.map((route) => (
              <button
                key={route.id}
                onClick={() => {
                  onChange(route.id)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                  value === route.id && 'bg-bg-selected'
                )}
              >
                {/* Route Icon */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                  style={{ backgroundColor: STATUS_COLORS[route.status] || '#579bfc' }}
                >
                  <MapPin className="w-4 h-4 text-white" />
                </div>

                {/* Route Info */}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="font-medium text-text-primary truncate">
                    {route.name || 'Unnamed Route'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(route.date)}</span>
                    <span className="px-1.5 py-0.5 rounded text-white text-[10px]" style={{ backgroundColor: STATUS_COLORS[route.status] || '#579bfc' }}>
                      {getStatusLabel(route.status)}
                    </span>
                  </div>
                </div>

                {/* Selected Indicator */}
                {value === route.id && (
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
