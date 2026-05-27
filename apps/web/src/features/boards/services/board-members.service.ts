// Board Members Service
// Handles board member operations: get, add, update role, remove

import { createClient } from '@/lib/supabase'
import type { BoardMember } from '@/types/board'

const getSupabase = () => createClient()

export const boardMembersService = {
  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    const { data: members, error } = await getSupabase()
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .order('added_at', { ascending: true })

    if (error) throw error
    if (!members || members.length === 0) return []

    // Fetch user details separately
    const userIds = members.map((m: any) => m.user_id)
    const { data: users } = await getSupabase()
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
    const { data, error } = await getSupabase()
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

    // Send email notification (fire-and-forget)
    // The DB trigger already creates the in-app notification
    this._sendBoardSharedEmail(boardId, userId, addedBy, role).catch(() => {})

    return data as unknown as BoardMember
  },

  /** @internal Send email when board is shared */
  async _sendBoardSharedEmail(
    boardId: string,
    userId: string,
    addedBy: string,
    role: string
  ): Promise<void> {
    const db = getSupabase()

    const [{ data: board }, { data: sharer }] = await Promise.all([
      db.from('boards').select('name').eq('id', boardId).maybeSingle(),
      db.from('users').select('full_name').eq('id', addedBy).maybeSingle(),
    ])

    const boardName = (board as any)?.name || 'a board'
    const sharerName = (sharer as any)?.full_name || 'Someone'

    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({
        user_id: userId,
        type: 'board_shared',
        title: `${sharerName} გაგიზიარათ დაფა`,
        message: `${sharerName} shared "${boardName}" with you`,
        data: { board_id: boardId, board_name: boardName, shared_by: sharerName, role },
      }),
    }).catch(() => {})
  },

  async updateBoardMemberRole(
    boardId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer'
  ): Promise<BoardMember> {
    const { data, error } = await getSupabase()
      .from('board_members')
      .update({ role })
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as unknown as BoardMember
  },

  async removeBoardMember(boardId: string, userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)

    if (error) throw error
  },
}
