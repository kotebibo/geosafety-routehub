'use client'

import { useQuery } from '@tanstack/react-query'

export interface AuditEntry {
  id: string
  actorName: string | null
  action: string
  entity: string | null
  weekStart: string | null
  detail: Record<string, any>
  createdAt: string
}

/** Routing change history for an officer (optionally scoped to a week). */
export function useRoutingAudit(inspectorId: string, weekStart?: string) {
  return useQuery({
    queryKey: ['routing-audit', inspectorId, weekStart ?? 'all'],
    queryFn: async (): Promise<AuditEntry[]> => {
      const qs = new URLSearchParams({ inspectorId })
      if (weekStart) qs.set('weekStart', weekStart)
      const res = await fetch(`/api/routing/audit?${qs.toString()}`)
      if (!res.ok) throw new Error('Failed to load history')
      return (await res.json()).entries ?? []
    },
    enabled: !!inspectorId,
    staleTime: 15_000,
  })
}
