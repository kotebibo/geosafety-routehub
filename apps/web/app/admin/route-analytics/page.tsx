'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Fuel,
  Loader2,
  Navigation,
  PieChart,
  Route as RouteIcon,
  Users,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui-monday/Toast'
import { PageHeader, StatCard, EmptyState } from '@/shared/components/ui'
import {
  useRouteAnalytics,
  useSetFuelPrices,
  type OfficerWeekSummary,
  type FuelType,
} from '@/features/routing/hooks/useRouteAnalytics'
import { OfficerWeekPopup } from '@/features/routing/components/OfficerWeekPopup'
import { AdminWeekTabs, type AdminTab } from '@/features/routing/components/analytics/AdminWeekTabs'
import { FuelBreakdownPopup } from '@/features/routing/components/analytics/FuelBreakdownPopup'
import { mondayOf, weekDays, dayKey, shortDate } from '@/features/routing/lib/week'

export default function RouteAnalyticsPage() {
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  // Officers plan their week; admins and dispatchers receive/see the analytics.
  const isManager = isAdmin || isDispatcher

  const { showToast } = useToast()
  const setFuelPrices = useSetFuelPrices()
  const [weekOffset, setWeekOffset] = useState(0)
  const [tab, setTab] = useState<'overview' | AdminTab>('overview')
  const [selected, setSelected] = useState<OfficerWeekSummary | null>(null)
  const [breakdown, setBreakdown] = useState(false)
  const [exporting, setExporting] = useState<'week' | 'month' | null>(null)
  const [priceInputs, setPriceInputs] = useState<Record<FuelType, string>>({
    petrol: '',
    diesel: '',
    gas: '',
  })

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(() => weekDays(monday), [monday])
  const weekStartKey = dayKey(monday)

  const { data, isLoading } = useRouteAnalytics(isManager ? weekStartKey : '')

  useEffect(() => {
    if (!authLoading && !isManager) router.push('/')
  }, [authLoading, isManager, router])

  // Seed the price inputs from the saved global prices once loaded.
  const gp = data?.globalPrices
  useEffect(() => {
    if (gp)
      setPriceInputs({
        petrol: gp.petrol != null ? String(gp.petrol) : '',
        diesel: gp.diesel != null ? String(gp.diesel) : '',
        gas: gp.gas != null ? String(gp.gas) : '',
      })
  }, [gp?.petrol, gp?.diesel, gp?.gas])

  const officers = data?.officers ?? []
  const fleet = useMemo(
    () => ({
      km: officers.reduce((s, o) => s + o.totalKm, 0),
      liters: officers.reduce((s, o) => s + (o.liters ?? 0), 0),
      cost: officers.reduce((s, o) => s + (o.cost ?? 0), 0),
      minutes: officers.reduce((s, o) => s + (o.minutes ?? 0), 0),
      planning: officers.filter(o => o.days > 0).length,
    }),
    [officers]
  )

  const saveGlobalPrices = async () => {
    const parse = (v: string): number | null => (v.trim() === '' ? null : Number(v))
    const prices = {
      petrol: parse(priceInputs.petrol),
      diesel: parse(priceInputs.diesel),
      gas: parse(priceInputs.gas),
    }
    if (Object.values(prices).some(n => n !== null && (isNaN(n) || n < 0))) {
      showToast(t('routeAnalytics.invalidPrice'), 'error')
      return
    }
    try {
      await setFuelPrices.mutateAsync(prices)
      showToast(t('routeAnalytics.priceSaved'), 'success')
    } catch (err: any) {
      showToast(err?.error || t('routeAnalytics.priceSaveFailed'), 'error')
    }
  }

  // Excel export of per-officer rows over the week or the viewed month.
  const exportXlsx = async (scope: 'week' | 'month') => {
    const from =
      scope === 'week' ? weekStartKey : dayKey(new Date(monday.getFullYear(), monday.getMonth(), 1))
    const to =
      scope === 'week'
        ? dayKey(days[6])
        : dayKey(new Date(monday.getFullYear(), monday.getMonth() + 1, 0))
    setExporting(scope)
    try {
      const res = await fetch(`/api/routing/export?from=${from}&to=${to}`)
      if (!res.ok) throw new Error()
      const { rows } = await res.json()
      const header = [
        t('inspectorRoutes.officer'),
        t('routing.org'),
        t('routing.fuelType'),
        t('routeAnalytics.daysShort'),
        t('officerPlan.objects'),
        t('myWeek.done'),
        t('routing.km'),
        t('officerPlan.fuelL'),
        '₾',
        t('routeAnalytics.totalTime'),
        t('routeAnalytics.tab.unplanned'),
      ]
      const body = (rows as any[]).map(r => [
        r.name,
        r.org ? t(`routing.org${r.org[0].toUpperCase()}${r.org.slice(1)}`) : '',
        r.fuelType ? t(`routing.fuel${r.fuelType[0].toUpperCase()}${r.fuelType.slice(1)}`) : '',
        r.days,
        r.stops,
        r.visited,
        r.km,
        r.liters ?? '',
        r.cost ?? '',
        r.minutes,
        r.unplanned,
      ])
      const ws = XLSX.utils.aoa_to_sheet([header, ...body])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Routing')
      XLSX.writeFile(wb, `routing-${scope}-${from}.xlsx`)
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setExporting(null)
    }
  }

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

        {/* Export + cost breakdown */}
        <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setBreakdown(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light text-sm text-text-secondary hover:bg-bg-hover"
          >
            <PieChart className="w-4 h-4" />
            {t('routeAnalytics.costBreakdown')}
          </button>
          <button
            type="button"
            onClick={() => exportXlsx('week')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
          >
            {exporting === 'week' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('routeAnalytics.exportWeek')}
          </button>
          <button
            type="button"
            onClick={() => exportXlsx('month')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
          >
            {exporting === 'month' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('routeAnalytics.exportMonth')}
          </button>
        </div>

        {/* Global fuel prices per type — an officer inherits the price for the
            fuel type set on their profile (unless they have an override). */}
        <div className="flex items-end gap-3 mb-6 flex-wrap bg-bg-primary border border-border-light rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-text-secondary self-center">
            <Fuel className="w-4 h-4 text-text-tertiary" />
            {t('routeAnalytics.fuelPrice')}
          </div>
          {(['petrol', 'diesel', 'gas'] as FuelType[]).map(type => (
            <div key={type} className="flex flex-col gap-1">
              <label className="text-xs text-text-tertiary">
                {t(`routing.fuel${type[0].toUpperCase()}${type.slice(1)}`)}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceInputs[type]}
                onChange={e => setPriceInputs(prev => ({ ...prev, [type]: e.target.value }))}
                placeholder="0.00"
                className="w-24 px-3 py-1.5 rounded-lg border border-border-light bg-bg-primary text-sm text-text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          ))}
          <span className="text-sm text-text-tertiary self-center">
            {t('routeAnalytics.perLiter')}
          </span>
          <button
            type="button"
            onClick={saveGlobalPrices}
            disabled={setFuelPrices.isPending}
            className="ml-auto px-4 py-1.5 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 self-center"
          >
            {t('common.save')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-border-light overflow-x-auto">
          {(['overview', 'requests', 'unplanned', 'deferred'] as const).map(tb => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                tab === tb
                  ? 'border-monday-primary text-monday-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {t(`routeAnalytics.tab.${tb}`)}
            </button>
          ))}
        </div>

        {tab !== 'overview' && <AdminWeekTabs weekStart={weekStartKey} tab={tab} />}

        {tab === 'overview' && (
          <>
            {/* Fleet totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              <StatCard
                label={t('routeAnalytics.totalCost')}
                value={Number(fleet.cost.toFixed(1))}
                icon={Coins}
                color="green"
              />
              <StatCard
                label={t('routeAnalytics.totalTime')}
                value={fleet.minutes}
                icon={Clock}
                color="blue"
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
                      {o.cost != null && (
                        <span className="inline-flex items-center gap-1 text-text-secondary">
                          <Coins className="w-3.5 h-3.5" />
                          {o.cost.toFixed(1)} ₾
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-text-tertiary ml-auto">
                        <RouteIcon className="w-3.5 h-3.5" />
                        {o.stopCount}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <OfficerWeekPopup
          summary={selected}
          weekStart={weekStartKey}
          typePrice={selected.fuelType ? (gp?.[selected.fuelType] ?? null) : null}
          onClose={() => setSelected(null)}
        />
      )}

      {breakdown && <FuelBreakdownPopup officers={officers} onClose={() => setBreakdown(false)} />}
    </div>
  )
}
