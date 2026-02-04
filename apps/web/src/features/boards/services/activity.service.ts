import { createClient } from '@/lib/supabase'
import type { ItemUpdate, ItemComment, UpdateType } from '@/types/board'

// Helper to get supabase client with current auth state
// IMPORTANT: Must be called inside functions, not at module level
const getSupabase = (): any => createClient()

// Type for update records with joined inspector data from Supabase
interface UpdateRecord {
  id: string
  item_type: string
  item_id: string
  user_id: string
  update_type: UpdateType
  field_name?: string
  column_id?: string
  old_value?: string
  new_value?: string
  content?: string
  metadata?: Record<string, unknown>
  source_board_id?: string
  target_board_id?: string
  created_at: string
  inspectors?: {
    full_name?: string
    email?: string
  }
  source_board?: {
    name?: string
  }
  target_board?: {
    name?: string
  }
}

// Type for comment records with joined inspector data from Supabase
interface CommentRecord {
  id: string
  item_type: string
  item_id: string
  user_id: string
  parent_comment_id?: string
  content: string
  mentions: string[]
  attachments: string[]
  is_edited: boolean
  created_at: string
  updated_at: string
  inspectors?: {
    full_name?: string
    email?: string
  }
}

/**
 * Activity & Comments Service
 * Handles activity feed and comments on board items
 */
