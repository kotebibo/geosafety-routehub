'use client'

import { MapPinned, Navigation } from 'lucide-react'
import type { LocationCheckin } from '@/types/checkin'

interface CheckinsCardProps {
  checkins: LocationCheckin[]
}

export function CheckinsCard({ checkins }: CheckinsCardProps) {
  if (checkins.length === 0) return null

  return (
    <div className="bg-bg-primary border border-border-light rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center gap-2">
        <MapPinned className="w-4.5 h-4.5 text-text-tertiary" />
        <h2 className="font-semibold text-text-primary">
          {'\u10D1\u10DD\u10DA\u10DD \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D4\u10D1\u10D8'}
        </h2>
        <span className="text-xs text-text-tertiary font-medium bg-bg-tertiary px-1.5 py-0.5 rounded">
          {checkins.length}
        </span>
      </div>
      <div className="divide-y divide-border-light">
        {checkins.map(checkin => (
          <div key={checkin.id} className="px-6 py-3 flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                checkin.location_updated
                  ? 'bg-green-100 text-green-600'
                  : 'bg-bg-tertiary text-text-tertiary'
              }`}
            >
              <MapPinned className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {checkin.inspector_name}
                </span>
                {checkin.location_name && (
                  <span className="text-xs text-text-tertiary">
                    {'\u2014'} {checkin.location_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-text-tertiary mt-0.5">
                <span>
                  {new Date(checkin.created_at).toLocaleDateString('ka-GE', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {checkin.distance_from_location != null && (
                  <span
                    className={`font-medium ${
                      checkin.distance_from_location < 100
                        ? 'text-green-600'
                        : checkin.distance_from_location < 500
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {checkin.distance_from_location}
                    {'\u10DB'}
                  </span>
                )}
              </div>
            </div>
            {checkin.location_updated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                <Navigation className="w-3 h-3" />
                GPS {'\u10D2\u10D0\u10DC\u10D0\u10EE\u10DA\u10D3\u10D0'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
