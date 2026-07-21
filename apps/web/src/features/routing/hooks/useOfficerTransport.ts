'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type FuelType = 'petrol' | 'diesel' | 'gas'
export type OfficerOrg = 'geosafety' | 'safetycorp'

export interface OfficerTransport {
  user_id: string
  car_model: string | null
  car_plate: string | null
  engine: string | null
  fuel_type: FuelType | null
  org: OfficerOrg | null
  consumption_l_per_100km: number | null
  home_lat: number | null
  home_lng: number | null
  home_address: string | null
  start_lat: number | null
  start_lng: number | null
  start_address: string | null
  updated_at?: string | null
}

export type OfficerTransportInput = {
  user_id: string
  car_model?: string | null
  car_plate?: string | null
  engine?: string | null
  fuel_type?: FuelType | null
  org?: OfficerOrg | null
  consumption_l_per_100km?: number | null
  home_lat?: number | null
  home_lng?: number | null
  home_address?: string | null
  start_lat?: number | null
  start_lng?: number | null
  start_address?: string | null
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
