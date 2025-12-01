// User Boards Service
// Handles CRUD operations for user-created boards

import { createClient } from '@/lib/supabase'
import type {
  Board,
  BoardItem,
  BoardMember,
  BoardTemplate,
  BoardType,
} from '@/types/board'

const supabase = createClient()

export const userBoardsService = {
  // ==================== BOARDS ====================

  /**
   * Get all boards accessible to the user
   * RLS policies automatically filter based on auth.email()
   */
  async getBoards(userId?: string): Promise<Board[]> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error} = await supabase
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
    const { data, error } = await supabase
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
    ownerId: string
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

    // Create columns from template
    const columns = template.default_columns.map((col, index) => ({
      board_type: template.board_type,
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
    const { error: colError } = await supabase
      .from('board_columns')
      .insert(columns)

    if (colError) console.error('Error creating columns:', colError)

    return createdBoard
  },

  /**
   * Update a board
   */
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    const { data, error } = await supabase
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
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (error) throw error
  },

  /**
   * Duplicate a board
   */
  async duplicateBoard(boardId: string, newName: string, ownerId: string): Promise<Board> {
    const { data, error } = await supabase
      .rpc('duplicate_board', {
        p_board_id: boardId,
        p_new_name: newName,
        p_owner_id: ownerId,
      })

    if (error) throw error

    // Return the new board
    return this.getBoard(data)
  },

  // ==================== BOARD ITEMS ====================

  /**
   * Get all items in a board
   */
  async getBoardItems(boardId: string): Promise<BoardItem[]> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
      .from('board_members')
      .select(`
        *,
        user:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('board_id', boardId)
      .order('added_at', { ascending: true })

    if (error) throw error
    return data || []
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
    const { data, error } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: userId,
        role,
        added_by: addedBy,
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('board_templates')
      .select('*')
      .eq('id', templateId)
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('board_items')
      .select('*')
      .eq('board_id', boardId)
      .ilike('name', `%${query}%`)
      .order('position', { ascending: true })
      .limit(50)

    if (error) throw error
    return data || []
  },
}
