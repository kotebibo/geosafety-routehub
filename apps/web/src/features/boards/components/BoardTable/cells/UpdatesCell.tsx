'use client'

import React, { useState, lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'

// Lazy load the heavy modal component (~22KB) - only loaded when user clicks
const UpdatesModal = lazy(() => import('./UpdatesModal').then(m => ({ default: m.UpdatesModal })))

interface UpdatesCellProps {
  value?: number | null
  itemId?: string
  itemName?: string
  itemType?: string
  onEditStart?: () => void
}

export function UpdatesCell({ value, itemId, itemName, itemType = 'board_item', onEditStart }: UpdatesCellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(value || 0)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const handleOpen = () => {
    onEditStart?.()
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="relative h-full min-h-[36px]">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center justify-center gap-1.5 px-3',
          'hover:bg-[#f0f3ff] cursor-pointer transition-colors'
        )}
      >
        <MessageSquare className={cn(
          'w-4 h-4',
          commentCount > 0 ? 'text-[#0073ea]' : 'text-[#676879]'
        )} />
        {commentCount > 0 && (
          <span className="text-sm font-medium text-[#0073ea]">{commentCount}</span>
        )}
      </button>

      {/* Full Modal View - Lazy loaded */}
      {itemId && isModalOpen && (
        <Suspense fallback={null}>
          <UpdatesModal
            isOpen={isModalOpen}
            onClose={handleClose}
            itemId={itemId}
            itemName={itemName}
            itemType={itemType}
            onCommentCountChange={setCommentCount}
          />
        </Suspense>
      )}
    </div>
  )
}
