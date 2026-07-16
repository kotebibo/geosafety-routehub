'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { paymentsService } from '@/services/payments.service'
import type { UnmatchedTransaction } from '@/services/payments.service'
import {
  ArrowLeft,
  CheckCircle2,
  Ban,
  Building2,
  Search,
  ChevronDown,
  X,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Temporary matching company structure
interface SearchedCompany {
  id: string
  name: string
  inn?: string
}

export default function UnmatchedPaymentsPage() {
  const router = useRouter()
  const t = useTranslations()
  const { isAdmin, loading: authLoading } = useAuth()

  const [transactions, setTransactions] = useState<UnmatchedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Isolated search state for the expanded row
  const [companySearch, setCompanySearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedCompany[]>([])
  const [searching, setSearching] = useState(false)

  // Undo "Ignore" state management
  const [lastIgnored, setLastIgnored] = useState<{
    transaction: UnmatchedTransaction
    index: number
  } | null>(null)
  const [showUndoBanner, setShowUndoBanner] = useState(false)
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // Reset search context when the expanded row changes
  useEffect(() => {
    setCompanySearch('')
    setSearchResults([])
    setSearching(false)
  }, [expandedId])

  // Search-as-you-type: Debounced API query
  useEffect(() => {
    if (!companySearch.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const delayDebounce = setTimeout(async () => {
      try {
        // Replace with your actual search service call
        const results = await paymentsService.searchCompanies(companySearch)
        setSearchResults(results)
      } catch (err) {
        console.error('Error searching companies:', err)
      } finally {
        setSearching(false)
      }
    }, 300) // 300ms delay

    return () => clearTimeout(delayDebounce)
  }, [companySearch])

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

  const handleIgnore = async (transaction: UnmatchedTransaction) => {
    const originalIndex = transactions.findIndex(t => t.id === transaction.id)
    if (originalIndex === -1) return

    try {
      setActionLoading(transaction.id)
      await paymentsService.ignoreTransaction(transaction.id)

      // Store context for undo
      setLastIgnored({ transaction, index: originalIndex })
      setShowUndoBanner(true)

      // Start 8-second auto-dismiss timer for undo option
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => {
        setShowUndoBanner(false)
        setLastIgnored(null)
      }, 8000)

      setTransactions(prev => prev.filter(t => t.id !== transaction.id))
      if (expandedId === transaction.id) setExpandedId(null)
    } catch (err) {
      console.error('Error ignoring:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUndoIgnore = async () => {
    if (!lastIgnored) return
    const { transaction, index } = lastIgnored

    try {
      setActionLoading(transaction.id)
      // Call endpoint to revert ignored status
      await paymentsService.unignoreTransaction(transaction.id)

      // Restore item back to its precise previous index
      setTransactions(prev => {
        const updated = [...prev]
        updated.splice(index, 0, transaction)
        return updated
      })

      // Reset undo state
      setShowUndoBanner(false)
      setLastIgnored(null)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    } catch (err) {
      console.error('Error undoing ignore:', err)
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
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto pb-24 relative">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/payments')}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('payments.unmatched.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('payments.unmatched.countLabel', { count: transactions.length })}
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
          <p className="text-lg font-medium text-text-primary">
            {t('payments.unmatched.allMatchedTitle')}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {t('payments.unmatched.allMatchedSubtitle')}
          </p>
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
                        {txn.sender_name || t('payments.unmatched.unknownPayer')}
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
                        handleIgnore(txn)
                      }}
                      disabled={isProcessing}
                      className="p-1.5 rounded-md hover:bg-bg-secondary text-text-secondary hover:text-color-error transition-colors disabled:opacity-50"
                      title={t('payments.unmatched.ignoreTitle')}
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

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="border-t border-border-light px-4 py-4 bg-bg-secondary/20 space-y-4">
                    {/* Suggested Matches */}
                    <div>
                      <p className="text-xs font-medium text-text-secondary mb-2">
                        {t('payments.unmatched.suggestedCompanies')}
                      </p>

                      {txn.suggested_companies && txn.suggested_companies.length > 0 ? (
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
                                {t('payments.unmatched.matchAction')}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary italic">
                          {t('payments.unmatched.noSuggestions')}
                        </p>
                      )}
                    </div>

                    {/* Manual Search-as-you-type Picker */}
                    <div className="pt-3 border-t border-border-light/60">
                      <p className="text-xs font-medium text-text-secondary mb-2">
                        {t('payments.unmatched.searchManualLabel') || 'Or search database manually'}
                      </p>
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
                        <input
                          type="text"
                          placeholder={
                            t('payments.unmatched.searchPlaceholder') ||
                            'Type company name or Identification Number...'
                          }
                          value={companySearch}
                          onChange={e => setCompanySearch(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 text-sm bg-bg-primary border border-border-light rounded-md focus:outline-none focus:ring-1 focus:ring-monday-primary transition-all"
                        />
                        {companySearch && (
                          <button
                            onClick={() => setCompanySearch('')}
                            className="absolute right-3 top-2.5 hover:text-text-primary text-text-secondary transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Search results display box */}
                      {companySearch && (
                        <div className="mt-2 bg-bg-primary border border-border-light rounded-md shadow-lg max-h-48 overflow-y-auto max-w-md">
                          {searching ? (
                            <div className="p-3 text-xs text-text-secondary flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-monday-primary" />
                              {t('payments.unmatched.searching') || 'Searching...'}
                            </div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map(company => (
                              <button
                                key={company.id}
                                onClick={() => handleMatch(txn.id, company.id)}
                                disabled={isProcessing}
                                className="w-full text-left px-3 py-2 hover:bg-bg-secondary text-sm flex items-center justify-between border-b border-border-light/40 last:border-0"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-text-primary truncate">
                                    {company.name}
                                  </p>
                                  {company.inn && (
                                    <p className="text-xs text-text-secondary font-mono">
                                      INN: {company.inn}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-monday-primary font-medium shrink-0 ml-2">
                                  {t('payments.unmatched.selectAction') || 'Select'}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-xs text-text-secondary italic">
                              {t('payments.unmatched.noResults') || 'No companies found'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Undo Action Banner */}
      {showUndoBanner && lastIgnored && (
        <div className="fixed bottom-6 right-6 bg-text-primary text-bg-primary shadow-xl px-4 py-3 rounded-lg flex items-center gap-4 transition-all animate-in fade-in slide-in-from-bottom-5 z-50">
          <div className="text-sm">
            <span className="font-semibold">
              {lastIgnored.transaction.sender_name || 'Transaction'}
            </span>{' '}
            marked as ignored.
          </div>
          <button
            onClick={handleUndoIgnore}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-monday-primary hover:text-monday-primary/80 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('payments.unmatched.undo') || 'Undo'}
          </button>
          <button
            onClick={() => {
              setShowUndoBanner(false)
              setLastIgnored(null)
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
