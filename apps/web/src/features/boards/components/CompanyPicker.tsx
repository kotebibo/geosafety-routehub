/**
 * CompanyPicker Component
 * Two-step picker: Select company, then select location (if multiple locations)
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Search, X, Building2, MapPin, ChevronRight } from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import { LocationPicker } from './LocationPicker'
import type { CompanyLocation, CompanyCellValue } from '@/types/company'

interface Company {
  id: string
  name: string
  address?: string
  location_count?: number
  primary_location_address?: string | null
}

interface CompanyPickerProps {
  value?: CompanyCellValue | string | null  // Support both old (string) and new (object) format
  onChange: (value: CompanyCellValue | null) => void
  onClose: () => void
  placeholder?: string
  companies?: Company[]  // Optional: pass companies directly
}

export function CompanyPicker({ 
  value, 
  onChange, 
  onClose, 
  placeholder = 'კომპანიის ძებნა...',
  companies: propCompanies
}: CompanyPickerProps) {
  const [search, setSearch] = useState('')
  const [companies, setCompanies] = useState<Company[]>(propCompanies || [])
  const [loading, setLoading] = useState(!propCompanies)
  const [step, setStep] = useState<'company' | 'location'>('company')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse value - handle both string (legacy) and object formats
  const parsedValue: CompanyCellValue | null = typeof value === 'string' 
    ? { company_id: value, location_id: null }
    : value || null

  // Load companies on mount
  useEffect(() => {
    if (!propCompanies) {
      loadCompanies()
    }
  }, [propCompanies])

  useEffect(() => {
    if (step === 'company') {
      inputRef.current?.focus()
    }
  }, [step])

  async function loadCompanies() {
    try {
      setLoading(true)
      const data = await companiesService.getAllWithLocationCount()
      setCompanies(data)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCompanySelect(company: Company) {
    // If company has multiple locations, show location picker
    if (company.location_count && company.location_count > 1) {
      setSelectedCompany(company)
      setLoadingLocations(true)
      try {
        const locs = await companiesService.locations.getByCompanyId(company.id)
        setLocations(locs)
        setStep('location')
      } catch (error) {
        console.error('Error loading locations:', error)
        // Fallback: just use company without location
        onChange({ company_id: company.id, location_id: null })
        onClose()
      } finally {
        setLoadingLocations(false)
      }
    } else {
      // Single location or no locations - just select company
      onChange({ company_id: company.id, location_id: null })
      onClose()
    }
  }

  function handleLocationSelect(locationId: string | null) {
    if (selectedCompany) {
      onChange({ company_id: selectedCompany.id, location_id: locationId })
    }
    onClose()
  }

  function handleBack() {
    setStep('company')
    setSelectedCompany(null)
    setLocations([])
  }

  function handleClear() {
    onChange(null)
    onClose()
  }

  const filteredCompanies = companies.filter((company) => {
    const name = (company.name || '').toLowerCase()
    const address = (company.primary_location_address || company.address || '').toLowerCase()
    const searchLower = search.toLowerCase()
    return name.includes(searchLower) || address.includes(searchLower)
  })

  // If showing location picker
  if (step === 'location' && selectedCompany) {
    if (loadingLocations) {
      return (
        <div className="absolute top-0 left-0 w-full min-w-[300px] bg-white rounded-md shadow-lg border border-border-light z-50 overflow-hidden">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )
    }

    return (
      <LocationPicker
        companyId={selectedCompany.id}
        companyName={selectedCompany.name}
        locations={locations}
        value={parsedValue?.company_id === selectedCompany.id ? parsedValue.location_id : null}
        onChange={handleLocationSelect}
        onBack={handleBack}
        onClose={onClose}
      />
    )
  }

  // Company picker (step 1)
  return (
    <div className="absolute top-0 left-0 w-full min-w-[300px] bg-white rounded-md shadow-lg border border-border-light z-50 overflow-hidden">
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
      {parsedValue && (
        <div className="px-2 py-1 border-b border-border-light">
          <button
            onClick={handleClear}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover rounded transition-colors"
          >
            <X className="w-4 h-4" />
            <span>გასუფთავება</span>
          </button>
        </div>
      )}

      {/* Company List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            კომპანია არ მოიძებნა
          </div>
        ) : (
          <div className="py-1">
            {filteredCompanies.map((company) => {
              const isSelected = parsedValue?.company_id === company.id
              const hasMultipleLocations = (company.location_count || 0) > 1
              const displayAddress = company.primary_location_address || company.address

              return (
                <button
                  key={company.id}
                  onClick={() => handleCompanySelect(company)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-hover transition-colors',
                    isSelected && 'bg-bg-selected'
                  )}
                >
                  {/* Company Icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-[#6161ff] flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {company.name || 'უსახელო კომპანია'}
                      </span>
                      {hasMultipleLocations && (
                        <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {company.location_count} ლოკაცია
                        </span>
                      )}
                    </div>
                    {displayAddress && (
                      <div className="flex items-center gap-1 text-xs text-text-tertiary truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{displayAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow for multi-location or checkmark for selected */}
                  {hasMultipleLocations ? (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : isSelected ? (
                    <svg className="w-5 h-5 text-monday-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
