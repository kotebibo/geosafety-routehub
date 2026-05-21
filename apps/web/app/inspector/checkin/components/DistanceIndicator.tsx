'use client'

import { CheckCircle2, ShieldAlert, Navigation } from 'lucide-react'
import type { CompanyLocation } from '@/types/company'

interface DistanceIndicatorProps {
  selectedLocationId: string | null
  distanceToLocation: number | null
  radiusMeters: number
  locations: CompanyLocation[]
}

export function DistanceIndicator({
  selectedLocationId,
  distanceToLocation,
  radiusMeters,
  locations,
}: DistanceIndicatorProps) {
  if (!selectedLocationId) return null

  // Distance available - show radius indicator
  if (distanceToLocation !== null) {
    const withinRadius = distanceToLocation <= radiusMeters

    return (
      <div
        className={`rounded-xl border-2 p-4 flex items-center gap-3 ${
          withinRadius ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
        }`}
      >
        {withinRadius ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                {'\u10E0\u10D0\u10D3\u10D8\u10E3\u10E1\u10E8\u10D8 \u10EE\u10D0\u10E0\u10D7 \u2014'}{' '}
                {distanceToLocation}
                {'\u10DB'}
              </p>
              <p className="text-xs text-green-600">
                {
                  '\u10E8\u10D4\u10D2\u10D8\u10EB\u10DA\u10D8\u10D0\u10D7 \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8\u10E1 \u10D2\u10D0\u10D9\u10D4\u10D7\u10D4\u10D1\u10D0'
                }
              </p>
            </div>
          </>
        ) : (
          <>
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {
                  '\u10E0\u10D0\u10D3\u10D8\u10E3\u10E1\u10D8\u10E1 \u10D2\u10D0\u10E0\u10D4\u10D7 \u2014'
                }{' '}
                {distanceToLocation}
                {'\u10DB'}
              </p>
              <p className="text-xs text-red-600">
                {
                  '\u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8\u10E1\u10D7\u10D5\u10D8\u10E1 \u10E1\u10D0\u10ED\u10D8\u10E0\u10DD\u10D0'
                }{' '}
                {radiusMeters}
                {
                  '\u10DB \u10E0\u10D0\u10D3\u10D8\u10E3\u10E1\u10E8\u10D8 \u10E7\u10DD\u10E4\u10DC\u10D0'
                }
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  // New location notice (no coordinates yet)
  const selectedLocation = locations.find(l => l.id === selectedLocationId)
  if (selectedLocation && !selectedLocation.lat) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">
            {'\u10D0\u10EE\u10D0\u10DA\u10D8 \u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D0'}
          </p>
          <p className="text-xs text-blue-600">
            {
              '\u10D0\u10DB \u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D0\u10E1 \u10EF\u10D4\u10E0 \u10D0\u10E0 \u10D0\u10E5\u10D5\u10E1 GPS \u10D9\u10DD\u10DD\u10E0\u10D3\u10D8\u10DC\u10D0\u10E2\u10D4\u10D1\u10D8. \u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8 \u10D0\u10D5\u10E2\u10DD\u10DB\u10D0\u10E2\u10E3\u10E0\u10D0\u10D3 \u10D3\u10D0\u10D0\u10E4\u10D8\u10E5\u10E1\u10D8\u10E0\u10D4\u10D1\u10E1 \u10DB\u10D0\u10E1.'
            }
          </p>
        </div>
      </div>
    )
  }

  return null
}
