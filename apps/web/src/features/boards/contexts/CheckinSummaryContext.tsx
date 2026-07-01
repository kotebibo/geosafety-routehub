'use client'

import { createContext, useContext, useMemo } from 'react'
import { useBoardCheckinSummary } from '../hooks/useCheckinQueries'
import type { CheckinSummary } from '@/types/checkin'

const CheckinSummaryContext = createContext<Map<string, CheckinSummary>>(new Map())

interface CheckinSummaryProviderProps {
  boardId: string
  children: React.ReactNode
}

export function CheckinSummaryProvider({ boardId, children }: CheckinSummaryProviderProps) {
  const { data: summaryMap } = useBoardCheckinSummary(boardId)
  const value = useMemo(() => summaryMap ?? new Map<string, CheckinSummary>(), [summaryMap])
  return <CheckinSummaryContext.Provider value={value}>{children}</CheckinSummaryContext.Provider>
}

export function useCheckinSummary(itemId: string): CheckinSummary | undefined {
  const map = useContext(CheckinSummaryContext)
  return map.get(itemId)
}
