// User Boards Service - Composed barrel
// Re-exports all domain services as a single unified service object
// Cross-domain orchestration methods live here

import { createClient } from '@/lib/supabase'
import type { Board, BoardItem, BoardTemplate } from '@/types/board'
import { boardCrudService } from './board-crud.service'
import { boardItemsService } from './board-items.service'
import { boardMembersService } from './board-members.service'
import { boardTemplatesService } from './board-templates.service'
import { boardTransferService } from './board-transfer.service'

const getSupabase = (): any => createClient()

export const userBoardsService = {
  // Spread all domain services
  ...boardCrudService,
  ...boardItemsService,
  ...boardMembersService,
  ...boardTemplatesService,
  ...boardTransferService,

  // ==================== CROSS-DOMAIN ORCHESTRATION ====================

  async createBoardFromTemplate(
    templateId: string,
    name: string,
    ownerId: string,
    workspaceId?: string
  ): Promise<Board> {
    const template = await boardTemplatesService.getTemplate(templateId)

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

    const createdBoard = await boardCrudService.createBoard(board)

    // Create columns from template - deduplicate by column_id
    const seenColumnIds = new Set<string>()
    const uniqueTemplateColumns = template.default_columns.filter((col) => {
      if (seenColumnIds.has(col.id)) return false
      seenColumnIds.add(col.id)
      return true
    })

    const columns = uniqueTemplateColumns.map((col, index) => ({
      board_type: template.board_type,
      board_id: createdBoard.id,
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

    await (getSupabase() as any)
      .from('board_columns')
      .delete()
      .eq('board_id', createdBoard.id)

    const { error: colError } = await (getSupabase() as any)
      .from('board_columns')
      .insert(columns)

    if (colError) console.error('Error creating columns:', colError)

    return createdBoard
  },

  async duplicateBoard(boardId: string, newName: string, ownerId: string): Promise<Board> {
    const originalBoard = await boardCrudService.getBoard(boardId)

    const newBoard = await boardCrudService.createBoard({
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

    // Duplicate columns
    const { data: originalColumns } = await (getSupabase() as any)
      .from('board_columns')
      .select('*')
      .eq('board_type', originalBoard.board_type)

    if (originalColumns && originalColumns.length > 0) {
      const boardSpecificColumns = originalColumns.filter(
        (col: any) => col.board_id === boardId
      )

      if (boardSpecificColumns.length > 0) {
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

    // Duplicate items
    const originalItems = await boardItemsService.getBoardItems(boardId)

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

  async saveAsTemplate(
    boardId: string,
    templateData: {
      name: string
      description?: string
      category?: string
      is_featured?: boolean
    }
  ): Promise<BoardTemplate> {
    const board = await boardCrudService.getBoard(boardId)

    const { data: boardColumns, error: boardColError } = await (getSupabase() as any)
      .from('board_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    let columns = boardColumns
    if (boardColError || !columns || columns.length === 0) {
      const { data: typeColumns, error: typeColError } = await (getSupabase() as any)
        .from('board_columns')
        .select('*')
        .eq('board_type', board.board_type)
        .is('board_id', null)
        .order('position', { ascending: true })

      if (typeColError) throw typeColError
      columns = typeColumns
    }

    const seenIds = new Set<string>()
    const defaultColumns = (columns || [])
      .filter((col: any) => {
        if (seenIds.has(col.column_id)) return false
        seenIds.add(col.column_id)
        return true
      })
      .map((col: any) => ({
        id: col.column_id,
        name: col.column_name,
        name_ka: col.column_name_ka,
        type: col.column_type,
        width: col.width,
        config: col.config || {},
      }))

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
        default_items: [],
        is_featured: templateData.is_featured || false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
