import { Fragment } from 'react'
import { Banknote, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { BankTransaction, ContractInfo } from '@/services/payments.service'

import { formatAmount } from '../helpers'
import type { GroupedTransactions, TableTotals } from '../types'
import { PaymentGroupRow } from './PaymentGroupRow'
import { PaymentChildRow } from './PaymentChildRow'
import { PaymentFlatRow } from './PaymentFlatRow'

interface PaymentTableProps {
  loading: boolean
  transactions: BankTransaction[]
  grouped: GroupedTransactions[]
  groupByCompany: boolean
  expandedGroups: Set<string>
  contracts: Record<string, ContractInfo[]>
  contractsLoading: boolean
  monthsInRange: number
  effectiveDateRange: { from?: string; to?: string }
  matchSourceFilter: string
  tableTotals: TableTotals
  copiedId: string | null
  actionLoading: string | null
  // Pagination
  page: number
  total: number
  limit: number
  totalPages: number
  onPageChange: (page: number) => void
  // Callbacks
  onToggleGroup: (key: string) => void
  onCopy: (text: string, id: string) => void
  onIgnore: (transactionId: string) => void
  onNavigateToBoard: (boardId: string, itemId?: string) => void
  onNavigateUnmatched: () => void
}

export function PaymentTable({
  loading,
  transactions,
  grouped,
  groupByCompany,
  expandedGroups,
  contracts,
  contractsLoading,
  monthsInRange,
  effectiveDateRange,
  matchSourceFilter,
  tableTotals,
  copiedId,
  actionLoading,
  page,
  total,
  limit,
  totalPages,
  onPageChange,
  onToggleGroup,
  onCopy,
  onIgnore,
  onNavigateToBoard,
  onNavigateUnmatched,
}: PaymentTableProps) {
  return (
    <div className="bg-bg-primary rounded-xl border border-border-light overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-light bg-bg-secondary/50">
              <th className="text-left px-4 py-2.5 font-semibold text-text-secondary text-xs">
                {groupByCompany ? 'კომპანია / თარიღი' : 'შპს'}
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-text-secondary text-xs">
                გადახდილი
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-text-secondary text-xs">
                მოსალოდნელი
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-text-secondary text-xs">
                სხვაობა
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-secondary text-xs">
                დანიშნულება
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-secondary text-xs">
                სტატუსი
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-monday-primary mx-auto" />
                  <p className="text-xs text-text-tertiary mt-2">იტვირთება...</p>
                </td>
              </tr>
            ) : transactions.length === 0 && grouped.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <Banknote className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                  <p className="text-sm text-text-tertiary">ტრანზაქციები არ მოიძებნა</p>
                </td>
              </tr>
            ) : groupByCompany ? (
              grouped.map(group => {
                const isCollapsed = !expandedGroups.has(group.key)
                return (
                  <Fragment key={group.key}>
                    <PaymentGroupRow
                      group={group}
                      isCollapsed={isCollapsed}
                      contracts={contracts}
                      actionLoading={actionLoading}
                      onToggle={() => onToggleGroup(group.key)}
                      onIgnore={onIgnore}
                      onNavigateToBoard={onNavigateToBoard}
                      onNavigateUnmatched={onNavigateUnmatched}
                    />
                    {!isCollapsed &&
                      group.transactions.map(txn => (
                        <PaymentChildRow
                          key={txn.id}
                          txn={txn}
                          actionLoading={actionLoading}
                          onIgnore={onIgnore}
                          onNavigateUnmatched={onNavigateUnmatched}
                        />
                      ))}
                  </Fragment>
                )
              })
            ) : (
              transactions.map(txn => (
                <PaymentFlatRow
                  key={txn.id}
                  txn={txn}
                  contracts={contracts}
                  contractsLoading={contractsLoading}
                  monthsInRange={monthsInRange}
                  effectiveDateRange={effectiveDateRange}
                  matchSourceFilter={matchSourceFilter}
                  copiedId={copiedId}
                  actionLoading={actionLoading}
                  onCopy={onCopy}
                  onIgnore={onIgnore}
                  onNavigateUnmatched={onNavigateUnmatched}
                />
              ))
            )}

            {/* Totals row */}
            {!loading && (transactions.length > 0 || grouped.length > 0) && (
              <tr className="border-t-2 border-border-light bg-bg-secondary/50 font-semibold">
                <td className="px-4 py-2.5 text-xs text-text-primary">
                  ჯამი
                  {groupByCompany
                    ? ` (${grouped.length} კომპანია)`
                    : ` (${transactions.length} ტრანზაქცია)`}
                </td>
                <td className="px-4 py-2.5 text-right text-sm text-text-primary">
                  {formatAmount(tableTotals.totalPaid)}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-text-secondary">
                  {tableTotals.totalExpected != null
                    ? formatAmount(tableTotals.totalExpected)
                    : '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {tableTotals.totalExpected != null ? (
                    <span
                      className={cn(
                        'text-xs font-bold',
                        tableTotals.totalPaid - tableTotals.totalExpected >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      )}
                    >
                      {(tableTotals.totalPaid - tableTotals.totalExpected >= 0 ? '+' : '') +
                        formatAmount(tableTotals.totalPaid - tableTotals.totalExpected)}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">&mdash;</span>
                  )}
                </td>
                <td colSpan={3} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — only when not grouped */}
      {!groupByCompany && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light bg-bg-secondary/30">
          <p className="text-xs text-text-tertiary">
            {total} ტრანზაქციიდან {(page - 1) * limit + 1}&ndash;{Math.min(page * limit, total)}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-text-primary font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
