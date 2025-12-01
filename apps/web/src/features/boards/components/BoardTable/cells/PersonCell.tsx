'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useInspectors } from '@/hooks/useInspectors'
import { UserPicker } from '../../UserPicker'
import { cn } from '@/lib/utils'

interface PersonCellProps {
  value?: string | null
  onEdit?: (value: string | null) => void
  readOnly?: boolean
}

export function PersonCell({ value, onEdit, readOnly = false }: PersonCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { inspectors } = useInspectors()
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedInspector = inspectors?.find(i => i.id === value)

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const getFullName = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown'
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

  if (readOnly && value && selectedInspector) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#6161ff] text-white flex items-center justify-center text-xs font-semibold">
          {getInitials(selectedInspector.first_name, selectedInspector.last_name)}
        </div>
        <span className="text-sm text-[#323338] truncate">
          {getFullName(selectedInspector.first_name, selectedInspector.last_name)}
        </span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[36px]">
      <button
        onClick={() => !readOnly && setIsEditing(true)}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left',
          !readOnly && 'hover:bg-[#f0f3ff] cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        {value && selectedInspector ? (
          <>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#6161ff] text-white flex items-center justify-center text-xs font-semibold">
              {getInitials(selectedInspector.first_name, selectedInspector.last_name)}
            </div>
            <span className="text-sm text-[#323338] truncate">
              {getFullName(selectedInspector.first_name, selectedInspector.last_name)}
            </span>
          </>
        ) : (
          <span className="text-sm text-[#9699a6]">Select person...</span>
        )}
      </button>

      {isEditing && !readOnly && (
        <UserPicker
          value={value}
          onChange={handleChange}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}
