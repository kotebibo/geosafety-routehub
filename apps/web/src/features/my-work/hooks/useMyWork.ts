import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '@/lib/react-query'
import { myWorkService } from '@/services/my-work.service'
import type { MyWorkItem } from '@/services/my-work.service'

const MY_WORK_KEY = [...queryKeys.routes.all, 'my-work'] as const

export type DateGroup = 'overdue' | 'today' | 'this_week' | 'next_week' | 'later' | 'no_date'

export interface GroupedMyWork {
  overdue: MyWorkItem[]
  today: MyWorkItem[]
  this_week: MyWorkItem[]
  next_week: MyWorkItem[]
  later: MyWorkItem[]
  no_date: MyWorkItem[]
}

function getDateGroup(dateStr: string | null): DateGroup {
  if (!dateStr) return 'no_date'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)

  const diffMs = date.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'

  const todayDay = today.getDay()
  const daysUntilEndOfWeek = 7 - todayDay
  if (diffDays <= daysUntilEndOfWeek) return 'this_week'
  if (diffDays <= daysUntilEndOfWeek + 7) return 'next_week'
  return 'later'
}

export function useMyWorkItems(userId: string) {
  return useQuery({
    queryKey: MY_WORK_KEY,
    queryFn: () => myWorkService.getMyWorkItems(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useGroupedMyWork(items: MyWorkItem[] | undefined): GroupedMyWork {
  return useMemo(() => {
    const groups: GroupedMyWork = {
      overdue: [],
      today: [],
      this_week: [],
      next_week: [],
      later: [],
      no_date: [],
    }

    if (!items) return groups

    for (const item of items) {
      const group = getDateGroup(item.item_due_date)
      groups[group].push(item)
    }

    return groups
  }, [items])
}

export function useUpdateMyWorkItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      myWorkService.updateItemStatus(itemId, status),
    onMutate: async ({ itemId, status }) => {
      await queryClient.cancelQueries({ queryKey: MY_WORK_KEY })
      const previous = queryClient.getQueryData<MyWorkItem[]>(MY_WORK_KEY)
      if (previous) {
        queryClient.setQueryData(
          MY_WORK_KEY,
          previous.map(item => (item.item_id === itemId ? { ...item, item_status: status } : item))
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MY_WORK_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MY_WORK_KEY })
    },
  })
}

export function useUpdateMyWorkItemDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      dateColumnId,
      date,
    }: {
      itemId: string
      dateColumnId: string | null
      date: string | null
    }) => myWorkService.updateItemDate(itemId, dateColumnId, date),
    onMutate: async ({ itemId, date }) => {
      await queryClient.cancelQueries({ queryKey: MY_WORK_KEY })
      const previous = queryClient.getQueryData<MyWorkItem[]>(MY_WORK_KEY)
      if (previous) {
        queryClient.setQueryData(
          MY_WORK_KEY,
          previous.map(item => (item.item_id === itemId ? { ...item, item_due_date: date } : item))
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MY_WORK_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MY_WORK_KEY })
    },
  })
}
