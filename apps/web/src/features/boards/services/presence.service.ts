import { getSupabase } from '@/lib/supabase'
import type { BoardPresence, BoardType } from '@/types/board'

const supabase = getSupabase()

/**
 * Real-time Presence Service
 * Tracks which users are viewing/editing boards
 */
export const presenceService = {
  /**
   * Update user presence on a board
   */
  async updatePresence(
    userId: string,
    boardType: BoardType,
    boardId?: string,
    isEditing = false,
    editingItemId?: string
  ): Promise<void> {
    const { error } = await supabase.from('board_presence').upsert(
      {
        user_id: userId,
        board_type: boardType,
        board_id: boardId || null,
        last_seen: new Date().toISOString(),
        is_editing: isEditing,
        editing_item_id: editingItemId || null,
      },
      {
        onConflict: 'user_id,board_type,board_id',
      }
    )

    if (error) throw error
  },

  /**
   * Get all users currently on a board
   */
  async getBoardPresence(
    boardType: BoardType,
    boardId?: string
  ): Promise<BoardPresence[]> {
    let query = supabase
      .from('board_presence')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .eq('board_type', boardType)
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 minutes

    if (boardId) {
      query = query.eq('board_id', boardId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((presence: any) => ({
      ...presence,
      user_name: presence.inspectors?.full_name || presence.inspectors?.email,
    }))
  },

  /**
   * Remove user presence (on logout/leave)
   */
  async removePresence(
    userId: string,
    boardType: BoardType,
    boardId?: string
  ): Promise<void> {
    let query = supabase
      .from('board_presence')
      .delete()
      .eq('user_id', userId)
      .eq('board_type', boardType)

    if (boardId) {
      query = query.eq('board_id', boardId)
    }

    const { error } = await query

    if (error) throw error
  },

  /**
   * Clean up stale presence records (older than 5 minutes)
   */
  async cleanupStalePresence(): Promise<void> {
    const { error } = await supabase
      .from('board_presence')
      .delete()
      .lt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())

    if (error) throw error
  },

  /**
   * Subscribe to presence changes on a board
   */
  subscribeToPresence(
    boardType: BoardType,
    boardId: string | undefined,
    callback: (payload: any) => void
  ) {
    let filter = `board_type=eq.${boardType}`
    if (boardId) {
      filter += `,board_id=eq.${boardId}`
    }

    return supabase
      .channel(`presence:${boardType}:${boardId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_presence',
          filter,
        },
        callback
      )
      .subscribe()
  },

  /**
   * Use Supabase Presence (real-time presence tracking)
   */
  createPresenceChannel(
    boardType: BoardType,
    boardId: string | undefined,
    userId: string,
    userName: string
  ) {
    const channelName = `board-presence:${boardType}:${boardId || 'all'}`

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    let presenceState: BoardPresence[] = []

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        presenceState = Object.values(state)
          .flat()
          .map((presence: any) => ({
            user_id: presence.user_id,
            user_name: presence.user_name,
            user_avatar: presence.user_avatar,
            board_type: boardType,
            board_id: boardId,
            last_seen: presence.timestamp,
            is_editing: presence.is_editing || false,
            editing_item_id: presence.editing_item_id,
          }))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_name: userName,
            board_type: boardType,
            board_id: boardId,
            timestamp: new Date().toISOString(),
            is_editing: false,
          })
        }
      })

    return {
      channel,
      getPresenceState: () => presenceState,
      updatePresence: async (updates: Partial<BoardPresence>) => {
        await channel.track({
          user_id: userId,
          user_name: userName,
          board_type: boardType,
          board_id: boardId,
          timestamp: new Date().toISOString(),
          ...updates,
        })
      },
      unsubscribe: async () => {
        await supabase.removeChannel(channel)
      },
    }
  },
}
