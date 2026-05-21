import { useMemo } from 'react'

import type { BankTransaction, ContractInfo } from '@/services/payments.service'

import { getPaymentsPerYear, isActiveContract, sumExpectedForContracts } from '../helpers'
import type { GroupedTransactions } from '../types'

interface UseGroupedTransactionsParams {
  transactions: BankTransaction[]
  contracts: Record<string, ContractInfo[]>
  contractsLoading: boolean
  groupByCompany: boolean
  monthsInRange: number
  effectiveDateRange: { from?: string; to?: string }
  selectedMonth: number | null
  statusFilter: string
  matchSourceFilter: string
}

export function useGroupedTransactions({
  transactions,
  contracts,
  contractsLoading,
  groupByCompany,
  monthsInRange,
  effectiveDateRange,
  selectedMonth,
  statusFilter,
  matchSourceFilter,
}: UseGroupedTransactionsParams) {
  const grouped = useMemo((): GroupedTransactions[] => {
    if (!groupByCompany) return []

    const groups: Record<string, GroupedTransactions> = {}

    for (const txn of transactions) {
      const key = txn.sender_inn || txn.sender_name || txn.id
      if (!groups[key]) {
        groups[key] = {
          key,
          senderName: txn.sender_name || '\u2014',
          senderInn: txn.sender_inn,
          transactions: [],
          totalPaid: 0,
          totalExpected: null,
          boardId: null,
        }
      }
      groups[key].transactions.push(txn)
      if (txn.status !== 'ignored') groups[key].totalPaid += txn.amount
    }

    for (const group of Object.values(groups)) {
      if (group.senderInn && contracts[group.senderInn]) {
        const contractList = contracts[group.senderInn]
        group.boardId = contractList[0]?.board_id || null
        const expected = sumExpectedForContracts(
          contractList,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to,
          matchSourceFilter
        )
        if (expected) group.totalExpected = expected
      }
    }

    // Add active contracts with zero transactions in this period
    // Show on "all" filter and "unpaid" filter
    if (!contractsLoading && (!statusFilter || statusFilter === 'unpaid')) {
      const paidTaxIds = new Set(Object.keys(groups))
      for (const [taxId, contractList] of Object.entries(contracts)) {
        if (paidTaxIds.has(taxId)) continue // already has transactions
        // Check if any contract in this list has amounts
        const hasActive = contractList.some(c => isActiveContract(c))
        if (!hasActive) continue
        // Only show active/one_time contracts as "unpaid" — paused/ended are expected to not pay
        const hasNonPausedEnded = contractList.some(
          c => c.contract_source !== 'paused' && c.contract_source !== 'ended'
        )
        if (!hasNonPausedEnded) continue
        // For monthly view, skip if all contracts are non-monthly
        if (selectedMonth !== null) {
          const hasMonthly = contractList.some(c => getPaymentsPerYear(c.frequency) >= 12)
          if (!hasMonthly) continue
        }
        const expected = sumExpectedForContracts(
          contractList,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to,
          matchSourceFilter
        )
        if (!expected) continue // no active contracts in this period
        groups[taxId] = {
          key: taxId,
          senderName: contractList[0]?.company_name || '\u2014',
          senderInn: taxId,
          transactions: [],
          totalPaid: 0,
          totalExpected: expected,
          boardId: contractList[0]?.board_id || null,
        }
      }
    }

    // For "unpaid" filter, keep groups that paid less than expected
    if (statusFilter === 'unpaid') {
      for (const key of Object.keys(groups)) {
        const g = groups[key]
        // Keep if: no payments, or paid less than expected (with 5% tolerance)
        if (g.totalExpected != null && g.totalPaid >= g.totalExpected * 0.95) {
          delete groups[key]
        }
        // Also remove groups with no expected (can't determine if unpaid)
        if (g.totalExpected == null && g.totalPaid > 0) {
          delete groups[key]
        }
      }
    }

    return Object.values(groups).sort((a, b) => b.totalPaid - a.totalPaid)
  }, [
    transactions,
    contracts,
    contractsLoading,
    groupByCompany,
    monthsInRange,
    effectiveDateRange,
    selectedMonth,
    statusFilter,
    matchSourceFilter,
  ])

  return { grouped }
}
