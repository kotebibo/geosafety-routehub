/**
 * Users & Roles Service
 * Handles user management, role assignment, and permissions
 */

import { createClient } from '@/lib/supabase';

// Get fresh client for each call to ensure auth state is current
const getSupabase = () => createClient();

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role?: UserRole;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  inspector_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_name: string;
  permission: string;
  created_at: string;
}

export const usersService = {
  // ==================== USERS ====================

  /**
   * Get all users with their roles
   */
  async getUsers(): Promise<User[]> {
    const { data: users, error: usersError } = await getSupabase()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Get roles for all users
    const { data: roles, error: rolesError } = await getSupabase()
      .from('user_roles')
      .select('*');

    if (rolesError) throw rolesError;

    // Merge users with their roles
    const usersWithRoles = (users || []).map((user: User) => ({
      ...user,
      role: roles?.find((r: UserRole) => r.user_id === user.id) || null,
    }));

    return usersWithRoles;
  },

  /**
   * Get a single user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') return null;
      throw userError;
    }

    const { data: role } = await getSupabase()
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return { ...user, role };
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await getSupabase()
      .from('users')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        is_active: updates.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleName: string, inspectorId?: string): Promise<UserRole> {
    // Check if user already has a role
    const { data: existing } = await getSupabase()
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing role
      const { data, error } = await getSupabase()
        .from('user_roles')
        .update({
          role: roleName,
          inspector_id: inspectorId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new role assignment
      const { data, error } = await getSupabase()
        .from('user_roles')
        .insert({
          user_id: userId,
          role: roleName,
          inspector_id: inspectorId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Remove role from user
   */
  async removeRole(userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('users')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  },

  // ==================== ROLES ====================

  /**
   * Get all roles (both system and custom)
   */
  async getRoles(): Promise<CustomRole[]> {
    const { data: roles, error } = await getSupabase()
      .from('custom_roles')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    // Get permissions for each role
    const { data: rolePermissions } = await getSupabase()
      .from('role_permissions')
      .select('role_name, permission');

    // Merge roles with permissions
    const rolesWithPermissions = (roles || []).map((role: CustomRole) => ({
      ...role,
      permissions: (rolePermissions || [])
        .filter((rp: RolePermission) => rp.role_name === role.name)
        .map((rp: RolePermission) => rp.permission),
    }));

    return rolesWithPermissions;
  },

  /**
   * Get a single role by name
   */
  async getRole(roleName: string): Promise<CustomRole | null> {
    const { data: role, error } = await getSupabase()
      .from('custom_roles')
      .select('*')
      .eq('name', roleName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const { data: permissions } = await getSupabase()
      .from('role_permissions')
      .select('permission')
      .eq('role_name', roleName);

    return {
      ...role,
      permissions: (permissions || []).map((p: { permission: string }) => p.permission),
    };
  },

  /**
   * Create a custom role
   */
  async createRole(role: {
    name: string;
    display_name: string;
    description?: string;
    color?: string;
    permissions: string[];
  }): Promise<CustomRole> {
    // Create the role
    const { data: newRole, error: roleError } = await getSupabase()
      .from('custom_roles')
      .insert({
        name: role.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: role.display_name,
        description: role.description || null,
        color: role.color || '#6366f1',
        is_system: false,
      })
      .select()
      .single();

    if (roleError) throw roleError;

    // Assign permissions
    if (role.permissions.length > 0) {
      const permissionRecords = role.permissions.map(p => ({
        role_name: newRole.name,
        permission: p,
      }));

      const { error: permError } = await getSupabase()
        .from('role_permissions')
        .insert(permissionRecords);

      if (permError) throw permError;
    }

    return { ...newRole, permissions: role.permissions };
  },

  /**
   * Update a custom role
   */
  async updateRole(roleName: string, updates: {
    display_name?: string;
    description?: string;
    color?: string;
    permissions?: string[];
  }): Promise<CustomRole> {
    // Update role details
    const { data: updatedRole, error: roleError } = await getSupabase()
      .from('custom_roles')
      .update({
        display_name: updates.display_name,
        description: updates.description,
        color: updates.color,
        updated_at: new Date().toISOString(),
      })
      .eq('name', roleName)
      .eq('is_system', false) // Can't update system roles
      .select()
      .single();

    if (roleError) throw roleError;

    // Update permissions if provided
    if (updates.permissions !== undefined) {
      // Remove existing permissions
      await getSupabase()
        .from('role_permissions')
        .delete()
        .eq('role_name', roleName);

      // Add new permissions
      if (updates.permissions.length > 0) {
        const permissionRecords = updates.permissions.map(p => ({
          role_name: roleName,
          permission: p,
        }));

        await getSupabase()
          .from('role_permissions')
          .insert(permissionRecords);
      }
    }

    return { ...updatedRole, permissions: updates.permissions || [] };
  },

  /**
   * Delete a custom role
   */
  async deleteRole(roleName: string): Promise<void> {
    // Check if any users have this role
    const { data: usersWithRole } = await getSupabase()
      .from('user_roles')
      .select('user_id')
      .eq('role', roleName);

    if (usersWithRole && usersWithRole.length > 0) {
      throw new Error(`Cannot delete role: ${usersWithRole.length} user(s) have this role assigned`);
    }

    // Delete permissions first
    await getSupabase()
      .from('role_permissions')
      .delete()
      .eq('role_name', roleName);

    // Delete the role (only if not system role)
    const { error } = await getSupabase()
      .from('custom_roles')
      .delete()
      .eq('name', roleName)
      .eq('is_system', false);

    if (error) throw error;
  },

  // ==================== PERMISSIONS ====================

  /**
   * Get all available permissions
   */
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await getSupabase()
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get permissions grouped by category
   */
  async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions();

    return permissions.reduce((acc, perm) => {
      const category = perm.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleName: string): Promise<string[]> {
    const { data, error } = await getSupabase()
      .from('role_permissions')
      .select('permission')
      .eq('role_name', roleName);

    if (error) throw error;
    return (data || []).map((p: { permission: string }) => p.permission);
  },

  /**
   * Set permissions for a role
   */
  async setRolePermissions(roleName: string, permissions: string[]): Promise<void> {
    // Remove existing permissions
    await getSupabase()
      .from('role_permissions')
      .delete()
      .eq('role_name', roleName);

    // Add new permissions
    if (permissions.length > 0) {
      const records = permissions.map(p => ({
        role_name: roleName,
        permission: p,
      }));

      const { error } = await getSupabase()
        .from('role_permissions')
        .insert(records);

      if (error) throw error;
    }
  },

  // ==================== STATS ====================

  /**
   * Get user count for each role
   */
  async getUserCountByRole(): Promise<Record<string, number>> {
    const { data: roles, error } = await getSupabase()
      .from('user_roles')
      .select('role');

    if (error) throw error;

    return (roles || []).reduce((acc: Record<string, number>, r: { role: string }) => {
      acc[r.role] = (acc[r.role] || 0) + 1;
      return acc;
    }, {});
  },

  /**
   * Get role statistics for the roles page
   */
  async getRoleStats(): Promise<{
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    totalPermissions: number;
    usersByRole: Record<string, number>;
  }> {
    const [roles, permissions, userCounts] = await Promise.all([
      this.getRoles(),
      this.getPermissions(),
      this.getUserCountByRole(),
    ]);

    return {
      totalRoles: roles.length,
      systemRoles: roles.filter(r => r.is_system).length,
      customRoles: roles.filter(r => !r.is_system).length,
      totalPermissions: permissions.length,
      usersByRole: userCounts,
    };
  },

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    const { data: users, error: usersError } = await getSupabase()
      .from('users')
      .select('id, is_active');

    if (usersError) throw usersError;

    const { data: roles, error: rolesError } = await getSupabase()
      .from('user_roles')
      .select('role');

    if (rolesError) throw rolesError;

    const byRole = (roles || []).reduce((acc: Record<string, number>, r: { role: string }) => {
      acc[r.role] = (acc[r.role] || 0) + 1;
      return acc;
    }, {});

    return {
      total: users?.length || 0,
      active: users?.filter((u: { is_active: boolean }) => u.is_active).length || 0,
      inactive: users?.filter((u: { is_active: boolean }) => !u.is_active).length || 0,
      byRole,
    };
  },
};
