'use client'

import { useState } from 'react'

import { activityService } from '@/features/boards/services/activity.service'
import { useToast } from '@/components/ui-monday/Toast'

import type { ItemComment } from '@/types/board'
import type { FileAttachment } from './types'

interface UseCommentsOptions {
  itemId: string
  itemType: string
  userId: string | null
  onCommentCountChange?: (count: number) => void
  /** Called after a successful create/delete (e.g. to invalidate comment-count queries) */
  onCommentsMutated?: () => void
}

interface SubmitCommentExtras {
  mentions: string[]
  attachments: FileAttachment[]
  /** Called right after the comment is created, to clear mention/file state */
  onSuccess?: () => void
}

export function useComments({
  itemId,
  itemType,
  userId,
  onCommentCountChange,
  onCommentsMutated,
}: UseCommentsOptions) {
  const { showToast } = useToast()

  const [comments, setComments] = useState<ItemComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ItemComment | null>(null)
  const [editingComment, setEditingComment] = useState<ItemComment | null>(null)
  const [editContent, setEditContent] = useState('')

  const loadComments = async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const data = await activityService.getComments(itemType, itemId)
      setComments(data)
      onCommentCountChange?.(data.length)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async ({ mentions, attachments, onSuccess }: SubmitCommentExtras) => {
    if ((!newComment.trim() && attachments.length === 0) || !itemId || submitting || !userId) return

    setSubmitting(true)
    try {
      await activityService.createComment({
        item_type: itemType,
        item_id: itemId,
        user_id: userId,
        content:
          newComment.trim() ||
          (attachments.length > 0 ? `Attached ${attachments.length} file(s)` : ''),
        parent_comment_id: replyingTo?.id,
        mentions,
        attachments: attachments.map(f =>
          JSON.stringify({ name: f.name, url: f.url, type: f.type, size: f.size, path: f.path })
        ),
      })
      setNewComment('')
      onSuccess?.()
      setReplyingTo(null)
      await loadComments()
      onCommentsMutated?.()
    } catch (error) {
      console.error('Error creating comment:', error)
      showToast('Failed to post comment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const editComment = async (comment: ItemComment) => {
    if (!editContent.trim() || submitting) return

    setSubmitting(true)
    try {
      await activityService.updateComment(comment.id, editContent.trim())
      setEditingComment(null)
      setEditContent('')
      await loadComments()
    } catch (error) {
      console.error('Error updating comment:', error)
      showToast('Failed to update comment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await activityService.deleteComment(commentId)
      await loadComments()
      onCommentsMutated?.()
    } catch (error) {
      console.error('Error deleting comment:', error)
      showToast('Failed to delete comment', 'error')
    }
  }

  return {
    comments,
    setComments,
    newComment,
    setNewComment,
    loading,
    submitting,
    replyingTo,
    setReplyingTo,
    editingComment,
    setEditingComment,
    editContent,
    setEditContent,
    loadComments,
    submitComment,
    editComment,
    deleteComment,
  }
}
