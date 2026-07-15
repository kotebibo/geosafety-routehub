/**
 * Role Management Page
 * Admin page to create and manage custom roles with permissions
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usersService, CustomRole, Permission } from '@/services/users.service'
import { Shield, Plus, ArrowLeft, RefreshCw, Search, Lock, Settings, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'

import { RolesList } from './components/RolesList'
import { RoleEditor } from './components/RoleEditor'
import { DeleteRoleModal } from './components/DeleteRoleModal'

const ROLE_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
]

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
  const { isAdmin, loading: authLoading, refreshUserRole } = useAuth()

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

  function handleDuplicateRole(role: CustomRole) {
    setIsCreating(true)
    setSelectedRole(null)
    setFormData({
      name: '',
      display_name: `${role.display_name} (\u10D0\u10E1\u10DA\u10D8)`,
      description: role.description || '',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      permissions: role.permissions || [],
    })
  }

  function handleCancelEdit() {
    setSelectedRole(null)
    setIsCreating(false)
    setFormData({ name: '', display_name: '', description: '', color: '#6366f1', permissions: [] })
  }

  async function handleSaveRole() {
    if (!formData.display_name.trim()) return

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
      await refreshUserRole()
      handleCancelEdit()
    } catch (error) {
      console.error('Error saving role:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.role || deleteModal.confirmText !== deleteModal.role.display_name) return

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
    if (selectedRole?.is_system) return
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
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  function toggleAllPermissionsInCategory(category: string) {
    if (selectedRole?.is_system) return
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
        <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 bg-monday-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-monday-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  {
                    '\u10E0\u10DD\u10DA\u10D4\u10D1\u10D8\u10E1 \u10DB\u10D0\u10E0\u10D7\u10D5\u10D0'
                  }
                </h1>
                <p className="text-sm text-text-secondary">
                  {
                    '\u10E8\u10D4\u10E5\u10DB\u10D4\u10DC\u10D8\u10D7 \u10D3\u10D0 \u10DB\u10D0\u10E0\u10D7\u10D4\u10D7 \u10DB\u10DD\u10E0\u10D2\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E0\u10DD\u10DA\u10D4\u10D1\u10D8 \u10E3\u10E4\u10DA\u10D4\u10D1\u10D4\u10D1\u10D8\u10D7'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-monday-primary rounded-lg hover:bg-monday-primary-hover transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                {'\u10E0\u10DD\u10DA\u10D8\u10E1 \u10E8\u10D4\u10E5\u10DB\u10DC\u10D0'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                icon: Shield,
                iconBg: 'bg-monday-primary/10',
                iconColor: 'text-monday-primary',
                label: '\u10E1\u10E3\u10DA \u10E0\u10DD\u10DA\u10D4\u10D1\u10D8',
                value: stats.totalRoles,
              },
              {
                icon: Lock,
                iconBg: 'bg-monday-primary/10',
                iconColor: 'text-monday-primary',
                label: '\u10E1\u10D8\u10E1\u10E2\u10D4\u10DB\u10E3\u10E0\u10D8',
                value: stats.systemRoles,
              },
              {
                icon: Settings,
                iconBg: 'bg-color-success/10',
                iconColor: 'text-color-success',
                label: '\u10DB\u10DD\u10E0\u10D2\u10D4\u10D1\u10E3\u10DA\u10D8',
                value: stats.customRoles,
              },
              {
                icon: Key,
                iconBg: 'bg-color-warning/10',
                iconColor: 'text-color-warning',
                label: '\u10E3\u10E4\u10DA\u10D4\u10D1\u10D4\u10D1\u10D8',
                value: stats.totalPermissions,
              },
            ].map(({ icon: Icon, iconBg, iconColor, label, value }) => (
              <div key={label} className="bg-bg-primary rounded-lg border border-border-light p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${iconBg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">{label}</p>
                    <p className="text-2xl font-bold text-text-primary">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-bg-primary rounded-lg border border-border-light p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder={'\u10E0\u10DD\u10DA\u10D8\u10E1 \u10EB\u10D4\u10D1\u10DC\u10D0...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={v => setTypeFilter(v as 'all' | 'system' | 'custom')}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {'\u10E7\u10D5\u10D4\u10DA\u10D0 \u10E2\u10D8\u10DE\u10D8'}
                </SelectItem>
                <SelectItem value="system">
                  {'\u10E1\u10D8\u10E1\u10E2\u10D4\u10DB\u10E3\u10E0\u10D8'}
                </SelectItem>
                <SelectItem value="custom">
                  {'\u10DB\u10DD\u10E0\u10D2\u10D4\u10D1\u10E3\u10DA\u10D8'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <RolesList
              roles={filteredRoles}
              selectedRoleId={selectedRole?.id ?? null}
              loading={loading}
              stats={stats}
              onSelectRole={handleSelectRole}
              onDuplicateRole={handleDuplicateRole}
              onDeleteRole={role => setDeleteModal({ isOpen: true, role, confirmText: '' })}
            />
          </div>

          {/* Role Editor */}
          <div className="lg:col-span-2">
            <RoleEditor
              isCreating={isCreating}
              selectedRole={selectedRole}
              formData={formData}
              onFormDataChange={setFormData}
              permissions={permissions}
              expandedCategories={expandedCategories}
              saving={saving}
              onSave={handleSaveRole}
              onCancel={handleCancelEdit}
              onCreateNew={handleCreateNew}
              onTogglePermission={togglePermission}
              onToggleCategory={toggleCategory}
              onToggleAllInCategory={toggleAllPermissionsInCategory}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.role && (
        <DeleteRoleModal
          role={deleteModal.role}
          confirmText={deleteModal.confirmText}
          onConfirmTextChange={text => setDeleteModal(prev => ({ ...prev, confirmText: text }))}
          userCount={stats?.usersByRole[deleteModal.role.name]}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteModal({ isOpen: false, role: null, confirmText: '' })}
        />
      )}
    </div>
  )
}
