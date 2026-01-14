'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import {
  useWorkspaceWithMembers,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useWorkspaceMembers,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberRole,
} from '@/features/workspaces/hooks'
import { Button } from '@/shared/components/ui'
import {
  ArrowLeft,
  Save,
  Trash2,
  Users,
  Settings,
  Shield,
  UserMinus,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceRole } from '@/types/workspace'

// Color options
const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'bg-monday-primary' },
  { value: 'green', label: 'Green', class: 'bg-status-done' },
  { value: 'red', label: 'Red', class: 'bg-status-stuck' },
  { value: 'yellow', label: 'Yellow', class: 'bg-status-working' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
]

// Role options
const ROLE_OPTIONS: { value: WorkspaceRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Can manage members and boards' },
  { value: 'member', label: 'Member', description: 'Can view and create boards' },
  { value: 'guest', label: 'Guest', description: 'Read-only access' },
]

type TabType = 'general' | 'members' | 'danger'

export default function WorkspaceSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('blue')
  const [allowBoardCreation, setAllowBoardCreation] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const { data: workspace, isLoading: workspaceLoading } = useWorkspaceWithMembers(workspaceId)
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const updateMutation = useUpdateWorkspace(workspaceId)
  const deleteMutation = useDeleteWorkspace()
  const removeMemberMutation = useRemoveWorkspaceMember(workspaceId)
  const updateRoleMutation = useUpdateWorkspaceMemberRole(workspaceId)

  // Initialize form values when workspace loads
  useState(() => {
    if (workspace) {
      setName(workspace.name)
      setDescription(workspace.description || '')
      setColor(workspace.color || 'blue')
      setAllowBoardCreation(workspace.settings?.allowBoardCreation ?? true)
    }
  })

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      name,
      description: description || undefined,
      color,
      settings: { allowBoardCreation },
    })
    setHasChanges(false)
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== workspace?.name) return
    await deleteMutation.mutateAsync(workspaceId)
    router.push('/workspaces')
  }

  const handleRemoveMember = async (userId: string) => {
    await removeMemberMutation.mutateAsync(userId)
  }

  const handleUpdateRole = async (userId: string, role: WorkspaceRole) => {
    await updateRoleMutation.mutateAsync({ userId, role })
  }

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">Loading settings...</span>
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
        <Link href="/workspaces">
          <Button variant="primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspaces
          </Button>
        </Link>
      </div>
    )
  }

  const isOwner = workspace.owner_id === inspectorId

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/workspaces/${workspaceId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-h2 font-bold text-text-primary">
                Workspace Settings
              </h1>
              <p className="text-text-secondary">
                {workspace.name}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                activeTab === 'general'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              General
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                activeTab === 'members'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Members
            </button>
            {isOwner && (
              <button
                onClick={() => setActiveTab('danger')}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                  activeTab === 'danger'
                    ? 'bg-bg-secondary text-status-stuck'
                    : 'text-text-secondary hover:text-status-stuck'
                )}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Danger Zone
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                value={name || workspace.name}
                onChange={(e) => {
                  setName(e.target.value)
                  setHasChanges(true)
                }}
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary'
                )}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                value={description || workspace.description || ''}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setHasChanges(true)
                }}
                rows={3}
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary'
                )}
                placeholder="Describe this workspace..."
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setColor(option.value)
                      setHasChanges(true)
                    }}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform hover:scale-110',
                      option.class,
                      (color || workspace.color) === option.value &&
                        'ring-2 ring-offset-2 ring-monday-primary'
                    )}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            {/* Allow Board Creation */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Allow members to create boards
                </label>
                <p className="text-sm text-text-tertiary">
                  When disabled, only admins can create boards
                </p>
              </div>
              <button
                onClick={() => {
                  setAllowBoardCreation(!allowBoardCreation)
                  setHasChanges(true)
                }}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  allowBoardCreation ? 'bg-monday-primary' : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    allowBoardCreation ? 'right-1' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Save Button */}
            {hasChanges && (
              <div className="pt-4 border-t border-border-light">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Workspace Members ({members?.length || 0})
            </h3>

            {membersLoading ? (
              <div className="py-8 text-center text-text-secondary">
                Loading members...
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-monday-primary flex items-center justify-center text-white font-medium">
                        {member.user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">
                          {member.user?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-text-tertiary">
                          {member.user?.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.role === 'owner' ? (
                        <span className="px-2 py-1 bg-monday-primary/10 text-monday-primary text-xs font-medium rounded">
                          Owner
                        </span>
                      ) : isOwner ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(member.user_id, e.target.value as WorkspaceRole)
                            }
                            className="px-2 py-1 border border-border-default rounded text-sm"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-1 text-text-tertiary hover:text-status-stuck rounded"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-text-secondary text-xs font-medium rounded capitalize">
                          {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-text-secondary">
                No members found
              </div>
            )}
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && isOwner && (
          <div className="bg-bg-primary rounded-lg border border-status-stuck/30 p-6">
            <h3 className="text-lg font-semibold text-status-stuck mb-2">
              Danger Zone
            </h3>
            <p className="text-text-secondary mb-6">
              These actions are irreversible. Please be careful.
            </p>

            <div className="p-4 border border-status-stuck/30 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-text-primary">
                    Delete this workspace
                  </h4>
                  <p className="text-sm text-text-tertiary mt-1">
                    This will permanently delete the workspace and remove all member access.
                    Boards will be moved to their owner's default workspace.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={workspace.is_default}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              {workspace.is_default && (
                <p className="mt-3 text-sm text-status-stuck">
                  You cannot delete your default workspace.
                </p>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Delete Workspace
                  </h3>
                  <p className="text-text-secondary mb-4">
                    This action cannot be undone. Please type{' '}
                    <strong>{workspace.name}</strong> to confirm.
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
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteConfirmText !== workspace.name || deleteMutation.isPending}
                      className="flex-1"
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
