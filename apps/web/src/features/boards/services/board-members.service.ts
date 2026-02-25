// Board Members Service
// Handles board member operations: get, add, update role, remove

import { createClient } from '@/lib/supabase'
import type { BoardMember } from '@/types/board'

const getSupabase = (): any => createClient()

export const boardMembersService = {
  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    const { data: members, error } = await (getSupabase() as any)
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .order('added_at', { ascending: true })

    if (error) throw error
    if (!members || members.length === 0) return []

    // Fetch user details separately
    const userIds = members.map((m: any) => m.user_id)
    const { data: users } = await (getSupabase() as any)
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    const userMap = new Map((users || []).map((u: any) => [u.id, u]))

    return members.map((member: any) => ({
      ...member,
      user: userMap.get(member.user_id) || null,
    }))
  },

  async addBoardMember(
    boardId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer',
    addedBy: string
  ): Promise<BoardMember> {
    const { data, error } = await (getSupabase() as any)
      .from('board_members')
      .upsert(
        {
          board_id: boardId,
          user_id: userId,
          role,
          added_by: addedBy,
        },
        {
          onConflict: 'board_id,user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateBoardMemberRole(
    boardId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer'
  ): Promise<BoardMember> {
    const { data, error } = await (getSupabase() as any)
      .from('board_members')
      .update({ role })
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeBoardMember(boardId: string, userId: string): Promise<void> {
    const { error } = await (getSupabase() as any)
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)

    if (error) throw error
  },
}
