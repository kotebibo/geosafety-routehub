'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUserBoards } from '@/features/boards/hooks'
import { Button } from '@/shared/components/ui'
import { CreateBoardModal } from '@/features/boards/components'
import { Plus, MoreHorizontal, Trash2, Copy, ExternalLink, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Board } from '@/features/boards/types/board'

export default function BoardsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const { data: boards, isLoading } = useUserBoards(user?.id || '')

  // Track the workspace ID that was passed via URL - this persists even after URL is cleared
  const urlWorkspaceRef = useRef<string | null>(null)

  // Load workspace from URL param or localStorage, and handle ?create=true
  useEffect(() => {
    const urlWorkspace = searchParams.get('workspace')
    const shouldCreate = searchParams.get('create') === 'true'

    // Capture workspace ID from URL first (only if URL has workspace param)
    if (urlWorkspace) {
      urlWorkspaceRef.current = urlWorkspace
      setCurrentWorkspaceId(urlWorkspace)
    } else if (urlWorkspaceRef.current === null && typeof window !== 'undefined') {
      // Only use localStorage if we never captured from URL in this page session
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
      if (savedWorkspaceId) {
        setCurrentWorkspaceId(savedWorkspaceId)
      }
    }
    // If urlWorkspaceRef.current is set (not null), we already have the workspace from URL
    // Don't override with localStorage

    // Then open create modal if requested
    if (shouldCreate) {
      setIsCreateModalOpen(true)
      // Remove the query params from URL after a short delay
      // The workspace is already captured in urlWorkspaceRef and state
      const timeout = setTimeout(() => {
        router.replace('/boards', { scroll: false })
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [searchParams, router])

  // Reset the URL workspace ref when modal closes (user might want to create another board in a different workspace)
  useEffect(() => {
    if (!isCreateModalOpen) {
      urlWorkspaceRef.current = null
    }
  }, [isCreateModalOpen])


  const handleBoardCreated = (boardId: string) => {
    // Navigate to the new board
    router.push(`/boards/${boardId}`)
  }

  const handleBoardClick = (board: Board) => {
    router.push(`/boards/${board.id}`)
  }

  const getBoardColorClass = (color?: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-monday-primary',
      green: 'bg-status-done',
      red: 'bg-status-stuck',
      yellow: 'bg-status-working',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    }
    return colorMap[color || 'blue'] || 'bg-monday-primary'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">Loading boards...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-h1 font-bold text-text-primary mb-2">
              My Boards
            </h1>
            <p className="text-text-secondary">
              Create and manage your custom boards
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Board
          </Button>
        </div>

        {/* Boards Grid */}
        {boards && boards.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-bg-primary border-2 border-border-light flex items-center justify-center mb-6">
              <Plus className="w-12 h-12 text-text-tertiary" />
            </div>
            <h2 className="text-h3 font-semibold text-text-primary mb-2">
              No boards yet
            </h2>
            <p className="text-text-secondary text-center max-w-md mb-6">
              Create your first board to start organizing your work. Choose from templates or build from scratch.
            </p>
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards?.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onClick={() => handleBoardClick(board)}
                colorClass={getBoardColorClass(board.color)}
              />
            ))}

            {/* Create New Board Card */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={cn(
                'group relative h-48 rounded-lg',
                'border-2 border-dashed border-border-default',
                'hover:border-monday-primary hover:bg-monday-primary/5',
                'transition-all flex flex-col items-center justify-center gap-3'
              )}
            >
              <div className="w-16 h-16 rounded-full bg-bg-secondary group-hover:bg-monday-primary/10 flex items-center justify-center transition-colors">
                <Plus className="w-8 h-8 text-text-tertiary group-hover:text-monday-primary transition-colors" />
              </div>
              <span className="text-text-secondary group-hover:text-text-primary font-medium transition-colors">
                Create New Board
              </span>
            </button>
          </div>
        )}

        {/* Stats */}
        {boards && boards.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-primary border border-border-light rounded-lg p-6">
              <div className="text-3xl font-bold text-text-primary mb-1">
                {boards.length}
              </div>
              <div className="text-text-secondary text-sm">
                Total Boards
              </div>
            </div>

            <div className="bg-bg-primary border border-border-light rounded-lg p-6">
              <div className="text-3xl font-bold text-text-primary mb-1">
                {boards.filter(b => b.is_public).length}
              </div>
              <div className="text-text-secondary text-sm">
                Shared Boards
              </div>
            </div>

            <div className="bg-bg-primary border border-border-light rounded-lg p-6">
              <div className="text-3xl font-bold text-text-primary mb-1">
                {boards.filter(b => b.owner_id === user?.id).length}
              </div>
              <div className="text-text-secondary text-sm">
                Boards You Own
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBoardCreated={handleBoardCreated}
        workspaceId={currentWorkspaceId}
      />
    </div>
  )
}

// Board Card Component
function BoardCard({
  board,
  onClick,
  colorClass,
}: {
  board: Board
  onClick: () => void
  colorClass: string
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={cn(
        'group relative h-48 rounded-lg overflow-hidden',
        'bg-bg-primary border border-border-light',
        'hover:shadow-monday-md hover:border-monday-primary/30',
        'transition-all cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Color Bar */}
      <div className={cn('h-2 w-full', colorClass)} />

      {/* Content */}
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-text-primary text-lg line-clamp-2 flex-1">
            {board.name}
          </h3>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {board.description && (
          <p className="text-sm text-text-tertiary line-clamp-2 mb-4">
            {board.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            {board.is_public && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Shared</span>
              </div>
            )}
            <span className="capitalize">{board.board_type}</span>
          </div>

          <span>
            {new Date(board.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Hover Menu */}
      {showMenu && (
        <div
          className="absolute top-16 right-4 z-10 w-48 bg-bg-primary border border-border-light rounded-md shadow-monday-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <div className="my-1 border-t border-border-light" />
          <button className="w-full px-4 py-2 text-left text-sm text-status-stuck hover:bg-bg-hover flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
