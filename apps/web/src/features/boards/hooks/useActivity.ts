import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { activityService } from '../services/activity.service'
import { queryKeys } from '@/lib/react-query'
import type { ItemUpdate, ItemComment, UpdateType } from '@/types/board'

/**
 * Hook to fetch item updates
 */
export function useItemUpdates(itemType: string, itemId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.activity.byItem(itemType, itemId),
    queryFn: () => activityService.getItemUpdates(itemType, itemId, limit),
    enabled: !!itemType && !!itemId,
  })
}

/**
 * Hook to fetch recent updates (activity feed)
 */
export function useRecentUpdates(limit = 100) {
  return useQuery({
    queryKey: [...queryKeys.activity.all, 'recent'],
    queryFn: () => activityService.getRecentUpdates(limit),
  })
}

/**
 * Hook to create an update
 */
export function useCreateUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: {
      item_type: string
      item_id: string
      user_id: string
      update_type: UpdateType
      field_name?: string
      old_value?: string
      new_value?: string
      content?: string
      metadata?: Record<string, any>
    }) => activityService.createUpdate(update),
    onSuccess: (newUpdate) => {
      // Invalidate the item's activity
      queryClient.invalidateQueries({
        queryKey: queryKeys.activity.byItem(newUpdate.item_type, newUpdate.item_id),
      })

      // Invalidate recent updates
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.activity.all, 'recent'],
      })
    },
  })
}

/**
 * Hook to subscribe to real-time updates
 */
export function useItemUpdatesSubscription(
  itemType: string,
  itemId: string,
  enabled = true
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !itemType || !itemId) return

    const channel = activityService.subscribeToItemUpdates(
      itemType,
      itemId,
      (payload) => {
        console.log('New update:', payload)

        // Invalidate queries to refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.activity.byItem(itemType, itemId),
        })
      }
    )

    return () => {
      activityService.unsubscribe(channel)
    }
  }, [itemType, itemId, enabled, queryClient])
}

/**
 * Hook to fetch comments
 */
export function useItemComments(itemType: string, itemId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byItem(itemType, itemId),
    queryFn: () => activityService.getComments(itemType, itemId),
    enabled: !!itemType && !!itemId,
  })
}

/**
 * Hook to create a comment
 */
export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (comment: {
      item_type: string
      item_id: string
      user_id: string
      content: string
      parent_comment_id?: string
      mentions?: string[]
      attachments?: string[]
    }) => activityService.createComment(comment),
    onSuccess: (newComment) => {
      // Invalidate comments
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byItem(newComment.item_type, newComment.item_id),
      })

      // Invalidate activity (since comment creates an update)
      queryClient.invalidateQueries({
        queryKey: queryKeys.activity.byItem(newComment.item_type, newComment.item_id),
      })
    },
  })
}

/**
 * Hook to update a comment
 */
export function useUpdateComment(itemType: string, itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      activityService.updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byItem(itemType, itemId),
      })
    },
  })
}

/**
 * Hook to delete a comment
 */
export function useDeleteComment(itemType: string, itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => activityService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byItem(itemType, itemId),
      })
    },
  })
}

/**
 * Hook to subscribe to real-time comments
 */
export function useItemCommentsSubscription(
  itemType: string,
  itemId: string,
  enabled = true
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !itemType || !itemId) return

    const channel = activityService.subscribeToItemComments(
      itemType,
      itemId,
      (payload) => {
        console.log('Comment change:', payload)

        // Invalidate comments to refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byItem(itemType, itemId),
        })
      }
    )

    return () => {
      activityService.unsubscribe(channel)
    }
  }, [itemType, itemId, enabled, queryClient])
}

/**
 * Hook to get comment count
 */
export function useCommentCount(itemType: string, itemId: string) {
  return useQuery({
    queryKey: [...queryKeys.comments.byItem(itemType, itemId), 'count'],
    queryFn: () => activityService.getCommentCount(itemType, itemId),
    enabled: !!itemType && !!itemId,
  })
}
