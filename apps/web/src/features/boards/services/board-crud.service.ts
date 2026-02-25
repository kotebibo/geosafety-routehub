// Board CRUD Service
// Handles core board operations: get, create, update, delete

import { createClient } from '@/lib/supabase'
import type { Board, BoardType } from '@/types/board'

const getSupabase = (): any => createClient()

export const boardCrudService = {
  async getBoards(userId?: string): Promise<Board[]> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getBoardsByType(boardType: BoardType, userId?: string): Promise<Board[]> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .eq('board_type', boardType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getBoard(boardId: string): Promise<Board> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error) throw error
    return data
  },

  async createBoard(board: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .insert(board)
      .select()
      .single()

    if (error) throw error

    // Create a default group so every board starts with one
    await (getSupabase() as any)
      .from('board_groups')
      .insert({
        board_id: data.id,
        name: 'Items',
        color: '#579bfc',
        position: 0,
      })

    return data
  },

  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await (getSupabase() as any)
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (error) throw error
  },

  async searchBoards(query: string, userId?: string): Promise<Board[]> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  },
}
