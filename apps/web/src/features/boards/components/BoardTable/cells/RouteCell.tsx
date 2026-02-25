'use client'

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 })

  const selectedRoute = routes?.find(r => r.id === value)

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const updatePickerPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const pickerHeight = 350
      setPickerPos({
        top: spaceBelow > pickerHeight ? rect.bottom + 2 : Math.max(8, rect.top - pickerHeight - 2),
        left: Math.min(rect.left, window.innerWidth - 308),
      })
    }
  }, [])

  useLayoutEffect(() => {
    if (isEditing) {
      updatePickerPosition()
    }
  }, [isEditing, updatePickerPosition])

  // Close picker on scroll so it doesn't float away from the cell
  useEffect(() => {
    if (!isEditing) return
    const handleScroll = () => setIsEditing(false)
    const scrollParent = containerRef.current?.closest('.overflow-auto, .overflow-y-auto, [style*="overflow"]')
    scrollParent?.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollParent?.removeEventListener('scroll', handleScroll)
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

      {isEditing && !readOnly && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsEditing(false)} />
          <RoutePicker
            value={value}
            onChange={handleChange}
            onClose={() => setIsEditing(false)}
            positionStyle={{ top: pickerPos.top, left: pickerPos.left }}
          />
        </>,
        document.body
      )}
    </div>
  )
}
