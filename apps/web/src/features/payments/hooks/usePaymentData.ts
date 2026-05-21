import { useState, useEffect, useCallback, useRef } from 'react'

import { paymentsService } from '@/services/payments.service'
import type { BankTransaction, ContractInfo } from '@/services/payments.service'
import type { PaymentStats } from '@/lib/bog/types'

interface UsePaymentDataParams {
  statusFilter: string
  matchSourceFilter: string
  effectiveDateRange: { from?: string; to?: string }
  searchDebounced: string
  page: number
  limit: number
  groupByCompany: boolean
  isAuthorized: boolean
  authLoading: boolean
}

export function usePaymentData({
  statusFilter,
  matchSourceFilter,
  effectiveDateRange,
  searchDebounced,
  page,
  limit,
  groupByCompany,
  isAuthorized,
  authLoading,
}: UsePaymentDataParams) {
  // Data
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [contracts, setContracts] = useState<Record<string, ContractInfo[]>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch transactions — server-side search, no client-side filtering
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      // 'unpaid' is a client-side filter, don't send to API
      const apiStatus = statusFilter && statusFilter !== 'unpaid' ? statusFilter : undefined
      const apiMatchSource = matchSourceFilter || undefined

      if (groupByCompany) {
        // Grouped mode: fetch ALL transactions (paginate through everything)
        const PAGE_SIZE = 1000
        let allTxns: BankTransaction[] = []
        let currentPage = 1
        let totalCount = 0

        while (true) {
          const data = await paymentsService.getTransactions({
            status: apiStatus,
            from: effectiveDateRange.from,
            to: effectiveDateRange.to,
            search: searchDebounced || undefined,
            matchSource: apiMatchSource,
            page: currentPage,
            limit: PAGE_SIZE,
          })
          const batch = data.transactions || []
          allTxns = allTxns.concat(batch)
          totalCount = data.total || 0
          if (batch.length < PAGE_SIZE || allTxns.length >= totalCount) break
          currentPage++
        }

        setTransactions(allTxns)
        setTotal(totalCount)
      } else {
        // Flat mode: single page
        const data = await paymentsService.getTransactions({
          status: apiStatus,
          from: effectiveDateRange.from,
          to: effectiveDateRange.to,
          search: searchDebounced || undefined,
          matchSource: apiMatchSource,
          page,
          limit,
        })
        setTransactions(data.transactions || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [
    statusFilter,
    matchSourceFilter,
    effectiveDateRange,
    searchDebounced,
    page,
    limit,
    groupByCompany,
  ])

  // Fetch stats — month-scoped
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const data = await paymentsService.getStats({
        from: effectiveDateRange.from,
        to: effectiveDateRange.to,
        matchSource: matchSourceFilter || undefined,
      })
      setStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [effectiveDateRange, matchSourceFilter])

  const contractsFetchedRef = useRef(false)
  const fetchContracts = useCallback(async () => {
    if (contractsFetchedRef.current) return
    try {
      setContractsLoading(true)
      const data = await paymentsService.getContracts()
      setContracts(data.contracts || {})
      contractsFetchedRef.current = true
    } catch (err) {
      console.error('Error fetching contracts:', err)
    } finally {
      setContractsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchContracts()
    }
  }, [authLoading, isAuthorized, fetchContracts])

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchStats()
    }
  }, [authLoading, isAuthorized, fetchStats])

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchTransactions()
    }
  }, [authLoading, isAuthorized, fetchTransactions])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleIgnore = async (transactionId: string) => {
    try {
      setActionLoading(transactionId)
      await paymentsService.ignoreTransaction(transactionId)
      fetchTransactions()
      fetchStats()
    } catch (err) {
      console.error('Error ignoring transaction:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return {
    // Data
    stats,
    transactions,
    contracts,
    total,
    loading,
    statsLoading,
    contractsLoading,

    // Actions
    copiedId,
    actionLoading,
    handleCopy,
    handleIgnore,
  }
}
