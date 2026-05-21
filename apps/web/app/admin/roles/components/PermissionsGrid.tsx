'use client'

import { ChevronDown, ChevronRight, Users, Shield, Settings, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Permission } from '@/services/users.service'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'User Management': Users,
  'Role Management': Shield,
  Routes: Settings,
  Companies: Settings,
  Inspectors: Users,
  Inspections: Settings,
  Boards: Settings,
  Admin: Key,
}

interface PermissionsGridProps {
  permissions: Record<string, Permission[]>
  selectedPermissions: string[]
  expandedCategories: Set<string>
  canEdit: boolean
  isAdminRole: boolean
  onTogglePermission: (permissionName: string) => void
  onToggleCategory: (category: string) => void
  onToggleAllInCategory: (category: string) => void
}

export function PermissionsGrid({
  permissions,
  selectedPermissions,
  expandedCategories,
  canEdit,
  isAdminRole,
  onTogglePermission,
  onToggleCategory,
  onToggleAllInCategory,
}: PermissionsGridProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-text-primary">
          {'\u10E3\u10E4\u10DA\u10D4\u10D1\u10D4\u10D1\u10D8'} ({selectedPermissions.length}{' '}
          {'\u10D0\u10E0\u10E9\u10D4\u10E3\u10DA\u10D8'})
        </label>
        {isAdminRole && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            {
              '\u10D0\u10D3\u10DB\u10D8\u10DC\u10E1 \u10D0\u10E5\u10D5\u10E1 \u10E7\u10D5\u10D4\u10DA\u10D0 \u10E3\u10E4\u10DA\u10D4\u10D1\u10D0'
            }
          </span>
        )}
      </div>

      <div className="border border-border-light rounded-lg divide-y divide-border-light max-h-[400px] overflow-y-auto">
        {Object.entries(permissions).map(([category, perms]) => {
          const CategoryIcon = CATEGORY_ICONS[category] || Settings
          const isExpanded = expandedCategories.has(category)
          const selectedCount = perms.filter(p => selectedPermissions.includes(p.name)).length
          const allSelected = selectedCount === perms.length

          return (
            <div key={category}>
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-bg-secondary cursor-pointer hover:bg-bg-hover transition-colors"
                onClick={() => onToggleCategory(category)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-tertiary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                  )}
                  <CategoryIcon className="w-4 h-4 text-text-secondary" />
                  <span className="font-medium text-text-primary">{category}</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      selectedCount > 0
                        ? 'bg-monday-primary/10 text-monday-primary'
                        : 'bg-bg-tertiary text-text-secondary'
                    )}
                  >
                    {selectedCount}/{perms.length}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onToggleAllInCategory(category)
                    }}
                    className="text-xs text-monday-primary hover:text-monday-primary-hover font-medium"
                  >
                    {allSelected
                      ? '\u10D2\u10D0\u10E3\u10E5\u10DB\u10D4\u10D1\u10D0'
                      : '\u10E7\u10D5\u10D4\u10DA\u10D0'}
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="px-4 py-2 space-y-1 bg-bg-primary">
                  {perms.map(perm => (
                    <label
                      key={perm.id}
                      className={cn(
                        'flex items-start gap-3 p-2 rounded transition-colors',
                        canEdit ? 'cursor-pointer hover:bg-bg-secondary' : 'cursor-not-allowed'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.name)}
                        onChange={() => onTogglePermission(perm.name)}
                        disabled={!canEdit}
                        className="mt-0.5 rounded border-border-medium text-monday-primary focus:ring-monday-primary disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{perm.name}</div>
                        {perm.description && (
                          <div className="text-xs text-text-secondary mt-0.5">
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
  )
}
