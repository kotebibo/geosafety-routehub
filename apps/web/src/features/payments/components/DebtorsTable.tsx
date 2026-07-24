import { Fragment, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Building2, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import { formatAmount, formatDate } from '../helpers'
import { PayerCategoryBadge } from './PayerCategoryBadge'
import type { DebtorRow, PayerCategory } from '@/services/financial-analytics.service'

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const

interface DebtorsTableProps {
  debtors: DebtorRow[]
  loading: boolean
  categoryFilter: PayerCategory | 'all'
  onNavigateToBoard: (boardId: string, itemId?: string) => void
}

export function DebtorsTable({
  debtors,
  loading,
  categoryFilter,
  onNavigateToBoard,
}: DebtorsTableProps) {
  const t = useTranslations()
  const [expandedTaxId, setExpandedTaxId] = useState<string | null>(null)

  const visible =
    categoryFilter === 'all' ? debtors : debtors.filter(d => d.category === categoryFilter)

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-')
    return `${t(`payments.monthTabs.months.${MONTH_KEYS[Number(m) - 1]}`)} ${year}`
  }

  if (!loading && visible.length === 0) {
    return (
      <div className="bg-bg-primary rounded-xl border border-border-light p-10 text-center">
        <p className="text-sm text-text-secondary">{t('payments.debtors.table.empty')}</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-primary rounded-xl border border-border-light overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left text-xs text-text-tertiary">
            <th className="w-8" />
            <th className="px-4 py-3 font-medium">{t('payments.debtors.table.company')}</th>
            <th className="px-4 py-3 font-medium">{t('payments.debtors.table.taxId')}</th>
            <th className="px-4 py-3 font-medium">{t('payments.debtors.table.board')}</th>
            <th className="px-4 py-3 font-medium text-right">
              {t('payments.debtors.table.outstanding')}
            </th>
            <th className="px-4 py-3 font-medium text-right">
              {t('payments.debtors.table.unpaidMonths')}
            </th>
            <th className="px-4 py-3 font-medium text-right">
              {t('payments.debtors.table.daysOverdue')}
            </th>
            <th className="px-4 py-3 font-medium">{t('payments.debtors.table.lastPayment')}</th>
            <th className="px-4 py-3 font-medium">{t('payments.debtors.table.responsible')}</th>
            <th className="px-4 py-3 font-medium">{t('payments.debtors.table.category')}</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border-light last:border-0 animate-pulse">
                  <td colSpan={10} className="px-4 py-4">
                    <div className="h-4 bg-bg-secondary rounded w-full" />
                  </td>
                </tr>
              ))
            : visible.map(debtor => {
                const primaryContract =
                  debtor.contracts.find(c => c.contract_source === 'active') || debtor.contracts[0]
                const expanded = expandedTaxId === debtor.tax_id
                const unpaidBuckets = debtor.buckets.filter(b => b.outstanding > 0)
                return (
                  <Fragment key={debtor.tax_id}>
                    <tr className="border-b border-border-light last:border-0 hover:bg-bg-secondary/50 transition-colors">
                      <td className="pl-3">
                        <button
                          onClick={() => setExpandedTaxId(expanded ? null : debtor.tax_id)}
                          className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
                          aria-label={t('payments.debtors.buckets.title')}
                        >
                          <ChevronDown
                            className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {primaryContract ? (
                          <button
                            onClick={() =>
                              onNavigateToBoard(primaryContract.board_id, primaryContract.item_id)
                            }
                            className="inline-flex items-center gap-1.5 text-text-primary font-medium hover:text-monday-primary transition-colors text-left"
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-text-tertiary" />
                            {debtor.company_name}
                          </button>
                        ) : (
                          <span className="text-text-primary font-medium">
                            {debtor.company_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                          {debtor.tax_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {[...new Set(debtor.contracts.map(c => c.board_name))].join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {formatAmount(debtor.outstanding)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-primary">
                        {debtor.unpaid_months}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right',
                          debtor.days_overdue > 0
                            ? 'text-red-600 font-medium'
                            : 'text-text-secondary'
                        )}
                      >
                        {t('payments.debtors.table.daysUnit', { count: debtor.days_overdue })}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {debtor.last_payment_date ? formatDate(debtor.last_payment_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{debtor.responsible || '—'}</td>
                      <td className="px-4 py-3">
                        <PayerCategoryBadge category={debtor.category} />
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border-light last:border-0 bg-bg-secondary/30">
                        <td />
                        <td colSpan={9} className="px-4 py-3">
                          <p className="text-xs font-medium text-text-tertiary mb-2">
                            {t('payments.debtors.buckets.title')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {unpaidBuckets.map(bucket => (
                              <div
                                key={bucket.month}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs"
                              >
                                <p className="font-medium text-text-primary">
                                  {formatMonth(bucket.month)}
                                </p>
                                <p className="text-text-secondary mt-0.5">
                                  {t('payments.debtors.buckets.expected')}:{' '}
                                  {formatAmount(bucket.expected)}
                                </p>
                                <p className="text-text-secondary">
                                  {t('payments.debtors.buckets.paid')}: {formatAmount(bucket.paid)}
                                </p>
                                <p className="font-semibold text-red-600">
                                  {t('payments.debtors.buckets.outstanding')}:{' '}
                                  {formatAmount(bucket.outstanding)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}
