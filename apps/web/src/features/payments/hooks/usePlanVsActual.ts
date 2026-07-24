import { useState, useEffect, useCallback } from 'react'

import type { PlanVsActualResponse } from '../types'

interface UsePlanVsActualParams {
  year: number
  isAuthorized: boolean
  authLoading: boolean
}

export function usePlanVsActual({ year, isAuthorized, authLoading }: UsePlanVsActualParams) {
  const [data, setData] = useState<PlanVsActualResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPlanVsActual = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payments/plan-vs-actual?year=${year}`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch plan vs actual')
      }
      setData(await response.json())
    } catch (err) {
      console.error('Error fetching plan vs actual:', err)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchPlanVsActual()
    }
  }, [authLoading, isAuthorized, fetchPlanVsActual])

  return { data, loading, refetch: fetchPlanVsActual }
}
