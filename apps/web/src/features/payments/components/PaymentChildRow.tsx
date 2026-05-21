import { Link2, EyeOff } from 'lucide-react'

import type { BankTransaction } from '@/services/payments.service'

import { formatDate, formatAmount } from '../helpers'
import { getStatusBadge, getSourceBadge } from './PaymentBadges'

interface PaymentChildRowProps {
  txn: BankTransaction
  actionLoading: string | null
  onIgnore: (transactionId: string) => void
  onNavigateUnmatched: () => void
}

export function PaymentChildRow({
  txn,
  actionLoading,
  onIgnore,
  onNavigateUnmatched,
}: PaymentChildRowProps) {
  return (
    <tr className="border-b border-border-light/50 hover:bg-bg-secondary/30 transition-colors">
      {/* Indent + date */}
      <td className="py-2 pl-10 pr-4 whitespace-nowrap">
        <span className="text-xs text-text-secondary">{formatDate(txn.entry_date)}</span>
      </td>

      {/* Paid Amount */}
      <td className="px-4 py-2 text-right">
        <span className="text-sm font-medium text-text-primary whitespace-nowrap">
          {formatAmount(txn.amount, txn.currency)}
        </span>
      </td>

      {/* Expected — empty for child rows */}
      <td className="px-4 py-2" />

      {/* Difference — empty for child rows */}
      <td className="px-4 py-2" />

      {/* Purpose */}
      <td className="px-4 py-2 overflow-hidden">
        {txn.purpose ? (
          <span className="text-xs text-text-tertiary truncate block" title={txn.purpose}>
            {txn.purpose}
          </span>
        ) : (
          <span className="text-text-tertiary text-xs">&mdash;</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {getStatusBadge(txn.status)}
          {getSourceBadge(txn.match_source)}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        {txn.status !== 'ignored' && (
          <div className="flex items-center gap-1">
            {txn.status === 'unmatched' && (
              <button
                onClick={onNavigateUnmatched}
                title="დაკავშირება"
                className="p-1 rounded hover:bg-bg-secondary text-monday-primary"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onIgnore(txn.id)}
              title="იგნორირება"
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
