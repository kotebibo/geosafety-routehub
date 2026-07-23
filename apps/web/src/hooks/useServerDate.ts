'use client'

import { useQuery } from '@tanstack/react-query'

export interface ServerDate {
  nowUtc: string
  georgiaDate: string // YYYY-MM-DD (today in Georgia)
  georgiaTime: string // HH:MM:SS
  weekStart: string // Monday of this Georgia week
  nextWeekStart: string // Monday of next Georgia week
}

// Authoritative Georgia day/week from the server (GET /api/time). Use this
// instead of `new Date()` for any day/week decision so a wrong or drifting
// device clock can't shift things. Refetches on focus and on an interval so a
// tab left open across midnight self-corrects without a manual refresh.
export function useServerDate() {
  return useQuery({
    queryKey: ['server-time'],
    queryFn: async (): Promise<ServerDate> => {
      const res = await fetch('/api/time')
      if (!res.ok) throw new Error('Failed to load server time')
      return res.json()
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
