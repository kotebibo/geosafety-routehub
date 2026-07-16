'use client'

import { useTranslations } from 'next-intl'
import { Save, Shield, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PermissionsGrid } from './PermissionsGrid'
import type { CustomRole, Permission } from '@/services/users.service'

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

interface RoleFormData {
  name: string
  display_name: string
  description: string
  color: string
  permissions: string[]
}

interface RoleEditorProps {
  isCreating: boolean
  selectedRole: CustomRole | null
  formData: RoleFormData
  onFormDataChange: (data: RoleFormData) => void
  permissions: Record<string, Permission[]>
  expandedCategories: Set<string>
  saving: boolean
  onSave: () => void
  onCancel: () => void
  onCreateNew: () => void
  onTogglePermission: (permissionName: string) => void
  onToggleCategory: (category: string) => void
  onToggleAllInCategory: (category: string) => void
}

export function RoleEditor({
  isCreating,
  selectedRole,
  formData,
  onFormDataChange,
  permissions,
  expandedCategories,
  saving,
  onSave,
  onCancel,
  onCreateNew,
  onTogglePermission,
  onToggleCategory,
  onToggleAllInCategory,
}: RoleEditorProps) {
  const t = useTranslations()
  const isEditing = isCreating || selectedRole !== null
  const canEdit = isCreating || (selectedRole && !selectedRole.is_system)

  if (!isEditing) {
    return (
      <div className="bg-bg-primary rounded-lg border border-border-light p-8 text-center">
        <Shield className="w-12 h-12 text-text-disabled mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">
          {t('admin.roles.selectRolePrompt')}
        </h3>
        <p className="text-text-secondary mb-4">{t('admin.roles.selectRoleHint')}</p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-monday-primary rounded-lg hover:bg-monday-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('admin.roles.createRole')}
        </button>

        {/* System roles info */}
        <div className="mt-8 p-4 bg-color-warning/10 border border-color-warning/30 rounded-lg text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-color-warning flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-color-warning">
                {t('admin.roles.stats.systemRoles')}
              </h4>
              <p className="text-sm text-color-warning mt-1">
                <strong>{t('admin.roles.roleNames.admin')}</strong>,{' '}
                <strong>{t('admin.roles.roleNames.dispatcher')}</strong> {t('admin.roles.and')}{' '}
                <strong>{t('admin.roles.roleNames.officer')}</strong>{' '}
                {t('admin.roles.systemRolesInfo')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-primary rounded-lg border border-border-light">
      <div className="px-4 py-3 border-b border-border-light bg-bg-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-text-primary">
            {isCreating
              ? t('admin.roles.createRole')
              : `${t('admin.roles.editingRolePrefix')}: ${selectedRole?.display_name}`}
          </h2>
          {selectedRole?.is_system && (
            <span className="px-2 py-0.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded">
              {t('admin.roles.viewOnly')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover rounded transition-colors"
          >
            {t('admin.roles.cancel')}
          </button>
          {canEdit && (
            <button
              onClick={onSave}
              disabled={saving || !formData.display_name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-monday-primary hover:bg-monday-primary-hover rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? t('admin.roles.saving') : t('admin.roles.save')}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('admin.roles.roleName')} *
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={e => onFormDataChange({ ...formData, display_name: e.target.value })}
              placeholder={t('admin.roles.roleNamePlaceholder')}
              disabled={selectedRole?.is_system}
              className="w-full px-3 py-2 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary disabled:bg-bg-tertiary disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('admin.roles.color')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={e => onFormDataChange({ ...formData, color: e.target.value })}
                disabled={selectedRole?.is_system}
                className="w-10 h-10 rounded cursor-pointer border border-border-medium disabled:cursor-not-allowed"
              />
              <div className="flex flex-wrap gap-1">
                {ROLE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() =>
                      !selectedRole?.is_system && onFormDataChange({ ...formData, color })
                    }
                    disabled={selectedRole?.is_system}
                    className={cn(
                      'w-6 h-6 rounded transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
                      formData.color === color && 'ring-2 ring-offset-1 ring-border-medium'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('admin.roles.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={e => onFormDataChange({ ...formData, description: e.target.value })}
            placeholder={t('admin.roles.descriptionPlaceholder')}
            disabled={selectedRole?.is_system}
            rows={2}
            className="w-full px-3 py-2 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary disabled:bg-bg-tertiary disabled:cursor-not-allowed"
          />
        </div>

        {/* Permissions */}
        <PermissionsGrid
          permissions={permissions}
          selectedPermissions={formData.permissions}
          expandedCategories={expandedCategories}
          canEdit={!!canEdit}
          isAdminRole={!!selectedRole?.is_system && selectedRole.name === 'admin'}
          onTogglePermission={onTogglePermission}
          onToggleCategory={onToggleCategory}
          onToggleAllInCategory={onToggleAllInCategory}
        />
      </div>
    </div>
  )
}
