/**
 * CompanyAddressCell Component
 * Displays the address of a company's selected location
 * Read-only - automatically populated from company column
 */

'use client'

import React, { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import { useCompanyLocations } from '@/hooks/useCompanyLocations'
import type { CompanyCellValue } from '@/types/company'

interface CompanyAddressCellProps {
  value?: CompanyCellValue | string | null  // Company cell value (from linked company column)
  companyColumnId?: string  // ID of the company column to read from
  row?: Record<string, any>  // Full row data to find company value
  readOnly?: boolean
}

export function CompanyAddressCell({ 
  value, 
  companyColumnId, 
  row,
  readOnly = true  // Always read-only as it's derived
}: CompanyAddressCellProps) {
  
  // Try to get company value from row data if companyColumnId is provided
  const companyValue = useMemo(() => {
    if (value) {
      // Direct value passed
      if (typeof value === 'string') {
        return { company_id: value, location_id: null }
      }
      return value
    }
    
    if (companyColumnId && row?.data) {
      // Look up from row data
      const rowValue = row.data[companyColumnId]
      if (typeof rowValue === 'string') {
        return { company_id: rowValue, location_id: null }
      }
      return rowValue as CompanyCellValue | null
    }
    
    return null
  }, [value, companyColumnId, row])

  // Fetch locations for the company
  const { data: locations, isLoading } = useCompanyLocations(companyValue?.company_id)

  // Find the display location
  const displayAddress = useMemo(() => {
    if (!locations || locations.length === 0) return null
    
    // If specific location selected, use that
    if (companyValue?.location_id) {
      const loc = locations.find(l => l.id === companyValue.location_id)
      return loc?.address
    }
    
    // Otherwise use primary location
    const primary = locations.find(l => l.is_primary)
    return primary?.address
  }, [locations, companyValue?.location_id])

  // Empty state
  if (!companyValue?.company_id) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">
        -
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No address found
  if (!displayAddress) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-[#9699a6] text-sm">
        მისამართი არ არის
      </div>
    )
  }

  // Display address
  return (
    <div className="h-full min-h-[36px] flex items-center gap-2 px-3">
      <MapPin className="w-4 h-4 text-[#676879] flex-shrink-0" />
      <span className="text-sm text-[#323338] truncate" title={displayAddress}>
        {displayAddress}
      </span>
    </div>
  )
}
