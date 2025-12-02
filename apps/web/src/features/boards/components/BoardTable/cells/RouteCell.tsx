'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRoutes } from '@/hooks/useRoutes'
import { RoutePicker } from '../../RoutePicker'
import { cn } from '@/lib/utils'
import { MapPin, Calendar } from 'lucide-react'

interface RouteCellProps {
  value?: string | null
  onEdit?: (value: string | null) => void
  readOnly?: boolean
  onEditStart?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  planned: '#579bfc',
  in_progress: '#fdab3d',
  completed: '#00c875',
  cancelled: '#e2445c',
}

export function RouteCell({ value, onEdit, readOnly = false, onEditStart }: RouteCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { routes } = useRoutes()
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedRoute = routes?.find(r => r.id === value)

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    if (isEditing) {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsEditing(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing])

  const handleChange = (newValue: string | null) => {
    if (onEdit) {
      onEdit(newValue)
    }
    setIsEditing(false)
  }

  if (readOnly && !value) {
    return <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">-</div>
  }

  if (readOnly && value && selectedRoute) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <div
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: STATUS_COLORS[selectedRoute.status] || '#579bfc' }}
        >
          <MapPin className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-[#323338] truncate">
          {selectedRoute.name || 'Unnamed Route'}
        </span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[36px]">
      <button
        onClick={() => {
          if (!readOnly) {
            setIsEditing(true)
            onEditStart?.()
          }
        }}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left',
          !readOnly && 'hover:bg-[#f0f3ff] cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        {value && selectedRoute ? (
          <>
            <div
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: STATUS_COLORS[selectedRoute.status] || '#579bfc' }}
            >
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="text-sm text-[#323338] truncate block">
                {selectedRoute.name || 'Unnamed Route'}
              </span>
              <span className="text-xs text-[#9699a6] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(selectedRoute.date)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-sm text-[#9699a6]">Select route...</span>
        )}
      </button>

      {isEditing && !readOnly && (
        <RoutePicker
          value={value}
          onChange={handleChange}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}
