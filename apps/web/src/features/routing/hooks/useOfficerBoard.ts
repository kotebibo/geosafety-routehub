'use client'

import { useMemo } from 'react'
import { useUserBoards } from '@/features/boards/hooks'
import { useAuth } from '@/contexts/AuthContext'
import type { Board } from '@/types/board'

/**
 * The officer's own board. One officer is bound to one board (via
 * assigned_officer_id + board_members / RLS), so we take the first visible,
 * non-archived board. Managers viewing this get their first board too.
 */
export function useOfficerBoard() {
  const { user } = useAuth()
  const { data: boards = [], isLoading } = useUserBoards(user?.id || '')

  const board = useMemo<Board | null>(() => {
    const visible = (boards as Board[]).filter(b => !b.settings?.is_archived)
    // Prefer a board explicitly assigned to this officer, else the first one.
    return visible.find(b => b.settings?.assigned_officer_id === user?.id) ?? visible[0] ?? null
  }, [boards, user?.id])

  return { board, isLoading }
}
