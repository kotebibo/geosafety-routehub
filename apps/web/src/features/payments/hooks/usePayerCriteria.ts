import { useState, useEffect, useCallback } from 'react'

import type { PayerCriteria } from '@/services/financial-analytics.service'

interface UsePayerCriteriaParams {
  enabled: boolean
}

export function usePayerCriteria({ enabled }: UsePayerCriteriaParams) {
  const [criteria, setCriteria] = useState<PayerCriteria | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCriteria = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/payer-criteria')
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch payer criteria')
      }
      const data = await response.json()
      setCriteria(data.criteria)
    } catch (err) {
      console.error('Error fetching payer criteria:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      fetchCriteria()
    }
  }, [enabled, fetchCriteria])

  const save = useCallback(async (next: PayerCriteria) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/payments/payer-criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save payer criteria')
      }
      const data = await response.json()
      setCriteria(data.criteria)
    } finally {
      setSaving(false)
    }
  }, [])

  return { criteria, loading, save, saving, error }
}
