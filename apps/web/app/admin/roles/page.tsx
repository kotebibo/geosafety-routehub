/**
 * Role Management Page
 * Admin page to create and manage custom roles with permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usersService, CustomRole, Permission } from '@/services/users.service';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Lock,
  Users,
  ArrowLeft,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
];

export default function RoleManagementPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

  // Edit/Create state
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    color: '#6366f1',
    permissions: [] as string[],
  });

  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  async function fetchData() {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        usersService.getRoles(),
        usersService.getPermissionsByCategory(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      // Expand all categories by default
      setExpandedCategories(new Set(Object.keys(permissionsData)));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    setIsCreating(true);
    setEditingRole(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      permissions: [],
    });
  }

  function handleEditRole(role: CustomRole) {
    if (role.is_system) {
      alert('System roles cannot be edited');
      return;
    }
    setEditingRole(role);
    setIsCreating(false);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      color: role.color,
      permissions: role.permissions || [],
    });
  }

  function handleCancelEdit() {
    setEditingRole(null);
    setIsCreating(false);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      color: '#6366f1',
      permissions: [],
    });
  }

  async function handleSaveRole() {
    if (!formData.display_name.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      if (isCreating) {
        await usersService.createRole({
          name: formData.display_name.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.display_name,
          description: formData.description,
          color: formData.color,
          permissions: formData.permissions,
        });
      } else if (editingRole) {
        await usersService.updateRole(editingRole.name, {
          display_name: formData.display_name,
          description: formData.description,
          color: formData.color,
          permissions: formData.permissions,
        });
      }

      await fetchData();
      handleCancelEdit();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to save role');
    }
  }

  async function handleDeleteRole(role: CustomRole) {
    if (role.is_system) {
      alert('System roles cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${role.display_name}" role?`)) {
      return;
    }

    try {
      await usersService.deleteRole(role.name);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(error.message || 'Failed to delete role');
    }
  }

  function togglePermission(permissionName: string) {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName],
    }));
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function toggleAllPermissionsInCategory(category: string) {
    const categoryPermissions = permissions[category]?.map(p => p.name) || [];
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p));

    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }));
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEditing = isCreating || editingRole !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
                <p className="text-sm text-gray-500">Create and manage custom roles with permissions</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Roles</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 cursor-pointer',
                        editingRole?.id === role.id && 'bg-purple-50'
                      )}
                      onClick={() => !role.is_system && handleEditRole(role)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: role.color }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {role.display_name}
                              </span>
                              {role.is_system && (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {role.permissions?.length || 0} permissions
                            </p>
                          </div>
                        </div>
                        {!role.is_system && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleEditRole(role);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteRole(role);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {role.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {role.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Role Editor */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">
                    {isCreating ? 'Create New Role' : `Edit: ${editingRole?.display_name}`}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRole}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role Name *
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={e =>
                          setFormData({ ...formData, display_name: e.target.value })
                        }
                        placeholder="e.g., Manager"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={e => setFormData({ ...formData, color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                        />
                        <div className="flex flex-wrap gap-1">
                          {ROLE_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setFormData({ ...formData, color })}
                              className={cn(
                                'w-6 h-6 rounded',
                                formData.color === color && 'ring-2 ring-offset-1 ring-gray-400'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Describe what this role can do..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Permissions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Permissions ({formData.permissions.length} selected)
                      </label>
                    </div>

                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                      {Object.entries(permissions).map(([category, perms]) => {
                        const isExpanded = expandedCategories.has(category);
                        const selectedCount = perms.filter(p =>
                          formData.permissions.includes(p.name)
                        ).length;
                        const allSelected = selectedCount === perms.length;

                        return (
                          <div key={category}>
                            <div
                              className="flex items-center justify-between px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                              onClick={() => toggleCategory(category)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="font-medium text-gray-700">{category}</span>
                                <span className="text-xs text-gray-500">
                                  ({selectedCount}/{perms.length})
                                </span>
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleAllPermissionsInCategory(category);
                                }}
                                className="text-xs text-purple-600 hover:text-purple-800"
                              >
                                {allSelected ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="px-4 py-2 space-y-2">
                                {perms.map(perm => (
                                  <label
                                    key={perm.id}
                                    className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formData.permissions.includes(perm.name)}
                                      onChange={() => togglePermission(perm.name)}
                                      className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">
                                        {perm.name}
                                      </div>
                                      {perm.description && (
                                        <div className="text-xs text-gray-500">
                                          {perm.description}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Role to Edit
                </h3>
                <p className="text-gray-500 mb-4">
                  Click on a custom role to edit its permissions, or create a new role.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Create New Role
                </button>

                {/* System roles info */}
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">System Roles</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        The <strong>Admin</strong>, <strong>Dispatcher</strong>, and{' '}
                        <strong>Inspector</strong> roles are system roles and cannot be edited
                        or deleted. Create custom roles for additional permission configurations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
