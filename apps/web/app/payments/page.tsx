'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
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
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Copy,
  Check,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  X,
  Download,
  Link2,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────

const MONTHS_KA = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
]

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
  return { from, to }
}

/** How many payments per year based on Georgian frequency label */
function getPaymentsPerYear(frequency: string | null): number {
  if (!frequency) return 12
  if (frequency === 'ყოველთვე') return 12
  const match = frequency.match(/წელიწადში\s*(\d+)/)
  if (match) return parseInt(match[1])
  return 12
}

/** Expected total revenue from a contract within a date range.
 *  When no period is given ("all" mode), uses contract start → today. */
function getExpectedForPeriod(
  contract: ContractInfo,
  months: number,
  periodFrom?: string,
  periodTo?: string
): number | null {
  const amount = contract.monthly_amount || contract.invoice_amount
  if (!amount) return null
  const ppy = getPaymentsPerYear(contract.frequency)
  const today = new Date()

  const cStart = contract.start_date ? new Date(contract.start_date) : null
  const cEnd = contract.end_date ? new Date(contract.end_date) : null

  let activeMonths: number

  if (periodFrom && periodTo) {
    // Specific period (month or custom range)
    const pFrom = new Date(periodFrom)
    const pTo = new Date(periodTo)

    const effectiveFrom = cStart && cStart > pFrom ? cStart : pFrom
    let effectiveTo = cEnd && cEnd < pTo ? cEnd : pTo
    if (today < effectiveTo) effectiveTo = today

    if (effectiveFrom > effectiveTo) return null

    activeMonths =
      (effectiveTo.getFullYear() - effectiveFrom.getFullYear()) * 12 +
      (effectiveTo.getMonth() - effectiveFrom.getMonth()) +
      1
    activeMonths = Math.max(1, Math.min(activeMonths, months))
  } else {
    // "All" mode — contract start (or first payment) to today
    const from =
      cStart || (contract.first_payment_date ? new Date(contract.first_payment_date) : null)
    if (!from) return null
    const to = cEnd && cEnd < today ? cEnd : today
    if (from > to) return null

    activeMonths =
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1
    activeMonths = Math.max(1, activeMonths)
  }

  return Math.round(((amount * ppy * activeMonths) / 12) * 100) / 100
}

/** Whether a contract is active (not ended or paused) */
function isActiveContract(contract: ContractInfo): boolean {
  if (!contract.monthly_amount && !contract.invoice_amount) return false
  if (
    contract.status &&
    (contract.status.includes('შეჩერებულ') ||
      contract.status.includes('დასრულებულ') ||
      contract.status.includes('შეწყვეტილ'))
  )
    return false
  return true
}

/** Months between two date strings */
function monthsBetween(from: string, to: string): number {
  const d1 = new Date(from)
  const d2 = new Date(to)
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1
}

