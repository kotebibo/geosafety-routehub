'use client'

import { useTranslations } from 'next-intl'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { CustomRole } from '@/services/users.service'

interface DeleteRoleModalProps {
  role: CustomRole
  confirmText: string
  onConfirmTextChange: (text: string) => void
  userCount: number | undefined
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteRoleModal({
  role,
  confirmText,
  onConfirmTextChange,
  userCount,
  onConfirm,
  onCancel,
}: DeleteRoleModalProps) {
  const t = useTranslations()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-bg-primary rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-color-error/10 rounded-full">
            <Trash2 className="w-6 h-6 text-color-error" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {t('admin.roles.deleteModal.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('admin.roles.deleteModal.irreversible')}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-text-secondary mb-3">
            {t('admin.roles.deleteModal.confirmPrefix')} <strong>"{role.display_name}"</strong>{' '}
            {t('admin.roles.deleteModal.confirmSuffix')}
          </p>

          {userCount && (
            <div className="p-3 bg-color-warning/10 border border-color-warning/30 rounded-lg mb-3">
              <div className="flex items-center gap-2 text-color-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {userCount} {t('admin.roles.deleteModal.usersAssigned')}
                </span>
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('admin.roles.deleteModal.typeToConfirm')}{' '}
            <span className="font-semibold">{role.display_name}</span>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => onConfirmTextChange(e.target.value)}
            placeholder={role.display_name}
            className="w-full px-3 py-2 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-text-primary bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors"
          >
            {t('admin.roles.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== role.display_name}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('admin.roles.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
