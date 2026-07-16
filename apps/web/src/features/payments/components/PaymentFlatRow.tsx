import { Copy, Check, Link2, EyeOff, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import type { BankTransaction } from '@/services/payments.service'

import { formatAmount, sumExpectedForContracts } from '../helpers'
import type { ContractInfo } from '@/services/payments.service'
import { getStatusBadge, getSourceBadge } from './PaymentBadges'

interface PaymentFlatRowProps {
  txn: BankTransaction
  contracts: Record<string, ContractInfo[]>
  contractsLoading: boolean
  monthsInRange: number
  effectiveDateRange: { from?: string; to?: string }
  matchSourceFilter: string
  copiedId: string | null
  actionLoading: string | null
  onCopy: (text: string, id: string) => void
  onIgnore: (transactionId: string) => void
  onUnignore: (transactionId: string) => void
  onNavigateUnmatched: () => void
}

export function PaymentFlatRow({
  txn,
  contracts,
  contractsLoading,
  monthsInRange,
  effectiveDateRange,
  matchSourceFilter,
  copiedId,
  actionLoading,
  onCopy,
  onIgnore,
  onUnignore,
  onNavigateUnmatched,
}: PaymentFlatRowProps) {
  const t = useTranslations()
  const contractList = txn.sender_inn ? contracts[txn.sender_inn] : null
  const expectedAmount = contractList
    ? sumExpectedForContracts(
        contractList,
        monthsInRange,
        effectiveDateRange.from,
        effectiveDateRange.to,
        matchSourceFilter
      )
    : null
  const diff = expectedAmount != null ? txn.amount - expectedAmount : null

  return (
    <tr className="border-b border-border-light hover:bg-bg-secondary/40 transition-colors">
      {/* Company */}
      <td className="px-4 py-2.5 overflow-hidden">
        {txn.sender_name ? (
          <div className="group flex items-center gap-1 min-w-0">
            <span className="text-sm text-text-primary truncate min-w-0" title={txn.sender_name}>
              {txn.sender_name}
            </span>
            <button
              onClick={() => onCopy(txn.sender_name!, `name-${txn.id}`)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              {copiedId === `name-${txn.id}` ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-text-tertiary" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-text-tertiary text-sm">&mdash;</span>
        )}
      </td>

      {/* Paid Amount */}
      <td className="px-4 py-2.5 text-right">
        <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
          {formatAmount(txn.amount, txn.currency)}
        </span>
      </td>

      {/* Expected */}
      <td className="px-4 py-2.5 text-right">
        {contractsLoading ? (
          <span className="text-text-tertiary text-xs">...</span>
        ) : expectedAmount ? (
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {formatAmount(expectedAmount)}
          </span>
        ) : (
          <span className="text-text-tertiary text-xs">&mdash;</span>
        )}
      </td>

      {/* Difference */}
      <td className="px-4 py-2.5 text-right">
        {contractsLoading ? (
          <span className="text-text-tertiary text-xs">...</span>
        ) : diff != null ? (
          <span
            className={cn(
              'text-xs font-semibold whitespace-nowrap',
              Math.abs(diff) < 0.5
                ? 'text-emerald-600'
                : diff < 0
                  ? 'text-red-600'
                  : 'text-blue-600'
            )}
          >
            {Math.abs(diff) < 0.5 ? '0.00' : (diff > 0 ? '+' : '') + formatAmount(diff)}
          </span>
        ) : (
          <span className="text-text-tertiary text-xs">&mdash;</span>
        )}
      </td>

      {/* Purpose */}
      <td className="px-4 py-2.5 overflow-hidden">
        {txn.purpose ? (
          <span className="text-xs text-text-secondary truncate block" title={txn.purpose}>
            {txn.purpose}
          </span>
        ) : (
          <span className="text-text-tertiary text-xs">&mdash;</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          {getStatusBadge(txn.status, t)}
          {getSourceBadge(txn.match_source, t)}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        {txn.status === 'ignored' ? (
          <button
            onClick={() => onUnignore(txn.id)}
            title={t('payments.table.unignoreAction')}
            disabled={actionLoading === txn.id}
            className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-monday-primary disabled:opacity-30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            {txn.status === 'unmatched' && (
              <button
                onClick={onNavigateUnmatched}
                title={t('payments.table.linkAction')}
                className="p-1 rounded hover:bg-bg-secondary text-monday-primary"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onIgnore(txn.id)}
              title={t('payments.table.ignoreAction')}
              disabled={actionLoading === txn.id}
              className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-red-500 disabled:opacity-30"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
