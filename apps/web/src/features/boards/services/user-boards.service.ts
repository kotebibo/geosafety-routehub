// User Boards Service
// Handles CRUD operations for user-created boards

import { createClient } from '@/lib/supabase'
import type {
  Board,
  BoardColumn,
  BoardItem,
  BoardMember,
  BoardTemplate,
  BoardType,
} from '@/types/board'

// Helper to get supabase client with current auth state
// IMPORTANT: Must be called inside functions, not at module level
const getSupabase = (): any => createClient()

export const userBoardsService = {
  // ==================== BOARDS ====================

  /**
   * Get all boards accessible to the user
   * RLS policies automatically filter based on auth.uid()
   */
  async getBoards(userId?: string): Promise<Board[]> {
    const supabase = getSupabase()
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get boards by type
   * RLS policies automatically filter based on auth.email()
   */
  async getBoardsByType(boardType: BoardType, userId?: string): Promise<Board[]> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .eq('board_type', boardType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get a specific board by ID
   */
  async getBoard(boardId: string): Promise<Board> {
    const { data, error} = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a new board
   */
  async createBoard(board: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .insert(board)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create board from template
   */
  async createBoardFromTemplate(
    templateId: string,
    name: string,
    ownerId: string,
    workspaceId?: string
  ): Promise<Board> {
    // Get template
    const template = await this.getTemplate(templateId)

    // Create board with template settings
    const board: Omit<Board, 'id' | 'created_at' | 'updated_at'> = {
      owner_id: ownerId,
      board_type: template.board_type,
      name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      is_template: false,
      is_public: false,
      workspace_id: workspaceId,
      settings: {
        allowComments: true,
        allowActivityFeed: true,
        defaultView: 'table',
        permissions: {
          canEdit: [],
          canView: [],
        },
      },
    }

    const createdBoard = await this.createBoard(board)

    // Create columns from template - each board gets its own columns
    const columns = template.default_columns.map((col, index) => ({
      board_type: template.board_type,
      board_id: createdBoard.id,  // Link columns to this specific board
      column_id: col.id,
      column_name: col.name,
      column_name_ka: col.name_ka,
      column_type: col.type,
      is_visible: true,
      is_pinned: false,
      position: index,
      width: col.width,
      config: col.config || {},
    }))

    // Insert columns
    const { error: colError } = await (getSupabase() as any)
      .from('board_columns')
      .insert(columns)

    if (colError) console.error('Error creating columns:', colError)

    return createdBoard
  },

  /**
   * Update a board
   */
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

  /**
   * Delete a board
   */
  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await (getSupabase() as any)
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (error) throw error
  },

  /**
   * Duplicate a board (client-side implementation)
   * Creates a copy of the board with all its columns and items
   */
  async duplicateBoard(boardId: string, newName: string, ownerId: string): Promise<Board> {
    // Get the original board
    const originalBoard = await this.getBoard(boardId)

    // Create a new board with the same settings
    const newBoard = await this.createBoard({
      owner_id: ownerId,
      board_type: originalBoard.board_type,
      name: newName,
      name_ka: originalBoard.name_ka,
      description: originalBoard.description,
      icon: originalBoard.icon,
      color: originalBoard.color,
      is_template: false,
      is_public: false,
      settings: originalBoard.settings,
    })

    // Get and duplicate columns (board-specific ones only)
    const { data: originalColumns } = await (getSupabase() as any)
      .from('board_columns')
      .select('*')
      .eq('board_type', originalBoard.board_type)

    if (originalColumns && originalColumns.length > 0) {
      // Check if there are board-specific columns
      const boardSpecificColumns = originalColumns.filter(
        (col: any) => col.board_id === boardId
      )

      if (boardSpecificColumns.length > 0) {
        // Duplicate board-specific columns
        const newColumns = boardSpecificColumns.map((col: any) => ({
          board_type: col.board_type,
          board_id: newBoard.id,
          column_id: col.column_id,
          column_name: col.column_name,
          column_name_ka: col.column_name_ka,
          column_type: col.column_type,
          is_visible: col.is_visible,
          is_pinned: col.is_pinned,
          position: col.position,
          width: col.width,
          config: col.config,
        }))

        await (getSupabase() as any).from('board_columns').insert(newColumns)
      }
    }

    // Get and duplicate items
    const originalItems = await this.getBoardItems(boardId)

    if (originalItems.length > 0) {
      const newItems = originalItems.map((item, index) => ({
        board_id: newBoard.id,
        group_id: item.group_id,
        position: index,
        data: item.data,
        name: item.name,
        status: item.status,
        assigned_to: item.assigned_to,
        due_date: item.due_date,
        priority: item.priority,
        created_by: ownerId,
      }))

      await (getSupabase() as any).from('board_items').insert(newItems)
    }

    return newBoard
  },

  /**
   * Duplicate a single board item
   */
  async duplicateBoardItem(
    itemId: string,
    options?: { newName?: string; targetBoardId?: string }
  ): Promise<BoardItem> {
    // Get the original item
    const originalItem = await this.getBoardItem(itemId)

    // Get the max position in the target board
    const targetBoardId = options?.targetBoardId || originalItem.board_id
    const { data: existingItems } = await (getSupabase() as any)
      .from('board_items')
      .select('position')
      .eq('board_id', targetBoardId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPosition = existingItems?.[0]?.position ?? -1

    // Create the duplicate
    const newItem = await this.createBoardItem({
      board_id: targetBoardId,
      group_id: originalItem.group_id,
      position: maxPosition + 1,
      data: { ...originalItem.data }, // Deep copy the data
      name: options?.newName || `${originalItem.name} (copy)`,
      status: originalItem.status,
      assigned_to: originalItem.assigned_to,
      due_date: originalItem.due_date,
      priority: originalItem.priority,
      created_by: originalItem.created_by,
    })

    return newItem
  },

  /**
   * Duplicate multiple board items
   */
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

  // ==================== BOARD ITEMS ====================

  /**
   * Get all items in a board
   */
  async getBoardItems(boardId: string): Promise<BoardItem[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get a specific item
   */
  async getBoardItem(itemId: string): Promise<BoardItem> {
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a new item
   */
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

  /**
   * Update an item
   */
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

  /**
   * Update item field (specific field in data JSONB)
   */
  async updateBoardItemField(
    itemId: string,
    fieldName: string,
    value: any
  ): Promise<BoardItem> {
    const item = await this.getBoardItem(itemId)
    const newData = { ...item.data, [fieldName]: value }

    return this.updateBoardItem(itemId, { data: newData })
  },

  /**
   * Delete an item
   */
  async deleteBoardItem(itemId: string): Promise<void> {
    const { error } = await (getSupabase() as any)
      .from('board_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  },

  /**
   * Bulk update items
   */
  async bulkUpdateItems(updates: Array<{ id: string; data: Partial<BoardItem> }>): Promise<void> {
    const promises = updates.map(({ id, data }) => this.updateBoardItem(id, data))
    await Promise.all(promises)
  },

  /**
   * Reorder items
   */
  async reorderItems(items: Array<{ id: string; position: number }>): Promise<void> {
    const promises = items.map(({ id, position }) =>
      this.updateBoardItem(id, { position })
    )
    await Promise.all(promises)
  },

  // ==================== BOARD MEMBERS ====================

  /**
   * Get board members
   */
  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    // First get the board members
    const { data: members, error } = await (getSupabase() as any)
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .order('added_at', { ascending: true })

    if (error) throw error
    if (!members || members.length === 0) return []

    // Then fetch user details separately (since we don't have FK constraints)
    const userIds = members.map((m: any) => m.user_id)
    const { data: users } = await (getSupabase() as any)
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    // Create a map for quick lookup
    const userMap = new Map((users || []).map((u: any) => [u.id, u]))

    // Merge members with user data
    return members.map((member: any) => ({
      ...member,
      user: userMap.get(member.user_id) || null
    }))
  },

  /**
   * Add member to board
   */
  async addBoardMember(
    boardId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer',
    addedBy: string
  ): Promise<BoardMember> {
    const { data, error } = await (getSupabase() as any)
      .from('board_members')
      .upsert({
        board_id: boardId,
        user_id: userId,
        role,
        added_by: addedBy,
      }, {
        onConflict: 'board_id,user_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update member role
   */
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

  /**
   * Remove member from board
   */
  async removeBoardMember(boardId: string, userId: string): Promise<void> {
    const { error } = await (getSupabase() as any)
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)

    if (error) throw error
  },

  // ==================== BOARD TEMPLATES ====================

  /**
   * Get all board templates
   */
  async getTemplates(): Promise<BoardTemplate[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<BoardTemplate[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<BoardTemplate[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .eq('is_featured', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<BoardTemplate> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Save a board as a template
   */
  async saveAsTemplate(
    boardId: string,
    templateData: {
      name: string
      description?: string
      category?: string
      is_featured?: boolean
    }
  ): Promise<BoardTemplate> {
    // First get the board and its columns
    const board = await this.getBoard(boardId)
    const { data: columns, error: columnsError } = await (getSupabase() as any)
      .from('board_columns')
      .select('*')
      .eq('board_type', board.board_type)
      .order('position', { ascending: true })

    if (columnsError) throw columnsError

    // Convert columns to BoardColumnConfig format
    const defaultColumns = (columns || []).map((col: any) => ({
      id: col.column_id,
      name: col.column_name,
      name_ka: col.column_name_ka,
      type: col.column_type,
      width: col.width,
      config: col.config || {},
    }))

    // Create the template
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .insert({
        name: templateData.name,
        description: templateData.description,
        board_type: board.board_type,
        icon: board.icon || 'board',
        color: board.color || 'blue',
        category: templateData.category,
        default_columns: defaultColumns,
        default_items: [], // Empty default items
        is_featured: templateData.is_featured || false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ==================== SEARCH & FILTER ====================

  /**
   * Search boards
   * RLS policies automatically filter based on auth.email()
   */
  async searchBoards(query: string, userId?: string): Promise<Board[]> {
    const { data, error } = await (getSupabase() as any)
      .from('boards')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false})
      .limit(20)

    if (error) throw error
    return data || []
  },

  /**
   * Search items in a board
   */
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

  // ==================== ITEM TRANSFER BETWEEN BOARDS ====================

  /**
   * Get column mapping suggestions between two boards
   * Auto-maps columns with same column_id + column_type
   */
  async getColumnMapping(
    sourceBoardId: string,
    targetBoardId: string
  ): Promise<{
    sourceColumns: BoardColumn[]
    targetColumns: BoardColumn[]
    autoMapped: Record<string, string>
    needsMapping: string[]
    sameBoardType: boolean
  }> {
    // Get both boards
    const [sourceBoard, targetBoard] = await Promise.all([
      this.getBoard(sourceBoardId),
      this.getBoard(targetBoardId),
    ])

    const sameBoardType = sourceBoard.board_type === targetBoard.board_type

    // Get columns for both board types
    const [sourceColumnsResult, targetColumnsResult] = await Promise.all([
      (getSupabase() as any)
        .from('board_columns')
        .select('*')
        .eq('board_type', sourceBoard.board_type)
        .order('position', { ascending: true }),
      (getSupabase() as any)
        .from('board_columns')
        .select('*')
        .eq('board_type', targetBoard.board_type)
        .order('position', { ascending: true }),
    ])

    if (sourceColumnsResult.error) throw sourceColumnsResult.error
    if (targetColumnsResult.error) throw targetColumnsResult.error

    const sourceColumns = (sourceColumnsResult.data || []) as BoardColumn[]
    const targetColumns = (targetColumnsResult.data || []) as BoardColumn[]

    // Build auto-mapping
    const autoMapped: Record<string, string> = {}
    const needsMapping: string[] = []

    // Create target column lookup by column_id and by name+type
    const targetByColumnId = new Map(targetColumns.map(c => [c.column_id, c]))
    const targetByNameType = new Map(
      targetColumns.map(c => [`${c.column_name.toLowerCase()}_${c.column_type}`, c])
    )

    for (const srcCol of sourceColumns) {
      // Priority 1: Same column_id + same column_type
      const targetById = targetByColumnId.get(srcCol.column_id)
      if (targetById && targetById.column_type === srcCol.column_type) {
        autoMapped[srcCol.column_id] = targetById.column_id
        continue
      }

      // Priority 2: Same column_name + same column_type
      const targetByName = targetByNameType.get(
        `${srcCol.column_name.toLowerCase()}_${srcCol.column_type}`
      )
      if (targetByName) {
        autoMapped[srcCol.column_id] = targetByName.column_id
        continue
      }

      // No auto-match found
      needsMapping.push(srcCol.column_id)
    }

    return {
      sourceColumns,
      targetColumns,
      autoMapped,
      needsMapping,
      sameBoardType,
    }
  },

  /**
   * Move a single item to another board
   * Handles column mapping and preserves history
   */
  async moveItemToBoard(
    itemId: string,
    targetBoardId: string,
    columnMapping?: Record<string, string>,
    options?: { preserveUnmapped?: boolean }
  ): Promise<BoardItem> {
    const preserveUnmapped = options?.preserveUnmapped ?? true

    // Get the original item
    const originalItem = await this.getBoardItem(itemId)
    const sourceBoardId = originalItem.board_id

    // Get source and target boards
    const [sourceBoard, targetBoard] = await Promise.all([
      this.getBoard(sourceBoardId),
      this.getBoard(targetBoardId),
    ])

    // Get the max position in the target board
    const { data: existingItems } = await (getSupabase() as any)
      .from('board_items')
      .select('position')
      .eq('board_id', targetBoardId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPosition = existingItems?.[0]?.position ?? -1

    // Determine if we need column mapping
    const sameBoardType = sourceBoard.board_type === targetBoard.board_type

    let newData = { ...originalItem.data }
    let unmappedData: Record<string, unknown> = {}

    if (!sameBoardType && columnMapping) {
      // Apply column mapping
      const mappedData: Record<string, unknown> = {}

      for (const [sourceColId, value] of Object.entries(originalItem.data || {})) {
        const targetColId = columnMapping[sourceColId]
        if (targetColId) {
          mappedData[targetColId] = value
        } else if (preserveUnmapped) {
          unmappedData[sourceColId] = value
        }
      }

      newData = mappedData
    }

    // Build move metadata
    const moveMetadata = {
      moved_from_board_id: sourceBoardId,
      moved_from_board_name: sourceBoard.name,
      moved_at: new Date().toISOString(),
      column_mapping_used: columnMapping || null,
      unmapped_data: Object.keys(unmappedData).length > 0 ? unmappedData : null,
    }

    // Update the item to the new board
    const { data, error } = await (getSupabase() as any)
      .from('board_items')
      .update({
        board_id: targetBoardId,
        position: maxPosition + 1,
        data: newData,
        original_board_id: originalItem.original_board_id || sourceBoardId,
        move_metadata: moveMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    return data
  },

  /**
   * Move multiple items to another board
   * Uses the same column mapping for all items
   */
  async moveItemsToBoard(
    itemIds: string[],
    targetBoardId: string,
    columnMapping?: Record<string, string>,
    options?: { preserveUnmapped?: boolean }
  ): Promise<{ moved: BoardItem[]; failed: Array<{ id: string; error: string }> }> {
    const moved: BoardItem[] = []
    const failed: Array<{ id: string; error: string }> = []

    for (const itemId of itemIds) {
      try {
        const movedItem = await this.moveItemToBoard(
          itemId,
          targetBoardId,
          columnMapping,
          options
        )
        moved.push(movedItem)
      } catch (err) {
        failed.push({
          id: itemId,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return { moved, failed }
  },

  /**
   * Get compatible column types for mapping
   */
  getCompatibleColumnTypes(sourceType: string): string[] {
    const compatibilityMap: Record<string, string[]> = {
      text: ['text'],
      number: ['number', 'text'],
      date: ['date', 'text'],
      status: ['status', 'text'],
      person: ['person'],
      location: ['location', 'text'],
      files: ['files'],
      checkbox: ['checkbox'],
      link: ['link', 'text'],
      email: ['email', 'text'],
      phone: ['phone', 'text'],
    }

    return compatibilityMap[sourceType] || ['text']
  },
}
