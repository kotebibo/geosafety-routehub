import { getSupabase } from '@/lib/supabase'
import type { ItemUpdate, ItemComment, UpdateType } from '@/types/board'

const supabase = getSupabase()

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
    const { data, error } = await supabase
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Map inspector data to user_name
    return (data || []).map((update: any) => ({
      ...update,
      user_name: update.inspectors?.full_name || update.inspectors?.email,
    }))
  },

  /**
   * Get recent updates across all items (for activity feed)
   */
  async getRecentUpdates(limit = 100): Promise<ItemUpdate[]> {
    const { data, error } = await supabase
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((update: any) => ({
      ...update,
      user_name: update.inspectors?.full_name || update.inspectors?.email,
    }))
  },

  /**
   * Get updates by user
   */
  async getUserUpdates(userId: string, limit = 50): Promise<ItemUpdate[]> {
    const { data, error } = await supabase
      .from('item_updates')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((update: any) => ({
      ...update,
      user_name: update.inspectors?.full_name || update.inspectors?.email,
    }))
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
    const { data, error } = await supabase
      .from('item_updates')
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

    return {
      ...data,
      user_name: data.inspectors?.full_name || data.inspectors?.email,
    }
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
    oldValue: any,
    newValue: any
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
   * Get all comments for an item
   */
  async getComments(
    itemType: string,
    itemId: string
  ): Promise<ItemComment[]> {
    const { data, error } = await supabase
      .from('item_comments')
      .select(`
        *,
        inspectors:user_id (
          full_name,
          email
        )
      `)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .is('parent_comment_id', null) // Top-level comments only
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment: any) => {
        const replies = await this.getCommentReplies(comment.id)
        return {
          ...comment,
          user_name: comment.inspectors?.full_name || comment.inspectors?.email,
          replies,
        }
      })
    )

    return commentsWithReplies
  },

  /**
   * Get replies to a comment
   */
  async getCommentReplies(parentCommentId: string): Promise<ItemComment[]> {
    const { data, error } = await supabase
      .from('item_comments')
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

    return (data || []).map((reply: any) => ({
      ...reply,
      user_name: reply.inspectors?.full_name || reply.inspectors?.email,
    }))
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
    const { data, error } = await supabase
      .from('item_comments')
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

    return {
      ...data,
      user_name: data.inspectors?.full_name || data.inspectors?.email,
    }
  },

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    content: string
  ): Promise<ItemComment> {
    const { data, error } = await supabase
      .from('item_comments')
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

    return {
      ...data,
      user_name: data.inspectors?.full_name || data.inspectors?.email,
    }
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    // Delete all replies first
    await supabase
      .from('item_comments')
      .delete()
      .eq('parent_comment_id', commentId)

    // Delete the comment
    const { error } = await supabase
      .from('item_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  },

  /**
   * Get comment count for an item
   */
  async getCommentCount(itemType: string, itemId: string): Promise<number> {
    const { count, error } = await supabase
      .from('item_comments')
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
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`item-updates:${itemType}:${itemId}`)
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
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`item-comments:${itemType}:${itemId}`)
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
  async unsubscribe(channel: any) {
    await supabase.removeChannel(channel)
  },
}
