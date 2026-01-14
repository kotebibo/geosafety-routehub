'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import {
  useWorkspace,
  useActiveWorkspaceBoards,
  useArchivedWorkspaceBoards,
  useRestoreBoard,
  useArchiveBoard,
} from '@/features/workspaces/hooks'
import { CreateBoardModal } from '@/features/boards/components'
import { Button } from '@/shared/components/ui'
import {
  Plus,
  MoreHorizontal,
  Settings,
  ArrowLeft,
  Archive,
  ArchiveRestore,
  ChevronDown,
  Star,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Board } from '@/types/board'

// Board color mapping
const BOARD_COLORS: Record<string, string> = {
  blue: 'bg-monday-primary',
  green: 'bg-status-done',
  red: 'bg-status-stuck',
  yellow: 'bg-status-working',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
}

export default function WorkspaceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId)
  const { data: activeBoards, isLoading: activeBoardsLoading } = useActiveWorkspaceBoards(workspaceId)
  const { data: archivedBoards, isLoading: archivedBoardsLoading } = useArchivedWorkspaceBoards(workspaceId)

  const archiveMutation = useArchiveBoard()
  const restoreMutation = useRestoreBoard()

  const handleBoardCreated = (boardId: string) => {
    router.push(`/boards/${boardId}`)
  }

  const handleBoardClick = (board: Board) => {
    router.push(`/boards/${board.id}`)
  }

  const handleArchiveBoard = async (boardId: string) => {
    await archiveMutation.mutateAsync(boardId)
  }

  const handleRestoreBoard = async (boardId: string) => {
    await restoreMutation.mutateAsync(boardId)
  }

  const getBoardColorClass = (color?: string) => {
    return BOARD_COLORS[color || 'blue'] || BOARD_COLORS.blue
  }

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">Loading workspace...</span>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-h3 font-semibold text-text-primary mb-2">
          Workspace not found
        </h2>
        <p className="text-text-secondary mb-6">
          The workspace you're looking for doesn't exist or you don't have access.
        </p>
        <Link href="/workspaces">
          <Button variant="primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspaces
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <Link href="/workspaces" className="hover:text-monday-primary">
            Workspaces
          </Link>
          <span>/</span>
          <span className="text-text-primary">{workspace.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold',
                BOARD_COLORS[workspace.color || 'blue'] || BOARD_COLORS.blue
              )}
            >
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-h1 font-bold text-text-primary">
                  {workspace.name}
                </h1>
                {workspace.is_default && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-text-tertiary rounded">
                    Default
                  </span>
                )}
              </div>
              {workspace.description && (
                <p className="text-text-secondary mt-1">
                  {workspace.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/workspaces/${workspaceId}/settings`}>
              <Button variant="ghost">
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </Button>
            </Link>
            <Button
              variant="primary"
              onClick={() => setIsCreateBoardModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Board
            </Button>
          </div>
        </div>

        {/* Active Boards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Boards ({activeBoards?.length || 0})
          </h2>

          {activeBoardsLoading ? (
            <div className="flex items-center gap-3 py-8">
              <div className="w-6 h-6 border-3 border-monday-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary">Loading boards...</span>
            </div>
          ) : activeBoards && activeBoards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onClick={() => handleBoardClick(board)}
                  colorClass={getBoardColorClass(board.color)}
                  onArchive={() => handleArchiveBoard(board.id)}
                />
              ))}

              {/* Create New Board Card */}
              <button
                onClick={() => setIsCreateBoardModalOpen(true)}
                className={cn(
                  'group relative h-44 rounded-lg',
                  'border-2 border-dashed border-border-default',
                  'hover:border-monday-primary hover:bg-monday-primary/5',
                  'transition-all flex flex-col items-center justify-center gap-3'
                )}
              >
                <div className="w-12 h-12 rounded-full bg-bg-secondary group-hover:bg-monday-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-text-tertiary group-hover:text-monday-primary transition-colors" />
                </div>
                <span className="text-text-secondary group-hover:text-text-primary font-medium transition-colors">
                  Create Board
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-bg-primary rounded-lg border border-border-light">
              <LayoutDashboard className="w-12 h-12 text-text-tertiary mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No boards in this workspace
              </h3>
              <p className="text-text-secondary text-center max-w-md mb-4">
                Create your first board to start organizing your work.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsCreateBoardModalOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Board
              </Button>
            </div>
          )}
        </div>

        {/* Archived Boards */}
        {archivedBoards && archivedBoards.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4"
            >
              <Archive className="w-4 h-4" />
              <span className="font-medium">Archived ({archivedBoards.length})</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  showArchived && 'rotate-180'
                )}
              />
            </button>

            {showArchived && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {archivedBoards.map((board) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    onClick={() => handleBoardClick(board)}
                    colorClass={getBoardColorClass(board.color)}
                    isArchived
                    onRestore={() => handleRestoreBoard(board.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onBoardCreated={handleBoardCreated}
        workspaceId={workspaceId}
      />
    </div>
  )
}

// Board Card Component
function BoardCard({
  board,
  onClick,
  colorClass,
  isArchived = false,
  onArchive,
  onRestore,
}: {
  board: Board
  onClick: () => void
  colorClass: string
  isArchived?: boolean
  onArchive?: () => void
  onRestore?: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={cn(
        'group relative h-44 rounded-lg overflow-hidden',
        'bg-bg-primary border border-border-light',
        'hover:shadow-monday-md hover:border-monday-primary/30',
        'transition-all cursor-pointer',
        isArchived && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Color Bar */}
      <div className={cn('h-2 w-full', colorClass)} />

      {/* Content */}
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-text-primary line-clamp-2 flex-1 pr-2">
            {board.name}
          </h3>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <MoreHorizontal className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {board.description && (
          <p className="text-sm text-text-tertiary line-clamp-2 mb-3">
            {board.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-3">
            {board.settings?.is_favorite && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            )}
            {board.is_public && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Shared</span>
              </div>
            )}
          </div>

          <span>
            {new Date(board.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Hover Menu */}
      {showMenu && (
        <div
          className="absolute top-12 right-4 z-10 w-44 bg-bg-primary border border-border-light rounded-md shadow-monday-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {isArchived ? (
            <button
              onClick={() => {
                onRestore?.()
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
            >
              <ArchiveRestore className="w-4 h-4" />
              Restore
            </button>
          ) : (
            <button
              onClick={() => {
                onArchive?.()
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          )}
        </div>
      )}
    </div>
  )
}
