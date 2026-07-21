'use client'

import { Check, Fuel, Loader2, MapPin, Navigation } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PlannerFooterProps {
  totalCompanies: number
  totalKm: number
  fuelLiters: number | null
  planningWeek: boolean
  onPlanWeek: () => void
}

export function PlannerFooter({
  totalCompanies,
  totalKm,
  fuelLiters,
  planningWeek,
  onPlanWeek,
}: PlannerFooterProps) {
  const t = useTranslations()
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-t border-border-light flex-shrink-0 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm">
        <MapPin className="w-4 h-4 text-text-tertiary" />
        <span className="text-text-secondary">
          {t('routing.weekCompanies', { count: totalCompanies })}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <Navigation className="w-4 h-4 text-text-tertiary" />
        <span className="text-text-secondary">
          {totalKm.toFixed(1)} {t('routing.km')}
        </span>
      </div>
      {fuelLiters !== null && (
        <div className="flex items-center gap-1.5 text-sm">
          <Fuel className="w-4 h-4 text-monday-primary" />
          <span className="font-medium text-text-primary">
            {t('routing.fuelLiters', { liters: fuelLiters.toFixed(1) })}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onPlanWeek}
        disabled={totalCompanies === 0 || planningWeek}
        className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {planningWeek ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        {t('routing.planWeek')}
      </button>
    </div>
  )
}
