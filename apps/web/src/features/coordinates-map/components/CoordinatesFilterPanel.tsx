'use client'

import { Search, X, MapPin, RefreshCw } from 'lucide-react'

interface CoordinatesFilterPanelProps {
  inspectors: string[]
  selectedInspector: string
  onInspectorChange: (value: string) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  totalCount: number
  filteredCount: number
  lastUpdated: Date | null
  isLoading: boolean
}

export function CoordinatesFilterPanel({
  inspectors,
  selectedInspector,
  onInspectorChange,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  lastUpdated,
  isLoading,
}: CoordinatesFilterPanelProps) {
  return (
    <div className="w-72 border-r border-border-primary bg-bg-primary flex flex-col h-full">
      <div className="p-4 border-b border-border-primary">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          კოორდინატები
        </h2>
        <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
          <span>
            {filteredCount} / {totalCount}
          </span>
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
        </div>
        {lastUpdated && (
          <div className="text-[10px] text-text-tertiary mt-1">
            განახლდა: {lastUpdated.toLocaleTimeString('ka-GE')}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="ძიება..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-border-primary rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">ინსპექტორი</label>
          <select
            value={selectedInspector}
            onChange={e => onInspectorChange(e.target.value)}
            className="w-full py-1.5 px-2 text-sm border border-border-primary rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">ყველა ({totalCount})</option>
            {inspectors.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
