'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  X,
  ArrowRight,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react'
import { Button } from '@/components/ui-monday'
import { useAuth } from '@/contexts/AuthContext'
import {
  useUserBoards,
  useColumnMapping,
  useMoveItemToBoard,
  useMoveItemsToBoard,
} from '../hooks'
import type { Board, BoardColumn } from '@/types/board'

interface MoveItemModalProps {
  isOpen: boolean
  onClose: () => void
  itemIds: string[]
  sourceBoardId: string
  onMoveComplete?: (movedCount: number, failedCount: number) => void
}

export function MoveItemModal({
  isOpen,
  onClose,
  itemIds,
  sourceBoardId,
  onMoveComplete,
}: MoveItemModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [showBoardDropdown, setShowBoardDropdown] = useState(false)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [preserveUnmapped, setPreserveUnmapped] = useState(true)

  // Get current user
  const { user } = useAuth()

  // Fetch user's boards
  const { data: boards, isLoading: boardsLoading } = useUserBoards(user?.id || '')

  // Get column mapping when target board is selected
  const {
    data: mappingData,
    isLoading: mappingLoading,
  } = useColumnMapping(sourceBoardId, selectedBoardId)

  // Move mutations
  const moveItem = useMoveItemToBoard()
  const moveItems = useMoveItemsToBoard()

  const isSingleItem = itemIds.length === 1
  const isMoving = moveItem.isPending || moveItems.isPending

  // Filter out the source board from available targets
  const availableBoards = useMemo(() => {
    return (boards || []).filter((board) => board.id !== sourceBoardId)
  }, [boards, sourceBoardId])

  // Initialize column mapping from auto-mapped values
  useEffect(() => {
    if (mappingData?.autoMapped) {
      setColumnMapping(mappingData.autoMapped)
    }
  }, [mappingData])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBoardId('')
      setColumnMapping({})
      setShowBoardDropdown(false)
    }
  }, [isOpen])

  const selectedBoard = availableBoards.find((b) => b.id === selectedBoardId)

  const handleColumnMappingChange = (sourceColId: string, targetColId: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [sourceColId]: targetColId,
    }))
  }

  const handleMove = async () => {
    if (!selectedBoardId) return

    try {
      if (isSingleItem) {
        await moveItem.mutateAsync({
          itemId: itemIds[0],
          targetBoardId: selectedBoardId,
          columnMapping: mappingData?.sameBoardType ? undefined : columnMapping,
          options: { preserveUnmapped },
        })
        onMoveComplete?.(1, 0)
      } else {
        const result = await moveItems.mutateAsync({
          itemIds,
          targetBoardId: selectedBoardId,
          columnMapping: mappingData?.sameBoardType ? undefined : columnMapping,
          options: { preserveUnmapped },
        })
        onMoveComplete?.(result.moved.length, result.failed.length)
      }
      onClose()
    } catch (error) {
      console.error('Failed to move item(s):', error)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  Move {isSingleItem ? 'Item' : `${itemIds.length} Items`}
                </h2>
                <p className="text-sm text-gray-500">
                  Select destination board
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Board Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Board
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                  className={cn(
                    'w-full px-4 py-3 border rounded-lg text-left flex items-center justify-between',
                    'hover:border-monday-primary transition-colors',
                    showBoardDropdown ? 'border-monday-primary ring-2 ring-monday-primary/20' : 'border-gray-300'
                  )}
                >
                  <span className={selectedBoard ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedBoard?.name || 'Select a board...'}
                  </span>
                  <ChevronDown className={cn(
                    'w-5 h-5 text-gray-400 transition-transform',
                    showBoardDropdown && 'rotate-180'
                  )} />
                </button>

                {showBoardDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {boardsLoading ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading boards...
                      </div>
                    ) : availableBoards.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No other boards available
                      </div>
                    ) : (
                      availableBoards.map((board) => (
                        <button
                          key={board.id}
                          onClick={() => {
                            setSelectedBoardId(board.id)
                            setShowBoardDropdown(false)
                          }}
                          className={cn(
                            'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between',
                            board.id === selectedBoardId && 'bg-monday-primary/5'
                          )}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{board.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{board.board_type}</p>
                          </div>
                          {board.id === selectedBoardId && (
                            <Check className="w-5 h-5 text-monday-primary" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Column Mapping Section */}
            {selectedBoardId && mappingLoading && (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Analyzing columns...
              </div>
            )}

            {selectedBoardId && mappingData && !mappingData.sameBoardType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Column Mapping</h3>
                  {mappingData.needsMapping.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                      {mappingData.needsMapping.length} unmapped
                    </span>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {mappingData.sourceColumns.map((srcCol) => (
                    <div key={srcCol.column_id} className="px-4 py-3 flex items-center gap-3">
                      {/* Source Column */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">
                          {srcCol.column_name}
                        </p>
                        <p className="text-xs text-gray-500">{srcCol.column_type}</p>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

                      {/* Target Column Selector */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={columnMapping[srcCol.column_id] || ''}
                          onChange={(e) => handleColumnMappingChange(srcCol.column_id, e.target.value)}
                          className={cn(
                            'w-full px-2 py-1.5 text-sm border rounded-md',
                            !columnMapping[srcCol.column_id] ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                          )}
                        >
                          <option value="">-- Skip --</option>
                          {mappingData.targetColumns
                            .filter((tc) => tc.column_type === srcCol.column_type || tc.column_type === 'text')
                            .map((tc) => (
                              <option key={tc.column_id} value={tc.column_id}>
                                {tc.column_name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preserve Unmapped Option */}
                <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveUnmapped}
                    onChange={(e) => setPreserveUnmapped(e.target.checked)}
                    className="w-4 h-4 text-monday-primary border-gray-300 rounded focus:ring-monday-primary"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Preserve unmapped data
                    </p>
                    <p className="text-xs text-gray-500">
                      Store skipped column values in metadata for recovery
                    </p>
                  </div>
                </label>
              </div>
            )}

            {selectedBoardId && mappingData?.sameBoardType && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 text-sm">
                    Same board type
                  </p>
                  <p className="text-xs text-green-600">
                    Columns will transfer directly without mapping
                  </p>
                </div>
              </div>
            )}

            {/* Warning for unmapped columns */}
            {selectedBoardId && mappingData && !mappingData.sameBoardType && mappingData.needsMapping.length > 0 && !preserveUnmapped && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">
                    Some columns are not mapped
                  </p>
                  <p className="text-xs text-amber-600">
                    Data in unmapped columns will be lost. Enable "Preserve unmapped data" to keep it.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={!selectedBoardId || isMoving}
            >
              {isMoving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Moving...
                </>
              ) : (
                <>
                  Move {isSingleItem ? 'Item' : `${itemIds.length} Items`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default MoveItemModal
