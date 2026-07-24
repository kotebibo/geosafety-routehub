import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

import { formatAmount } from '../helpers'
import type { DebtorsSummary } from '@/services/financial-analytics.service'

interface DebtorsSummaryCardsProps {
  summary: DebtorsSummary | null
  loading: boolean
}

export function DebtorsSummaryCards({ summary, loading }: DebtorsSummaryCardsProps) {
  const t = useTranslations()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">{t('payments.debtors.summary.expected')}</p>
        <p className="text-xl font-bold text-monday-primary">
          {loading ? '...' : formatAmount(summary?.total_expected || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">{t('payments.debtors.summary.received')}</p>
        <p className="text-xl font-bold text-emerald-600">
          {loading ? '...' : formatAmount(summary?.total_paid || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">
          {t('payments.debtors.summary.difference')}
        </p>
        <p
          className={cn(
            'text-xl font-bold',
            !summary
              ? 'text-text-secondary'
              : summary.difference >= 0
                ? 'text-emerald-600'
                : 'text-red-600'
          )}
        >
          {loading
            ? '...'
            : ((summary?.difference || 0) >= 0 ? '+' : '') + formatAmount(summary?.difference || 0)}
        </p>
      </div>

      <div className="bg-bg-primary rounded-xl border border-border-light p-4">
        <p className="text-xs text-text-tertiary mb-1">
          {t('payments.debtors.summary.outstanding')}
        </p>
        <p className="text-xl font-bold text-red-600">
          {loading ? '...' : formatAmount(summary?.total_outstanding || 0)}
        </p>
        <div className="mt-1">
          <span className="text-[11px] text-text-secondary">
            {loading
              ? ''
              : t('payments.debtors.summary.debtorCount', { count: summary?.debtor_count || 0 })}
          </span>
        </div>
      </div>
    </div>
  )
}
