/**
 * Workspace Types
 * Workspaces group and organize multiple boards
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest'

export interface Workspace {
  id: string
  name: string
  name_ka?: string
  description?: string
  icon?: string
  color?: string
  owner_id: string
  settings: WorkspaceSettings
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface WorkspaceSettings {
  allowBoardCreation: boolean
  archivedBoards: string[]
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  added_by?: string
  added_at: string
  user?: {
    full_name: string
    email: string
    avatar_url?: string
  }
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[]
  board_count?: number
}

export interface WorkspaceWithBoards extends Workspace {
  boards: {
    id: string
    name: string
    icon?: string
    color?: string
    is_archived?: boolean
  }[]
}

// Create/Update DTOs
export interface CreateWorkspaceInput {
  name: string
  name_ka?: string
  description?: string
  icon?: string
  color?: string
}

export interface UpdateWorkspaceInput {
  name?: string
  name_ka?: string
  description?: string
  icon?: string
  color?: string
  settings?: Partial<WorkspaceSettings>
}

export interface AddWorkspaceMemberInput {
  user_id: string
  role: WorkspaceRole
}

// Role permissions helper
export const WORKSPACE_ROLE_PERMISSIONS = {
  owner: {
    canDelete: true,
    canManageMembers: true,
    canEditSettings: true,
    canCreateBoards: true,
    canArchiveBoards: true,
    canViewBoards: true,
  },
  admin: {
    canDelete: false,
    canManageMembers: true,
    canEditSettings: true,
    canCreateBoards: true,
    canArchiveBoards: true,
    canViewBoards: true,
  },
  member: {
    canDelete: false,
    canManageMembers: false,
    canEditSettings: false,
    canCreateBoards: true,
    canArchiveBoards: false,
    canViewBoards: true,
  },
  guest: {
    canDelete: false,
    canManageMembers: false,
    canEditSettings: false,
    canCreateBoards: false,
    canArchiveBoards: false,
    canViewBoards: true,
  },
} as const

export type WorkspacePermissions = typeof WORKSPACE_ROLE_PERMISSIONS[WorkspaceRole]
