// Board CRUD Service
// Handles core board operations: get, create, update, delete

import { createClient } from '@/lib/supabase'
import type { Board, BoardType } from '@/types/board'

const getSupabase = () => createClient()

export const boardCrudService = {
  async getBoards(userId?: string): Promise<Board[]> {
    const { data, error } = await getSupabase()
      .from('boards')
      .select('*, workspace:workspaces(id, name, icon, color)')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as unknown as Board[]
  },

  async getBoardsByType(boardType: BoardType, userId?: string): Promise<Board[]> {
    const { data, error } = await getSupabase()
      .from('boards')
      .select('*')
      .eq('board_type', boardType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as unknown as Board[]
  },

  async getBoard(boardId: string): Promise<Board> {
    const { data, error } = await getSupabase()
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error) throw error
    return data as unknown as Board
  },

  async createBoard(board: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    const { data, error } = await getSupabase()
      .from('boards')
      .insert(board as any)
      .select()
      .single()

    if (error) throw error

    // Create a default group so every board starts with one
    await getSupabase().from('board_groups').insert({
      board_id: data.id,
      name: 'Items',
      color: '#579bfc',
      position: 0,
    })

    return data as unknown as Board
  },

  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    const { data, error } = await getSupabase()
      .from('boards')
      .update(updates as any)
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data as unknown as Board
  },

  async reorderBoards(updates: Array<{ id: string; position: number }>): Promise<void> {
    const promises = updates.map(({ id, position }) =>
      getSupabase().from('boards').update({ position }).eq('id', id)
    )
    const results = await Promise.all(promises)
    const error = results.find((r: any) => r.error)?.error
    if (error) throw error
  },

  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await getSupabase().from('boards').delete().eq('id', boardId)

    if (error) throw error
  },

  async searchBoards(query: string, userId?: string): Promise<Board[]> {
    const { data, error } = await getSupabase()
      .from('boards')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return (data || []) as unknown as Board[]
  },
}
