'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { paymentsService } from '@/services/payments.service'
import type { BankTransaction, ContractInfo } from '@/services/payments.service'
import type { PaymentStats } from '@/lib/bog/types'
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Ban,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Copy,
  Check,
  ArrowDownUp,
  Clock,
  FileWarning,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Prorate for first month: (days_served / days_in_month) * monthly_price
function getExpectedAmount(contract: ContractInfo, entryDate: string): number | null {
  const monthly = contract.monthly_amount || contract.invoice_amount
  if (!monthly) return null
  if (!contract.start_date) return monthly

  const txnDate = new Date(entryDate)
  const startDate = new Date(contract.start_date)

  // First month of contract — prorate by days served
  if (
    txnDate.getFullYear() === startDate.getFullYear() &&
    txnDate.getMonth() === startDate.getMonth()
  ) {
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
    const daysServed = daysInMonth - startDate.getDate() + 1
    return Math.round((daysServed / daysInMonth) * monthly * 100) / 100
  }

  return monthly
}

export default function PaymentsPage() {
  const router = useRouter()
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()

  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [contracts, setContracts] = useState<Record<string, ContractInfo>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const limit = 25

  useEffect(() => {
    if (!authLoading && !isAdmin && !isDispatcher) {
      router.push('/')
    }
  }, [authLoading, isAdmin, isDispatcher, router])

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const data = await paymentsService.getStats()
      setStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await paymentsService.getTransactions({
        status: statusFilter || undefined,
        page,
        limit,
      })
      setTransactions(data.transactions || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, limit])

  const fetchContracts = useCallback(async () => {
    try {
      setContractsLoading(true)
      const data = await paymentsService.getContracts()
      setContracts(data.contracts || {})
    } catch (err) {
      console.error('Error fetching contracts:', err)
    } finally {
      setContractsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && (isAdmin || isDispatcher)) {
      fetchStats()
      fetchTransactions()
      fetchContracts()
    }
  }, [authLoading, isAdmin, isDispatcher, fetchStats, fetchTransactions, fetchContracts])

  // Compute discrepancy stats
  const discrepancyStats = useMemo(() => {
    if (contractsLoading || loading) return null
    let underpaid = 0
    let overpaid = 0
    let noContract = 0
    let totalExpected = 0
    let totalActual = 0

    for (const txn of transactions) {
      const contract = txn.sender_inn ? contracts[txn.sender_inn] : null
      if (!contract) {
        if (txn.status === 'matched') noContract++
        totalActual += txn.amount
        continue
      }
      const expected = getExpectedAmount(contract, txn.entry_date)
      totalActual += txn.amount
      if (!expected) continue
      totalExpected += expected
      if (txn.amount < expected * 0.95) underpaid++
      else if (txn.amount > expected * 1.05) overpaid++
    }
    return { underpaid, overpaid, noContract, totalExpected, totalActual }
  }, [transactions, contracts, contractsLoading, loading])

  // Find overdue contracts (have contract but no recent payment)
  const overdueContracts = useMemo(() => {
    if (contractsLoading || loading) return []
    const paidTaxIds = new Set(
      transactions
        .filter(t => t.status === 'matched')
        .map(t => t.sender_inn)
        .filter(Boolean)
    )

    const now = new Date()
    return Object.values(contracts).filter(c => {
      if (!c.monthly_amount && !c.invoice_amount) return false
      if (c.status?.toLowerCase().includes('შეჩერ') || c.status?.toLowerCase().includes('შეწყვ'))
        return false
      if (c.end_date && new Date(c.end_date) < now) return false
      return !paidTaxIds.has(c.tax_id)
    })
  }, [contracts, transactions, contractsLoading, loading])

  const totalPages = Math.ceil(total / limit)

  const formatAmount = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('ka-GE', {
      style: 'currency',
      currency: currency || 'GEL',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-color-success/10 text-color-success">
            <CheckCircle2 className="w-3 h-3" />
            Matched
          </span>
        )
      case 'unmatched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-color-warning/10 text-color-warning">
            <AlertCircle className="w-3 h-3" />
            Unmatched
          </span>
        )
      case 'ignored':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-text-secondary/10 text-text-secondary">
            <Ban className="w-3 h-3" />
            Ignored
          </span>
        )
      default:
        return null
    }
  }

  const getMatchMethodLabel = (method: string | null) => {
    switch (method) {
      case 'inn_exact':
        return 'Tax ID'
      case 'name_exact':
        return 'Name (exact)'
      case 'fuzzy':
        return 'Name (fuzzy)'
      case 'manual':
        return 'Manual'
      default:
        return '—'
    }
  }

  const getDiscrepancyBadge = (txn: BankTransaction) => {
    if (!txn.sender_inn) return null
    const contract = contracts[txn.sender_inn]
    if (!contract) return null
    const expected = getExpectedAmount(contract, txn.entry_date)
    if (!expected) return null

    const diff = txn.amount - expected
    const pct = Math.round((diff / expected) * 100)

    if (Math.abs(pct) <= 5) {
      return (
        <span
          className="text-color-success text-xs"
          title={`მოსალოდნელი: ${formatAmount(expected)}`}
        >
          OK
        </span>
      )
    }

    if (diff < 0) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-red-500 text-xs font-medium"
          title={`მოსალოდნელი: ${formatAmount(expected)} | სხვაობა: ${formatAmount(diff)}`}
        >
          <ArrowDownUp className="w-3 h-3" />
          {pct}%
        </span>
      )
    }

    return (
      <span
        className="inline-flex items-center gap-0.5 text-color-info text-xs font-medium"
        title={`მოსალოდნელი: ${formatAmount(expected)} | ზედმეტი: +${formatAmount(diff)}`}
      >
        <ArrowDownUp className="w-3 h-3" />+{pct}%
      </span>
    )
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filteredTransactions = searchQuery
    ? transactions.filter(
        t =>
          t.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.sender_inn?.includes(searchQuery) ||
          t.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.doc_key.includes(searchQuery)
      )
    : transactions

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">გადახდები</h1>
          <p className="text-sm text-text-secondary mt-1">
            ბანკის ტრანზაქციების თვალყურის დევნება და კომპანიებთან დაკავშირება
          </p>
        </div>
        <button
          onClick={() => router.push('/payments/unmatched')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-color-warning/10 text-color-warning hover:bg-color-warning/20 transition-colors text-sm font-medium"
        >
          <AlertCircle className="w-4 h-4" />
          დაუკავშირებელი ({stats?.unmatched_count || 0})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">სულ ტრანზაქციები</p>
              <p className="text-2xl font-bold text-color-info">
                {statsLoading ? '...' : stats?.total_transactions || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-color-info/10 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-color-info" />
            </div>
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">დაკავშირებული</p>
              <p className="text-2xl font-bold text-color-success">
                {statsLoading ? '...' : stats?.matched_count || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-color-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-color-success" />
            </div>
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">Match Rate</p>
              <p className="text-2xl font-bold text-monday-primary">
                {statsLoading ? '...' : `${stats?.match_rate || 0}%`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-monday-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-monday-primary" />
            </div>
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">მოსალოდნელი თანხა</p>
              <p className="text-2xl font-bold text-monday-primary">
                {contractsLoading || loading
                  ? '...'
                  : formatAmount(discrepancyStats?.totalExpected || 0, 'GEL')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-monday-primary/10 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-monday-primary" />
            </div>
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">რეალური თანხა</p>
              <p className="text-2xl font-bold text-color-success">
                {contractsLoading || loading
                  ? '...'
                  : formatAmount(discrepancyStats?.totalActual || 0, 'GEL')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-color-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-color-success" />
            </div>
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">სხვაობა</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  !discrepancyStats
                    ? 'text-text-secondary'
                    : discrepancyStats.totalActual >= discrepancyStats.totalExpected
                      ? 'text-color-success'
                      : 'text-red-500'
                )}
              >
                {contractsLoading || loading
                  ? '...'
                  : formatAmount(
                      (discrepancyStats?.totalActual || 0) - (discrepancyStats?.totalExpected || 0),
                      'GEL'
                    )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center">
              <ArrowDownUp className="w-6 h-6 text-text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy + Overdue Summary */}
      {!contractsLoading && (discrepancyStats?.underpaid || overdueContracts.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discrepancyStats && discrepancyStats.underpaid > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/30 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <ArrowDownUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                    ნაკლებად გადახდილი
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {discrepancyStats.underpaid} ტრანზაქცია
                  </p>
                </div>
              </div>
            </div>
          )}

          {discrepancyStats && discrepancyStats.overpaid > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ArrowDownUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    ზედმეტად გადახდილი
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {discrepancyStats.overpaid} ტრანზაქცია
                  </p>
                </div>
              </div>
            </div>
          )}

          {overdueContracts.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900/30 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                    გადახდა არ მიღებულა
                  </p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {overdueContracts.length} კონტრაქტი
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overdue Contracts Detail */}
      {!contractsLoading && overdueContracts.length > 0 && (
        <div className="bg-bg-primary rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b bg-orange-50/50 dark:bg-orange-950/10 flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-medium text-text-primary">კონტრაქტები გადახდის გარეშე</h3>
            <span className="text-xs text-text-secondary">({overdueContracts.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-bg-secondary/50">
                  <th className="text-left px-4 py-2 font-medium text-text-secondary">კომპანია</th>
                  <th className="text-left px-4 py-2 font-medium text-text-secondary">ს/კ</th>
                  <th className="text-right px-4 py-2 font-medium text-text-secondary">
                    მოსალოდნელი
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-text-secondary">
                    პერიოდულობა
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-text-secondary">ვადა</th>
                </tr>
              </thead>
              <tbody>
                {overdueContracts.map(c => (
                  <tr
                    key={c.item_id}
                    className="border-b border-border-light hover:bg-bg-secondary/30"
                  >
                    <td className="px-4 py-2 text-text-primary">{c.company_name}</td>
                    <td className="px-4 py-2 text-text-secondary font-mono text-xs">{c.tax_id}</td>
                    <td className="px-4 py-2 text-right font-medium text-text-primary">
                      {formatAmount(c.monthly_amount || c.invoice_amount || 0)}
                    </td>
                    <td className="px-4 py-2 text-text-secondary text-xs">{c.frequency || '—'}</td>
                    <td className="px-4 py-2 text-text-secondary text-xs">
                      {c.end_date ? formatDate(c.end_date) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="ძიება გადამხდელით, ს/კ-ით ან დანიშნულებით..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border-light bg-bg-primary text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
          />
        </div>

        <div className="flex items-center gap-1 bg-bg-primary border border-border-light rounded-lg p-0.5">
          {[
            { value: '', label: 'ყველა' },
            { value: 'matched', label: 'დაკავშირებული' },
            { value: 'unmatched', label: 'დაუკავშირებელი' },
            { value: 'ignored', label: 'იგნორირებული' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value)
                setPage(1)
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-monday-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-bg-primary rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">თარიღი</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">გადამხდელი</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">ს/კ</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">გადახდილი</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">
                  მოსალოდნელი
                </th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">სხვაობა</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">კომპანია</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">სტატუსი</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">მეთოდი</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-monday-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-secondary">
                    ტრანზაქციები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(txn => {
                  const contract = txn.sender_inn ? contracts[txn.sender_inn] : null
                  const expectedAmount = contract
                    ? getExpectedAmount(contract, txn.entry_date)
                    : null

                  return (
                    <tr
                      key={txn.id}
                      className="border-b border-border-light hover:bg-bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-text-primary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                          {formatDate(txn.entry_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {txn.sender_name ? (
                          <div className="group relative flex items-center gap-1">
                            <span className="text-text-primary truncate" title={txn.sender_name}>
                              {txn.sender_name}
                            </span>
                            <button
                              onClick={() => handleCopy(txn.sender_name!, `name-${txn.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              title="კოპირება"
                            >
                              {copiedId === `name-${txn.id}` ? (
                                <Check className="w-3 h-3 text-color-success" />
                              ) : (
                                <Copy className="w-3 h-3 text-text-secondary hover:text-text-primary" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {txn.sender_inn ? (
                          <div className="group relative flex items-center gap-1">
                            <span
                              className="text-text-secondary font-mono text-xs"
                              title={txn.sender_inn}
                            >
                              {txn.sender_inn}
                            </span>
                            <button
                              onClick={() => handleCopy(txn.sender_inn!, `inn-${txn.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              title="კოპირება"
                            >
                              {copiedId === `inn-${txn.id}` ? (
                                <Check className="w-3 h-3 text-color-success" />
                              ) : (
                                <Copy className="w-3 h-3 text-text-secondary hover:text-text-primary" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary whitespace-nowrap">
                        {formatAmount(txn.amount, txn.currency)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {contractsLoading ? (
                          <span className="text-text-secondary text-xs">...</span>
                        ) : expectedAmount ? (
                          <span className="text-text-secondary text-xs">
                            {formatAmount(expectedAmount)}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {contractsLoading ? (
                          <span className="text-text-secondary text-xs">...</span>
                        ) : (
                          getDiscrepancyBadge(txn)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {txn.companies ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-monday-primary flex-shrink-0" />
                            <span className="text-text-primary truncate max-w-[150px]">
                              {txn.companies.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(txn.status)}</td>
                      <td className="px-4 py-3 text-center text-xs text-text-secondary">
                        {getMatchMethodLabel(txn.match_method)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-text-secondary">
              {total} ტრანზაქციიდან {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-text-primary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
