import { getSupabase } from '@/lib/supabase'
import type {
  BoardColumn,
  BoardView,
  BoardType,
  BoardFilter,
  SortConfig,
  ColumnConfig,
} from '@/types/board'

// Use any type for supabase to bypass strict table typings
// This is needed because the database schema types may not be in sync
const supabase = getSupabase() as any

/**
 * Board Configuration Service
 * Handles board columns, views, and configuration
 */
export const boardsService = {
  // ==================== BOARD COLUMNS ====================

  /**
   * Get all columns for a specific board type or board
   * If boardId is provided, gets board-specific columns + default columns for that type
   * If boardId is null, gets only default columns for the board type
   */
  async getColumns(boardType: BoardType, boardId?: string): Promise<BoardColumn[]> {
    // Simple query that works both before and after migration 015
    const { data, error } = await supabase
      .from('board_columns')
      .select('*')
      .eq('board_type', boardType)
      .order('position', { ascending: true })

    if (error) throw error

    // Filter client-side if boardId is provided and board_id column exists
    if (boardId && data && data.length > 0) {
      // Check if board_id column exists in the data
      const hasBoardIdColumn = 'board_id' in data[0]
      if (hasBoardIdColumn) {
        // After migration 015: include columns where board_id is null OR matches boardId
        return data.filter((col: any) => !col.board_id || col.board_id === boardId)
      }
    }

    return data || []
  },

  /**
   * Get visible columns only
   */
  async getVisibleColumns(boardType: BoardType): Promise<BoardColumn[]> {
    const { data, error } = await supabase
      .from('board_columns')
      .select('*')
      .eq('board_type', boardType)
      .eq('is_visible', true)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Update column configuration
   */
  async updateColumn(
    columnId: string,
    updates: Partial<BoardColumn>
  ): Promise<BoardColumn> {
    const { data, error } = await supabase
      .from('board_columns')
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
      supabase
        .from('board_columns')
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
    label: string
    column_type: string
    width: number
    position: number
    is_visible: boolean
  }): Promise<BoardColumn> {
    const { data, error } = await supabase
      .from('board_columns')
      .insert(column)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a column
   */
  async deleteColumn(columnId: string): Promise<void> {
    const { error } = await supabase
      .from('board_columns')
      .delete()
      .eq('id', columnId)

    if (error) throw error
  },

  // ==================== BOARD VIEWS ====================

  /**
   * Get all views for a board type
   */
  async getViews(boardType: BoardType, userId: string): Promise<BoardView[]> {
    const { data, error } = await supabase
      .from('board_views')
      .select('*')
      .eq('board_type', boardType)
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get default view for a board type
   */
  async getDefaultView(
    boardType: BoardType,
    userId: string
  ): Promise<BoardView | null> {
    const { data, error } = await supabase
      .from('board_views')
      .select('*')
      .eq('board_type', boardType)
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    return data
  },

  /**
   * Get a specific view by ID
   */
  async getView(viewId: string): Promise<BoardView> {
    const { data, error } = await supabase
      .from('board_views')
      .select('*')
      .eq('id', viewId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a new view
   */
  async createView(view: Omit<BoardView, 'id' | 'created_at' | 'updated_at'>): Promise<BoardView> {
    // If setting as default, unset other defaults first
    if (view.is_default) {
      await supabase
        .from('board_views')
        .update({ is_default: false })
        .eq('user_id', view.user_id)
        .eq('board_type', view.board_type)
    }

    const { data, error } = await supabase
      .from('board_views')
      .insert(view)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update an existing view
   */
  async updateView(
    viewId: string,
    updates: Partial<BoardView>
  ): Promise<BoardView> {
    const { data, error } = await supabase
      .from('board_views')
      .update(updates)
      .eq('id', viewId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<void> {
    const { error } = await supabase
      .from('board_views')
      .delete()
      .eq('id', viewId)

    if (error) throw error
  },

  /**
   * Set a view as default
   */
  async setDefaultView(viewId: string, userId: string, boardType: BoardType): Promise<void> {
    // Unset other defaults
    await supabase
      .from('board_views')
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
