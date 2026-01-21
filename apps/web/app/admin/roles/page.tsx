/**
 * Role Management Page
 * Admin page to create and manage custom roles with permissions
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usersService, CustomRole, Permission } from '@/services/users.service'
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
  Search,
  Key,
  Settings,
  Copy,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
]

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'User Management': Users,
  'Role Management': Shield,
  'Routes': Settings,
  'Companies': Settings,
  'Inspectors': Users,
  'Inspections': Settings,
  'Boards': Settings,
  'Admin': Key,
}

interface RoleStats {
  totalRoles: number
  systemRoles: number
  customRoles: number
  totalPermissions: number
  usersByRole: Record<string, number>
}

interface DeleteModalState {
  isOpen: boolean
  role: CustomRole | null
  confirmText: string
}

export default function RoleManagementPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()

  // Data state
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({})
  const [stats, setStats] = useState<RoleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all')

  // Edit/Create state
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    color: '#6366f1',
    permissions: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    role: null,
    confirmText: '',
  })

  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin])

  async function fetchData() {
    try {
      setLoading(true)
      const [rolesData, permissionsData, statsData] = await Promise.all([
        usersService.getRoles(),
        usersService.getPermissionsByCategory(),
        usersService.getRoleStats(),
      ])
      setRoles(rolesData)
      setPermissions(permissionsData)
      setStats(statsData)
      // Expand all categories by default
      setExpandedCategories(new Set(Object.keys(permissionsData)))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const matchesSearch =
        role.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'system' && role.is_system) ||
        (typeFilter === 'custom' && !role.is_system)

      return matchesSearch && matchesType
    })
  }, [roles, searchQuery, typeFilter])

  function handleCreateNew() {
    setIsCreating(true)
    setSelectedRole(null)
    setFormData({
      name: '',
      display_name: '',
      description: '',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      permissions: [],
    })
  }

  function handleSelectRole(role: CustomRole) {
    if (role.is_system) {
      // For system roles, show read-only view
      setSelectedRole(role)
      setIsCreating(false)
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        color: role.color,
        permissions: role.permissions || [],
      })
    } else {
      setSelectedRole(role)
      setIsCreating(false)
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        color: role.color,
        permissions: role.permissions || [],
      })
    }
  }

  function handleDuplicateRole(role: CustomRole) {
    setIsCreating(true)
    setSelectedRole(null)
    setFormData({
      name: '',
      display_name: `${role.display_name} (ასლი)`,
      description: role.description || '',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      permissions: role.permissions || [],
    })
  }

  function handleCancelEdit() {
    setSelectedRole(null)
    setIsCreating(false)
    setFormData({
      name: '',
      display_name: '',
      description: '',
      color: '#6366f1',
      permissions: [],
    })
  }

  async function handleSaveRole() {
    if (!formData.display_name.trim()) {
      return
    }

    setSaving(true)
    try {
      if (isCreating) {
        await usersService.createRole({
          name: formData.display_name.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.display_name,
          description: formData.description,
          color: formData.color,
          permissions: formData.permissions,
        })
      } else if (selectedRole && !selectedRole.is_system) {
        await usersService.updateRole(selectedRole.name, {
          display_name: formData.display_name,
          description: formData.description,
          color: formData.color,
          permissions: formData.permissions,
        })
      }

      await fetchData()
      handleCancelEdit()
    } catch (error) {
      console.error('Error saving role:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleOpenDeleteModal(role: CustomRole) {
    setDeleteModal({
      isOpen: true,
      role,
      confirmText: '',
    })
  }

  async function handleConfirmDelete() {
    if (!deleteModal.role || deleteModal.confirmText !== deleteModal.role.display_name) {
      return
    }

    try {
      await usersService.deleteRole(deleteModal.role.name)
      await fetchData()
      setDeleteModal({ isOpen: false, role: null, confirmText: '' })
      if (selectedRole?.name === deleteModal.role.name) {
        handleCancelEdit()
      }
    } catch (error: any) {
      console.error('Error deleting role:', error)
    }
  }

  function togglePermission(permissionName: string) {
    if (selectedRole?.is_system) return // Can't modify system roles

    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName],
    }))
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  function toggleAllPermissionsInCategory(category: string) {
    if (selectedRole?.is_system) return // Can't modify system roles

    const categoryPermissions = permissions[category]?.map(p => p.name) || []
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p))

    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }))
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isEditing = isCreating || selectedRole !== null
  const canEdit = isCreating || (selectedRole && !selectedRole.is_system)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">როლების მართვა</h1>
                <p className="text-sm text-gray-500">შექმენით და მართეთ მორგებული როლები უფლებებით</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                როლის შექმნა
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">სულ როლები</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalRoles}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">სისტემური</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.systemRoles}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">მორგებული</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.customRoles}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Key className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">უფლებები</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPermissions}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="როლის ძებნა..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'all' | 'system' | 'custom')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">ყველა ტიპი</option>
              <option value="system">სისტემური</option>
              <option value="custom">მორგებული</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">როლები ({filteredRoles.length})</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">როლები ვერ მოიძებნა</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {filteredRoles.map(role => (
                    <div
                      key={role.id}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors',
                        selectedRole?.id === role.id && 'bg-purple-50 border-l-4 border-purple-600'
                      )}
                      onClick={() => handleSelectRole(role)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
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
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{role.permissions?.length || 0} უფლება</span>
                              {stats?.usersByRole[role.name] && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {stats.usersByRole[role.name]}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {!role.is_system && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleDuplicateRole(role)
                              }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="დუბლირება"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleOpenDeleteModal(role)
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {role.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2 ml-7">
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
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">
                      {isCreating ? 'ახალი როლის შექმნა' : `რედაქტირება: ${selectedRole?.display_name}`}
                    </h2>
                    {selectedRole?.is_system && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        მხოლოდ ნახვა
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      გაუქმება
                    </button>
                    {canEdit && (
                      <button
                        onClick={handleSaveRole}
                        disabled={saving || !formData.display_name.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'ინახება...' : 'შენახვა'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        როლის სახელი *
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="მაგ., მენეჯერი"
                        disabled={selectedRole?.is_system}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ფერი
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={e => setFormData({ ...formData, color: e.target.value })}
                          disabled={selectedRole?.is_system}
                          className="w-10 h-10 rounded cursor-pointer border border-gray-300 disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-wrap gap-1">
                          {ROLE_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => !selectedRole?.is_system && setFormData({ ...formData, color })}
                              disabled={selectedRole?.is_system}
                              className={cn(
                                'w-6 h-6 rounded transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
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
                      აღწერა
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="აღწერეთ რა შეუძლია ამ როლს..."
                      disabled={selectedRole?.is_system}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Permissions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        უფლებები ({formData.permissions.length} არჩეული)
                      </label>
                      {selectedRole?.is_system && selectedRole.name === 'admin' && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          ადმინს აქვს ყველა უფლება
                        </span>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                      {Object.entries(permissions).map(([category, perms]) => {
                        const CategoryIcon = CATEGORY_ICONS[category] || Settings
                        const isExpanded = expandedCategories.has(category)
                        const selectedCount = perms.filter(p =>
                          formData.permissions.includes(p.name)
                        ).length
                        const allSelected = selectedCount === perms.length

                        return (
                          <div key={category}>
                            <div
                              className="flex items-center justify-between px-4 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleCategory(category)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <CategoryIcon className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-700">{category}</span>
                                <span className={cn(
                                  'text-xs px-1.5 py-0.5 rounded',
                                  selectedCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                                )}>
                                  {selectedCount}/{perms.length}
                                </span>
                              </div>
                              {canEdit && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    toggleAllPermissionsInCategory(category)
                                  }}
                                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  {allSelected ? 'გაუქმება' : 'ყველა'}
                                </button>
                              )}
                            </div>
                            {isExpanded && (
                              <div className="px-4 py-2 space-y-1 bg-white">
                                {perms.map(perm => (
                                  <label
                                    key={perm.id}
                                    className={cn(
                                      'flex items-start gap-3 p-2 rounded transition-colors',
                                      canEdit ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formData.permissions.includes(perm.name)}
                                      onChange={() => togglePermission(perm.name)}
                                      disabled={!canEdit}
                                      className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-700">
                                        {perm.name}
                                      </div>
                                      {perm.description && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {perm.description}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  აირჩიეთ როლი რედაქტირებისთვის
                </h3>
                <p className="text-gray-500 mb-4">
                  დააწკაპუნეთ როლზე უფლებების სანახავად, ან შექმენით ახალი როლი.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  ახალი როლის შექმნა
                </button>

                {/* System roles info */}
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">სისტემური როლები</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        <strong>ადმინი</strong>, <strong>დისპეტჩერი</strong> და{' '}
                        <strong>ინსპექტორი</strong> სისტემური როლებია და მათი რედაქტირება
                        ან წაშლა შეუძლებელია. შექმენით მორგებული როლები დამატებითი
                        კონფიგურაციისთვის.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteModal({ isOpen: false, role: null, confirmText: '' })}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">როლის წაშლა</h3>
                <p className="text-sm text-gray-500">ეს მოქმედება შეუქცევადია</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                დარწმუნებული ხართ, რომ გსურთ <strong>"{deleteModal.role.display_name}"</strong> როლის წაშლა?
              </p>

              {stats?.usersByRole[deleteModal.role.name] && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {stats.usersByRole[deleteModal.role.name]} მომხმარებელს აქვს ეს როლი მინიჭებული
                    </span>
                  </div>
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-1">
                დასადასტურებლად ჩაწერეთ: <span className="font-semibold">{deleteModal.role.display_name}</span>
              </label>
              <input
                type="text"
                value={deleteModal.confirmText}
                onChange={e => setDeleteModal({ ...deleteModal, confirmText: e.target.value })}
                placeholder={deleteModal.role.display_name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, role: null, confirmText: '' })}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteModal.confirmText !== deleteModal.role.display_name}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
