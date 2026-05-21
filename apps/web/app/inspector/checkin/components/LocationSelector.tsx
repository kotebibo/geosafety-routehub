'use client'

import { MapPin, Check, Loader2 } from 'lucide-react'
import type { CompanyLocation } from '@/types/company'

interface LocationSelectorProps {
  locations: CompanyLocation[]
  selectedLocationId: string | null
  onSelectLocation: (id: string) => void
  loadingLocations: boolean
}

export function LocationSelector({
  locations,
  selectedLocationId,
  onSelectLocation,
  loadingLocations,
}: LocationSelectorProps) {
  return (
    <div className="bg-bg-primary rounded-xl border border-border-light p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-monday-primary" />
        <span className="text-sm font-semibold text-text-primary">
          {'\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D0'}
        </span>
      </div>

      {loadingLocations ? (
        <div className="flex items-center gap-2 text-sm text-text-tertiary py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{'\u10D8\u10E2\u10D5\u10D8\u10E0\u10D7\u10D4\u10D1\u10D0...'}</span>
        </div>
      ) : locations.length === 0 ? (
        <p className="text-sm text-text-secondary py-1">
          {
            '\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D4\u10D1\u10D8 \u10D0\u10E0 \u10DB\u10DD\u10D8\u10EB\u10D4\u10D1\u10DC\u10D0 \u2014 GPS \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8 \u10D9\u10DD\u10DB\u10DE\u10D0\u10DC\u10D8\u10D0\u10D6\u10D4'
          }
        </p>
      ) : (
        <div className="space-y-2">
          {locations.map(loc => (
            <button
              key={loc.id}
              type="button"
              onClick={() => onSelectLocation(loc.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                selectedLocationId === loc.id
                  ? 'border-monday-primary bg-monday-primary/5 ring-1 ring-monday-primary/30'
                  : 'border-border-light hover:bg-bg-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-text-primary truncate">{loc.name}</span>
                    {loc.is_primary && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                        {'\u10DB\u10D7\u10D0\u10D5\u10D0\u10E0\u10D8'}
                      </span>
                    )}
                    {!loc.lat && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                        {'\u10D0\u10EE\u10D0\u10DA\u10D8'}
                      </span>
                    )}
                  </div>
                  {loc.address && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{loc.address}</p>
                  )}
                </div>
                {selectedLocationId === loc.id && (
                  <Check className="w-4 h-4 text-monday-primary flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
