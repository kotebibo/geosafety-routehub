'use client'

import { ExternalLink, Loader2, MapPin, Route as RouteIcon, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { shortDate, DAY_LABELS_KA } from '../../lib/week'
import { googleMapsDirUrl } from '../../lib/google-maps'
import type { DayResult } from './types'

interface DayCardProps {
  date: Date
  dayIndex: number
  ids: string[]
  result: DayResult | undefined
  isSelected: boolean
  saving: boolean
  nameOf: (itemId: string) => string
  coordsOf: (itemId: string) => { lat: number; lng: number } | null
  start: { lat: number; lng: number } | null
  onSelect: () => void
  onRemove: (itemId: string) => void
  onSaveDay: () => void
  onViewMap: () => void
}

export function DayCard({
  date,
  dayIndex,
  ids,
  result,
  isSelected,
  saving,
  nameOf,
  coordsOf,
  start,
  onSelect,
  onRemove,
  onSaveDay,
  onViewMap,
}: DayCardProps) {
  const t = useTranslations()
  // Home → objects (in order) → home, straight to Google Maps driving.
  const gmapsUrl = googleMapsDirUrl([
    ...(start ? [start] : []),
    ...ids.map(coordsOf).filter((c): c is { lat: number; lng: number } => c != null),
    ...(start ? [start] : []),
  ])
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-2xl border p-3 cursor-pointer transition-all min-h-[120px]',
        isSelected
          ? 'border-monday-primary/60 bg-gradient-to-br from-monday-primary/10 to-monday-purple/5 ring-2 ring-monday-primary/20 shadow-md'
          : 'border-border-light bg-bg-primary hover:border-monday-primary/40 hover:shadow-sm'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0',
              isSelected ? 'bg-monday-primary text-white' : 'bg-bg-tertiary text-text-secondary'
            )}
          >
            {DAY_LABELS_KA[dayIndex]}
          </span>
          <span className="text-xs text-text-tertiary">{shortDate(date)}</span>
        </div>
        {ids.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-monday-primary/10 text-monday-primary flex-shrink-0">
            {ids.length}
          </span>
        )}
      </div>

      {ids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <MapPin className="w-5 h-5 text-text-tertiary/50 mb-1" />
          <p className="text-xs text-text-tertiary">{t('routing.dayEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {ids.map((id, idx) => (
            <div key={id} className="flex items-center gap-1.5 text-xs text-text-primary">
              <span className="w-4 h-4 rounded-full bg-monday-primary text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 truncate">{nameOf(id)}</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onRemove(id)
                }}
                className="text-text-tertiary hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border-light">
            {result ? (
              <span className="text-[11px] text-green-600 font-medium">
                {result.km.toFixed(1)} {t('routing.km')}
              </span>
            ) : (
              <span className="text-[11px] text-text-tertiary">—</span>
            )}
            <div className="flex items-center gap-2.5">
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {t('routing.openInGoogleMaps')}
                </a>
              )}
              {result && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onViewMap()
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  {t('routing.viewOnMap')}
                </button>
              )}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onSaveDay()
                }}
                disabled={saving}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RouteIcon className="w-3 h-3" />
                )}
                {t('routing.saveDay')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
