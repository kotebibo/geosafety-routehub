'use client'

import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useServiceTypes } from '@/hooks/useServiceTypes'
import { ServiceTypePicker } from '../../ServiceTypePicker'
import { cn } from '@/lib/utils'
import { Shield, HardHat, Utensils, Scale, Briefcase, Leaf } from 'lucide-react'

interface ServiceTypeCellProps {
  value?: string | string[] | null
  onEdit?: (value: string[]) => void
  readOnly?: boolean
  onEditStart?: () => void
}

// Icon mapping for service types
const SERVICE_ICONS: Record<string, React.ElementType> = {
  labor_safety: HardHat,
  labor_rights: Scale,
  food_safety: Utensils,
  personal_data: Shield,
  legal_outsource: Briefcase,
  fire_safety: Shield,
  environmental: Leaf,
  construction: HardHat,
}

// Color mapping for service types
const SERVICE_COLORS: Record<string, string> = {
  labor_safety: '#00c875',
  labor_rights: '#fdab3d',
  food_safety: '#ff158a',
  personal_data: '#a25ddc',
  legal_outsource: '#5559df',
  fire_safety: '#e2445c',
  environmental: '#00c875',
  construction: '#784bd1',
}

// Normalize value to string array (backward compat)
function normalizeServiceIds(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      // Not JSON
    }
    return [trimmed]
  }
  return []
}

export function ServiceTypeCell({
  value,
  onEdit,
  readOnly = false,
  onEditStart,
}: ServiceTypeCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { serviceTypes } = useServiceTypes()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 })

  const selectedIds = normalizeServiceIds(value)
  const selectedTypes = selectedIds.map(id => serviceTypes?.find(t => t.id === id)).filter(Boolean)

  const getIcon = (inspectorType?: string) => {
    return SERVICE_ICONS[inspectorType || ''] || Shield
  }

  const getColor = (inspectorType?: string) => {
    return SERVICE_COLORS[inspectorType || ''] || '#579bfc'
  }

  const updatePickerPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const pickerHeight = 400
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

  // Close picker on scroll
  useEffect(() => {
    if (!isEditing) return
    const handleScroll = () => setIsEditing(false)
    const scrollParent = containerRef.current?.closest(
      '.overflow-auto, .overflow-y-auto, [style*="overflow"]'
    )
    scrollParent?.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollParent?.removeEventListener('scroll', handleScroll)
  }, [isEditing])

  const handleChange = (newIds: string[]) => {
    onEdit?.(newIds)
  }

  const handleClose = () => {
    setIsEditing(false)
  }

  if (readOnly && selectedTypes.length === 0) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-text-tertiary text-sm">-</div>
    )
  }

  const firstType = selectedTypes[0]
  const firstIcon = firstType ? getIcon(firstType.required_inspector_type) : Shield
  const firstColor = firstType ? getColor(firstType.required_inspector_type) : '#579bfc'

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
          !readOnly && 'hover:bg-bg-hover cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        {selectedTypes.length > 0 ? (
          <>
            <div
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: firstColor }}
            >
              {React.createElement(firstIcon, { className: 'w-3 h-3 text-white' })}
            </div>
            <span className="text-sm text-text-primary truncate">
              {firstType?.name_ka || firstType?.name}
            </span>
            {selectedTypes.length > 1 && (
              <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
                +{selectedTypes.length - 1}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-text-tertiary">Select service...</span>
        )}
      </button>

      {isEditing &&
        !readOnly &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={handleClose} />
            <ServiceTypePicker
              value={selectedIds}
              onChange={handleChange}
              onClose={handleClose}
              positionStyle={{ top: pickerPos.top, left: pickerPos.left }}
            />
          </>,
          document.body
        )}
    </div>
  )
}