export const activityService = {
  // ==================== ITEM UPDATES (Activity Feed) ====================

  /**
   * Get all updates for a specific item
   */
  async getItemUpdates(
    itemType: string,
    itemId: string,
    limit = 50
  ): Promise<ItemUpdate[]> {
    const { data, error } = await getSupabase()
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        ),
        source_board:source_board_id (
          name
        ),
        target_board:target_board_id (
          name
        )
      `)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Map inspector data and board names
    return (data || []).map((update: UpdateRecord) => ({
      ...update,
      item_type: update.item_type as ItemUpdate['item_type'],
      user_name: update.inspectors?.full_name || update.inspectors?.email,
      source_board_name: update.source_board?.name,
      target_board_name: update.target_board?.name,
    })) as ItemUpdate[]
  },

  /**
   * Get recent updates across all items (for activity feed)
   */
  async getRecentUpdates(limit = 100): Promise<ItemUpdate[]> {
    const { data, error } = await getSupabase()
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        ),
        source_board:source_board_id (
          name
        ),
        target_board:target_board_id (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((update: UpdateRecord) => ({
      ...update,
      item_type: update.item_type as ItemUpdate['item_type'],
      user_name: update.inspectors?.full_name || update.inspectors?.email,
      source_board_name: update.source_board?.name,
      target_board_name: update.target_board?.name,
    })) as ItemUpdate[]
  },

  /**
   * Get updates by user
   */
  async getUserUpdates(userId: string, limit = 50): Promise<ItemUpdate[]> {
    const { data, error } = await getSupabase()
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        ),
        source_board:source_board_id (
          name
        ),
        target_board:target_board_id (
          name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((update: UpdateRecord) => ({
      ...update,
      item_type: update.item_type as ItemUpdate['item_type'],
      user_name: update.inspectors?.full_name || update.inspectors?.email,
      source_board_name: update.source_board?.name,
      target_board_name: update.target_board?.name,
    })) as ItemUpdate[]
  },

  /**
   * Create a new update/activity entry
   */
  async createUpdate(update: {
    item_type: string
    item_id: string
    user_id: string
    update_type: UpdateType
    field_name?: string
    old_value?: string
    new_value?: string
    content?: string
    metadata?: Record<string, any>
  }): Promise<ItemUpdate> {
    const { data, error } = await (getSupabase()
      .from('item_updates') as any)
      .insert(update)
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .single()

    if (error) throw error

    const record = data as UpdateRecord
    return {
      ...record,
      item_type: record.item_type as ItemUpdate['item_type'],
      user_name: record.inspectors?.full_name || record.inspectors?.email,
    } as ItemUpdate
  },

  /**
   * Helper: Log a status change
   */
  async logStatusChange(
    itemType: string,
    itemId: string,
    userId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<ItemUpdate> {
    return this.createUpdate({
      item_type: itemType,
      item_id: itemId,
      user_id: userId,
      update_type: 'status_changed',
      field_name: 'status',
      old_value: oldStatus,
      new_value: newStatus,
    })
  },

  /**
   * Helper: Log an assignment change
   */
  async logAssignment(
    itemType: string,
    itemId: string,
    userId: string,
    assignedToId: string,
    assignedToName: string
  ): Promise<ItemUpdate> {
    return this.createUpdate({
      item_type: itemType,
      item_id: itemId,
      user_id: userId,
      update_type: 'assigned',
      field_name: 'assigned_inspector_id',
      new_value: assignedToId,
      content: `Assigned to ${assignedToName}`,
    })
  },

  /**
   * Helper: Log a field update
   */
  async logFieldUpdate(
    itemType: string,
    itemId: string,
    userId: string,
    fieldName: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<ItemUpdate> {
    return this.createUpdate({
      item_type: itemType,
      item_id: itemId,
      user_id: userId,
      update_type: 'updated',
      field_name: fieldName,
      old_value: JSON.stringify(oldValue),
      new_value: JSON.stringify(newValue),
    })
  },

  // ==================== COMMENTS ====================

  /**
   * Get all comments for an item (optimized: single query with nested replies)
   */
  async getComments(
    itemType: string,
    itemId: string
  ): Promise<ItemComment[]> {
    // Fetch all comments for this item in a single query
    const { data, error } = await (getSupabase()
      .from('item_comments') as any)
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return []

    const comments = data as CommentRecord[]

    // Build comment tree in memory (O(n) instead of N+1 queries)
    // Using any for complex tree structure - proper typing would require recursive types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentMap = new Map<string, any>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topLevelComments: any[] = []

    // First pass: create map of all comments
    for (const comment of comments) {
      commentMap.set(comment.id, {
        ...comment,
        item_type: comment.item_type as ItemComment['item_type'],
        user_name: comment.inspectors?.full_name || comment.inspectors?.email,
        replies: [],
      })
    }

    // Second pass: build tree structure
    for (const comment of comments) {
      const mappedComment = commentMap.get(comment.id)
      if (comment.parent_comment_id) {
        // This is a reply - add to parent's replies
        const parent = commentMap.get(comment.parent_comment_id)
        if (parent) {
          parent.replies.push(mappedComment)
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(mappedComment)
      }
    }

    // Return top-level comments (newest first) with nested replies
    return topLevelComments.reverse()
  },

  /**
   * Get replies to a comment
   */
  async getCommentReplies(parentCommentId: string): Promise<ItemComment[]> {
    const { data, error } = await (getSupabase()
      .from('item_comments') as any)
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return ((data || []) as CommentRecord[]).map((reply: CommentRecord) => ({
      ...reply,
      item_type: reply.item_type as ItemComment['item_type'],
      user_name: reply.inspectors?.full_name || reply.inspectors?.email,
    })) as ItemComment[]
  },

  /**
   * Create a new comment
   */
  async createComment(comment: {
    item_type: string
    item_id: string
    user_id: string
    content: string
    parent_comment_id?: string
    mentions?: string[]
    attachments?: string[]
  }): Promise<ItemComment> {
    const { data, error } = await (getSupabase()
      .from('item_comments') as any)
      .insert(comment)
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .single()

    if (error) throw error

    // Also create an activity update for the comment
    await this.createUpdate({
      item_type: comment.item_type,
      item_id: comment.item_id,
      user_id: comment.user_id,
      update_type: 'comment',
      content: comment.content.substring(0, 100), // First 100 chars
    })

    const record = data as CommentRecord
    return {
      ...record,
      item_type: record.item_type as ItemComment['item_type'],
      user_name: record.inspectors?.full_name || record.inspectors?.email,
    } as ItemComment
  },

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    content: string
  ): Promise<ItemComment> {
    const { data, error } = await (getSupabase()
      .from('item_comments') as any)
      .update({
        content,
        is_edited: true,
      })
      .eq('id', commentId)
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .single()

    if (error) throw error

    const record = data as CommentRecord
    return {
      ...record,
      item_type: record.item_type as ItemComment['item_type'],
      user_name: record.inspectors?.full_name || record.inspectors?.email,
    } as ItemComment
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    // Delete all replies first
    await (getSupabase()
      .from('item_comments') as any)
      .delete()
      .eq('parent_comment_id', commentId)

    // Delete the comment
    const { error } = await (getSupabase()
      .from('item_comments') as any)
      .delete()
      .eq('id', commentId)

    if (error) throw error
  },

  /**
   * Get comment count for an item
   */
  async getCommentCount(itemType: string, itemId: string): Promise<number> {
    const { count, error } = await (getSupabase()
      .from('item_comments') as any)
      .select('*', { count: 'exact', head: true })
      .eq('item_type', itemType)
      .eq('item_id', itemId)

    if (error) throw error
    return count || 0
  },

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to updates for an item
   */
  subscribeToItemUpdates(
    itemType: string,
    itemId: string,
    callback: (payload: { new: UpdateRecord; old: UpdateRecord | null }) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase().channel(`item-updates:${itemType}:${itemId}`) as any)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'item_updates',
          filter: `item_type=eq.${itemType},item_id=eq.${itemId}`,
        },
        callback
      )
      .subscribe()
  },

  /**
   * Subscribe to comments for an item
   */
  subscribeToItemComments(
    itemType: string,
    itemId: string,
    callback: (payload: { new: CommentRecord; old: CommentRecord | null }) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase().channel(`item-comments:${itemType}:${itemId}`) as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_comments',
          filter: `item_type=eq.${itemType},item_id=eq.${itemId}`,
        },
        callback
      )
      .subscribe()
  },

  /**
   * Unsubscribe from a channel
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async unsubscribe(channel: any) {
    await getSupabase().removeChannel(channel)
  },

  // ==================== BOARD-WIDE ACTIVITY ====================

  /**
   * Get all updates for items in a specific board
   * Includes resolved column names for proper display
   */
  async getBoardUpdates(boardId: string, limit = 100): Promise<ItemUpdate[]> {
    // First, get board info and all board item IDs
    const { data: board, error: boardError } = await (getSupabase() as any)
      .from('boards')
      .select('id, board_type')
      .eq('id', boardId)
      .single()

    if (boardError) throw boardError

    const { data: boardItems, error: boardItemsError } = await getSupabase()
      .from('board_items')
      .select('id')
      .eq('board_id', boardId)

    if (boardItemsError) throw boardItemsError
    if (!boardItems || boardItems.length === 0) return []

    const boardItemIds = boardItems.map((item: { id: string }) => item.id)

    // Get column definitions for this board type
    const { data: columns } = await getSupabase()
      .from('board_columns')
      .select('column_id, column_name, column_name_ka')
      .eq('board_type', board.board_type)

    const columnMap = new Map<string, { name: string; name_ka?: string }>(
      (columns || []).map((c: { column_id: string; column_name: string; column_name_ka?: string }) => [
        c.column_id,
        { name: c.column_name, name_ka: c.column_name_ka }
      ])
    )

    // Then get updates for these items
    const { data, error } = await getSupabase()
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        ),
        source_board:source_board_id (
          name
        ),
        target_board:target_board_id (
          name
        )
      `)
      .in('item_id', boardItemIds)
      .eq('item_type', 'board_item')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Map with resolved column names
    return (data || []).map((update: UpdateRecord) => {
      const columnInfo = update.column_id ? columnMap.get(update.column_id) : null
      return {
        ...update,
        item_type: update.item_type as ItemUpdate['item_type'],
        user_name: update.inspectors?.full_name || update.inspectors?.email,
        column_name: columnInfo?.name || update.column_id,
        column_name_ka: columnInfo?.name_ka,
        source_board_name: update.source_board?.name,
        target_board_name: update.target_board?.name,
      }
    }) as ItemUpdate[]
  },

  /**
   * Resolve column names for a list of updates
   * Useful when displaying updates from multiple board types
   */
  async resolveColumnNames(
    updates: ItemUpdate[],
    boardType: string
  ): Promise<ItemUpdate[]> {
    // Get column definitions for this board type
    const { data: columns } = await getSupabase()
      .from('board_columns')
      .select('column_id, column_name, column_name_ka')
      .eq('board_type', boardType)

    const columnMap = new Map<string, { name: string; name_ka?: string }>(
      (columns || []).map((c: { column_id: string; column_name: string; column_name_ka?: string }) => [
        c.column_id,
        { name: c.column_name, name_ka: c.column_name_ka }
      ])
    )

    return updates.map(update => {
      const columnInfo = update.column_id ? columnMap.get(update.column_id) : null
      return {
        ...update,
        column_name: columnInfo?.name || update.column_id,
        column_name_ka: columnInfo?.name_ka,
      }
    })
  },

  // ==================== ROLLBACK FUNCTIONALITY ====================

  /**
   * Rollback a change by applying the old value
   */
  async rollbackUpdate(
    updateId: string,
    userId: string,
    applyRollback: (itemId: string, fieldName: string, oldValue: unknown) => Promise<void>
  ): Promise<ItemUpdate | null> {
    // Get the update to rollback
    const { data, error } = await (getSupabase()
      .from('item_updates') as any)
      .select('*')
      .eq('id', updateId)
      .single()

    if (error || !data) return null

    const update = data as UpdateRecord

    // Parse old value if it's JSON
    let oldValue: unknown = update.old_value
    try {
      oldValue = JSON.parse(update.old_value || '')
    } catch {
      // Keep as string
    }

    // Apply the rollback using the provided callback
    if (update.field_name) {
      await applyRollback(update.item_id, update.field_name, oldValue)
    }

    // Create a new update to track the rollback
    await this.createUpdate({
      item_type: update.item_type,
      item_id: update.item_id,
      user_id: userId,
      update_type: 'updated',
      field_name: update.field_name,
      old_value: update.new_value,
      new_value: update.old_value,
      content: `Rolled back change to ${update.field_name}`,
      metadata: { rollback_of: updateId },
    })

    return {
      ...update,
      item_type: update.item_type as ItemUpdate['item_type'],
    } as ItemUpdate
  },
}
