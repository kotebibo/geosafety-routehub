'use client'

import { useRef, useEffect } from 'react'
import { Search, Building2, Loader2, X } from 'lucide-react'

interface CompanySearchResult {
  id: string
  name: string
}

interface CompanySearchProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchResults: CompanySearchResult[]
  searching: boolean
  showDropdown: boolean
  selectedCompany: CompanySearchResult | null
  onSelectCompany: (company: CompanySearchResult) => void
  onClearCompany: () => void
  onCloseDropdown: () => void
}

export function CompanySearch({
  searchQuery,
  onSearchChange,
  searchResults,
  searching,
  showDropdown,
  selectedCompany,
  onSelectCompany,
  onClearCompany,
  onCloseDropdown,
}: CompanySearchProps) {
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        onCloseDropdown()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onCloseDropdown])

  return (
    <div className="bg-bg-primary rounded-xl border border-border-light p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-monday-primary" />
        <span className="text-sm font-semibold text-text-primary">
          {'\u10D9\u10DD\u10DB\u10DE\u10D0\u10DC\u10D8\u10D0'}
        </span>
      </div>

      {selectedCompany ? (
        <div className="flex items-center justify-between bg-monday-primary/5 border border-monday-primary/20 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-monday-primary flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {selectedCompany.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClearCompany}
            className="p-1 text-text-tertiary hover:text-text-secondary flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={
                '\u10DB\u10DD\u10EB\u10D4\u10D1\u10DC\u10D4\u10D7 \u10D9\u10DD\u10DB\u10DE\u10D0\u10DC\u10D8\u10D0...'
              }
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary/30 focus:border-monday-primary"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary animate-spin" />
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-light rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
              {searchResults.map(company => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => onSelectCompany(company)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg-secondary flex items-center gap-2 border-b border-border-light last:border-0"
                >
                  <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                  <span className="truncate">{company.name}</span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-light rounded-lg shadow-lg p-3 z-20">
              <p className="text-sm text-text-secondary text-center">
                {
                  '\u10D9\u10DD\u10DB\u10DE\u10D0\u10DC\u10D8\u10D0 \u10D5\u10D4\u10E0 \u10DB\u10DD\u10D8\u10EB\u10D4\u10D1\u10DC\u10D0'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
