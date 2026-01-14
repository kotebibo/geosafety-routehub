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

const supabase = createClient() as any

export const workspaceService = {
  // ==================== WORKSPACES ====================

  /**
   * Get all workspaces accessible to the user
   * RLS policies automatically filter based on auth.email()
   */
  async getWorkspaces(): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get workspaces with board counts
   */
  async getWorkspacesWithBoardCounts(): Promise<(Workspace & { board_count: number })[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        boards:boards(count)
      `)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((w: any) => ({
      ...w,
      board_count: w.boards?.[0]?.count || 0,
    }))
  },

  /**
   * Get a specific workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const { data, error } = await supabase
      .from('workspaces')
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
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (wsError) throw wsError

    // Then get members with inspector details
    const { data: members, error: memError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('added_at', { ascending: true })

    if (memError) throw memError

    // Fetch inspector details for each member
    const memberIds = members?.map((m: any) => m.user_id) || []
    let inspectorMap: Record<string, any> = {}

    if (memberIds.length > 0) {
      const { data: inspectors } = await supabase
        .from('inspectors')
        .select('id, full_name, email, avatar_url')
        .in('id', memberIds)

      if (inspectors) {
        inspectorMap = inspectors.reduce((acc: any, i: any) => {
          acc[i.id] = i
          return acc
        }, {})
      }
    }

    // Combine members with inspector details
    const membersWithDetails = (members || []).map((m: any) => ({
      ...m,
      user: inspectorMap[m.user_id] || null,
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
    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        boards:boards(
          id,
          name,
          icon,
          color,
          settings
        )
      `)
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
   * Get user's default workspace
   */
  async getDefaultWorkspace(): Promise<Workspace | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_default', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      throw error
    }
    return data
  },

  /**
   * Create a new workspace
   */
  async createWorkspace(
    input: CreateWorkspaceInput,
    ownerId: string
  ): Promise<Workspace> {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: input.name,
        name_ka: input.name_ka,
        description: input.description,
        icon: input.icon || 'folder',
        color: input.color || 'blue',
        owner_id: ownerId,
        is_default: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update a workspace
   */
  async updateWorkspace(
    workspaceId: string,
    updates: UpdateWorkspaceInput
  ): Promise<Workspace> {
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

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a workspace
   * Note: Cannot delete default workspace (RLS enforces this)
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)

    if (error) throw error
  },

  // ==================== BOARDS IN WORKSPACE ====================

  /**
   * Get all boards in a workspace
   */
  async getWorkspaceBoards(workspaceId: string): Promise<Board[]> {
    const { data, error } = await supabase
      .from('boards')
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
  async moveBoardToWorkspace(
    boardId: string,
    workspaceId: string | null
  ): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
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
    const { data: board } = await supabase
      .from('boards')
      .select('settings')
      .eq('id', boardId)
      .single()

    const newSettings = {
      ...(board?.settings || {}),
      is_archived: true,
    }

    const { data, error } = await supabase
      .from('boards')
      .update({ settings: newSettings })
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Restore an archived board
   */
  async restoreBoard(boardId: string): Promise<Board> {
    const { data: board } = await supabase
      .from('boards')
      .select('settings')
      .eq('id', boardId)
      .single()

    const newSettings = {
      ...(board?.settings || {}),
      is_archived: false,
    }

    const { data, error } = await supabase
      .from('boards')
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
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('added_at', { ascending: true })

    if (error) throw error

    // Fetch inspector details for each member
    const memberIds = members?.map((m: any) => m.user_id) || []
    let inspectorMap: Record<string, any> = {}

    if (memberIds.length > 0) {
      const { data: inspectors } = await supabase
        .from('inspectors')
        .select('id, full_name, email, avatar_url')
        .in('id', memberIds)

      if (inspectors) {
        inspectorMap = inspectors.reduce((acc: any, i: any) => {
          acc[i.id] = i
          return acc
        }, {})
      }
    }

    // Combine members with inspector details
    return (members || []).map((m: any) => ({
      ...m,
      user: inspectorMap[m.user_id] || null,
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
    const { data, error } = await supabase
      .from('workspace_members')
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
    const { data, error } = await supabase
      .from('workspace_members')
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
  async removeWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) throw error
  },

  /**
   * Get current user's role in workspace
   */
  async getUserWorkspaceRole(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceRole | null> {
    const { data, error } = await supabase
      .from('workspace_members')
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
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .or(`name.ilike.%${query}%,name_ka.ilike.%${query}%`)
      .order('is_default', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  },
}
