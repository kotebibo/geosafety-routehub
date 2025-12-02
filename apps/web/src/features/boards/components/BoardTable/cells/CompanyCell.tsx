'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useCompanies } from '@/hooks/useCompanies'
import { CompanyPicker } from '../../CompanyPicker'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'

interface CompanyCellProps {
  value?: string | null
  onEdit?: (value: string | null) => void
  readOnly?: boolean
  onEditStart?: () => void
}

export function CompanyCell({ value, onEdit, readOnly = false, onEditStart }: CompanyCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { allCompanies } = useCompanies()
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedCompany = allCompanies?.find(c => c.id === value)

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

  if (readOnly && value && selectedCompany) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <div className="flex-shrink-0 w-6 h-6 rounded bg-[#6161ff] flex items-center justify-center">
          <Building2 className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-[#323338] truncate">
          {selectedCompany.name || 'Unnamed Company'}
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
        {value && selectedCompany ? (
          <>
            <div className="flex-shrink-0 w-6 h-6 rounded bg-[#6161ff] flex items-center justify-center">
              <Building2 className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-[#323338] truncate">
              {selectedCompany.name || 'Unnamed Company'}
            </span>
          </>
        ) : (
          <span className="text-sm text-[#9699a6]">Select company...</span>
        )}
      </button>

      {isEditing && !readOnly && (
        <CompanyPicker
          value={value}
          onChange={handleChange}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}
