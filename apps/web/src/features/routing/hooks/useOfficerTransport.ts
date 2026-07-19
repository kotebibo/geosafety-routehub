'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface OfficerTransport {
  user_id: string
  car_model: string | null
  engine: string | null
  consumption_l_per_100km: number | null
  updated_at?: string | null
}

export type OfficerTransportInput = {
  user_id: string
  car_model?: string | null
  engine?: string | null
  consumption_l_per_100km?: number | null
}

export function useOfficerTransport(userId: string) {
  return useQuery({
    queryKey: ['officer-transport', userId],
    queryFn: async (): Promise<OfficerTransport | null> => {
      const res = await fetch(`/api/admin/officer-transport?userId=${userId}`)
      if (!res.ok) throw new Error('Failed to load transport')
      return res.json()
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useSaveOfficerTransport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: OfficerTransportInput): Promise<OfficerTransport> => {
      const res = await fetch('/api/admin/officer-transport', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['officer-transport', variables.user_id] })
    },
  })
}
