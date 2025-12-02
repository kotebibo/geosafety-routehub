'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { BoardPresence } from '@/features/boards/types/board'

interface BoardPresenceIndicatorProps {
  presence: BoardPresence[]
  isConnected: boolean
  maxAvatars?: number
}

// Generate consistent color from user ID
function getUserColor(userId: string): string {
  const colors = [
    '#579bfc', // Bright blue
    '#a25ddc', // Dark purple
    '#00c875', // Grass green
    '#fdab3d', // Egg yolk
    '#e2445c', // Berry
    '#00d2d2', // Aquamarine
    '#ff7575', // Coral
    '#784bd1', // Royal
    '#ff158a', // Lipstick
    '#037f4c', // Dark green
  ]

  // Simple hash from userId
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash
  }

  return colors[Math.abs(hash) % colors.length]
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export function BoardPresenceIndicator({
  presence,
  isConnected,
  maxAvatars = 5,
}: BoardPresenceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (presence.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        )} />
        <span className="text-xs text-text-tertiary">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
    )
  }

  const visibleUsers = presence.slice(0, maxAvatars)
  const remainingCount = presence.length - maxAvatars

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Connection indicator */}
      <div className={cn(
        'w-2 h-2 rounded-full mr-2',
        isConnected ? 'bg-green-500' : 'bg-gray-400'
      )} />

      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user, index) => (
          <div
            key={user.user_id}
            className={cn(
              'relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white',
              user.is_editing && 'ring-2 ring-offset-1 ring-yellow-400'
            )}
            style={{
              backgroundColor: getUserColor(user.user_id),
              zIndex: visibleUsers.length - index,
            }}
            title={user.user_name}
          >
            {getInitials(user.user_name)}

            {/* Editing indicator */}
            {user.is_editing && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-sm" />
              </span>
            )}
          </div>
        ))}

        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 text-gray-600 border-2 border-white"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && presence.length > 0 && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg shadow-lg border border-border-light py-2 px-3 min-w-[200px]">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {presence.length} viewer{presence.length !== 1 ? 's' : ''} online
          </div>
          <div className="space-y-2">
            {presence.map((user) => (
              <div key={user.user_id} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                  style={{ backgroundColor: getUserColor(user.user_id) }}
                >
                  {getInitials(user.user_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">
                    {user.user_name}
                  </div>
                  {user.is_editing && (
                    <div className="text-xs text-yellow-600">
                      Editing...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Cell-level editing indicator - shows avatars of users editing a specific cell
 */
interface CellEditingIndicatorProps {
  users: BoardPresence[]
  position?: 'top-right' | 'bottom-right'
}

export function CellEditingIndicator({
  users,
  position = 'top-right',
}: CellEditingIndicatorProps) {
  if (users.length === 0) return null

  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'bottom-right': '-bottom-1 -right-1',
  }

  return (
    <div className={cn('absolute z-10 flex -space-x-1', positionClasses[position])}>
      {users.slice(0, 2).map((user) => (
        <div
          key={user.user_id}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium text-white border border-white animate-pulse"
          style={{ backgroundColor: getUserColor(user.user_id) }}
          title={`${user.user_name} is editing`}
        >
          {getInitials(user.user_name)}
        </div>
      ))}
    </div>
  )
}
