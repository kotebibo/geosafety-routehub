'use client'

import { Loader2, MapPin, Route as RouteIcon, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { shortDate, DAY_LABELS_KA } from '../../lib/week'
import type { DayResult } from './types'

interface DayCardProps {
  date: Date
  dayIndex: number
  ids: string[]
  result: DayResult | undefined
  isSelected: boolean
  saving: boolean
  nameOf: (itemId: string) => string
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
  onSelect,
  onRemove,
  onSaveDay,
  onViewMap,
}: DayCardProps) {
  const t = useTranslations()
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-2xl border p-3 cursor-pointer transition-all min-h-[120px]',
        isSelected
          ? 'border-monday-primary bg-monday-primary/5 shadow-sm'
          : 'border-border-light bg-bg-primary hover:border-border-medium hover:shadow-sm'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-text-primary">{DAY_LABELS_KA[dayIndex]}</span>
          <span className="text-xs text-text-tertiary ml-1.5">{shortDate(date)}</span>
        </div>
        {ids.length > 0 && (
          <span className="text-[11px] text-text-tertiary">
            {t('routing.companiesCount', { count: ids.length })}
          </span>
        )}
      </div>

      {ids.length === 0 ? (
        <p className="text-xs text-text-tertiary py-2">{t('routing.dayEmpty')}</p>
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
