'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, Users, Search, ChevronDown, Crown, Pencil, Eye, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui-monday'
import { useBoardMembers, useAddBoardMember, useUpdateBoardMemberRole, useRemoveBoardMember } from '../hooks'
import { useAuth } from '@/contexts/AuthContext'
import type { BoardMember } from '@/types/board'
import { usersService, type User } from '@/services/users.service'
import { useQuery } from '@tanstack/react-query'

interface BoardAccessModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  boardName: string
  ownerId: string
}

type MemberRole = 'owner' | 'editor' | 'viewer'

const ROLE_CONFIG: Record<MemberRole, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  owner: {
    label: 'Owner',
    icon: <Crown className="w-4 h-4" />,
    description: 'Full access, can manage members',
    color: 'text-amber-600',
  },
  editor: {
    label: 'Editor',
    icon: <Pencil className="w-4 h-4" />,
    description: 'Can edit board content',
    color: 'text-blue-600',
  },
  viewer: {
    label: 'Viewer',
    icon: <Eye className="w-4 h-4" />,
    description: 'Can only view',
    color: 'text-gray-600',
  },
}

export function BoardAccessModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  ownerId,
}: BoardAccessModalProps) {
  const { user, isAdmin } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<MemberRole>('viewer')
  const [showAddUser, setShowAddUser] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch board members
  const { data: members = [], isLoading: loadingMembers } = useBoardMembers(boardId)

  // Fetch all users for adding
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersService.getUsers(),
    enabled: showAddUser,
  })

  // Mutations
  const addMember = useAddBoardMember(boardId)
  const updateRole = useUpdateBoardMemberRole(boardId)
  const removeMember = useRemoveBoardMember(boardId)

  // Check if current user is owner or admin
  const isCurrentUserOwner = user?.id === ownerId || members.some(m => m.user_id === user?.id && m.role === 'owner')
  const canManageAccess = isCurrentUserOwner || isAdmin

  // Filter users not already members
  const memberUserIds = new Set(members.map(m => m.user_id))
  const availableUsers = allUsers.filter(u =>
    !memberUserIds.has(u.id) &&
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleAddMember = async (userId: string) => {
    if (!user?.id) return
    try {
      await addMember.mutateAsync({
        userId,
        role: selectedRole,
        addedBy: user.id,
      })
      setSearchQuery('')
      setShowAddUser(false)
    } catch (error) {
      console.error('Failed to add member:', error)
    }
  }

  const handleUpdateRole = async (userId: string, role: MemberRole) => {
    try {
      await updateRole.mutateAsync({ userId, role })
      setRoleDropdownOpen(null)
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember.mutateAsync(userId)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setShowAddUser(false)
    setRoleDropdownOpen(null)
    onClose()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setRoleDropdownOpen(null)
    if (roleDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [roleDropdownOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-primary rounded-lg shadow-monday-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-monday-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-monday-primary" />
            </div>
            <div>
              <h2 className="text-h4 font-semibold text-text-primary">
                Board Access
              </h2>
              <p className="text-sm text-text-secondary truncate max-w-[280px]">
                {boardName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Add Member Section */}
          {canManageAccess && (
            <div className="mb-4">
              {showAddUser ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        autoFocus
                        className={cn(
                          'w-full pl-9 pr-4 py-2 rounded-md',
                          'border border-border-default',
                          'focus:ring-2 focus:ring-monday-primary focus:border-transparent',
                          'text-text-primary placeholder-text-tertiary',
                          'transition-all text-sm'
                        )}
                      />
                    </div>
                    {/* Role selector for new member */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setRoleDropdownOpen(roleDropdownOpen === 'new' ? null : 'new')
                        }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md',
                          'border border-border-default',
                          'hover:bg-bg-hover transition-colors text-sm'
                        )}
                      >
                        <span className={ROLE_CONFIG[selectedRole].color}>
                          {ROLE_CONFIG[selectedRole].icon}
                        </span>
                        <span>{ROLE_CONFIG[selectedRole].label}</span>
                        <ChevronDown className="w-4 h-4 text-text-tertiary" />
                      </button>
                      {roleDropdownOpen === 'new' && (
                        <RoleDropdown
                          currentRole={selectedRole}
                          onSelect={(role) => {
                            setSelectedRole(role)
                            setRoleDropdownOpen(null)
                          }}
                          excludeOwner={true}
                        />
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowAddUser(false)
                        setSearchQuery('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* User search results */}
                  {searchQuery && (
                    <div className="border border-border-light rounded-md max-h-48 overflow-y-auto">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-5 h-5 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : availableUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-text-secondary text-center">
                          No users found
                        </div>
                      ) : (
                        availableUsers.slice(0, 5).map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleAddMember(u.id)}
                            disabled={addMember.isPending}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2',
                              'hover:bg-bg-hover transition-colors text-left',
                              'border-b border-border-light last:border-b-0'
                            )}
                          >
                            <UserAvatar name={u.full_name} avatarUrl={u.avatar_url} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-text-primary truncate">
                                {u.full_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-text-secondary truncate">
                                {u.email}
                              </div>
                            </div>
                            <UserPlus className="w-4 h-4 text-text-tertiary" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setShowAddUser(true)}
                  className="w-full justify-center"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add people
                </Button>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-text-secondary mb-2">
              Members ({members.length})
            </div>

            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-sm text-text-secondary text-center py-8">
                No members yet
              </div>
            ) : (
              <div className="space-y-1 max-h-[320px] overflow-y-auto">
                {members.map((member) => (
                  <MemberRow
                    key={member.user_id}
                    member={member}
                    isOwner={member.user_id === ownerId}
                    canManage={canManageAccess && member.user_id !== user?.id}
                    roleDropdownOpen={roleDropdownOpen === member.user_id}
                    onToggleDropdown={(e) => {
                      e.stopPropagation()
                      setRoleDropdownOpen(roleDropdownOpen === member.user_id ? null : member.user_id)
                    }}
                    onUpdateRole={(role) => handleUpdateRole(member.user_id, role)}
                    onRemove={() => handleRemoveMember(member.user_id)}
                    isUpdating={updateRole.isPending}
                    isRemoving={removeMember.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper Components

function UserAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = name
    ?.split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        className="w-8 h-8 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="w-8 h-8 rounded-full bg-monday-primary text-white flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  )
}

interface MemberRowProps {
  member: BoardMember
  isOwner: boolean
  canManage: boolean
  roleDropdownOpen: boolean
  onToggleDropdown: (e: React.MouseEvent) => void
  onUpdateRole: (role: MemberRole) => void
  onRemove: () => void
  isUpdating: boolean
  isRemoving: boolean
}

function MemberRow({
  member,
  isOwner,
  canManage,
  roleDropdownOpen,
  onToggleDropdown,
  onUpdateRole,
  onRemove,
  isUpdating,
  isRemoving,
}: MemberRowProps) {
  const roleConfig = ROLE_CONFIG[member.role]

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-md',
      'hover:bg-bg-hover transition-colors'
    )}>
      <UserAvatar
        name={member.user?.full_name || null}
        avatarUrl={member.user?.avatar_url || null}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {member.user?.full_name || 'Unknown'}
          </span>
          {isOwner && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Board Owner
            </span>
          )}
        </div>
        <div className="text-xs text-text-secondary truncate">
          {member.user?.email}
        </div>
      </div>

      {/* Role badge / dropdown */}
      <div className="relative">
        {canManage ? (
          <>
            <button
              onClick={onToggleDropdown}
              disabled={isUpdating}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md',
                'border border-border-default',
                'hover:bg-bg-hover transition-colors text-sm',
                isUpdating && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className={roleConfig.color}>{roleConfig.icon}</span>
              <span className="text-text-secondary">{roleConfig.label}</span>
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            </button>
            {roleDropdownOpen && (
              <RoleDropdown
                currentRole={member.role}
                onSelect={onUpdateRole}
                excludeOwner={false}
              />
            )}
          </>
        ) : (
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-sm',
            roleConfig.color
          )}>
            {roleConfig.icon}
            <span>{roleConfig.label}</span>
          </div>
        )}
      </div>

      {/* Remove button */}
      {canManage && (
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className={cn(
            'p-1.5 rounded-md text-text-tertiary',
            'hover:bg-red-50 hover:text-red-600 transition-colors',
            isRemoving && 'opacity-50 cursor-not-allowed'
          )}
          title="Remove member"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

interface RoleDropdownProps {
  currentRole: MemberRole
  onSelect: (role: MemberRole) => void
  excludeOwner: boolean
}

function RoleDropdown({ currentRole, onSelect, excludeOwner }: RoleDropdownProps) {
  const roles: MemberRole[] = excludeOwner ? ['editor', 'viewer'] : ['owner', 'editor', 'viewer']

  return (
    <div className={cn(
      'absolute right-0 top-full mt-1 z-50',
      'bg-white rounded-md shadow-lg border border-border-light',
      'min-w-[180px] py-1'
    )}>
      {roles.map((role) => {
        const config = ROLE_CONFIG[role]
        const isSelected = role === currentRole

        return (
          <button
            key={role}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(role)
            }}
            className={cn(
              'w-full flex items-start gap-3 px-3 py-2',
              'hover:bg-bg-hover transition-colors text-left',
              isSelected && 'bg-bg-hover'
            )}
          >
            <span className={cn('mt-0.5', config.color)}>{config.icon}</span>
            <div>
              <div className="text-sm font-medium text-text-primary">
                {config.label}
              </div>
              <div className="text-xs text-text-secondary">
                {config.description}
              </div>
            </div>
            {isSelected && (
              <svg className="w-4 h-4 text-monday-primary ml-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
