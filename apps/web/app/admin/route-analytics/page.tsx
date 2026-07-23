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
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui-monday/Toast'
import { StatCard, EmptyState } from '@/shared/components/ui'
import {
  useRouteAnalytics,
  useSetFuelPrices,
  type OfficerWeekSummary,
  type FuelType,
} from '@/features/routing/hooks/useRouteAnalytics'
import { OfficerWeekPopup } from '@/features/routing/components/OfficerWeekPopup'
import { AdminWeekTabs, type AdminTab } from '@/features/routing/components/analytics/AdminWeekTabs'
import { FuelBreakdownPopup } from '@/features/routing/components/analytics/FuelBreakdownPopup'
import { MonthBreakdown } from '@/features/routing/components/analytics/MonthBreakdown'
import { mondayOf, weekDays, dayKey, shortDate } from '@/features/routing/lib/week'

export default function RouteAnalyticsPage() {
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  // Officers plan their week; admins and dispatchers receive/see the analytics.
  const isManager = isAdmin || isDispatcher

  const { showToast } = useToast()
  const setFuelPrices = useSetFuelPrices()
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [tab, setTab] = useState<'overview' | AdminTab>('overview')
  const [selected, setSelected] = useState<{
    summary: OfficerWeekSummary
    weekStart: string
  } | null>(null)
  const [breakdown, setBreakdown] = useState(false)
  const [officerQuery, setOfficerQuery] = useState('')
  const [exporting, setExporting] = useState<'week' | 'month' | null>(null)
  const [priceInputs, setPriceInputs] = useState<Record<FuelType, string>>({
    petrol: '',
    diesel: '',
    gas: '',
  })

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(() => weekDays(monday), [monday])
  const weekStartKey = dayKey(monday)

  // Month view (weekly breakdown). Month name comes from the browser locale.
  const monthBase = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])
  const monthKey = `${monthBase.getFullYear()}-${String(monthBase.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = monthBase.toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' })

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
  const filteredOfficers = useMemo(() => {
    const q = officerQuery.trim().toLowerCase()
    if (!q) return officers
    return officers.filter(o => (o.name || o.email || '').toLowerCase().includes(q))
  }, [officers, officerQuery])
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
    // In month view the month export follows the selected month; otherwise it
    // uses the month the viewed week sits in.
    const mBase = period === 'month' ? monthBase : monday
    const from =
      scope === 'week' ? weekStartKey : dayKey(new Date(mBase.getFullYear(), mBase.getMonth(), 1))
    const to =
      scope === 'week'
        ? dayKey(days[6])
        : dayKey(new Date(mBase.getFullYear(), mBase.getMonth() + 1, 0))
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero — title + glass week navigation */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-monday-primary to-monday-purple p-6 shadow-lg mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="pointer-events-none absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t('routeAnalytics.title')}</h1>
                <p className="text-sm text-white/80">{t('routeAnalytics.description')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {/* Week / month toggle */}
              <div className="inline-flex self-start rounded-full bg-white/10 ring-1 ring-white/20 p-0.5 sm:self-auto">
                {(['week', 'month'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                      period === p
                        ? 'bg-white text-monday-primary'
                        : 'text-white/80 hover:text-white'
                    )}
                  >
                    {t(`routeAnalytics.period.${p}`)}
                  </button>
                ))}
              </div>
              {/* Period navigation */}
              <div className="flex items-center gap-1 self-start rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20 p-1 sm:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    period === 'week' ? setWeekOffset(w => w - 1) : setMonthOffset(w => w - 1)
                  }
                  className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-white px-2 whitespace-nowrap capitalize">
                  {period === 'week' ? `${shortDate(days[0])} – ${shortDate(days[6])}` : monthLabel}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    period === 'week' ? setWeekOffset(w => w + 1) : setMonthOffset(w => w + 1)
                  }
                  className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export + cost breakdown */}
        <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setBreakdown(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-light text-sm text-text-secondary transition-colors hover:bg-bg-hover"
          >
            <PieChart className="w-4 h-4" />
            {t('routeAnalytics.costBreakdown')}
          </button>
          <button
            type="button"
            onClick={() => exportXlsx('week')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-light text-sm text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-light text-sm text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
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
                className="w-24 px-3 py-1.5 rounded-xl border border-border-light bg-bg-primary text-sm text-text-primary transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
            className="ml-auto px-4 py-1.5 rounded-xl bg-monday-primary text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 self-center"
          >
            {t('common.save')}
          </button>
        </div>

        {/* Month view: weekly breakdown of the selected month */}
        {period === 'month' && (
          <MonthBreakdown
            month={monthKey}
            onSelect={(summary, weekStart) => setSelected({ summary, weekStart })}
          />
        )}

        {/* Tabs (week view only) */}
        {period === 'week' && (
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
        )}

        {period === 'week' && tab !== 'overview' && (
          <AdminWeekTabs weekStart={weekStartKey} tab={tab} />
        )}

        {period === 'week' && tab === 'overview' && (
          <>
            {/* Fleet totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
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

            {/* Search officers by name */}
            {officers.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                <input
                  type="text"
                  value={officerQuery}
                  onChange={e => setOfficerQuery(e.target.value)}
                  placeholder={t('routeAnalytics.searchOfficer')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border-light bg-bg-primary text-sm text-text-primary transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20"
                />
              </div>
            )}

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
            ) : filteredOfficers.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-10">
                {t('routeAnalytics.noOfficerMatch')}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredOfficers.map((o, i) => (
                  <button
                    key={o.officerId}
                    type="button"
                    onClick={() => setSelected({ summary: o, weekStart: weekStartKey })}
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}
                    className={cn(
                      'text-left rounded-2xl border p-4 shadow-sm transition-all',
                      'hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]',
                      'animate-in fade-in slide-in-from-bottom-2 duration-500',
                      o.days > 0
                        ? 'border-border-light bg-bg-primary hover:border-monday-primary/40'
                        : 'border-border-light bg-bg-primary opacity-70 hover:opacity-100'
                    )}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-monday-primary/10 flex items-center justify-center text-monday-primary font-bold flex-shrink-0">
                        {o.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">{o.name}</p>
                        <p className="text-xs text-text-tertiary">
                          {o.days > 0
                            ? t('routeAnalytics.daysPlanned', { count: o.days })
                            : t('routeAnalytics.noPlan')}
                        </p>
                      </div>
                      {o.stopCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-600 border border-green-500/30 flex-shrink-0">
                          {o.visitedCount}/{o.stopCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip icon={Navigation}>
                        {o.totalKm.toFixed(1)} {t('routing.km')}
                      </Chip>
                      <Chip icon={Fuel}>
                        {o.liters != null
                          ? `${o.liters.toFixed(1)} ${t('routeAnalytics.litersShort')}`
                          : '—'}
                      </Chip>
                      {o.cost != null && <Chip icon={Coins}>{o.cost.toFixed(1)} ₾</Chip>}
                      {o.minutes > 0 && (
                        <Chip icon={Clock}>
                          {o.minutes}
                          {t('routing.minutesShort')}
                        </Chip>
                      )}
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
          key={`${selected.summary.officerId}-${selected.weekStart}`}
          summary={selected.summary}
          weekStart={selected.weekStart}
          typePrice={selected.summary.fuelType ? (gp?.[selected.summary.fuelType] ?? null) : null}
          onClose={() => setSelected(null)}
        />
      )}

      {breakdown && <FuelBreakdownPopup officers={officers} onClose={() => setBreakdown(false)} />}
    </div>
  )
}

// Soft pill for a metric on the officer card.
function Chip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-secondary text-xs text-text-secondary">
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  )
}
