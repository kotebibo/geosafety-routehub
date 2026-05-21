'use client'

import { Shield, Lock, Users, Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomRole } from '@/services/users.service'

interface RoleStats {
  totalRoles: number
  systemRoles: number
  customRoles: number
  totalPermissions: number
  usersByRole: Record<string, number>
}

interface RolesListProps {
  roles: CustomRole[]
  selectedRoleId: string | null
  loading: boolean
  stats: RoleStats | null
  onSelectRole: (role: CustomRole) => void
  onDuplicateRole: (role: CustomRole) => void
  onDeleteRole: (role: CustomRole) => void
}

export function RolesList({
  roles,
  selectedRoleId,
  loading,
  stats,
  onSelectRole,
  onDuplicateRole,
  onDeleteRole,
}: RolesListProps) {
  return (
    <div className="bg-bg-primary rounded-lg border border-border-light overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light bg-bg-secondary">
        <h2 className="font-semibold text-text-primary">
          {'\u10E0\u10DD\u10DA\u10D4\u10D1\u10D8'} ({roles.length})
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Shield className="w-12 h-12 text-text-disabled mx-auto mb-3" />
          <p className="text-text-secondary">
            {
              '\u10E0\u10DD\u10DA\u10D4\u10D1\u10D8 \u10D5\u10D4\u10E0 \u10DB\u10DD\u10D8\u10EB\u10D4\u10D1\u10DC\u10D0'
            }
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border-light max-h-[600px] overflow-y-auto">
          {roles.map(role => (
            <div
              key={role.id}
              className={cn(
                'px-4 py-3 hover:bg-bg-secondary cursor-pointer transition-colors',
                selectedRoleId === role.id &&
                  'bg-monday-primary/10 border-l-4 border-monday-primary'
              )}
              onClick={() => onSelectRole(role)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{role.display_name}</span>
                      {role.is_system && <Lock className="w-3 h-3 text-text-tertiary" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>
                        {role.permissions?.length || 0} {'\u10E3\u10E4\u10DA\u10D4\u10D1\u10D0'}
                      </span>
                      {stats?.usersByRole[role.name] && (
                        <>
                          <span>{'\u2022'}</span>
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
                        onDuplicateRole(role)
                      }}
                      className="p-1.5 text-text-tertiary hover:text-monday-primary hover:bg-monday-primary/10 rounded transition-colors"
                      title={'\u10D3\u10E3\u10D1\u10DA\u10D8\u10E0\u10D4\u10D1\u10D0'}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onDeleteRole(role)
                      }}
                      className="p-1.5 text-text-tertiary hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title={'\u10EC\u10D0\u10E8\u10DA\u10D0'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {role.description && (
                <p className="mt-1 text-xs text-text-secondary line-clamp-2 ml-7">
                  {role.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
