import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ablyPresenceService, type AblyBoardChannel, type BoardItemChange } from '../services/ably-presence.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardPresence, BoardType } from '../types/board'

interface UseRealtimeBoardOptions {
  boardId: string
  boardType: BoardType
  userId?: string
  userName?: string
  userAvatar?: string
  enabled?: boolean
}

interface RealtimeBoardState {
  presence: BoardPresence[]
  isConnected: boolean
}

/**
 * Hook for real-time board collaboration using Ably
 * Handles:
 * - Live item updates from other users (instant)
 * - User presence (who's viewing the board)
 * - Cell editing indicators
 */
export function useRealtimeBoard({
  boardId,
  boardType,
  userId,
  userName,
  userAvatar,
  enabled = true,
}: UseRealtimeBoardOptions) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<RealtimeBoardState>({
    presence: [],
    isConnected: false,
  })
  const channelRef = useRef<AblyBoardChannel | null>(null)

  // Update presence state (e.g., when editing a cell)
  const updatePresence = useCallback(async (updates: Partial<BoardPresence>) => {
    if (channelRef.current?.updatePresence) {
      await channelRef.current.updatePresence({
        is_editing: updates.is_editing,
        editing_item_id: updates.editing_item_id,
        editing_column_id: updates.editing_column_id,
      })
    }
  }, [])

  // Set editing state
  const setEditing = useCallback((itemId: string | null, columnId?: string) => {
    updatePresence({
      is_editing: !!itemId,
      editing_item_id: itemId || undefined,
      editing_column_id: columnId,
    })
  }, [updatePresence])

  // Publish item change for other users
  const publishItemChange = useCallback(async (
    event: 'insert' | 'update' | 'delete',
    itemId: string,
    data?: Record<string, any>
  ) => {
    if (channelRef.current?.publishItemChange) {
      await channelRef.current.publishItemChange({
        event,
        item_id: itemId,
        board_id: boardId,
        data,
      })
    }
  }, [boardId])

  // Subscribe to real-time updates via Ably
  useEffect(() => {
    if (!enabled || !boardId || !userId || !userName) return

    // Check if Ably is available
    if (!ablyPresenceService.isAvailable()) {
      console.warn('Ably not configured. Using polling fallback.')
      // Fallback to polling every 15 seconds (reduced from 3s for performance)
      // Only invalidate active queries to minimize unnecessary requests
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.routes.all, 'board-items', boardId],
          refetchType: 'active', // Only refetch active queries
        })
      }, 15000) // 15 seconds instead of 3 seconds

      setState(prev => ({ ...prev, isConnected: true }))

      return () => {
        clearInterval(pollInterval)
      }
    }

    // Create Ably channel for this board
    const channel = ablyPresenceService.createBoardChannel(
      boardType,
      boardId,
      userId,
      userName,
      userAvatar
    )
    channelRef.current = channel

    // Listen for presence changes
    channel.onPresenceChange((presence) => {
      setState(prev => ({
        ...prev,
        presence,
      }))
    })

    // Listen for item changes from other users
    channel.onItemChange((change: BoardItemChange) => {
      // Immediately invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    })

    setState(prev => ({ ...prev, isConnected: true }))

    // Cleanup
    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [enabled, boardId, boardType, userId, userName, userAvatar, queryClient])

  return {
    ...state,
    updatePresence,
    setEditing,
    publishItemChange,
    isUserEditing: (itemId: string) =>
      state.presence.some(p => p.editing_item_id === itemId),
    getUsersEditingItem: (itemId: string) =>
      state.presence.filter(p => p.editing_item_id === itemId),
  }
}

/**
 * Simple hook just for presence display (no editing tracking)
 */
export function useBoardPresence(
  boardType: BoardType,
  boardId?: string,
  userId?: string,
  userName?: string,
  enabled = true
) {
  const [presence, setPresence] = useState<BoardPresence[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<AblyBoardChannel | null>(null)

  useEffect(() => {
    if (!enabled || !boardId || !userId || !userName) return

    if (!ablyPresenceService.isAvailable()) {
      setIsConnected(true)
      return
    }

    const channel = ablyPresenceService.createBoardChannel(
      boardType,
      boardId,
      userId,
      userName
    )
    channelRef.current = channel

    channel.onPresenceChange((newPresence) => {
      setPresence(newPresence)
    })

    setIsConnected(true)

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [enabled, boardType, boardId, userId, userName])

  return {
    presence,
    isConnected,
    totalViewers: presence.length + 1, // Include self
  }
}
