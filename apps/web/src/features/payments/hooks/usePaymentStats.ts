import { useMemo } from 'react'

import type { BankTransaction, ContractInfo } from '@/services/payments.service'

import { sumExpectedForContracts } from '../helpers'
import type { MonthStats, TableTotals } from '../types'

interface UsePaymentStatsParams {
  transactions: BankTransaction[]
  contracts: Record<string, ContractInfo[]>
  loading: boolean
  contractsLoading: boolean
  monthsInRange: number
  effectiveDateRange: { from?: string; to?: string }
  matchSourceFilter: string
}

export function usePaymentStats({
  transactions,
  contracts,
  loading,
  contractsLoading,
  monthsInRange,
  effectiveDateRange,
  matchSourceFilter,
}: UsePaymentStatsParams) {
  const monthStats = useMemo((): MonthStats | null => {
    if (loading || contractsLoading) return null

    // Sum actual payments from transactions (exclude ignored)
    let totalPaid = 0
    let matched = 0
    let unmatched = 0
    let ignored = 0
    for (const txn of transactions) {
      if (txn.status === 'ignored') {
        ignored++
        continue
      }
      totalPaid += txn.amount
      if (txn.status === 'matched') matched++
      if (txn.status === 'unmatched') unmatched++
    }

    // Sum expected: ALL contracts (not just those with transactions)
    let totalExpected = 0
    for (const contractList of Object.values(contracts)) {
      const expected = sumExpectedForContracts(
        contractList,
        monthsInRange,
        effectiveDateRange.from,
        effectiveDateRange.to,
        matchSourceFilter
      )
      if (expected) totalExpected += expected
    }

    // Count companies that underpaid/overpaid vs their expected
    let underpaid = 0
    let overpaid = 0
    const paidByTaxId: Record<string, number> = {}
    for (const txn of transactions) {
      if (txn.status === 'ignored') continue
      if (txn.sender_inn) {
        paidByTaxId[txn.sender_inn] = (paidByTaxId[txn.sender_inn] || 0) + txn.amount
      }
    }
    for (const [taxId, contractList] of Object.entries(contracts)) {
      const expected = sumExpectedForContracts(
        contractList,
        monthsInRange,
        effectiveDateRange.from,
        effectiveDateRange.to,
        matchSourceFilter
      )
      if (!expected) continue
      const paid = paidByTaxId[taxId] || 0
      const diff = paid - expected
      if (diff < -expected * 0.05) underpaid++
      else if (diff > expected * 0.05) overpaid++
    }

    return {
      totalPaid,
      totalExpected,
      difference: totalPaid - totalExpected,
      matched,
      unmatched,
      underpaid,
      overpaid,
      count: transactions.length,
    }
  }, [
    transactions,
    contracts,
    loading,
    contractsLoading,
    monthsInRange,
    effectiveDateRange,
    matchSourceFilter,
  ])

  // Table footer totals — same as stats cards for consistency
  const tableTotals = useMemo(
    (): TableTotals => ({
      totalPaid: monthStats?.totalPaid || 0,
      totalExpected: monthStats?.totalExpected ?? null,
    }),
    [monthStats]
  )

  return { monthStats, tableTotals }
}