function formatAmount(amount: number, currency?: string) {
  return new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: currency || 'GEL',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ── Types ────────────────────────────────────────────────────────────

interface GroupedTransactions {
  key: string
  senderName: string
  senderInn: string | null
  transactions: BankTransaction[]
  totalPaid: number
  totalExpected: number | null
}

// ── Component ────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const router = useRouter()
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()

  // Month navigation
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth())

  // Data
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [contracts, setContracts] = useState<Record<string, ContractInfo>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const limit = 50

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Grouping — all collapsed by default
  const [groupByCompany, setGroupByCompany] = useState(true)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | null>(null)

  // Copy & actions
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAdmin && !isDispatcher) {
      router.push('/')
    }
  }, [authLoading, isAdmin, isDispatcher, router])

  // Debounce search for server-side filtering
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchQuery), 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Compute date range from month selection or custom dates
  const effectiveDateRange = useMemo(() => {
    if (dateFrom || dateTo) {
      return { from: dateFrom || undefined, to: dateTo || undefined }
    }
    if (selectedMonth === null) {
      // All history — no date bounds
      return { from: undefined, to: undefined }
    }
    return getMonthRange(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth, dateFrom, dateTo])

  // How many months the current view covers (for expected amount calculation)
  // When "all", this is ignored — getExpectedForPeriod uses contract start → today
  const monthsInRange = useMemo(() => {
    const { from, to } = effectiveDateRange
    if (from && to) return monthsBetween(from, to)
    return 0 // "all" mode — getExpectedForPeriod handles this
  }, [effectiveDateRange])

  // Fetch transactions — server-side search, no client-side filtering
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await paymentsService.getTransactions({
        status: statusFilter || undefined,
        from: effectiveDateRange.from,
        to: effectiveDateRange.to,
        search: searchDebounced || undefined,
        page: groupByCompany ? 1 : page,
        limit: groupByCompany ? 1000 : limit,
      })
      setTransactions(data.transactions || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, effectiveDateRange, searchDebounced, page, limit, groupByCompany])

  // Fetch stats — month-scoped
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const data = await paymentsService.getStats({
        from: effectiveDateRange.from,
        to: effectiveDateRange.to,
      })
      setStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [effectiveDateRange])

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
      fetchContracts()
    }
  }, [authLoading, isAdmin, isDispatcher, fetchContracts])

  useEffect(() => {
    if (!authLoading && (isAdmin || isDispatcher)) {
      fetchStats()
    }
  }, [authLoading, isAdmin, isDispatcher, fetchStats])

  useEffect(() => {
    if (!authLoading && (isAdmin || isDispatcher)) {
      fetchTransactions()
    }
  }, [authLoading, isAdmin, isDispatcher, fetchTransactions])

  // Reset page and collapse state on filter change
  useEffect(() => {
    setPage(1)
    setCollapsedGroups(null)
  }, [statusFilter, selectedMonth, selectedYear, dateFrom, dateTo, searchDebounced])

  // Computed stats — expected is per-company (not per-transaction)
  const monthStats = useMemo(() => {
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

    // Sum expected: once per active contract, frequency-aware
    let totalExpected = 0
    for (const contract of Object.values(contracts)) {
      if (!isActiveContract(contract)) continue
      const expected = getExpectedForPeriod(
        contract,
        monthsInRange,
        effectiveDateRange.from,
        effectiveDateRange.to
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
    for (const [taxId, contract] of Object.entries(contracts)) {
      if (!isActiveContract(contract)) continue
      const expected = getExpectedForPeriod(
        contract,
        monthsInRange,
        effectiveDateRange.from,
        effectiveDateRange.to
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
  }, [transactions, contracts, loading, contractsLoading, monthsInRange, effectiveDateRange])

  // Grouped transactions
  const grouped = useMemo((): GroupedTransactions[] => {
    if (!groupByCompany) return []

    const groups: Record<string, GroupedTransactions> = {}

    for (const txn of transactions) {
      const key = txn.sender_inn || txn.sender_name || txn.id
      if (!groups[key]) {
        groups[key] = {
          key,
          senderName: txn.sender_name || '—',
          senderInn: txn.sender_inn,
          transactions: [],
          totalPaid: 0,
          totalExpected: null,
        }
      }
      groups[key].transactions.push(txn)
      if (txn.status !== 'ignored') groups[key].totalPaid += txn.amount
    }

    for (const group of Object.values(groups)) {
      if (group.senderInn && contracts[group.senderInn]) {
        const contract = contracts[group.senderInn]
        const expected = getExpectedForPeriod(
          contract,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to
        )
        if (expected) group.totalExpected = expected
      }
    }

    // Add active contracts with zero transactions in this period
    if (!contractsLoading) {
      for (const [taxId, contract] of Object.entries(contracts)) {
        if (groups[taxId]) continue // already has transactions
        if (!isActiveContract(contract)) continue
        // For monthly view, skip non-monthly contracts
        if (selectedMonth !== null && getPaymentsPerYear(contract.frequency) < 12) continue
        const expected = getExpectedForPeriod(
          contract,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to
        )
        if (!expected) continue // contract not active in this period
        groups[taxId] = {
          key: taxId,
          senderName: contract.company_name || '—',
          senderInn: taxId,
          transactions: [],
          totalPaid: 0,
          totalExpected: expected,
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
  ])

  // Initialize all groups as collapsed on first load / data change
  useEffect(() => {
    if (grouped.length > 0 && collapsedGroups === null) {
      setCollapsedGroups(new Set(grouped.map(g => g.key)))
    }
  }, [grouped, collapsedGroups])

  // Totals for the table footer — derived from grouped data (includes zero-payment companies)
  const tableTotals = useMemo(() => {
    if (groupByCompany && grouped.length > 0) {
      let totalPaid = 0
      let totalExpected = 0
      let hasExpected = false
      for (const group of grouped) {
        totalPaid += group.totalPaid
        if (group.totalExpected != null) {
          totalExpected += group.totalExpected
          hasExpected = true
        }
      }
      return { totalPaid, totalExpected: hasExpected ? totalExpected : null }
    }

    // Flat mode — sum from transactions
    let totalPaid = 0
    for (const txn of transactions) {
      if (txn.status !== 'ignored') totalPaid += txn.amount
    }
    let totalExpected = 0
    let hasExpected = false
    const seenTaxIds = new Set<string>()
    for (const txn of transactions) {
      if (txn.status === 'ignored') continue
      if (!txn.sender_inn || seenTaxIds.has(txn.sender_inn)) continue
      seenTaxIds.add(txn.sender_inn)
      const contract = contracts[txn.sender_inn]
      if (contract) {
        const expected = getExpectedForPeriod(
          contract,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to
        )
        if (expected) {
          totalExpected += expected
          hasExpected = true
        }
      }
    }
    return { totalPaid, totalExpected: hasExpected ? totalExpected : null }
  }, [transactions, contracts, grouped, groupByCompany, monthsInRange, effectiveDateRange])

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev || [])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

  const navigateMonth = (delta: number) => {
    setDateFrom('')
    setDateTo('')
    if (selectedMonth === null) {
      // From "all" view, go to Dec (prev) or Jan (next)
      setSelectedMonth(delta < 0 ? 11 : 0)
      if (delta < 0) setSelectedYear(y => y - 1)
      return
    }
    let m = selectedMonth + delta
    let y = selectedYear
    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }
    setSelectedMonth(m)
    setSelectedYear(y)
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
  }

  const exportCSV = () => {
    const headers = [
      'შპს',
      'ს/კ',
      'გადახდის ID',
      'გადახდილი',
      'მოსალოდნელი',
      'სხვაობა',
      'თარიღი',
      'დანიშნულება',
      'სტატუსი',
      'მეთოდი',
    ]
    const rows = transactions.map(txn => {
      const contract = txn.sender_inn ? contracts[txn.sender_inn] : null
      const expected = contract
        ? getExpectedForPeriod(
            contract,
            monthsInRange,
            effectiveDateRange.from,
            effectiveDateRange.to
          )
        : null
      const diff = expected != null ? txn.amount - expected : null
      return [
        txn.sender_name || '',
        txn.sender_inn || '',
        txn.doc_key,
        txn.amount.toFixed(2),
        expected?.toFixed(2) || '',
        diff?.toFixed(2) || '',
        txn.entry_date,
        txn.purpose || '',
        txn.status,
        txn.match_method || '',
      ]
    })

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${selectedYear}${selectedMonth !== null ? '-' + String(selectedMonth + 1).padStart(2, '0') : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = groupByCompany ? 1 : Math.ceil(total / limit)

  const getStatusBadge = (status: string) => {
    const styles = {
      matched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      unmatched: 'bg-amber-50 text-amber-700 border-amber-200',
      ignored: 'bg-gray-50 text-gray-500 border-gray-200',
    }
    const icons = {
      matched: <CheckCircle2 className="w-3 h-3" />,
      unmatched: <AlertCircle className="w-3 h-3" />,
      ignored: <Ban className="w-3 h-3" />,
    }
    const labels = {
      matched: 'დაკავშ.',
      unmatched: 'დაუკავშ.',
      ignored: 'იგნორ.',
    }
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
          styles[status as keyof typeof styles] || ''
        )}
      >
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-primary" />
      </div>
    )
  }

  // Year options for dropdown
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  // ── Render child transaction row (inside a group) ──

  const renderChildRow = (txn: BankTransaction) => (
    <tr
      key={txn.id}
      className="border-b border-border-light/50 hover:bg-bg-secondary/30 transition-colors"
    >
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
      <td className="px-4 py-2 max-w-[300px]">
        {txn.purpose ? (
          <span className="text-xs text-text-tertiary truncate block" title={txn.purpose}>
            {txn.purpose}
          </span>
        ) : (
          <span className="text-text-tertiary text-xs">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-2">{getStatusBadge(txn.status)}</td>

      {/* Actions */}
      <td className="px-3 py-2">
        {txn.status === 'unmatched' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/payments/unmatched`)}
              title="დაკავშირება"
              className="p-1 rounded hover:bg-bg-secondary text-monday-primary"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleIgnore(txn.id)}
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

  // ── Render flat transaction row (ungrouped mode) ──

  const renderFlatRow = (txn: BankTransaction) => {
    const contract = txn.sender_inn ? contracts[txn.sender_inn] : null
    const expectedAmount = contract
      ? getExpectedForPeriod(
          contract,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to
        )
      : null
    const diff = expectedAmount != null ? txn.amount - expectedAmount : null

    return (
      <tr
        key={txn.id}
        className="border-b border-border-light hover:bg-bg-secondary/40 transition-colors"
      >
        {/* შპს - Company */}
        <td className="px-4 py-2.5 max-w-[250px]">
          {txn.sender_name ? (
            <div className="group flex items-center gap-1">
              <span className="text-sm text-text-primary truncate" title={txn.sender_name}>
                {txn.sender_name}
              </span>
              <button
                onClick={() => handleCopy(txn.sender_name!, `name-${txn.id}`)}
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
            <span className="text-text-tertiary text-sm">—</span>
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
            <span className="text-text-tertiary text-xs">—</span>
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
            <span className="text-text-tertiary text-xs">—</span>
          )}
        </td>

        {/* Purpose */}
        <td className="px-4 py-2.5 max-w-[300px]">
          {txn.purpose ? (
            <span className="text-xs text-text-secondary truncate block" title={txn.purpose}>
              {txn.purpose}
            </span>
          ) : (
            <span className="text-text-tertiary text-xs">—</span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-2.5">{getStatusBadge(txn.status)}</td>

        {/* Actions */}
        <td className="px-3 py-2.5">
          {txn.status === 'unmatched' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(`/payments/unmatched`)}
                title="დაკავშირება"
                className="p-1 rounded hover:bg-bg-secondary text-monday-primary"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleIgnore(txn.id)}
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

  return (
    <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">გადახდები</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            ტრანზაქციების თვალყურის დევნება და ანალიზი
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary text-text-secondary border border-border-light hover:bg-bg-secondary transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => router.push('/payments/unmatched')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            დაუკავშირებელი ({stats?.unmatched_count || 0})
          </button>
        </div>
      </div>

      {/* ── Month Tabs ── */}
      <div className="bg-bg-primary rounded-xl border border-border-light p-1 flex items-center gap-1">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              clearDateFilter()
              setSelectedMonth(null)
            }}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              selectedMonth === null && !dateFrom && !dateTo
                ? 'bg-monday-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            )}
          >
            ყველა
          </button>
          <div className="w-px h-4 bg-border-light mx-0.5" />
          {MONTHS_KA.map((name, i) => {
            const isSelected = selectedMonth === i && !dateFrom && !dateTo
            const isCurrent = now.getMonth() === i && now.getFullYear() === selectedYear
            return (
              <button
                key={i}
                onClick={() => {
                  clearDateFilter()
                  setSelectedMonth(i)
                }}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isSelected
                    ? 'bg-monday-primary text-white shadow-sm'
                    : isCurrent
                      ? 'bg-monday-primary/10 text-monday-primary hover:bg-monday-primary/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                )}
              >
                {name}
              </button>
            )
          })}
        </div>

        <div className="pl-2 border-l border-border-light">
          <select
            value={selectedYear}
            onChange={e => {
              setSelectedYear(Number(e.target.value))
              clearDateFilter()
            }}
            className="px-2 py-1 rounded-lg text-xs font-bold text-text-primary bg-bg-secondary border-none focus:outline-none focus:ring-2 focus:ring-monday-primary/30 cursor-pointer"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Custom date range indicator */}
      {(dateFrom || dateTo) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Calendar className="w-4 h-4" />
          <span>
            ფილტრი: {dateFrom || '...'} — {dateTo || '...'}
          </span>
          <button onClick={clearDateFilter} className="ml-auto p-0.5 hover:bg-blue-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <p className="text-xs text-text-tertiary mb-1">ტრანზაქციები</p>
          <p className="text-xl font-bold text-text-primary">
            {statsLoading ? '...' : stats?.total_transactions || 0}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-emerald-600">
              {stats?.matched_count || 0} დაკავშ.
            </span>
            <span className="text-[11px] text-amber-600">
              {stats?.unmatched_count || 0} დაუკავშ.
            </span>
          </div>
        </div>

        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <p className="text-xs text-text-tertiary mb-1">მიღებული</p>
          <p className="text-xl font-bold text-emerald-600">
            {statsLoading ? '...' : formatAmount(stats?.matched_amount || 0)}
          </p>
        </div>

        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <p className="text-xs text-text-tertiary mb-1">მოსალოდნელი</p>
          <p className="text-xl font-bold text-monday-primary">
            {loading || contractsLoading ? '...' : formatAmount(monthStats?.totalExpected || 0)}
          </p>
        </div>

        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <p className="text-xs text-text-tertiary mb-1">სხვაობა</p>
          <p
            className={cn(
              'text-xl font-bold',
              !monthStats
                ? 'text-text-secondary'
                : monthStats.difference >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
            )}
          >
            {loading || contractsLoading
              ? '...'
              : ((monthStats?.difference || 0) >= 0 ? '+' : '') +
                formatAmount(monthStats?.difference || 0)}
          </p>
          {monthStats && (monthStats.underpaid > 0 || monthStats.overpaid > 0) && (
            <div className="flex items-center gap-2 mt-1">
              {monthStats.underpaid > 0 && (
                <span className="text-[11px] text-red-600">{monthStats.underpaid} ნაკლ.</span>
              )}
              {monthStats.overpaid > 0 && (
                <span className="text-[11px] text-blue-600">{monthStats.overpaid} ზედმ.</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search — server-side */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="ძიება გადამხდელით, ს/კ-ით, დანიშნულებით..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border-light bg-bg-primary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary/30 focus:border-monday-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-text-tertiary hover:text-text-primary" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-0.5 bg-bg-primary border border-border-light rounded-lg p-0.5">
          {[
            { value: '', label: 'ყველა' },
            { value: 'matched', label: 'დაკავშ.' },
            { value: 'unmatched', label: 'დაუკავშ.' },
            { value: 'ignored', label: 'იგნორ.' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
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

        {/* Date range — always visible */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-border-light bg-bg-primary text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
            title="თარიღიდან"
          />
          <span className="text-text-tertiary text-xs">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-border-light bg-bg-primary text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
            title="თარიღამდე"
          />
          {(dateFrom || dateTo) && (
            <button onClick={clearDateFilter} className="p-1 hover:bg-bg-secondary rounded">
              <X className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
          )}
        </div>

        {/* Group toggle */}
        <button
          onClick={() => setGroupByCompany(!groupByCompany)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
            groupByCompany
              ? 'bg-monday-primary/10 text-monday-primary border-monday-primary/30'
              : 'bg-bg-primary text-text-secondary border-border-light hover:bg-bg-secondary'
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          დაჯგუფება
        </button>
      </div>

      {/* ── Transactions Table ── */}
      <div className="bg-bg-primary rounded-xl border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                <th className="w-[70px]" />
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
                  const isCollapsed = collapsedGroups?.has(group.key) ?? true
                  const diff =
                    group.totalExpected != null ? group.totalPaid - group.totalExpected : null

                  return (
                    <Fragment key={group.key}>
                      {/* Group header */}
                      <tr
                        className="border-b border-border-light cursor-pointer hover:bg-bg-secondary/80 transition-colors bg-bg-secondary/60 border-l-2 border-l-monday-primary"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRightIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-monday-primary flex-shrink-0" />
                            )}
                            <Building2 className="w-3.5 h-3.5 text-monday-primary flex-shrink-0" />
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {group.senderName}
                            </span>
                            {group.senderInn && (
                              <span className="text-[11px] font-mono text-text-tertiary flex-shrink-0">
                                {group.senderInn}
                              </span>
                            )}
                            <span className="text-[11px] text-text-tertiary bg-bg-primary px-1.5 py-0.5 rounded flex-shrink-0">
                              {group.transactions.length}
                            </span>
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
                            <span className="text-xs text-text-tertiary">—</span>
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
                              {Math.abs(diff) < 0.5
                                ? '0.00'
                                : (diff > 0 ? '+' : '') + formatAmount(diff)}
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </td>
                        <td colSpan={3} />
                      </tr>

                      {/* Group children */}
                      {!isCollapsed && group.transactions.map(txn => renderChildRow(txn))}
                    </Fragment>
                  )
                })
              ) : (
                transactions.map(txn => renderFlatRow(txn))
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
                      : '—'}
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
                      <span className="text-xs text-text-tertiary">—</span>
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
              <span className="px-3 py-1 text-xs text-text-primary font-medium">
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
