'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useWorkspacesWithBoardCounts, useDeleteWorkspace, useUpdateWorkspace } from '@/features/workspaces/hooks'
import { CreateWorkspaceModal } from '@/features/workspaces/components'
import { Button } from '@/shared/components/ui'
import {
  Plus,
  MoreHorizontal,
  Settings,
  Folder,
  LayoutDashboard,
  Users,
  Home,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types/workspace'

// Workspace color mapping
const WORKSPACE_COLORS: Record<string, string> = {
  blue: 'bg-monday-primary',
  green: 'bg-status-done',
  red: 'bg-status-stuck',
  yellow: 'bg-status-working',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
}

export default function WorkspacesPage() {
  const router = useRouter()
  const { user, userRole } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: workspaces, isLoading, refetch } = useWorkspacesWithBoardCounts()

  // Check if user is admin
  const isAdmin = userRole?.role === 'admin'

  // Workspace action states
  const [renameWorkspace, setRenameWorkspace] = useState<Workspace | null>(null)
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const deleteMutation = useDeleteWorkspace()

  const handleWorkspaceCreated = (workspaceId: string) => {
    router.push(`/workspaces/${workspaceId}`)
  }

  const handleWorkspaceClick = (workspace: Workspace) => {
    router.push(`/workspaces/${workspace.id}`)
  }

  const handleRename = (workspace: Workspace) => {
    setRenameValue(workspace.name)
    setRenameWorkspace(workspace)
  }

  const handleDuplicate = async (workspace: Workspace) => {
    // Open create modal with pre-filled name
    setIsCreateModalOpen(true)
    // Note: CreateWorkspaceModal would need to accept initial values to fully support this
    // For now, just open the create modal
  }

  const handleDelete = async () => {
    if (!deleteWorkspace || deleteConfirmText !== deleteWorkspace.name) return
    try {
      await deleteMutation.mutateAsync(deleteWorkspace.id)
      setDeleteWorkspace(null)
      setDeleteConfirmText('')
      refetch()
    } catch (error) {
      console.error('Failed to delete workspace:', error)
    }
  }

  const getWorkspaceColorClass = (color?: string) => {
    return WORKSPACE_COLORS[color || 'blue'] || WORKSPACE_COLORS.blue
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">Loading workspaces...</span>
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
              Workspaces
            </h1>
            <p className="text-text-secondary">
              Organize your boards into workspaces
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Workspace
          </Button>
        </div>

        {/* Workspaces Grid */}
        {workspaces && workspaces.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-bg-primary border-2 border-border-light flex items-center justify-center mb-6">
              <Folder className="w-12 h-12 text-text-tertiary" />
            </div>
            <h2 className="text-h3 font-semibold text-text-primary mb-2">
              No workspaces yet
            </h2>
            <p className="text-text-secondary text-center max-w-md mb-6">
              Create your first workspace to start organizing your boards by team or project.
            </p>
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workspaces?.map((workspace) => {
              const isOwner = workspace.owner_id === user?.id
              return (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => handleWorkspaceClick(workspace)}
                  colorClass={getWorkspaceColorClass(workspace.color)}
                  canEdit={isOwner || isAdmin}
                  onRename={() => handleRename(workspace)}
                  onDuplicate={() => handleDuplicate(workspace)}
                  onDelete={() => setDeleteWorkspace(workspace)}
                />
              )
            })}

            {/* Create New Workspace Card */}
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
                Create New Workspace
              </span>
            </button>
          </div>
        )}

        {/* Stats */}
        {workspaces && workspaces.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-primary border border-border-light rounded-lg p-6">
              <div className="text-3xl font-bold text-text-primary mb-1">
                {workspaces.length}
              </div>
              <div className="text-text-secondary text-sm">
                Total Workspaces
              </div>
            </div>

            <div className="bg-bg-primary border border-border-light rounded-lg p-6">
              <div className="text-3xl font-bold text-text-primary mb-1">
                {workspaces.reduce((acc, w) => acc + (w.board_count || 0), 0)}
              </div>
              <div className="text-text-secondary text-sm">
                Total Boards
              </div>
            </div>

            <div className="bg-bg-primary border border-border-light rounded-lg p-6">
              <div className="text-3xl font-bold text-text-primary mb-1">
                {workspaces.filter(w => w.is_default).length}
              </div>
              <div className="text-text-secondary text-sm">
                Default Workspaces
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {inspectorId && (
        <CreateWorkspaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          userId={inspectorId}
          onSuccess={handleWorkspaceCreated}
        />
      )}

      {/* Rename Workspace Modal */}
      {renameWorkspace && (
        <RenameWorkspaceModal
          workspace={renameWorkspace}
          value={renameValue}
          onChange={setRenameValue}
          onClose={() => {
            setRenameWorkspace(null)
            setRenameValue('')
          }}
          onSuccess={() => {
            setRenameWorkspace(null)
            setRenameValue('')
            refetch()
          }}
        />
      )}

      {/* Delete Workspace Confirmation Modal */}
      {deleteWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Delete Workspace
            </h3>
            <p className="text-text-secondary mb-4">
              This action cannot be undone. All boards in this workspace will be moved to their owner's default workspace.
            </p>
            <p className="text-text-secondary mb-4">
              Please type <strong>{deleteWorkspace.name}</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type workspace name"
              className="w-full px-3 py-2 border border-border-default rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteWorkspace(null)
                  setDeleteConfirmText('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirmText !== deleteWorkspace.name || deleteMutation.isPending}
                className="flex-1"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Workspace Card Component
interface WorkspaceWithBoardCount extends Workspace {
  board_count?: number
}

function WorkspaceCard({
  workspace,
  onClick,
  colorClass,
  canEdit,
  onRename,
  onDuplicate,
  onDelete,
}: {
  workspace: WorkspaceWithBoardCount
  onClick: () => void
  colorClass: string
  canEdit: boolean
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`/workspaces/${workspace.id}`, '_blank')
    setShowMenu(false)
  }

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
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold',
                colorClass
              )}
            >
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-lg line-clamp-1">
                {workspace.name}
              </h3>
              {workspace.is_default && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-text-tertiary rounded">
                  Default
                </span>
              )}
            </div>
          </div>

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

        {workspace.description && (
          <p className="text-sm text-text-tertiary line-clamp-2 mb-4">
            {workspace.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <LayoutDashboard className="w-3 h-3" />
              <span>{workspace.board_count || 0} boards</span>
            </div>
          </div>

          <span>
            {new Date(workspace.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Hover Menu */}
      {showMenu && (
        <div
          className="absolute top-16 right-4 z-10 w-48 bg-bg-primary border border-border-light rounded-md shadow-monday-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/workspaces/${workspace.id}`}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <Folder className="w-4 h-4" />
            Open Workspace
          </Link>
          <button
            onClick={handleOpenInNewTab}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              onDuplicate()
            }}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                onRename()
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
          )}
          <Link
            href={`/workspaces/${workspace.id}/settings`}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          {canEdit && !workspace.is_default && (
            <>
              <div className="my-1 border-t border-border-light" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-4 py-2 text-left text-sm text-status-stuck hover:bg-bg-hover flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Rename Workspace Modal Component
function RenameWorkspaceModal({
  workspace,
  value,
  onChange,
  onClose,
  onSuccess,
}: {
  workspace: Workspace
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSuccess: () => void
}) {
  const updateMutation = useUpdateWorkspace(workspace.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    try {
      await updateMutation.mutateAsync({ name: value.trim() })
      onSuccess()
    } catch (error) {
      console.error('Failed to rename workspace:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Rename Workspace
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Workspace name"
            className="w-full px-3 py-2 border border-border-default rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!value.trim() || value === workspace.name || updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
