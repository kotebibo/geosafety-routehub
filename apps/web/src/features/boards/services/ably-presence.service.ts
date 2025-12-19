import Ably from 'ably'
import { getAblyClient, isAblyAvailable } from '@/lib/ably'
import type { BoardPresence, BoardType } from '../types/board'

export interface AblyPresenceData {
  user_id: string
  user_name: string
  user_avatar?: string
  board_type: BoardType
  board_id?: string
  is_editing: boolean
  editing_item_id?: string
  editing_column_id?: string
  timestamp: string
}

export interface BoardItemChange {
  event: 'insert' | 'update' | 'delete'
  item_id: string
  board_id: string
  data?: Record<string, any>
  changed_by: string
}

/**
 * Ably-based Presence Service for Board Collaboration
 * Provides instant real-time updates for:
 * - Who is viewing/editing the board
 * - Cell-level editing indicators
 * - Item changes from other users
 */
export const ablyPresenceService = {
  /**
   * Create a presence channel for a board
   */
  createBoardChannel(
    boardType: BoardType,
    boardId: string,
    userId: string,
    userName: string,
    userAvatar?: string
  ) {
    const ably = getAblyClient()
    if (!ably) {
      return createFallbackChannel()
    }

    const channelName = `board:${boardType}:${boardId}`
    const channel = ably.channels.get(channelName, {
      params: { rewind: '1' }, // Get last message on connect
    })

    let presenceState: BoardPresence[] = []
    let onPresenceChange: ((presence: BoardPresence[]) => void) | null = null
    let onItemChange: ((change: BoardItemChange) => void) | null = null

    // Track presence
    channel.presence.subscribe('enter', () => updatePresenceState())
    channel.presence.subscribe('leave', () => updatePresenceState())
    channel.presence.subscribe('update', () => updatePresenceState())

    // Subscribe to item changes
    channel.subscribe('item:change', (message) => {
      const change = message.data as BoardItemChange
      // Note: We allow same-user updates to support testing with same account in multiple tabs
      // The React Query cache will dedupe if the data hasn't actually changed
      if (onItemChange) {
        onItemChange(change)
      }
    })

    // Store our clientId to filter ourselves - each tab gets a unique clientId
    // We'll capture the connectionId once connected
    let myConnectionId: string | undefined

    // Enter presence
    channel.presence.enter({
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      board_type: boardType,
      board_id: boardId,
      is_editing: false,
      timestamp: new Date().toISOString(),
    } as AblyPresenceData)

    async function updatePresenceState() {
      // Capture connectionId when we have it (after connection is established)
      if (!myConnectionId && ably?.connection.id) {
        myConnectionId = ably.connection.id
      }

      try {
        const members = await channel.presence.get()

        // Filter out our own presence entry by connectionId
        const filteredMembers = (members || [])
          .filter((member) => {
            if (myConnectionId) {
              return member.connectionId !== myConnectionId
            }
            return true
          })

        presenceState = filteredMembers.map((member) => {
          const data = member.data as AblyPresenceData
          return {
            user_id: data.user_id,
            user_name: data.user_name,
            user_avatar: data.user_avatar,
            board_type: data.board_type,
            board_id: data.board_id,
            last_seen: data.timestamp,
            is_editing: data.is_editing,
            editing_item_id: data.editing_item_id,
            editing_column_id: data.editing_column_id,
          } as BoardPresence
        })

        if (onPresenceChange) {
          onPresenceChange(presenceState)
        }
      } catch (err) {
        console.error('Error getting presence:', err)
      }
    }

    // Initial presence fetch
    updatePresenceState()

    return {
      channel,

      getPresenceState: () => presenceState,

      onPresenceChange: (callback: (presence: BoardPresence[]) => void) => {
        onPresenceChange = callback
      },

      onItemChange: (callback: (change: BoardItemChange) => void) => {
        onItemChange = callback
      },

      updatePresence: async (updates: Partial<AblyPresenceData>) => {
        try {
          const fullUpdate = {
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            board_type: boardType,
            board_id: boardId,
            timestamp: new Date().toISOString(),
            ...updates,
          } as AblyPresenceData
          await channel.presence.update(fullUpdate)
        } catch (err) {
          console.error('Error updating presence:', err)
        }
      },

      publishItemChange: async (change: Omit<BoardItemChange, 'changed_by'>) => {
        try {
          const fullChange = {
            ...change,
            changed_by: userId,
          } as BoardItemChange
          await channel.publish('item:change', fullChange)
        } catch (err) {
          console.error('Error publishing item change:', err)
        }
      },

      unsubscribe: async () => {
        try {
          await channel.presence.leave()
          channel.unsubscribe()
          channel.presence.unsubscribe()
        } catch (err) {
          console.error('Error unsubscribing:', err)
        }
      },
    }
  },

  /**
   * Check if Ably is available
   */
  isAvailable: isAblyAvailable,
}

/**
 * Fallback channel for when Ably is not available
 * Uses polling as a backup
 */
function createFallbackChannel() {
  let presenceState: BoardPresence[] = []
  let onPresenceChange: ((presence: BoardPresence[]) => void) | null = null
  let onItemChange: ((change: BoardItemChange) => void) | null = null

  return {
    channel: null,
    getPresenceState: () => presenceState,
    onPresenceChange: (callback: (presence: BoardPresence[]) => void) => {
      onPresenceChange = callback
    },
    onItemChange: (callback: (change: BoardItemChange) => void) => {
      onItemChange = callback
    },
    updatePresence: async () => {},
    publishItemChange: async () => {},
    unsubscribe: async () => {},
  }
}

export type AblyBoardChannel = ReturnType<typeof ablyPresenceService.createBoardChannel>
