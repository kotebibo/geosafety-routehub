import { createClient } from '@/lib/supabase'
import type { BoardSubitem, BoardSubitemColumn } from '../types/board'

const getSupabase = () => createClient()

// Helper: tables not in generated types yet, cast to any
const subitemsTable = () => getSupabase().from('board_subitems') as any
const subitemColumnsTable = () => getSupabase().from('board_subitem_columns') as any

/**
 * Board Subitems Service
 * Handles CRUD for subitems (child rows under parent board items)
 */
export const boardSubitemsService = {
  // ─── Subitems ───

  async getSubitems(parentItemId: string): Promise<BoardSubitem[]> {
    const { data, error } = await subitemsTable()
      .select('*')
      .eq('parent_item_id', parentItemId)
      .order('position')

    if (error) throw error
    return data || []
  },

  async getSubitemsByBoard(boardId: string): Promise<BoardSubitem[]> {
    const { data, error } = await subitemsTable()
      .select('*')
      .eq('board_id', boardId)
      .order('position')

    if (error) throw error
    return data || []
  },

  async createSubitem(subitem: {
    parent_item_id: string
    board_id: string
    name: string
    position: number
    data?: Record<string, any>
    status?: string
    assigned_to?: string
    due_date?: string
    created_by?: string
  }): Promise<BoardSubitem> {
    const { data, error } = await subitemsTable().insert(subitem).select().single()

    if (error) throw error
    return data
  },

  async updateSubitem(
    subitemId: string,
    updates: Partial<
      Pick<BoardSubitem, 'name' | 'data' | 'status' | 'assigned_to' | 'due_date' | 'position'>
    >
  ): Promise<BoardSubitem> {
    const { data, error } = await subitemsTable()
      .update(updates)
      .eq('id', subitemId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteSubitem(subitemId: string): Promise<void> {
    const { error } = await subitemsTable().delete().eq('id', subitemId)

    if (error) throw error
  },

  async reorderSubitems(updates: { id: string; position: number }[]): Promise<void> {
    for (const { id, position } of updates) {
      const { error } = await subitemsTable().update({ position }).eq('id', id)

      if (error) throw error
    }
  },

  async getSubitemCount(parentItemId: string): Promise<number> {
    const { count, error } = await subitemsTable()
      .select('*', { count: 'exact', head: true })
      .eq('parent_item_id', parentItemId)

    if (error) throw error
    return count || 0
  },

  async getSubitemCounts(parentItemIds: string[]): Promise<Record<string, number>> {
    if (parentItemIds.length === 0) return {}

    // Batch into chunks to avoid URL length limits (400 errors)
    const BATCH_SIZE = 200
    const counts: Record<string, number> = {}

    for (let i = 0; i < parentItemIds.length; i += BATCH_SIZE) {
      const batch = parentItemIds.slice(i, i + BATCH_SIZE)
      const { data, error } = await subitemsTable()
        .select('parent_item_id')
        .in('parent_item_id', batch)

      if (error) throw error

      for (const row of data || []) {
        counts[row.parent_item_id] = (counts[row.parent_item_id] || 0) + 1
      }
    }

    return counts
  },

  // ─── Subitem Columns ───

  async getSubitemColumns(boardId: string): Promise<BoardSubitemColumn[]> {
    const { data, error } = await subitemColumnsTable()
      .select('*')
      .eq('board_id', boardId)
      .order('position')

    if (error) throw error
    return data || []
  },

  async createSubitemColumn(column: {
    board_id: string
    column_id: string
    column_name: string
    column_name_ka?: string
    column_type: string
    is_visible?: boolean
    position: number
    width?: number
    config?: Record<string, any>
  }): Promise<BoardSubitemColumn> {
    const { data, error } = await subitemColumnsTable().insert(column).select().single()

    if (error) throw error
    return data
  },

  async updateSubitemColumn(
    id: string,
    updates: Partial<
      Pick<
        BoardSubitemColumn,
        'column_name' | 'column_name_ka' | 'is_visible' | 'position' | 'width' | 'config'
      >
    >
  ): Promise<BoardSubitemColumn> {
    const { data, error } = await subitemColumnsTable()
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteSubitemColumn(id: string): Promise<void> {
    const { error } = await subitemColumnsTable().delete().eq('id', id)

    if (error) throw error
  },

  async ensureDefaultColumns(boardId: string): Promise<BoardSubitemColumn[]> {
    const existing = await boardSubitemsService.getSubitemColumns(boardId)
    if (existing.length > 0) return existing

    const defaults = [
      {
        board_id: boardId,
        column_id: 'name',
        column_name: 'Name',
        column_name_ka: 'სახელი',
        column_type: 'text',
        position: 0,
        width: 200,
      },
      {
        board_id: boardId,
        column_id: 'status',
        column_name: 'Status',
        column_name_ka: 'სტატუსი',
        column_type: 'status',
        position: 1,
        width: 130,
      },
      {
        board_id: boardId,
        column_id: 'person',
        column_name: 'Person',
        column_name_ka: 'პირი',
        column_type: 'person',
        position: 2,
        width: 130,
      },
      {
        board_id: boardId,
        column_id: 'date',
        column_name: 'Date',
        column_name_ka: 'თარიღი',
        column_type: 'date',
        position: 3,
        width: 130,
      },
    ]

    const { data, error } = await subitemColumnsTable().insert(defaults).select()

    if (error) throw error
    return data || []
  },
}
