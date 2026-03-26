/**
 * Workspace Service
 * Handles CRUD operations for workspaces and workspace members
 */

import { createClient } from '@/lib/supabase'
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceWithMembers,
  WorkspaceWithBoards,
  WorkspaceRole,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@/types/workspace'
import type { Board } from '@/types/board'

// Helper to get supabase client with current auth state
// IMPORTANT: Must be called inside functions, not at module level
const getSupabase = () => createClient()

export const workspaceService = {
  // ==================== WORKSPACES ====================

  /**
   * Get all workspaces accessible to the user
   * RLS policies automatically filter based on auth.email()
   */
  async getWorkspaces(): Promise<(Workspace & { current_user_role?: WorkspaceRole })[]> {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .select('*, workspace_members(role, user_id)')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Extract the current user's role from the joined workspace_members
    // RLS ensures we only see our own membership rows
    return (data || []).map((w: any) => {
      const myMembership = w.workspace_members?.[0]
      const { workspace_members, ...workspace } = w
      return {
        ...workspace,
        current_user_role: myMembership?.role || null,
      }
    })
  },

  /**
   * Get workspaces with board counts
   */
  async getWorkspacesWithBoardCounts(): Promise<
    (Workspace & { board_count: number; current_user_role?: WorkspaceRole })[]
  > {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .select(
        `
        *,
        boards:boards(count),
        workspace_members(role, user_id)
      `
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((w: any) => {
      const myMembership = w.workspace_members?.[0]
      const { workspace_members, ...workspace } = w
      return {
        ...workspace,
        board_count: w.boards?.[0]?.count || 0,
        current_user_role: myMembership?.role || null,
      }
    })
  },

  /**
   * Get a specific workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get workspace with its members
   */
  async getWorkspaceWithMembers(workspaceId: string): Promise<WorkspaceWithMembers> {
    // First get the workspace
    const { data: workspace, error: wsError } = await (getSupabase().from('workspaces') as any)
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (wsError) throw wsError

    // Then get members
    const { data: members, error: memError } = await (
      getSupabase().from('workspace_members') as any
    )
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('added_at', { ascending: true })

    if (memError) throw memError

    // Fetch user details for each member (user_id is now auth.users.id)
    const memberIds = members?.map((m: any) => m.user_id) || []
    let userMap: Record<string, any> = {}

    if (memberIds.length > 0) {
      const { data: users } = await getSupabase()
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', memberIds)

      if (users) {
        userMap = users.reduce((acc: any, u: any) => {
          acc[u.id] = u
          return acc
        }, {})
      }
    }

    // Combine members with user details
    const membersWithDetails = (members || []).map((m: any) => ({
      ...m,
      user: userMap[m.user_id] || null,
    }))

    return {
      ...workspace,
      members: membersWithDetails,
    }
  },

  /**
   * Get workspace with its boards
   */
  async getWorkspaceWithBoards(workspaceId: string): Promise<WorkspaceWithBoards> {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .select(
        `
        *,
        boards:boards(
          id,
          name,
          icon,
          color,
          settings
        )
      `
      )
      .eq('id', workspaceId)
      .single()

    if (error) throw error

    // Process boards to add is_archived from settings
    const processedBoards = (data.boards || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      is_archived: b.settings?.is_archived || false,
    }))

    return {
      ...data,
      boards: processedBoards,
    }
  },

  /**
   * Create a new workspace
   */
  async createWorkspace(input: CreateWorkspaceInput, ownerId: string): Promise<Workspace> {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .insert({
        name: input.name,
        name_ka: input.name_ka,
        description: input.description,
        icon: input.icon || 'folder',
        color: input.color || 'blue',
        owner_id: ownerId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update a workspace
   */
  async updateWorkspace(workspaceId: string, updates: UpdateWorkspaceInput): Promise<Workspace> {
    const updateData: any = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.name_ka !== undefined) updateData.name_ka = updates.name_ka
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.color !== undefined) updateData.color = updates.color

    if (updates.settings) {
      // Merge settings with existing
      const current = await this.getWorkspace(workspaceId)
      updateData.settings = {
        ...current.settings,
        ...updates.settings,
      }
    }

    const { data, error } = await (getSupabase().from('workspaces') as any)
      .update(updateData)
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .delete()
      .eq('id', workspaceId)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Failed to delete workspace. You may not have permission.')
    }
  },

  // ==================== BOARDS IN WORKSPACE ====================

  /**
   * Get all boards in a workspace
   */
  async getWorkspaceBoards(workspaceId: string): Promise<Board[]> {
    const { data, error } = await (getSupabase().from('boards') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get non-archived boards in a workspace
   */
  async getActiveWorkspaceBoards(workspaceId: string): Promise<Board[]> {
    const boards = await this.getWorkspaceBoards(workspaceId)
    return boards.filter(b => !b.settings?.is_archived)
  },

  /**
   * Get archived boards in a workspace
   */
  async getArchivedWorkspaceBoards(workspaceId: string): Promise<Board[]> {
    const boards = await this.getWorkspaceBoards(workspaceId)
    return boards.filter(b => b.settings?.is_archived)
  },

  /**
   * Move a board to a workspace
   */
  async moveBoardToWorkspace(boardId: string, workspaceId: string | null): Promise<Board> {
    const { data, error } = await (getSupabase().from('boards') as any)
      .update({ workspace_id: workspaceId })
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Archive a board in workspace
   */
  async archiveBoard(boardId: string): Promise<Board> {
    // Get current board settings
    const { data: board } = await (getSupabase().from('boards') as any)
      .select('settings')
      .eq('id', boardId)
      .single()

    const newSettings = {
      ...(board?.settings || {}),
      is_archived: true,
    }

    const { data, error } = await (getSupabase().from('boards') as any)
      .update({ settings: newSettings })
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Permanently delete a board
   */
  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await (getSupabase().from('boards') as any).delete().eq('id', boardId)

    if (error) throw error
  },

  /**
   * Restore an archived board
   */
  async restoreBoard(boardId: string): Promise<Board> {
    const { data: board } = await (getSupabase().from('boards') as any)
      .select('settings')
      .eq('id', boardId)
      .single()

    const newSettings = {
      ...(board?.settings || {}),
      is_archived: false,
    }

    const { data, error } = await (getSupabase().from('boards') as any)
      .update({ settings: newSettings })
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ==================== WORKSPACE MEMBERS ====================

  /**
   * Get all members of a workspace
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    // Get members
    const { data: members, error } = await (getSupabase().from('workspace_members') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('added_at', { ascending: true })

    if (error) throw error

    // Fetch user details for each member (user_id is now auth.users.id)
    const memberIds = members?.map((m: any) => m.user_id) || []
    let userMap: Record<string, any> = {}

    if (memberIds.length > 0) {
      // First try to get from users table (synced with auth.users)
      const { data: users } = await getSupabase()
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', memberIds)

      if (users) {
        userMap = users.reduce((acc: any, u: any) => {
          acc[u.id] = u
          return acc
        }, {})
      }
    }

    // Combine members with user details
    return (members || []).map((m: any) => ({
      ...m,
      user: userMap[m.user_id] || null,
    }))
  },

  /**
   * Add a member to workspace
   */
  async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    addedBy: string
  ): Promise<WorkspaceMember> {
    const { data, error } = await (getSupabase().from('workspace_members') as any)
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
        added_by: addedBy,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    const { data, error } = await (getSupabase().from('workspace_members') as any)
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove member from workspace
   * Note: Cannot remove owner (RLS enforces this)
   */
  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await (getSupabase().from('workspace_members') as any)
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) throw error
  },

  /**
   * Get current user's role in workspace
   */
  async getUserWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const { data, error } = await (getSupabase().from('workspace_members') as any)
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data?.role || null
  },

  // ==================== SEARCH ====================

  /**
   * Search workspaces
   */
  async searchWorkspaces(query: string): Promise<Workspace[]> {
    const { data, error } = await (getSupabase().from('workspaces') as any)
      .select('*')
      .or(`name.ilike.%${query}%,name_ka.ilike.%${query}%`)
      .limit(20)

    if (error) throw error
    return data || []
  },
}
