// Board Transfer Service
// Handles item transfer between boards: column mapping, move operations

import { createClient } from '@/lib/supabase'
import type { BoardColumn, BoardItem } from '@/types/board'
import { boardCrudService } from './board-crud.service'
import { boardItemsService } from './board-items.service'

const getSupabase = (): any => createClient()

export const boardTransferService = {
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
    const [sourceBoard, targetBoard] = await Promise.all([
      boardCrudService.getBoard(sourceBoardId),
      boardCrudService.getBoard(targetBoardId),
    ])

    const sameBoardType = sourceBoard.board_type === targetBoard.board_type

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

    const autoMapped: Record<string, string> = {}
    const needsMapping: string[] = []

    const targetByColumnId = new Map(targetColumns.map(c => [c.column_id, c]))
    const targetByNameType = new Map(
      targetColumns.map(c => [`${c.column_name.toLowerCase()}_${c.column_type}`, c])
    )

    for (const srcCol of sourceColumns) {
      const targetById = targetByColumnId.get(srcCol.column_id)
      if (targetById && targetById.column_type === srcCol.column_type) {
        autoMapped[srcCol.column_id] = targetById.column_id
        continue
      }

      const targetByName = targetByNameType.get(
        `${srcCol.column_name.toLowerCase()}_${srcCol.column_type}`
      )
      if (targetByName) {
        autoMapped[srcCol.column_id] = targetByName.column_id
        continue
      }

      needsMapping.push(srcCol.column_id)
    }

    return { sourceColumns, targetColumns, autoMapped, needsMapping, sameBoardType }
  },

  async moveItemToBoard(
    itemId: string,
    targetBoardId: string,
    columnMapping?: Record<string, string>,
    options?: { preserveUnmapped?: boolean }
  ): Promise<BoardItem> {
    const preserveUnmapped = options?.preserveUnmapped ?? true

    const originalItem = await boardItemsService.getBoardItem(itemId)
    const sourceBoardId = originalItem.board_id

    const [sourceBoard, targetBoard] = await Promise.all([
      boardCrudService.getBoard(sourceBoardId),
      boardCrudService.getBoard(targetBoardId),
    ])

    const { data: existingItems } = await (getSupabase() as any)
      .from('board_items')
      .select('position')
      .eq('board_id', targetBoardId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPosition = existingItems?.[0]?.position ?? -1

    const sameBoardType = sourceBoard.board_type === targetBoard.board_type

    let newData = { ...originalItem.data }
    let unmappedData: Record<string, unknown> = {}

    if (!sameBoardType && columnMapping) {
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

    const moveMetadata = {
      moved_from_board_id: sourceBoardId,
      moved_from_board_name: sourceBoard.name,
      moved_at: new Date().toISOString(),
      column_mapping_used: columnMapping || null,
      unmapped_data: Object.keys(unmappedData).length > 0 ? unmappedData : null,
    }

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
