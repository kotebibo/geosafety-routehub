'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { paymentsService } from '@/services/payments.service'
import type { UnmatchedTransaction } from '@/services/payments.service'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Ban,
  Building2,
  Search,
  ChevronDown,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UnmatchedPaymentsPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()

  const [transactions, setTransactions] = useState<UnmatchedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [companySearch, setCompanySearch] = useState('')

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  const fetchUnmatched = useCallback(async () => {
    try {
      setLoading(true)
      const data = await paymentsService.getUnmatched()
      setTransactions(data)
    } catch (err) {
      console.error('Error fetching unmatched:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUnmatched()
    }
  }, [authLoading, isAdmin, fetchUnmatched])

  const handleMatch = async (transactionId: string, companyId: string) => {
    try {
      setActionLoading(transactionId)
      await paymentsService.matchTransaction(transactionId, companyId)
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
      setExpandedId(null)
    } catch (err) {
      console.error('Error matching:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleIgnore = async (transactionId: string) => {
    try {
      setActionLoading(transactionId)
      await paymentsService.ignoreTransaction(transactionId)
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
    } catch (err) {
      console.error('Error ignoring:', err)
    } finally {
      setActionLoading(null)
    }
  }

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/payments')}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">დაუკავშირებელი ტრანზაქციები</h1>
          <p className="text-sm text-text-secondary mt-1">
            {transactions.length} ტრანზაქცია მოითხოვს ხელით დაკავშირებას
          </p>
        </div>
      </div>

      {/* Transaction Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-color-success mx-auto mb-3" />
          <p className="text-lg font-medium text-text-primary">ყველა ტრანზაქცია დაკავშირებულია</p>
          <p className="text-sm text-text-secondary mt-1">დაუკავშირებელი ტრანზაქციები არ არის</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map(txn => {
            const isExpanded = expandedId === txn.id
            const isProcessing = actionLoading === txn.id

            return (
              <div
                key={txn.id}
                className="bg-bg-primary rounded-lg border border-border-light overflow-hidden"
              >
                {/* Transaction Summary Row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-text-primary truncate">
                        {txn.sender_name || 'უცნობი გადამხდელი'}
                      </span>
                      {txn.sender_inn && (
                        <span className="text-xs font-mono text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded">
                          {txn.sender_inn}
                        </span>
                      )}
                    </div>
                    {txn.purpose && (
                      <p className="text-xs text-text-secondary mt-1 truncate">{txn.purpose}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-text-primary">
                      {formatAmount(txn.amount, txn.currency)}
                    </p>
                    <p className="text-xs text-text-secondary">{formatDate(txn.entry_date)}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleIgnore(txn.id)
                      }}
                      disabled={isProcessing}
                      className="p-1.5 rounded-md hover:bg-bg-secondary text-text-secondary hover:text-color-error transition-colors disabled:opacity-50"
                      title="იგნორირება"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-text-secondary transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </div>

                {/* Expanded: Suggested Matches */}
                {isExpanded && (
                  <div className="border-t border-border-light px-4 py-3 bg-bg-secondary/20">
                    <p className="text-xs font-medium text-text-secondary mb-2">
                      შემოთავაზებული კომპანიები:
                    </p>

                    {txn.suggested_companies.length > 0 ? (
                      <div className="space-y-2">
                        {txn.suggested_companies.map(suggestion => (
                          <div
                            key={suggestion.company_id}
                            className="flex items-center justify-between bg-bg-primary rounded-md px-3 py-2 border border-border-light"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-4 h-4 text-monday-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {suggestion.company_name}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {suggestion.reason} · {Math.round(suggestion.confidence * 100)}%
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleMatch(txn.id, suggestion.company_id)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-color-success/10 text-color-success hover:bg-color-success/20 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              დაკავშირება
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary italic">
                        შემოთავაზებები ვერ მოიძებნა — გთხოვთ ხელით დააკავშიროთ
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
