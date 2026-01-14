'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useWorkspacesWithBoardCounts } from '@/features/workspaces/hooks'
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
  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: workspaces, isLoading } = useWorkspacesWithBoardCounts()

  const handleWorkspaceCreated = (workspaceId: string) => {
    router.push(`/workspaces/${workspaceId}`)
  }

  const handleWorkspaceClick = (workspace: Workspace) => {
    router.push(`/workspaces/${workspace.id}`)
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
            {workspaces?.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onClick={() => handleWorkspaceClick(workspace)}
                colorClass={getWorkspaceColorClass(workspace.color)}
              />
            ))}

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
}: {
  workspace: WorkspaceWithBoardCount
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
          <Link
            href={`/workspaces/${workspace.id}/settings`}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      )}
    </div>
  )
}
