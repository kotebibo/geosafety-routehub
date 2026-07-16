import { Search, Building2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

interface PaymentFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  matchSourceFilter: string
  onMatchSourceFilterChange: (value: string) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  onClearDateFilter: () => void
  groupByCompany: boolean
  onGroupByCompanyToggle: () => void
}

export function PaymentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  matchSourceFilter,
  onMatchSourceFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClearDateFilter,
  groupByCompany,
  onGroupByCompanyToggle,
}: PaymentFiltersProps) {
  const t = useTranslations()
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search — server-side */}
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder={t('payments.filters.searchPlaceholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border-light bg-bg-primary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary/30 focus:border-monday-primary"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5 text-text-tertiary hover:text-text-primary" />
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-0.5 bg-bg-primary border border-border-light rounded-lg p-0.5">
        {[
          { value: '', label: t('payments.filters.statusAll') },
          { value: 'matched', label: t('payments.filters.statusMatched') },
          { value: 'unmatched', label: t('payments.filters.statusUnmatched') },
          { value: 'unpaid', label: t('payments.filters.statusUnpaid') },
          { value: 'ignored', label: t('payments.filters.statusIgnored') },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => onStatusFilterChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === opt.value
                ? opt.value === 'unpaid'
                  ? 'bg-red-600 text-white'
                  : 'bg-monday-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Match source filter pills */}
      {statusFilter !== 'unmatched' && statusFilter !== 'ignored' && (
        <div className="flex items-center gap-0.5 bg-bg-primary border border-border-light rounded-lg p-0.5">
          {[
            { value: '', label: t('payments.filters.sourceAll') },
            { value: 'active', label: t('payments.filters.sourceActive') },
            { value: 'one_time', label: t('payments.filters.sourceOneTime') },
            { value: 'paused', label: t('payments.filters.sourcePaused') },
            { value: 'ended', label: t('payments.filters.sourceEnded') },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onMatchSourceFilterChange(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                matchSourceFilter === opt.value
                  ? opt.value === 'paused'
                    ? 'bg-amber-500 text-white'
                    : opt.value === 'ended'
                      ? 'bg-red-500 text-white'
                      : 'bg-monday-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Date range — always visible */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-border-light bg-bg-primary text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
          title={t('payments.filters.dateFromTitle')}
        />
        <span className="text-text-tertiary text-xs">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateToChange(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-border-light bg-bg-primary text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
          title={t('payments.filters.dateToTitle')}
        />
        {(dateFrom || dateTo) && (
          <button onClick={onClearDateFilter} className="p-1 hover:bg-bg-secondary rounded">
            <X className="w-3.5 h-3.5 text-text-tertiary" />
          </button>
        )}
      </div>

      {/* Group toggle */}
      <button
        onClick={onGroupByCompanyToggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
          groupByCompany
            ? 'bg-monday-primary/10 text-monday-primary border-monday-primary/30'
            : 'bg-bg-primary text-text-secondary border-border-light hover:bg-bg-secondary'
        )}
      >
        <Building2 className="w-3.5 h-3.5" />
        {t('payments.filters.groupByCompany')}
      </button>
    </div>
  )
}
