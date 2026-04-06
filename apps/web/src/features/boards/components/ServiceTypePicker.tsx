'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useServiceTypes } from '@/hooks/useServiceTypes'
import { cn } from '@/lib/utils'
import { Search, X, Check, Shield, HardHat, Utensils, Scale, Briefcase, Leaf } from 'lucide-react'

interface ServiceTypePickerProps {
  value?: string[] | string | null
  onChange: (serviceTypeIds: string[]) => void
  onClose: () => void
  placeholder?: string
  positionStyle?: React.CSSProperties
}

// Icon mapping for service types
const SERVICE_ICONS: Record<string, React.ElementType> = {
  labor_safety: HardHat,
  labor_rights: Scale,
  food_safety: Utensils,
  personal_data: Shield,
  legal_outsource: Briefcase,
  // Legacy mappings
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
  // Legacy mappings
  fire_safety: '#e2445c',
  environmental: '#00c875',
  food_safety_legacy: '#579bfc',
  construction: '#784bd1',
}

// Normalize value to string array
function normalizeValue(value: string[] | string | null | undefined): string[] {
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

export function ServiceTypePicker({
  value,
  onChange,
  onClose,
  placeholder = 'Search services...',
  positionStyle,
}: ServiceTypePickerProps) {
  const [search, setSearch] = useState('')
  const { serviceTypes, loading } = useServiceTypes()
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = normalizeValue(value)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredTypes =
    serviceTypes?.filter(type => {
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

  const handleToggle = (typeId: string) => {
    if (selected.includes(typeId)) {
      onChange(selected.filter(id => id !== typeId))
    } else {
      onChange([...selected, typeId])
    }
  }

  return (
    <div
      style={positionStyle}
      className={cn(
        'min-w-[280px] bg-bg-primary rounded-md shadow-lg border border-border-light z-[9999] overflow-hidden',
        positionStyle ? 'fixed w-[300px]' : 'absolute top-0 left-0 w-full'
      )}
    >
      {/* Search Input */}
      <div className="p-2 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-2 py-1.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded focus:outline-none focus:border-monday-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Selected count + clear */}
      {selected.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border-light flex items-center justify-between">
          <span className="text-xs text-text-secondary">{selected.length} selected</span>
          <button
            onClick={() => onChange([])}
            className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
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
            {filteredTypes.map(type => {
              const IconComponent = getIcon(type.required_inspector_type)
              const color = getColor(type.required_inspector_type)
              const isSelected = selected.includes(type.id)
              return (
                <button
                  key={type.id}
                  onClick={() => handleToggle(type.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                    isSelected && 'bg-bg-selected'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'border-monday-primary bg-monday-primary'
                        : 'border-border-light bg-bg-primary'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Service Icon */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <IconComponent className="w-3.5 h-3.5 text-white" />
                  </div>

                  {/* Service Info */}
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="font-medium text-text-primary truncate">{type.name_ka}</div>
                    <div className="text-xs text-text-tertiary truncate">{type.name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Done button */}
      <div className="p-2 border-t border-border-light">
        <button
          onClick={onClose}
          className="w-full py-1.5 text-sm font-medium text-white bg-monday-primary rounded hover:bg-monday-primary-hover transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
