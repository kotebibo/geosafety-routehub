import {
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Building2,
  ExternalLink,
  Link2,
  EyeOff,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ContractInfo } from '@/services/payments.service'

import { formatAmount } from '../helpers'
import type { GroupedTransactions } from '../types'

interface PaymentGroupRowProps {
  group: GroupedTransactions
  isCollapsed: boolean
  contracts: Record<string, ContractInfo[]>
  actionLoading: string | null
  onToggle: () => void
  onIgnore: (transactionId: string) => void
  onNavigateToBoard: (boardId: string, itemId?: string) => void
  onNavigateUnmatched: () => void
}

export function PaymentGroupRow({
  group,
  isCollapsed,
  contracts,
  actionLoading,
  onToggle,
  onIgnore,
  onNavigateToBoard,
  onNavigateUnmatched,
}: PaymentGroupRowProps) {
  const diff = group.totalExpected != null ? group.totalPaid - group.totalExpected : null

  return (
    <tr
      className="border-b border-border-light cursor-pointer hover:bg-bg-secondary/80 transition-colors bg-bg-secondary/60 border-l-2 border-l-monday-primary"
      onClick={onToggle}
    >
      <td className="px-4 py-2.5 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-monday-primary flex-shrink-0" />
          )}
          <Building2 className="w-3.5 h-3.5 text-monday-primary flex-shrink-0" />
          <span
            className="text-sm font-semibold text-text-primary truncate min-w-0"
            title={group.senderName}
          >
            {group.senderName}
          </span>
          <span className="text-[11px] text-text-tertiary bg-bg-primary px-1.5 py-0.5 rounded flex-shrink-0">
            {group.transactions.length}
          </span>
          {group.boardId && (
            <button
              onClick={e => {
                e.stopPropagation()
                const contractItemId = group.senderInn
                  ? contracts[group.senderInn]?.[0]?.item_id
                  : null
                onNavigateToBoard(group.boardId!, contractItemId || undefined)
              }}
              title="ხელშეკრულების ბორდზე გადასვლა"
              className="p-0.5 rounded hover:bg-bg-primary text-text-tertiary hover:text-monday-primary flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-sm font-bold text-text-primary whitespace-nowrap">
          {formatAmount(group.totalPaid)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        {group.totalExpected != null ? (
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {formatAmount(group.totalExpected)}
          </span>
        ) : (
          <span className="text-xs text-text-tertiary">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {diff != null ? (
          <span
            className={cn(
              'text-xs font-bold whitespace-nowrap',
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
          <span className="text-xs text-text-tertiary">&mdash;</span>
        )}
      </td>
      <td />
      <td />
      <td className="px-3 py-2.5">
        {group.transactions.some(t => t.status !== 'ignored') && (
          <div className="flex items-center gap-1">
            {group.transactions.some(t => t.status === 'unmatched') && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onNavigateUnmatched()
                }}
                title="დაკავშირება"
                className="p-1 rounded hover:bg-bg-secondary text-monday-primary"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            )}
            {group.transactions.length === 1 && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onIgnore(group.transactions[0].id)
                }}
                title="იგნორირება"
                disabled={actionLoading === group.transactions[0].id}
                className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-red-500 disabled:opacity-30"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
