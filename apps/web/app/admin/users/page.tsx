/**
 * User Management Page
 * Admin page to manage users and their roles
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usersService, User, CustomRole } from '@/services/users.service'
import {
  Users,
  Shield,
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  UserCheck,
  UserX,
  ChevronDown,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UserManagementPage() {
  const router = useRouter()
  const { user: currentUser, isAdmin, loading: authLoading, refreshUserRole } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Edit mode state
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    full_name: string
    phone: string
    role: string
  }>({ full_name: '', phone: '', role: '' })

  // Create user state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    role: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [showCreatePassword, setShowCreatePassword] = useState(false)

  // Action menu state
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byRole: {} as Record<string, number>,
  })

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
      const [usersData, rolesData, statsData] = await Promise.all([
        fetch('/api/admin/users').then(async res => {
          if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch users')
          return res.json()
        }),
        usersService.getRoles(),
        usersService.getUserStats(),
      ])
      setUsers(usersData)
      setRoles(rolesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole =
      filterRole === 'all' ||
      user.role?.role === filterRole ||
      (!user.role && filterRole === 'none')

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active)

    return matchesSearch && matchesRole && matchesStatus
  })

  async function handleEditUser(user: User) {
    setEditingUserId(user.id)
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role?.role || '',
    })
  }

  async function handleSaveUser() {
    if (!editingUserId) return

    try {
      // Update user profile via API
      const updateRes = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUserId,
          full_name: editForm.full_name,
          phone: editForm.phone,
        }),
      })
      if (!updateRes.ok) {
        throw new Error((await updateRes.json()).error || 'Failed to update user')
      }

      // Update role if changed via API
      const user = users.find(u => u.id === editingUserId)
      if (editForm.role && editForm.role !== user?.role?.role) {
        const roleRes = await fetch('/api/admin/assign-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editingUserId, roleName: editForm.role }),
        })
        if (!roleRes.ok) {
          throw new Error((await roleRes.json()).error || 'Failed to assign role')
        }
      } else if (!editForm.role && user?.role) {
        await usersService.removeRole(editingUserId)
      }

      await fetchData()
      // Refresh the current user's role in case the admin changed their own role
      await refreshUserRole()
      setEditingUserId(null)
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Failed to save user')
    }
  }

  async function handleToggleUserStatus(user: User) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, is_active: !user.is_active }),
      })
      if (!res.ok) {
        throw new Error((await res.json()).error || 'Failed to update user status')
      }
      await fetchData()
    } catch (error) {
      console.error('Error toggling user status:', error)
      alert('Failed to update user status')
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }

      // Success - reset form, close panel, refresh list
      setCreateForm({ email: '', full_name: '', phone: '', password: '', role: '' })
      setShowCreateForm(false)
      setShowCreatePassword(false)
      await fetchData()
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  function getRoleColor(roleName?: string): string {
    const role = roles.find(r => r.name === roleName)
    return role?.color || '#6b7280'
  }

  function getRoleDisplayName(roleName?: string): string {
    if (!roleName) return 'No Role'
    const role = roles.find(r => r.name === roleName)
    return role?.display_name || roleName
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-monday-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-monday-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
                <p className="text-sm text-text-secondary">Manage users, roles, and permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/roles')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-primary bg-bg-primary border border-border-medium rounded-lg hover:bg-bg-secondary"
              >
                <Shield className="w-4 h-4" />
                Manage Roles
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm)
                  setCreateError('')
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Create User
              </button>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-monday-primary rounded-lg hover:bg-monday-primary-hover"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Create New User</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateError('')
                }}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary placeholder-text-tertiary"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.full_name}
                    onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary placeholder-text-tertiary"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary placeholder-text-tertiary"
                    placeholder="+995 ..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={createForm.password}
                      onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary placeholder-text-tertiary"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                    >
                      {showCreatePassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary"
                  >
                    <option value="">No Role</option>
                    {roles.map(role => (
                      <option key={role.name} value={role.name}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-monday-primary rounded-lg hover:bg-monday-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateError('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary rounded-lg border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-monday-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-monday-primary" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Users</p>
                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-primary rounded-lg border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Active</p>
                <p className="text-2xl font-bold text-text-primary">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-primary rounded-lg border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Inactive</p>
                <p className="text-2xl font-bold text-text-primary">{stats.inactive}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-primary rounded-lg border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Roles</p>
                <p className="text-2xl font-bold text-text-primary">{roles.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-bg-primary rounded-lg border border-border-light p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary placeholder-text-tertiary"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-4 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary"
            >
              <option value="all">All Roles</option>
              <option value="none">No Role</option>
              {roles.map(role => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-bg-primary text-text-primary border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-bg-primary rounded-lg border border-border-light overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-text-disabled mx-auto mb-4" />
              <p className="text-text-secondary">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-bg-secondary border-b border-border-light">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className={cn(
                      'hover:bg-bg-secondary',
                      !user.is_active && 'bg-bg-secondary opacity-60'
                    )}
                  >
                    <td className="px-6 py-4">
                      {editingUserId === user.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                            placeholder="Full name"
                            className="w-full px-3 py-1.5 border border-border-medium rounded text-sm"
                          />
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            placeholder="Phone"
                            className="w-full px-3 py-1.5 border border-border-medium rounded text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary font-medium">
                            {(user.full_name || user.email)?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">
                              {user.full_name || 'No name'}
                            </p>
                            <p className="text-sm text-text-secondary flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </p>
                            {user.phone && (
                              <p className="text-sm text-text-secondary flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingUserId === user.id ? (
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="px-3 py-1.5 border border-border-medium rounded text-sm"
                        >
                          <option value="">No Role</option>
                          {roles.map(role => (
                            <option key={role.name} value={role.name}>
                              {role.display_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${getRoleColor(user.role?.role)}20`,
                            color: getRoleColor(user.role?.role),
                          }}
                        >
                          {getRoleDisplayName(user.role?.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        )}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingUserId === user.id ? (
                          <>
                            <button
                              onClick={handleSaveUser}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="p-1.5 text-text-tertiary hover:bg-bg-hover rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-1.5 text-text-tertiary hover:text-monday-primary hover:bg-monday-primary/10 rounded"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className={cn(
                                'p-1.5 rounded',
                                user.is_active
                                  ? 'text-text-tertiary hover:text-red-600 hover:bg-red-50'
                                  : 'text-text-tertiary hover:text-green-600 hover:bg-green-50'
                              )}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.is_active ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-sm text-text-secondary">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>
    </div>
  )
}
