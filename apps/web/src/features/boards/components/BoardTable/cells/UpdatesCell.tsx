'use client'

import React, { useState, lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import type { BoardColumn } from '@/types/board'

// Lazy load the heavy modal component (~22KB) - only loaded when user clicks
const UpdatesPanel = lazy(() => import('./UpdatesPanel').then(m => ({ default: m.UpdatesPanel })))

interface UpdatesCellProps {
  value?: number | null
  itemId?: string
  itemName?: string
  itemType?: string
  row?: any
  allColumns?: BoardColumn[]
  onEditStart?: () => void
}

export function UpdatesCell({
  value,
  itemId,
  itemName,
  itemType = 'board_item',
  row,
  allColumns,
  onEditStart,
}: UpdatesCellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(value || 0)

  const handleOpen = () => {
    onEditStart?.()
    setIsModalOpen(true)
  }

  return (
    <div className="relative h-full min-h-[36px]">
      <button
        onClick={handleOpen}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center justify-center gap-1.5 px-3',
          'hover:bg-bg-hover cursor-pointer transition-colors'
        )}
      >
        <MessageSquare
          className={cn('w-4 h-4', commentCount > 0 ? 'text-text-link' : 'text-text-secondary')}
        />
        {commentCount > 0 && (
          <span className="text-sm font-medium text-text-link">{commentCount}</span>
        )}
      </button>

      {/* Slide-in Panel - Lazy loaded */}
      {itemId && isModalOpen && (
        <Suspense fallback={null}>
          <UpdatesPanel
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            itemId={itemId}
            itemName={itemName}
            itemType={itemType}
            row={row}
            allColumns={allColumns}
            onCommentCountChange={setCommentCount}
          />
        </Suspense>
      )}
    </div>
  )
}
