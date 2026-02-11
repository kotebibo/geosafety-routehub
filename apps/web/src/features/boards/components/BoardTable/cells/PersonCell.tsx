'use client'

import React, { useState, useRef, memo } from 'react'
import { useInspectors } from '@/hooks/useInspectors'
import { MultiUserPicker } from '../../MultiUserPicker'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

// Color palette for avatars
const AVATAR_COLORS = [
  '#6161ff', '#00c875', '#fdab3d', '#e2445c', '#0073ea',
  '#a25ddc', '#ff642e', '#00d2d2', '#784bd1', '#579bfc'
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface PersonCellProps {
  value?: string | string[] | null  // Now supports array of IDs
  onEdit?: (value: string[] | null) => void
  readOnly?: boolean
  onEditStart?: () => void
}

export const PersonCell = memo(function PersonCell({ value, onEdit, readOnly = false, onEditStart }: PersonCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const { inspectors } = useInspectors()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Normalize value to always be an array
  const selectedIds: string[] = Array.isArray(value) 
    ? value 
    : (value ? [value] : [])

  // Get selected inspectors
  const selectedInspectors = inspectors?.filter(i => selectedIds.includes(i.id)) || []

  const getInitials = (fullName?: string | null) => {
    if (!fullName) return '?'
    const parts = fullName.trim().split(/\s+/)
    const first = parts[0]?.charAt(0) || ''
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : ''
    return (first + last).toUpperCase() || '?'
  }

  const handleChange = (newValue: string[]) => {
    if (onEdit) {
      onEdit(newValue.length > 0 ? newValue : null)
    }
  }

  const handleOpen = () => {
    if (!readOnly && buttonRef.current) {
      setTriggerRect(buttonRef.current.getBoundingClientRect())
      setIsEditing(true)
      onEditStart?.()
    }
  }

  // Read-only empty state
  if (readOnly && selectedInspectors.length === 0) {
    return <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">-</div>
  }

  // Read-only with values
  if (readOnly && selectedInspectors.length > 0) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3">
        <div className="flex -space-x-2">
          {selectedInspectors.slice(0, 4).map((inspector) => (
            <div 
              key={inspector.id}
              className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-semibold border-2 border-white"
              style={{ backgroundColor: getAvatarColor(inspector.id) }}
              title={inspector.full_name || ''}
            >
              {getInitials(inspector.full_name)}
            </div>
          ))}
          {selectedInspectors.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-semibold border-2 border-white">
              +{selectedInspectors.length - 4}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[36px]">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left',
          !readOnly && 'hover:bg-[#f0f3ff] cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        {selectedInspectors.length > 0 ? (
          <div className="flex items-center gap-2">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {selectedInspectors.slice(0, 3).map((inspector) => (
                <div 
                  key={inspector.id}
                  className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-semibold border-2 border-white"
                  style={{ backgroundColor: getAvatarColor(inspector.id) }}
                  title={inspector.full_name || ''}
                >
                  {getInitials(inspector.full_name)}
                </div>
              ))}
              {selectedInspectors.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-semibold border-2 border-white">
                  +{selectedInspectors.length - 3}
                </div>
              )}
            </div>
            {/* Add more button */}
            {!readOnly && (
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Plus className="w-4 h-4" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#9699a6]">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <Plus className="w-4 h-4 text-gray-400" />
            </div>
            <span>დაამატე...</span>
          </div>
        )}
      </button>

      {isEditing && !readOnly && (
        <MultiUserPicker
          value={selectedIds}
          onChange={handleChange}
          onClose={() => setIsEditing(false)}
          triggerRect={triggerRect}
        />
      )}
    </div>
  )
})
