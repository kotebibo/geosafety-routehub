'use client'

import { Check, Fuel, Loader2, MapPin, Navigation, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PlannerFooterProps {
  totalCompanies: number
  totalKm: number
  fuelLiters: number | null
  planningWeek: boolean
  onPlanWeek: () => void
  /** Plan lifecycle: 'draft' shows "send to admin"; else a status pill. */
  planStatus?: 'draft' | 'submitted' | 'approved'
  onSubmit?: () => void
  submitting?: boolean
}

export function PlannerFooter({
  totalCompanies,
  totalKm,
  fuelLiters,
  planningWeek,
  onPlanWeek,
  planStatus = 'draft',
  onSubmit,
  submitting,
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
      {planStatus === 'draft' ? (
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onPlanWeek}
            disabled={totalCompanies === 0 || planningWeek}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-monday-primary text-monday-primary text-sm font-medium hover:bg-monday-primary/10 disabled:opacity-50 transition-colors"
          >
            {planningWeek ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t('routing.planWeek')}
          </button>
          {onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={totalCompanies === 0 || planningWeek || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-monday-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 active:scale-[0.97] transition-all"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t('officerPlan.sendToAdmin')}
            </button>
          )}
        </div>
      ) : (
        <span
          className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            planStatus === 'approved'
              ? 'bg-green-500/15 text-green-600 border border-green-500/30'
              : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {t(
            planStatus === 'approved' ? 'officerPlan.statusApproved' : 'officerPlan.statusSubmitted'
          )}
        </span>
      )}
    </div>
  )
}
