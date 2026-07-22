'use client'

import { useTranslations } from 'next-intl'
import { Clock, Coins, Fuel, Loader2, Navigation, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useMonthAnalytics,
  type FuelPrices,
  type OfficerWeekSummary,
  type WeekSlice,
} from '../../hooks/useRouteAnalytics'
import { shortDate } from '../../lib/week'

interface MonthBreakdownProps {
  month: string // YYYY-MM
  globalPrices: FuelPrices | undefined
  onSelect: (summary: OfficerWeekSummary, weekStart: string) => void
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return shortDate(new Date(y, m - 1, d))
}

// Month analytics as weekly slices — one card per week, each with fleet totals
// and a compact per-officer breakdown. Clicking an officer opens their week.
export function MonthBreakdown({ month, globalPrices, onSelect }: MonthBreakdownProps) {
  const t = useTranslations()
  const { data, isLoading } = useMonthAnalytics(month)

  if (isLoading || !data)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
      </div>
    )

  const { monthTotals, weeks } = data

  return (
    <div className="space-y-6">
      {/* Month totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <TotalCard
          icon={Navigation}
          label={t('routeAnalytics.distanceKm')}
          value={`${monthTotals.km.toFixed(1)}`}
          tint="purple"
        />
        <TotalCard
          icon={Fuel}
          label={t('routeAnalytics.fuelLiters')}
          value={`${monthTotals.liters.toFixed(1)}`}
          tint="amber"
        />
        <TotalCard
          icon={Coins}
          label={t('routeAnalytics.totalCost')}
          value={`${monthTotals.cost.toFixed(1)} ₾`}
          tint="green"
        />
        <TotalCard
          icon={Clock}
          label={t('routeAnalytics.totalTime')}
          value={`${monthTotals.minutes}`}
          tint="blue"
        />
      </div>

      {/* Weekly slices */}
      <div className="space-y-4">
        {weeks.map((week, i) => (
          <WeekSliceCard
            key={week.weekStart}
            week={week}
            index={i}
            monthLabel={`${t('routeAnalytics.period.week')} ${i + 1}`}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function WeekSliceCard({
  week,
  index,
  monthLabel,
  onSelect,
}: {
  week: WeekSlice
  index: number
  monthLabel: string
  onSelect: (summary: OfficerWeekSummary, weekStart: string) => void
}) {
  const t = useTranslations()
  const active = week.officers.filter(o => o.days > 0)

  return (
    <div
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
      className="rounded-2xl border border-border-light bg-bg-primary shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      {/* Week header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-bg-secondary/50 border-b border-border-light">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-text-primary">{monthLabel}</span>
          <span className="text-xs text-text-tertiary whitespace-nowrap">
            {fmtDate(week.weekStart)} – {fmtDate(week.weekEnd)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-text-tertiary" />
            {week.fleet.planning}
          </span>
          <span className="inline-flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-text-tertiary" />
            {week.fleet.km.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
            <Coins className="w-3.5 h-3.5 text-text-tertiary" />
            {week.fleet.cost.toFixed(1)} ₾
          </span>
        </div>
      </div>

      {/* Officer breakdown */}
      {active.length === 0 ? (
        <p className="px-4 py-4 text-xs text-text-tertiary">{t('routeAnalytics.noWeekData')}</p>
      ) : (
        <div className="divide-y divide-border-light">
          {active.map(o => (
            <button
              key={o.officerId}
              type="button"
              onClick={() => onSelect(o, week.weekStart)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-secondary/40"
            >
              <div className="w-8 h-8 rounded-xl bg-monday-primary/10 flex items-center justify-center text-monday-primary text-xs font-bold flex-shrink-0">
                {o.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-sm text-text-primary">{o.name}</span>
              <span className="hidden sm:inline text-xs text-text-tertiary whitespace-nowrap">
                {o.totalKm.toFixed(1)} {t('routing.km')}
              </span>
              <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
                {o.cost != null ? `${o.cost.toFixed(1)} ₾` : '—'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TINTS = {
  purple: 'bg-monday-purple/10 text-monday-purple',
  amber: 'bg-amber-500/10 text-amber-500',
  green: 'bg-green-500/10 text-green-600',
  blue: 'bg-bright-blue/10 text-bright-blue',
} as const

function TotalCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Navigation
  label: string
  value: string
  tint: keyof typeof TINTS
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-bg-primary p-4 shadow-sm">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', TINTS[tint])}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xl font-bold text-text-primary leading-tight">{value}</p>
      <p className="text-[11px] text-text-tertiary mt-0.5">{label}</p>
    </div>
  )
}
