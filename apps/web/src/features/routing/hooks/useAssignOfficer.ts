'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useUpdateBoard } from '@/features/boards/hooks'
import { createClient } from '@/lib/supabase'
import type { Board } from '@/types/board'

/**
 * Assigns/unassigns an officer to a board. Assignment does two things:
 *  1. stores the officer id in board.settings.assigned_officer_id
 *  2. adds the officer as a board_member so RLS scopes them to this board
 *     (an officer who is a member only of their own board sees only it).
 */
export function useAssignOfficer(board: Board) {
  const { user } = useAuth()
  const updateBoard = useUpdateBoard(board.id, user?.id || '')
  const current = board.settings?.assigned_officer_id ?? null

  const addMember = async (officerId: string) => {
    const supabase = createClient() as any
    await supabase
      .from('board_members')
      .upsert(
        { board_id: board.id, user_id: officerId, role: 'viewer', added_by: user?.id ?? null },
        { onConflict: 'board_id,user_id' }
      )
  }
  const removeMember = async (officerId: string) => {
    const supabase = createClient() as any
    await supabase.from('board_members').delete().eq('board_id', board.id).eq('user_id', officerId)
  }

  const assign = async (officerId: string) => {
    // drop the previous officer's membership if we're reassigning
    if (current && current !== officerId) await removeMember(current)
    await addMember(officerId)
    await updateBoard.mutateAsync({
      settings: { ...board.settings, assigned_officer_id: officerId },
    })
  }

  const unassign = async () => {
    if (current) await removeMember(current)
    const next = { ...board.settings }
    delete next.assigned_officer_id
    await updateBoard.mutateAsync({ settings: next })
  }

  return { assignedOfficerId: current, assign, unassign, isSaving: updateBoard.isPending }
}
