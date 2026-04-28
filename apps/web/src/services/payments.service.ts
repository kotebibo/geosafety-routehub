/**
 * Payments Service
 * Client-side service for payment/transaction data
 */

import type { PaymentStats } from '@/lib/bog/types'

export interface BankTransaction {
  id: string
  doc_key: string
  entry_date: string
  doc_date: string | null
  amount: number
  currency: string
  sender_name: string | null
  sender_inn: string | null
  sender_account: string | null
  receiver_account: string | null
  purpose: string | null
  matched_company_id: string | null
  match_method: string | null
  match_confidence: number | null
  status: 'matched' | 'unmatched' | 'ignored'
  created_at: string
  updated_at: string
  companies: {
    id: string
    name: string
    tax_id: string | null
  } | null
}

export interface TransactionsResponse {
  transactions: BankTransaction[]
  total: number
  page: number
  limit: number
}

export interface UnmatchedTransaction extends BankTransaction {
  suggested_companies: Array<{
    company_id: string
    company_name: string
    tax_id: string | null
    confidence: number
    reason: string
  }>
}

export const paymentsService = {
  getTransactions: async (params?: {
    status?: string
    companyId?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  }): Promise<TransactionsResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.companyId) searchParams.set('companyId', params.companyId)
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const response = await fetch(`/api/payments?${searchParams}`)
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to fetch transactions')
    }
    return response.json()
  },

  getStats: async (): Promise<PaymentStats> => {
    const response = await fetch('/api/payments/stats')
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to fetch payment stats')
    }
    return response.json()
  },

  getUnmatched: async (): Promise<UnmatchedTransaction[]> => {
    const response = await fetch('/api/payments/unmatched')
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to fetch unmatched transactions')
    }
    return response.json()
  },

  matchTransaction: async (
    transactionId: string,
    companyId: string,
    notes?: string
  ): Promise<void> => {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'match',
        transactionId,
        companyId,
        notes,
      }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to match transaction')
    }
  },

  ignoreTransaction: async (transactionId: string): Promise<void> => {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ignore',
        transactionId,
      }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to ignore transaction')
    }
  },
}
