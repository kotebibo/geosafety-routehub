'use client'

import { useState } from 'react'
import { FolderInput, Check } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import type { BoardGroup, BoardItem } from '@/features/boards/types/board'

interface MoveToGroupModalProps {
  isOpen: boolean
  onClose: () => void
  groups: BoardGroup[]
  items: BoardItem[]
  onMove: (itemId: string, targetGroupId: string) => Promise<void>
  onComplete?: () => void
}

export function MoveToGroupModal({
  isOpen,
  onClose,
  groups,
  items,
  onMove,
  onComplete,
}: MoveToGroupModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)

  if (!isOpen) return null

  // Find which groups the selected items are currently in
  const currentGroupIds = new Set(items.map(item => item.group_id).filter(Boolean))
  const allInSameGroup = currentGroupIds.size === 1
  const currentGroupId = allInSameGroup ? Array.from(currentGroupIds)[0] : null

  const handleMove = async () => {
    if (!selectedGroupId) return
    setMoving(true)
    try {
      for (const item of items) {
        if (item.group_id !== selectedGroupId) {
          await onMove(item.id, selectedGroupId)
        }
      }
      onComplete?.()
      onClose()
    } catch {
      // Error handled by onMove
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-bg-primary rounded-xl shadow-xl border border-border-light w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <FolderInput className="w-4 h-4" />
              Move to Group
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {items.length === 1 ? 'Move item' : `Move ${items.length} items`} to a different group
            </p>
          </div>

          <div className="px-3 py-2 max-h-64 overflow-y-auto">
            {groups
              .filter(g => !g.id.startsWith('groupby_'))
              .map(group => {
                const isCurrent = group.id === currentGroupId
                const isSelected = group.id === selectedGroupId

                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    disabled={isCurrent && items.length === 1}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-monday-primary/10 ring-1 ring-monday-primary'
                        : isCurrent
                          ? 'bg-bg-secondary opacity-60'
                          : 'hover:bg-bg-hover'
                    } ${isCurrent && items.length === 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: group.color || '#579bfc' }}
                    />
                    <span className="text-sm text-text-primary flex-1 truncate">{group.name}</span>
                    {isCurrent && <span className="text-xs text-text-tertiary">current</span>}
                    {isSelected && !isCurrent && (
                      <Check className="w-4 h-4 text-monday-primary flex-shrink-0" />
                    )}
                  </button>
                )
              })}
          </div>

          <div className="px-5 py-3 border-t border-border-light flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleMove}
              disabled={
                !selectedGroupId ||
                moving ||
                (selectedGroupId === currentGroupId && items.length === 1)
              }
            >
              {moving ? 'Moving...' : 'Move'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
