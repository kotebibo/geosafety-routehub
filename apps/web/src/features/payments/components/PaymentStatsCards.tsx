import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

import { formatAmount } from '../helpers'
import type { MonthStats } from '../types'

interface PaymentStatsCardsProps {
  monthStats: MonthStats | null
  loading: boolean
  contractsLoading: boolean
}

export function PaymentStatsCards({
  monthStats,
  loading,
  contractsLoading,
}: PaymentStatsCardsProps) {
  const t = useTranslations()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">{t('payments.stats.transactions')}</p>
        <p className="text-xl font-bold text-text-primary">
          {loading ? '...' : monthStats?.count || 0}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-emerald-600">
            {t('payments.stats.matchedCount', { count: monthStats?.matched || 0 })}
          </span>
          <span className="text-[11px] text-amber-600">
            {t('payments.stats.unmatchedCount', { count: monthStats?.unmatched || 0 })}
          </span>
        </div>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">{t('payments.stats.received')}</p>
        <p className="text-xl font-bold text-emerald-600">
          {loading ? '...' : formatAmount(monthStats?.totalPaid || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">{t('payments.stats.expected')}</p>
        <p className="text-xl font-bold text-monday-primary">
          {loading || contractsLoading ? '...' : formatAmount(monthStats?.totalExpected || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">{t('payments.stats.difference')}</p>
        <p
          className={cn(
            'text-xl font-bold',
            !monthStats
              ? 'text-text-secondary'
              : monthStats.difference >= 0
                ? 'text-emerald-600'
                : 'text-red-600'
          )}
        >
          {loading || contractsLoading
            ? '...'
            : ((monthStats?.difference || 0) >= 0 ? '+' : '') +
              formatAmount(monthStats?.difference || 0)}
        </p>
        {monthStats && (monthStats.underpaid > 0 || monthStats.overpaid > 0) && (
          <div className="flex items-center gap-2 mt-1">
            {monthStats.underpaid > 0 && (
              <span className="text-[11px] text-red-600">
                {t('payments.stats.underpaidCount', { count: monthStats.underpaid })}
              </span>
            )}
            {monthStats.overpaid > 0 && (
              <span className="text-[11px] text-blue-600">
                {t('payments.stats.overpaidCount', { count: monthStats.overpaid })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
