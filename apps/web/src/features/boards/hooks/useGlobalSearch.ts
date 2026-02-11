'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { userBoardsService } from '../services/user-boards.service'

import type { GlobalSearchBoardGroup } from '@/types/board'

export function useGlobalSearch(query: string) {
  const { data: results, isLoading, error } = useQuery({
    queryKey: [...queryKeys.routes.all, 'global-search', query],
    queryFn: () => userBoardsService.searchGlobal(query),
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    placeholderData: (prev: any) => prev,
  })

  const groupedResults = useMemo((): GlobalSearchBoardGroup[] => {
    if (!results || results.length === 0) return []

    const boardMap = new Map<string, GlobalSearchBoardGroup>()

    for (const result of results) {
      const existing = boardMap.get(result.item_board_id)
      if (existing) {
        existing.items.push(result)
      } else {
        boardMap.set(result.item_board_id, {
          boardId: result.item_board_id,
          boardName: result.board_name,
          boardColor: result.board_color,
          boardIcon: result.board_icon,
          boardType: result.board_type,
          items: [result],
        })
      }
    }

    return Array.from(boardMap.values())
  }, [results])

  return {
    results: results || [],
    groupedResults,
    isLoading,
    error,
    totalCount: results?.length || 0,
  }
}
