import { createClient } from '@/lib/supabase'
import type {
  BoardColumn,
  BoardView,
  BoardType,
  BoardFilter,
  SortConfig,
  ColumnConfig,
} from '@/types/board'
import type { BoardGroup } from '../types/board'

// Helper to get supabase client with current auth state
// IMPORTANT: Must be called inside functions, not at module level
const getSupabase = () => createClient()

/**
 * Board Configuration Service
 * Handles board columns, views, and configuration
 */
export const boardsService = {
  // ==================== BOARD COLUMNS ====================

  /**
   * Get all columns for a specific board
   * Each board has its own columns - no shared/global columns
   */
  async getColumns(_boardType: BoardType, boardId?: string): Promise<BoardColumn[]> {
    // If no boardId provided, return empty - columns are always board-specific
    if (!boardId) {
      return []
    }

    // Get columns for this specific board only
    const { data, error } = await (getSupabase()
      .from('board_columns') as any)
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    if (error) throw error
    const columns = (data || []) as BoardColumn[]

    // Ensure a "name" column exists — older Monday imports may be missing it
    if (columns.length > 0 && !columns.some(c => c.column_id === 'name')) {
      const nameColumn: BoardColumn = {
        id: `${boardId}_name`,
        board_type: _boardType,
        column_id: 'name',
        column_name: 'Name',
        column_type: 'text',
        position: -1, // ensures it sorts first
        width: 200,
        is_visible: true,
        is_pinned: false,
        config: {},
      }
      columns.unshift(nameColumn)
    }

    return columns
  },

  /**
   * Get visible columns only
   */
  async getVisibleColumns(boardType: BoardType): Promise<BoardColumn[]> {
    const { data, error } = await (getSupabase()
      .from('board_columns') as any)
      .select('*')
      .eq('board_type', boardType)
      .eq('is_visible', true)
      .order('position', { ascending: true })

    if (error) throw error
    return (data || []) as BoardColumn[]
  },

  /**
   * Update column configuration
   */
  async updateColumn(
    columnId: string,
    updates: Partial<BoardColumn>
  ): Promise<BoardColumn> {
    const { data, error } = await (getSupabase()
      .from('board_columns') as any)
      .update(updates)
      .eq('id', columnId)
      .select()
      .single()

    if (error) throw error
    return data as BoardColumn
  },

  /**
   * Update multiple columns (for reordering)
   */
  async updateColumns(
    columns: Array<{ id: string; position: number; width?: number }>
  ): Promise<void> {
    const updates = columns.map((col) =>
      (getSupabase().from('board_columns') as any)
        .update({ position: col.position, width: col.width })
        .eq('id', col.id)
    )

    await Promise.all(updates)
  },

  /**
   * Toggle column visibility
   */
  async toggleColumnVisibility(
    columnId: string,
    isVisible: boolean
  ): Promise<BoardColumn> {
    return this.updateColumn(columnId, { is_visible: isVisible })
  },

  /**
   * Update column width
   */
  async updateColumnWidth(columnId: string, width: number): Promise<void> {
    await this.updateColumn(columnId, { width })
  },

  /**
   * Create a new column
   */
  async createColumn(column: {
    board_type: BoardType
    board_id?: string
    column_id: string
    column_name: string
    column_type: string
    width: number
    position: number
    is_visible: boolean
  }): Promise<BoardColumn> {
    const { data, error } = await (getSupabase()
      .from('board_columns') as any)
      .insert(column)
      .select()
      .single()

    if (error) throw error
    return data as BoardColumn
  },

  /**
   * Delete a column
   */
  async deleteColumn(columnId: string): Promise<void> {
    const { error } = await (getSupabase()
      .from('board_columns') as any)
      .delete()
      .eq('id', columnId)

    if (error) throw error
  },

  // ==================== BOARD GROUPS ====================

  /**
   * Get all groups for a board
   */
  async getBoardGroups(boardId: string): Promise<BoardGroup[]> {
    const { data, error } = await (getSupabase()
      .from('board_groups') as any)
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    if (error) throw error
    return (data || []) as BoardGroup[]
  },

  /**
   * Create a new group
   */
  async createBoardGroup(group: {
    board_id: string
    name: string
    color: string
    position: number
  }): Promise<BoardGroup> {
    const { data, error } = await (getSupabase()
      .from('board_groups') as any)
      .insert(group)
      .select()
      .single()

    if (error) throw error
    return data as BoardGroup
  },

  /**
   * Update a group
   */
  async updateBoardGroup(
    groupId: string,
    updates: Partial<Pick<BoardGroup, 'name' | 'color' | 'position' | 'is_collapsed'>>
  ): Promise<BoardGroup> {
    const { data, error } = await (getSupabase()
      .from('board_groups') as any)
      .update(updates)
      .eq('id', groupId)
      .select()
      .single()

    if (error) throw error
    return data as BoardGroup
  },

  /**
   * Delete a group
   */
  async deleteBoardGroup(groupId: string): Promise<void> {
    const { error } = await (getSupabase()
      .from('board_groups') as any)
      .delete()
      .eq('id', groupId)

    if (error) throw error
  },

  /**
   * Reorder multiple groups (batch update positions)
   */
  async reorderBoardGroups(
    updates: Array<{ id: string; position: number }>
  ): Promise<void> {
    const promises = updates.map((update) =>
      (getSupabase().from('board_groups') as any)
        .update({ position: update.position })
        .eq('id', update.id)
    )

    await Promise.all(promises)
  },

  // ==================== BOARD VIEWS ====================

  /**
   * Get all views for a board type
   */
  async getViews(boardType: BoardType, userId: string): Promise<BoardView[]> {
    const { data, error } = await (getSupabase()
      .from('board_views') as any)
      .select('*')
      .eq('board_type', boardType)
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as BoardView[]
  },

  /**
   * Get default view for a board type
   */
  async getDefaultView(
    boardType: BoardType,
    userId: string
  ): Promise<BoardView | null> {
    const { data, error } = await (getSupabase()
      .from('board_views') as any)
      .select('*')
      .eq('board_type', boardType)
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    return data as BoardView | null
  },

  /**
   * Get a specific view by ID
   */
  async getView(viewId: string): Promise<BoardView> {
    const { data, error } = await (getSupabase()
      .from('board_views') as any)
      .select('*')
      .eq('id', viewId)
      .single()

    if (error) throw error
    return data as BoardView
  },

  /**
   * Create a new view
   */
  async createView(view: Omit<BoardView, 'id' | 'created_at' | 'updated_at'>): Promise<BoardView> {
    // If setting as default, unset other defaults first
    if (view.is_default) {
      await (getSupabase().from('board_views') as any)
        .update({ is_default: false })
        .eq('user_id', view.user_id)
        .eq('board_type', view.board_type)
    }

    const { data, error } = await (getSupabase()
      .from('board_views') as any)
      .insert(view)
      .select()
      .single()

    if (error) throw error
    return data as BoardView
  },

  /**
   * Update an existing view
   */
  async updateView(
    viewId: string,
    updates: Partial<BoardView>
  ): Promise<BoardView> {
    const { data, error } = await (getSupabase()
      .from('board_views') as any)
      .update(updates)
      .eq('id', viewId)
      .select()
      .single()

    if (error) throw error
    return data as BoardView
  },

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<void> {
    const { error } = await (getSupabase()
      .from('board_views') as any)
      .delete()
      .eq('id', viewId)

    if (error) throw error
  },

  /**
   * Set a view as default
   */
  async setDefaultView(viewId: string, userId: string, boardType: BoardType): Promise<void> {
    // Unset other defaults
    await (getSupabase().from('board_views') as any)
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('board_type', boardType)

    // Set this one as default
    await this.updateView(viewId, { is_default: true })
  },

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Apply filters to a Supabase query
   */
  applyFilters(query: any, filters: BoardFilter[]): any {
    let modifiedQuery = query

    filters.forEach((filter) => {
      const { column_id, operator, value } = filter

      switch (operator) {
        case 'equals':
          modifiedQuery = modifiedQuery.eq(column_id, value)
          break
        case 'not_equals':
          modifiedQuery = modifiedQuery.neq(column_id, value)
          break
        case 'contains':
          modifiedQuery = modifiedQuery.ilike(column_id, `%${value}%`)
          break
        case 'not_contains':
          modifiedQuery = modifiedQuery.not(column_id, 'ilike', `%${value}%`)
          break
        case 'starts_with':
          modifiedQuery = modifiedQuery.ilike(column_id, `${value}%`)
          break
        case 'ends_with':
          modifiedQuery = modifiedQuery.ilike(column_id, `%${value}`)
          break
        case 'is_empty':
          modifiedQuery = modifiedQuery.is(column_id, null)
          break
        case 'is_not_empty':
          modifiedQuery = modifiedQuery.not(column_id, 'is', null)
          break
        case 'greater_than':
          modifiedQuery = modifiedQuery.gt(column_id, value)
          break
        case 'less_than':
          modifiedQuery = modifiedQuery.lt(column_id, value)
          break
        case 'greater_than_or_equal':
          modifiedQuery = modifiedQuery.gte(column_id, value)
          break
        case 'less_than_or_equal':
          modifiedQuery = modifiedQuery.lte(column_id, value)
          break
        case 'is_one_of':
          modifiedQuery = modifiedQuery.in(column_id, value)
          break
        case 'is_not_one_of':
          modifiedQuery = modifiedQuery.not(column_id, 'in', value)
          break
        case 'date_is':
          modifiedQuery = modifiedQuery.eq(column_id, value)
          break
        case 'date_before':
          modifiedQuery = modifiedQuery.lt(column_id, value)
          break
        case 'date_after':
          modifiedQuery = modifiedQuery.gt(column_id, value)
          break
        case 'date_between':
          if (Array.isArray(value) && value.length === 2) {
            modifiedQuery = modifiedQuery.gte(column_id, value[0]).lte(column_id, value[1])
          }
          break
      }
    })

    return modifiedQuery
  },

  /**
   * Apply sorting to a Supabase query
   */
  applySort(query: any, sort: SortConfig | null): any {
    if (!sort) return query

    return query.order(sort.column_id, {
      ascending: sort.direction === 'asc',
    })
  },

  /**
   * Get column configuration from a view
   */
  getColumnConfigMap(columnConfig: ColumnConfig[]): Map<string, ColumnConfig> {
    return new Map(columnConfig.map((config) => [config.column_id, config]))
  },

  /**
   * Merge view column config with default columns
   */
  mergeColumnConfigs(
    defaultColumns: BoardColumn[],
    viewConfig: ColumnConfig[]
  ): BoardColumn[] {
    const configMap = this.getColumnConfigMap(viewConfig)

    return defaultColumns
      .map((col) => {
        const config = configMap.get(col.column_id)
        if (!config) return col

        return {
          ...col,
          is_visible: config.is_visible,
          width: config.width || col.width,
          position: config.position !== undefined ? config.position : col.position,
        }
      })
      .sort((a, b) => a.position - b.position)
  },
}
