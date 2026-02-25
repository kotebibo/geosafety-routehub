'use client'

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useServiceTypes } from '@/hooks/useServiceTypes'
import { ServiceTypePicker } from '../../ServiceTypePicker'
import { cn } from '@/lib/utils'
import { Shield, Flame, Leaf, Utensils, HardHat, Zap, Gauge } from 'lucide-react'

interface ServiceTypeCellProps {
  value?: string | null
  onEdit?: (value: string | null) => void
  readOnly?: boolean
  onEditStart?: () => void
}

// Icon mapping for service types
const SERVICE_ICONS: Record<string, React.ElementType> = {
  'labor_safety': HardHat,
  'fire_safety': Flame,
  'environmental': Leaf,
  'food_safety': Utensils,
  'construction': HardHat,
  'electrical': Zap,
  'gas_safety': Gauge,
  'elevator': Gauge,
  'pressure_vessels': Gauge,
  'radiation': Shield,
}

// Color mapping for service types
const SERVICE_COLORS: Record<string, string> = {
  'labor_safety': '#fdab3d',
  'fire_safety': '#e2445c',
  'environmental': '#00c875',
  'food_safety': '#579bfc',
  'construction': '#784bd1',
  'electrical': '#ffcb00',
  'gas_safety': '#ff642e',
  'elevator': '#a25ddc',
  'pressure_vessels': '#00d2d2',
  'radiation': '#bb3354',
}

export function ServiceTypeCell({ value, onEdit, readOnly = false, onEditStart }: ServiceTypeCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { serviceTypes } = useServiceTypes()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 })

  const selectedType = serviceTypes?.find(t => t.id === value)

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

  if (readOnly && value && selectedType) {
    const IconComponent = getIcon(selectedType.required_inspector_type)
    const color = getColor(selectedType.required_inspector_type)
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <div
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <IconComponent className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-[#323338] truncate">
          {selectedType.name}
        </span>
      </div>
    )
  }

  const IconComponent = selectedType ? getIcon(selectedType.required_inspector_type) : Shield
  const color = selectedType ? getColor(selectedType.required_inspector_type) : '#579bfc'

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
        {value && selectedType ? (
          <>
            <div
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <IconComponent className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-[#323338] truncate">
              {selectedType.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-[#9699a6]">Select service...</span>
        )}
      </button>

      {isEditing && !readOnly && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsEditing(false)} />
          <ServiceTypePicker
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
