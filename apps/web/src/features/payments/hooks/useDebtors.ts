import { useState, useEffect, useCallback } from 'react'

import type { DebtorsResponse } from '../types'

interface UseDebtorsParams {
  monthsBack: number
  isAuthorized: boolean
  authLoading: boolean
}

export function useDebtors({ monthsBack, isAuthorized, authLoading }: UseDebtorsParams) {
  const [data, setData] = useState<DebtorsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDebtors = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/payments/debtors?months_back=${monthsBack}`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch debtors')
      }
      setData(await response.json())
    } catch (err) {
      console.error('Error fetching debtors:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [monthsBack])

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchDebtors()
    }
  }, [authLoading, isAuthorized, fetchDebtors])

  return { data, loading, error, refetch: fetchDebtors }
}
