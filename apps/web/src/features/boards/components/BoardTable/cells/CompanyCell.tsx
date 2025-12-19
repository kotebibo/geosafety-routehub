/**
 * CompanyCell Component
 * Displays company with optional location info in board cells
 * Supports both legacy (string) and new (object) value formats
 */

'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { CompanyPicker } from '../../CompanyPicker'
import { cn } from '@/lib/utils'
import { Building2, MapPin } from 'lucide-react'
import { useCompaniesWithLocationCount, useCompanyLocations } from '@/hooks/useCompanyLocations'
import type { CompanyCellValue } from '@/types/company'

interface CompanyCellProps {
  value?: CompanyCellValue | string | null  // Support both formats
  onEdit?: (value: CompanyCellValue | null) => void
  readOnly?: boolean
  onEditStart?: () => void
}

export function CompanyCell({ value, onEdit, readOnly = false, onEditStart }: CompanyCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Parse value - handle both string (legacy) and object formats
  const parsedValue: CompanyCellValue | null = useMemo(() => {
    if (!value) return null
    if (typeof value === 'string') {
      return { company_id: value, location_id: null }
    }
    return value
  }, [value])

  // Fetch companies with location info
  const { data: companies } = useCompaniesWithLocationCount()
  
  // Fetch locations for selected company (if has location_id or need to show primary)
  const { data: locations } = useCompanyLocations(parsedValue?.company_id)

  // Find selected company
  const selectedCompany = useMemo(() => {
    if (!parsedValue?.company_id || !companies) return null
    return companies.find(c => c.id === parsedValue.company_id)
  }, [parsedValue?.company_id, companies])

  // Find selected or primary location
  const displayLocation = useMemo(() => {
    if (!locations || locations.length === 0) return null
    
    if (parsedValue?.location_id) {
      return locations.find(loc => loc.id === parsedValue.location_id)
    }
    
    // Return primary location if no specific location selected
    return locations.find(loc => loc.is_primary)
  }, [locations, parsedValue?.location_id])

  // Check if company has multiple locations
  const hasMultipleLocations = (selectedCompany?.location_count || 0) > 1

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

  const handleChange = (newValue: CompanyCellValue | null) => {
    if (onEdit) {
      onEdit(newValue)
    }
    setIsEditing(false)
  }

  // Empty state
  if (!parsedValue?.company_id) {
    if (readOnly) {
      return <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">-</div>
    }

    return (
      <div ref={containerRef} className="relative h-full min-h-[36px]">
        <button
          onClick={() => {
            setIsEditing(true)
            onEditStart?.()
          }}
          className="h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left hover:bg-[#f0f3ff] cursor-pointer"
        >
          <span className="text-sm text-[#9699a6]">აირჩიეთ კომპანია...</span>
        </button>

        {isEditing && (
          <CompanyPicker
            value={parsedValue}
            onChange={handleChange}
            onClose={() => setIsEditing(false)}
          />
        )}
      </div>
    )
  }

  // Read-only display
  if (readOnly) {
    return (
      <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
        <div className="flex-shrink-0 w-6 h-6 rounded bg-[#6161ff] flex items-center justify-center">
          <Building2 className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#323338] truncate">
            {selectedCompany?.name || 'კომპანია იტვირთება...'}
          </div>
          {hasMultipleLocations && displayLocation && (
            <div className="flex items-center gap-1 text-xs text-[#676879] truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{displayLocation.name}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Editable display
  return (
    <div ref={containerRef} className="relative h-full min-h-[36px]">
      <button
        onClick={() => {
          setIsEditing(true)
          onEditStart?.()
        }}
        className="h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left hover:bg-[#f0f3ff] cursor-pointer"
      >
        <div className="flex-shrink-0 w-6 h-6 rounded bg-[#6161ff] flex items-center justify-center">
          <Building2 className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#323338] truncate">
            {selectedCompany?.name || 'კომპანია იტვირთება...'}
          </div>
          {hasMultipleLocations && displayLocation && (
            <div className="flex items-center gap-1 text-xs text-[#676879] truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{displayLocation.name}</span>
            </div>
          )}
        </div>
      </button>

      {isEditing && (
        <CompanyPicker
          value={parsedValue}
          onChange={handleChange}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}
