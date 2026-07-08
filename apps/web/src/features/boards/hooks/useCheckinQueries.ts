'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { createClient } from '@/lib/supabase'
import type { CheckinSummary, LocationCheckin } from '@/types/checkin'

const getSupabase = () => createClient()

export function useBoardCheckinSummary(boardId: string) {
  return useQuery({
    queryKey: queryKeys.checkins.summary(boardId),
    queryFn: async (): Promise<Map<string, CheckinSummary>> => {
      const res = await fetch(`/api/checkins/summary?board_id=${boardId}`)
      if (!res.ok) throw new Error('Failed to fetch checkin summary')
      const data: CheckinSummary[] = await res.json()
      const map = new Map<string, CheckinSummary>()
      for (const s of data) map.set(s.item_id, s)
      return map
    },
    enabled: !!boardId,
    staleTime: 30_000,
  })
}

export function useItemCheckins(itemId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.checkins.byItem(itemId),
    queryFn: async (): Promise<LocationCheckin[]> => {
      const res = await fetch(`/api/checkins?board_item_id=${itemId}&limit=50`)
      if (!res.ok) throw new Error('Failed to fetch checkins')
      return res.json()
    },
    enabled: !!itemId && enabled,
    staleTime: 15_000,
  })
}

export function useCreateItemCheckin(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      inspector_id: string
      board_item_id: string
      board_column_id?: string
      checkin_type?: string
      lat: number
      lng: number
      accuracy?: number
      notes?: string
    }) => {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.summary(boardId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkins.byItem(variables.board_item_id),
      })
      // Stage automation may have updated the item's status column
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}

export function useDeleteCheckin(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { checkin_id: string; board_item_id: string }) => {
      const res = await fetch(`/api/checkins?id=${input.checkin_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.summary(boardId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkins.byItem(variables.board_item_id),
      })
    },
  })
}

export function useCheckout(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      checkin_id: string
      board_item_id: string
      lat: number
      lng: number
      accuracy?: number
    }) => {
      const res = await fetch('/api/checkins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: input.checkin_id,
          lat: input.lat,
          lng: input.lng,
          accuracy: input.accuracy,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.summary(boardId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkins.byItem(variables.board_item_id),
      })
    },
  })
}
