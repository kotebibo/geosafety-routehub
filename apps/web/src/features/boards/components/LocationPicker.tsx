/**
 * LocationPicker Component
 * Dropdown to select a location for a company in boards
 */

'use client'

import React, { useState, useRef, useEffect, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { Search, X, MapPin, Star, ChevronLeft } from 'lucide-react'
import type { CompanyLocation } from '@/types/company'

interface LocationPickerProps {
  companyId: string
  companyName: string
  locations: CompanyLocation[]
  value?: string | null  // location_id
  onChange: (locationId: string | null) => void
  onBack: () => void
  onClose: () => void
  /** Fixed position style when rendered via portal */
  positionStyle?: CSSProperties
}

export function LocationPicker({
  companyId,
  companyName,
  locations,
  value,
  onChange,
  onBack,
  onClose,
  positionStyle,
}: LocationPickerProps) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredLocations = locations.filter((location) => {
    const name = (location.name || '').toLowerCase()
    const address = (location.address || '').toLowerCase()
    const searchLower = search.toLowerCase()
    return name.includes(searchLower) || address.includes(searchLower)
  })

  // Get primary location
  const primaryLocation = locations.find(loc => loc.is_primary)

  return (
    <div
      style={positionStyle}
      className={cn(
        'min-w-[300px] bg-white rounded-md shadow-lg border border-border-light z-[9999] overflow-hidden',
        positionStyle ? 'fixed w-[300px]' : 'absolute top-0 left-0 w-full'
      )}
    >
      {/* Header with back button */}
      <div className="px-3 py-2 border-b border-border-light bg-gray-50">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>უკან</span>
        </button>
        <div className="mt-1 font-medium text-gray-900 truncate">{companyName}</div>
        <div className="text-xs text-gray-500">აირჩიეთ ლოკაცია ({locations.length})</div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ლოკაციის ძებნა..."
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-border-light rounded focus:outline-none focus:border-monday-primary"
          />
        </div>
      </div>

      {/* Use Primary Option */}
      {primaryLocation && (
        <div className="px-2 py-1 border-b border-border-light">
          <button
            onClick={() => {
              onChange(null)  // null means use primary
              onClose()
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors',
              value === null 
                ? 'bg-yellow-50 text-yellow-800' 
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span>მთავარი ლოკაციის გამოყენება</span>
            {value === null && (
              <svg className="w-4 h-4 ml-auto text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Location List */}
      <div className="max-h-48 overflow-y-auto">
        {filteredLocations.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-text-tertiary">
            ლოკაცია არ მოიძებნა
          </div>
        ) : (
          <div className="py-1">
            {filteredLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => {
                  onChange(location.id)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                  value === location.id && 'bg-bg-selected'
                )}
              >
                {/* Location Icon */}
                <div className={cn(
                  'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5',
                  location.is_primary ? 'bg-yellow-100' : 'bg-gray-100'
                )}>
                  <MapPin className={cn(
                    'w-3.5 h-3.5',
                    location.is_primary ? 'text-yellow-600' : 'text-gray-500'
                  )} />
                </div>

                {/* Location Info */}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-text-primary truncate">
                      {location.name}
                    </span>
                    {location.is_primary && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    {location.address}
                  </div>
                </div>

                {/* Selected Indicator */}
                {value === location.id && (
                  <svg className="w-5 h-5 text-monday-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
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
