import { useTranslations } from 'next-intl'
import { TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'

import { formatAmount } from '../helpers'
import type { PlanVsActualResponse } from '../types'

interface PlanVsActualStripProps {
  data: PlanVsActualResponse | null
  loading: boolean
  /** 0-based month to show; null = whole-period totals. */
  selectedMonth: number | null
  selectedYear: number
}

export function PlanVsActualStrip({
  data,
  loading,
  selectedMonth,
  selectedYear,
}: PlanVsActualStripProps) {
  const t = useTranslations()

  const monthKey =
    selectedMonth !== null ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}` : null
  const monthRow = monthKey ? data?.by_month.find(m => m.month === monthKey) : null
  const shown = monthRow ?? data?.totals ?? null

  // A selected month outside the fetched period (e.g. a future month) has no
  // row — show nothing rather than the misleading whole-period totals.
  if (monthKey && !monthRow && !loading) return null

  const values = [
    {
      label: t('payments.planVsActual.planned'),
      value: shown?.expected ?? 0,
      cls: 'text-monday-primary',
    },
    {
      label: t('payments.planVsActual.actual'),
      value: shown?.received ?? 0,
      cls: 'text-emerald-600',
    },
  ]
  const difference = shown?.difference ?? 0

  return (
    <div className="bg-bg-primary rounded-xl border border-border-light px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-text-tertiary">
        <TrendingUp className="w-4 h-4" />
        {t('payments.planVsActual.title')}
      </span>
      {values.map(v => (
        <div key={v.label} className="flex items-baseline gap-1.5">
          <span className="text-xs text-text-tertiary">{v.label}</span>
          <span className={cn('text-sm font-semibold', v.cls)}>
            {loading ? '...' : formatAmount(v.value)}
          </span>
        </div>
      ))}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-text-tertiary">{t('payments.planVsActual.difference')}</span>
        <span
          className={cn(
            'text-sm font-semibold',
            difference >= 0 ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          {loading ? '...' : (difference >= 0 ? '+' : '') + formatAmount(difference)}
        </span>
      </div>
    </div>
  )
}
