'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Loader2,
  Navigation,
  Route as RouteIcon,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, StatCard, EmptyState } from '@/shared/components/ui'
import {
  useRouteAnalytics,
  type OfficerWeekSummary,
} from '@/features/routing/hooks/useRouteAnalytics'
import { OfficerWeekPopup } from '@/features/routing/components/OfficerWeekPopup'
import { mondayOf, weekDays, dayKey, shortDate } from '@/features/routing/lib/week'

export default function RouteAnalyticsPage() {
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  // Officers plan their week; admins and dispatchers receive/see the analytics.
  const isManager = isAdmin || isDispatcher

  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState<OfficerWeekSummary | null>(null)

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(() => weekDays(monday), [monday])
  const weekStartKey = dayKey(monday)

  const { data, isLoading } = useRouteAnalytics(isManager ? weekStartKey : '')

  useEffect(() => {
    if (!authLoading && !isManager) router.push('/')
  }, [authLoading, isManager, router])

  const officers = data?.officers ?? []
  const fleet = useMemo(
    () => ({
      km: officers.reduce((s, o) => s + o.totalKm, 0),
      liters: officers.reduce((s, o) => s + (o.liters ?? 0), 0),
      planning: officers.filter(o => o.days > 0).length,
    }),
    [officers]
  )

  if (authLoading || !isManager) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader title={t('routeAnalytics.title')} description={t('routeAnalytics.description')} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week navigation */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-text-primary px-2 whitespace-nowrap">
            {shortDate(days[0])} – {shortDate(days[6])}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fleet totals */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label={t('routeAnalytics.planningOfficers')}
            value={fleet.planning}
            icon={Users}
            color="blue"
          />
          <StatCard
            label={t('routeAnalytics.distanceKm')}
            value={Number(fleet.km.toFixed(1))}
            icon={Navigation}
            color="purple"
          />
          <StatCard
            label={t('routeAnalytics.fuelLiters')}
            value={Number(fleet.liters.toFixed(1))}
            icon={Fuel}
            color="amber"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
          </div>
        ) : officers.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="w-16 h-16" />}
            title={t('routeAnalytics.emptyTitle')}
            description={t('routeAnalytics.emptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {officers.map(o => (
              <button
                key={o.officerId}
                type="button"
                onClick={() => setSelected(o)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-colors',
                  o.days > 0
                    ? 'border-border-light bg-bg-primary hover:border-monday-primary'
                    : 'border-border-light bg-bg-primary opacity-70 hover:opacity-100'
                )}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary font-medium flex-shrink-0">
                    {o.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{o.name}</p>
                    <p className="text-xs text-text-tertiary">
                      {o.days > 0
                        ? t('routeAnalytics.daysPlanned', { count: o.days })
                        : t('routeAnalytics.noPlan')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 text-text-secondary">
                    <Navigation className="w-3.5 h-3.5" />
                    {o.totalKm.toFixed(1)} {t('routing.km')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-text-secondary">
                    <Fuel className="w-3.5 h-3.5" />
                    {o.liters != null
                      ? `${o.liters.toFixed(1)} ${t('routeAnalytics.litersShort')}`
                      : '—'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-text-tertiary ml-auto">
                    <RouteIcon className="w-3.5 h-3.5" />
                    {o.stopCount}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <OfficerWeekPopup
          summary={selected}
          weekStart={weekStartKey}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
