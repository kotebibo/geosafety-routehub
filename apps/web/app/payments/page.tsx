'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { paymentsService } from '@/services/payments.service'
import type { BankTransaction, TransactionsResponse } from '@/services/payments.service'
import type { PaymentStats } from '@/lib/bog/types'
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Ban,
  TrendingUp,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PaymentsPage() {
  const router = useRouter()
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()

  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
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

  useEffect(() => {
    if (!authLoading && (isAdmin || isDispatcher)) {
      fetchStats()
      fetchTransactions()
    }
  }, [authLoading, isAdmin, isDispatcher, fetchStats, fetchTransactions])

  const totalPages = Math.ceil(total / limit)

  const formatAmount = (amount: number, currency: string) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-sm text-text-secondary mb-1">სულ თანხა</p>
              <p className="text-2xl font-bold text-color-success">
                {statsLoading ? '...' : formatAmount(stats?.total_amount || 0, 'GEL')}
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
      </div>

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
                <th className="text-right px-4 py-3 font-medium text-text-secondary">თანხა</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">დანიშნულება</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">კომპანია</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">სტატუსი</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">მეთოდი</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-monday-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-secondary">
                    ტრანზაქციები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(txn => (
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
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate">
                      {txn.sender_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {txn.sender_inn || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-text-primary whitespace-nowrap">
                      {formatAmount(txn.amount, txn.currency)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-[250px] truncate text-xs">
                      {txn.purpose || '—'}
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
                ))
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
