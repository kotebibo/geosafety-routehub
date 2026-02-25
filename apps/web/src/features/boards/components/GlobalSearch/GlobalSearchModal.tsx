'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useQueries } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import { boardsService } from '../../services/boards.service'
import { VirtualizedBoardTable } from '../BoardTable'
import { queryKeys } from '@/lib/react-query'

import type { GlobalSearchBoardGroup, BoardItem, BoardColumn, BoardGroup, BoardType } from '../../types/board'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { groupedResults, isLoading, totalCount } = useGlobalSearch(debouncedQuery)

  // Collect unique boardId+boardType pairs for column fetching
  const boardInfos = useMemo(() => {
    return groupedResults.map(g => ({
      boardId: g.boardId,
      boardType: g.boardType as BoardType,
    }))
  }, [groupedResults])

  // Fetch columns for each board that has results
  const columnQueries = useQueries({
    queries: boardInfos.map(info => ({
      queryKey: [...queryKeys.boardColumns.all, 'by-board', info.boardId],
      queryFn: () => boardsService.getColumns(info.boardType, info.boardId),
      staleTime: 5 * 60 * 1000,
      enabled: isOpen && boardInfos.length > 0,
    })),
  })

  // Map boardId -> columns
  const columnsByBoard = useMemo(() => {
    const map = new Map<string, BoardColumn[]>()
    boardInfos.forEach((info, i) => {
      const data = columnQueries[i]?.data
      if (data) {
        map.set(info.boardId, data.filter((c: BoardColumn) => c.is_visible))
      }
    })
    return map
  }, [boardInfos, columnQueries])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleRowDoubleClick = useCallback((boardId: string) => (row: BoardItem) => {
    onClose()
    router.push(`/boards/${boardId}?item=${row.id}`)
  }, [onClose, router])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Full-screen Modal */}
      <div className="relative flex flex-col m-3 bg-bg-primary rounded-lg shadow-2xl border border-border-light overflow-hidden flex-1">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-light flex-shrink-0">
          <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search across all boards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-tertiary"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-text-tertiary animate-spin flex-shrink-0" />
          )}
          {totalCount > 0 && (
            <span className="text-xs text-text-tertiary flex-shrink-0">
              {totalCount} result{totalCount !== 1 ? 's' : ''} in {groupedResults.length} board{groupedResults.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-hover rounded text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <EmptyState message="Type at least 2 characters to search..." />
          ) : groupedResults.length === 0 && !isLoading ? (
            <EmptyState message={`No results found for "${debouncedQuery}"`} />
          ) : (
            groupedResults.map(group => {
              const columns = columnsByBoard.get(group.boardId) || []
              const columnsReady = columnsByBoard.has(group.boardId)

              return (
                <SearchBoardSection
                  key={group.boardId}
                  group={group}
                  columns={columns}
                  columnsLoading={!columnsReady}
                  onRowDoubleClick={handleRowDoubleClick(group.boardId)}
                  highlightQuery={debouncedQuery}
                />
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-text-tertiary">
      {message}
    </div>
  )
}

interface SearchBoardSectionProps {
  group: GlobalSearchBoardGroup
  columns: BoardColumn[]
  columnsLoading: boolean
  onRowDoubleClick: (row: BoardItem) => void
  highlightQuery?: string
}

function SearchBoardSection({ group, columns, columnsLoading, onRowDoubleClick, highlightQuery }: SearchBoardSectionProps) {
  // Convert GlobalSearchResult[] to BoardItem[] for VirtualizedBoardTable
  const boardItems: BoardItem[] = useMemo(() => {
    return group.items.map(item => ({
      id: item.item_id,
      board_id: item.item_board_id,
      group_id: 'search-group',
      position: item.item_position,
      data: item.item_data || {},
      name: item.item_name,
      status: (item.item_status || 'default') as any,
      assigned_to: item.item_assigned_to || undefined,
      due_date: item.item_due_date || undefined,
      priority: 0,
      created_at: item.item_created_at,
      updated_at: item.item_created_at,
    }))
  }, [group.items])

  // Use the board name as the group name — this IS the header
  const groups: BoardGroup[] = useMemo(() => [{
    id: 'search-group',
    board_id: group.boardId,
    name: `${group.boardName} (${group.items.length})`,
    color: group.boardColor || '#579bfc',
    position: 0,
  }], [group.boardId, group.boardName, group.boardColor, group.items.length])

  if (columnsLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
      </div>
    )
  }

  if (columns.length === 0) return null

  return (
    <VirtualizedBoardTable
      boardType={group.boardType as BoardType}
      columns={columns}
      data={boardItems}
      groups={groups}
      onRowDoubleClick={onRowDoubleClick}
      scrollContainerClassName="overflow-visible bg-white"
      highlightQuery={highlightQuery}
    />
  )
}
