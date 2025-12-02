'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useServiceTypes } from '@/hooks/useServiceTypes'
import { cn } from '@/lib/utils'
import { Search, X, Shield, Flame, Leaf, Utensils, HardHat, Zap, Gauge } from 'lucide-react'

interface ServiceTypePickerProps {
  value?: string | null
  onChange: (serviceTypeId: string | null) => void
  onClose: () => void
  placeholder?: string
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

export function ServiceTypePicker({ value, onChange, onClose, placeholder = 'Search service types...' }: ServiceTypePickerProps) {
  const [search, setSearch] = useState('')
  const { serviceTypes, loading } = useServiceTypes()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredTypes = serviceTypes?.filter((type) => {
    const name = (type.name || '').toLowerCase()
    const nameKa = (type.name_ka || '').toLowerCase()
    const searchLower = search.toLowerCase()
    return name.includes(searchLower) || nameKa.includes(searchLower)
  }) || []

  const getIcon = (inspectorType?: string) => {
    return SERVICE_ICONS[inspectorType || ''] || Shield
  }

  const getColor = (inspectorType?: string) => {
    return SERVICE_COLORS[inspectorType || ''] || '#579bfc'
  }

  return (
    <div className="absolute top-0 left-0 w-full min-w-[280px] bg-white rounded-md shadow-lg border border-border-light z-50 overflow-hidden">
      {/* Search Input */}
      <div className="p-2 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-border-light rounded focus:outline-none focus:border-monday-primary"
          />
        </div>
      </div>

      {/* Clear Selection */}
      {value && (
        <div className="px-2 py-1 border-b border-border-light">
          <button
            onClick={() => {
              onChange(null)
              onClose()
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover rounded transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear selection</span>
          </button>
        </div>
      )}

      {/* Service Type List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No service types found
          </div>
        ) : (
          <div className="py-1">
            {filteredTypes.map((type) => {
              const IconComponent = getIcon(type.required_inspector_type)
              const color = getColor(type.required_inspector_type)
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    onChange(type.id)
                    onClose()
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                    value === type.id && 'bg-bg-selected'
                  )}
                >
                  {/* Service Icon */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>

                  {/* Service Info */}
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="font-medium text-text-primary truncate">
                      {type.name}
                    </div>
                    <div className="text-xs text-text-tertiary truncate">
                      {type.name_ka}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {value === type.id && (
                    <svg className="w-5 h-5 text-monday-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
