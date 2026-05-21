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
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">ტრანზაქციები</p>
        <p className="text-xl font-bold text-text-primary">
          {loading ? '...' : monthStats?.count || 0}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-emerald-600">{monthStats?.matched || 0} დაკავშ.</span>
          <span className="text-[11px] text-amber-600">{monthStats?.unmatched || 0} დაუკავშ.</span>
        </div>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">მიღებული</p>
        <p className="text-xl font-bold text-emerald-600">
          {loading ? '...' : formatAmount(monthStats?.totalPaid || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">მოსალოდნელი</p>
        <p className="text-xl font-bold text-monday-primary">
          {loading || contractsLoading ? '...' : formatAmount(monthStats?.totalExpected || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">სხვაობა</p>
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
              <span className="text-[11px] text-red-600">{monthStats.underpaid} ნაკლ.</span>
            )}
            {monthStats.overpaid > 0 && (
              <span className="text-[11px] text-blue-600">{monthStats.overpaid} ზედმ.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
