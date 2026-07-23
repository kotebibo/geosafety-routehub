'use client'

import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Fuel, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { OfficerWeekSummary, FuelType } from '../../hooks/useRouteAnalytics'

interface FuelBreakdownPopupProps {
  officers: OfficerWeekSummary[]
  onClose: () => void
}

const TYPES: FuelType[] = ['petrol', 'diesel', 'gas']

// Breakdown of the week's fleet cost: per fuel type (how many people, km,
// liters, ₾) + a per-officer line. Opened from the total-cost card.
export function FuelBreakdownPopup({ officers, onClose }: FuelBreakdownPopupProps) {
  const t = useTranslations()

  const byType = useMemo(() => {
    const active = officers.filter(o => o.totalKm > 0)
    return TYPES.map(type => {
      const rows = active.filter(o => o.fuelType === type)
      return {
        type,
        people: rows.length,
        km: rows.reduce((s, o) => s + o.totalKm, 0),
        liters: rows.reduce((s, o) => s + (o.liters ?? 0), 0),
        cost: rows.reduce((s, o) => s + (o.cost ?? 0), 0),
      }
    }).filter(g => g.people > 0)
  }, [officers])

  const active = officers.filter(o => o.totalKm > 0)

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">
              {t('routeAnalytics.costBreakdown')}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Per fuel type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {byType.map(g => (
              <div
                key={g.type}
                className="rounded-xl bg-bg-secondary border border-border-light p-3"
              >
                <p className="text-xs font-semibold text-text-primary mb-1">
                  {t(`routing.fuel${g.type[0].toUpperCase()}${g.type.slice(1)}`)}
                </p>
                <p className="text-[11px] text-text-tertiary">
                  {t('routeAnalytics.peopleCount', { count: g.people })}
                </p>
                <div className="mt-1.5 text-sm font-bold text-text-primary">
                  {g.cost.toFixed(1)} ₾
                </div>
                <p className="text-[11px] text-text-tertiary">
                  {g.km.toFixed(0)} {t('routing.km')} · {g.liters.toFixed(1)}{' '}
                  {t('officerPlan.fuelL')}
                </p>
              </div>
            ))}
          </div>

          {/* Per officer */}
          <div className="rounded-xl border border-border-light overflow-hidden">
            {active.map(o => (
              <div
                key={o.officerId}
                className="flex items-center gap-2 px-3 py-2 text-sm border-b border-border-light last:border-0"
              >
                <span className="flex-1 truncate text-text-primary">{o.name}</span>
                {o.fuelType && (
                  <span className="text-[11px] text-text-tertiary">
                    {t(`routing.fuel${o.fuelType[0].toUpperCase()}${o.fuelType.slice(1)}`)}
                  </span>
                )}
                <span className="text-xs text-text-secondary w-20 text-right">
                  {o.totalKm.toFixed(1)} {t('routing.km')}
                </span>
                <span className="text-xs font-medium text-text-primary w-16 text-right">
                  {o.cost != null ? `${o.cost.toFixed(1)} ₾` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
