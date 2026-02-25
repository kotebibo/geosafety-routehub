// Board Items Service
// Handles board item CRUD, duplication, bulk operations, and search

import { createClient } from '@/lib/supabase'
import type { BoardItem } from '@/types/board'

const getSupabase = (): any => createClient()

export const boardItemsService = {
  async getBoardItems(boardId: string): Promise<BoardItem[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getBoardItem(itemId: string): Promise<BoardItem> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (error) throw error
    return data
  },

  async createBoardItem(
    item: Omit<BoardItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<BoardItem> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateBoardItem(itemId: string, updates: Partial<BoardItem>): Promise<BoardItem> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateBoardItemField(
    itemId: string,
    fieldName: string,
    value: any
  ): Promise<BoardItem> {
    const item = await this.getBoardItem(itemId)
    const newData = { ...item.data, [fieldName]: value }
    return this.updateBoardItem(itemId, { data: newData })
  },

  async deleteBoardItem(itemId: string): Promise<void> {
    const { error } = await (getSupabase() as any)
      .from('board_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  },

  async bulkUpdateItems(updates: Array<{ id: string; data: Partial<BoardItem> }>): Promise<void> {
    const promises = updates.map(({ id, data }) => this.updateBoardItem(id, data))
    await Promise.all(promises)
  },

  async reorderItems(items: Array<{ id: string; position: number }>): Promise<void> {
    const promises = items.map(({ id, position }) =>
      this.updateBoardItem(id, { position })
    )
    await Promise.all(promises)
  },

  async duplicateBoardItem(
    itemId: string,
    options?: { newName?: string; targetBoardId?: string }
  ): Promise<BoardItem> {
    const originalItem = await this.getBoardItem(itemId)

    const targetBoardId = options?.targetBoardId || originalItem.board_id
    const { data: existingItems } = await (getSupabase() as any)
      .from('board_items')
      .select('position')
      .eq('board_id', targetBoardId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPosition = existingItems?.[0]?.position ?? -1

    const newItem = await this.createBoardItem({
      board_id: targetBoardId,
      group_id: originalItem.group_id,
      position: maxPosition + 1,
      data: { ...originalItem.data },
      name: options?.newName || `${originalItem.name} (copy)`,
      status: originalItem.status,
      assigned_to: originalItem.assigned_to,
      due_date: originalItem.due_date,
      priority: originalItem.priority,
      created_by: originalItem.created_by,
    })

    return newItem
  },

  async duplicateBoardItems(
    itemIds: string[],
    targetBoardId?: string
  ): Promise<BoardItem[]> {
    const duplicatedItems: BoardItem[] = []

    for (const itemId of itemIds) {
      const newItem = await this.duplicateBoardItem(itemId, { targetBoardId })
      duplicatedItems.push(newItem)
    }

    return duplicatedItems
  },

  async searchBoardItems(boardId: string, query: string): Promise<BoardItem[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .select('*')
      .eq('board_id', boardId)
      .ilike('name', `%${query}%`)
      .order('position', { ascending: true })
      .limit(50)

    if (error) throw error
    return data || []
  },

  async searchGlobal(query: string, maxPerBoard = 10, maxTotal = 100): Promise<any[]> {
    const { data, error } = await (getSupabase() as any)
      .rpc('search_board_items_global', {
        search_query: query,
        max_per_board: maxPerBoard,
        max_total: maxTotal,
      })

    if (error) throw error
    return data || []
  },
}
