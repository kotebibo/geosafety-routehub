'use client'

import { Check, Loader2, MapPin, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { DAY_LABELS_KA } from '../../lib/week'
import type { RoutingItem } from '../../hooks/useRoutingData'

interface CompanyPoolProps {
  items: RoutingItem[]
  isLoading: boolean
  selectedDay: number
  dayOfItem: (itemId: string) => number
  hasCoords: (itemId: string) => boolean
  geocodable: RoutingItem[]
  geocoding: boolean
  geoProgress: { done: number; total: number }
  onToggle: (itemId: string) => void
  onGeocode: () => void
}

export function CompanyPool({
  items,
  isLoading,
  selectedDay,
  dayOfItem,
  hasCoords,
  geocodable,
  geocoding,
  geoProgress,
  onToggle,
  onGeocode,
}: CompanyPoolProps) {
  const t = useTranslations()
  return (
    <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border-light flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-border-light flex-shrink-0">
        <p className="text-sm font-medium text-text-primary">
          {t('routing.assignTo', { day: DAY_LABELS_KA[selectedDay] })}
        </p>
        <p className="text-xs text-text-tertiary">{t('routing.clickToAssign')}</p>
        {geocodable.length > 0 && (
          <button
            type="button"
            onClick={onGeocode}
            disabled={geocoding}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/30 text-xs font-medium hover:bg-orange-500/20 disabled:opacity-60 transition-colors"
          >
            {geocoding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {geoProgress.done}/{geoProgress.total}
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5" />
                {t('routing.geocodeAddresses', { count: geocodable.length })}
              </>
            )}
          </button>
        )}
      </div>
      <div className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
          </div>
        ) : (
          items.map(ri => {
            const assignedDay = dayOfItem(ri.item.id)
            const onSelected = assignedDay === selectedDay
            const coords = hasCoords(ri.item.id)
            return (
              <button
                key={ri.item.id}
                type="button"
                onClick={() => onToggle(ri.item.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors',
                  onSelected
                    ? 'bg-monday-primary/10 border border-monday-primary/30'
                    : 'hover:bg-bg-hover border border-transparent'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    onSelected
                      ? 'bg-monday-primary border-monday-primary text-white'
                      : 'border-border-medium'
                  )}
                >
                  {onSelected ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3 text-text-tertiary" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-text-primary truncate">{ri.item.name}</span>
                  {!coords && (
                    <span className="block text-[10px] text-orange-500">
                      {t('routing.noCoords')}
                    </span>
                  )}
                </span>
                {assignedDay >= 0 && assignedDay !== selectedDay && (
                  <span className="text-[10px] text-text-tertiary flex-shrink-0">
                    {DAY_LABELS_KA[assignedDay]}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
