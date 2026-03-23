import { createClient } from '@/lib/supabase'
import type { BoardViewTab, ViewType } from '../types/board'

const getSupabase = () => createClient()

// Helper: table not in generated types yet, cast to any
const viewTabsTable = () => getSupabase().from('board_view_tabs') as any

/**
 * Board View Tabs Service
 * Handles CRUD for per-board view tabs (each with independent filter/sort/group state)
 */
export const boardViewTabsService = {
  async getViewTabs(boardId: string): Promise<BoardViewTab[]> {
    const { data, error } = await viewTabsTable()
      .select('*')
      .eq('board_id', boardId)
      .order('position')

    if (error) throw error
    return data || []
  },

  async getViewTab(tabId: string): Promise<BoardViewTab> {
    const { data, error } = await viewTabsTable().select('*').eq('id', tabId).single()

    if (error) throw error
    return data
  },

  async createViewTab(tab: {
    board_id: string
    view_name: string
    view_name_ka?: string
    view_type: ViewType
    icon?: string
    position: number
    is_default?: boolean
    created_by?: string
  }): Promise<BoardViewTab> {
    const { data, error } = await viewTabsTable().insert(tab).select().single()

    if (error) throw error
    return data
  },

  async updateViewTab(
    tabId: string,
    updates: Partial<
      Pick<
        BoardViewTab,
        | 'view_name'
        | 'view_name_ka'
        | 'icon'
        | 'position'
        | 'filters'
        | 'sort_config'
        | 'group_by_column'
      >
    >
  ): Promise<BoardViewTab> {
    const { data, error } = await viewTabsTable().update(updates).eq('id', tabId).select().single()

    if (error) throw error
    return data
  },

  async deleteViewTab(tabId: string): Promise<void> {
    const { error } = await viewTabsTable().delete().eq('id', tabId)

    if (error) throw error
  },

  async reorderViewTabs(updates: { id: string; position: number }[]): Promise<void> {
    for (const { id, position } of updates) {
      const { error } = await viewTabsTable().update({ position }).eq('id', id)

      if (error) throw error
    }
  },

  async duplicateViewTab(tabId: string, newName: string): Promise<BoardViewTab> {
    // Fetch original
    const { data: original, error: fetchError } = await viewTabsTable()
      .select('*')
      .eq('id', tabId)
      .single()

    if (fetchError) throw fetchError

    // Get max position for the board
    const { data: tabs } = await viewTabsTable()
      .select('position')
      .eq('board_id', original.board_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = (tabs?.[0]?.position ?? 0) + 1

    // Create duplicate
    const { data, error } = await viewTabsTable()
      .insert({
        board_id: original.board_id,
        view_name: newName,
        view_name_ka: original.view_name_ka ? `${original.view_name_ka} (ასლი)` : null,
        view_type: original.view_type,
        icon: original.icon,
        position: nextPosition,
        is_default: false,
        filters: original.filters,
        sort_config: original.sort_config,
        group_by_column: original.group_by_column,
        created_by: original.created_by,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
