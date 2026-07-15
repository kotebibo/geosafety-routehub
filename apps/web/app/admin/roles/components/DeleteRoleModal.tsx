'use client'

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
              {'\u10E0\u10DD\u10DA\u10D8\u10E1 \u10EC\u10D0\u10E8\u10DA\u10D0'}
            </h3>
            <p className="text-sm text-text-secondary">
              {
                '\u10D4\u10E1 \u10DB\u10DD\u10E5\u10DB\u10D4\u10D3\u10D4\u10D1\u10D0 \u10E8\u10D4\u10E3\u10E5\u10EA\u10D4\u10D5\u10D0\u10D3\u10D8\u10D0'
              }
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-text-secondary mb-3">
            {
              '\u10D3\u10D0\u10E0\u10EC\u10DB\u10E3\u10DC\u10D4\u10D1\u10E3\u10DA\u10D8 \u10EE\u10D0\u10E0\u10D7, \u10E0\u10DD\u10DB \u10D2\u10E1\u10E3\u10E0\u10D7'
            }{' '}
            <strong>"{role.display_name}"</strong>{' '}
            {'\u10E0\u10DD\u10DA\u10D8\u10E1 \u10EC\u10D0\u10E8\u10DA\u10D0?'}
          </p>

          {userCount && (
            <div className="p-3 bg-color-warning/10 border border-color-warning/30 rounded-lg mb-3">
              <div className="flex items-center gap-2 text-color-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {userCount}{' '}
                  {
                    '\u10DB\u10DD\u10DB\u10EE\u10DB\u10D0\u10E0\u10D4\u10D1\u10D4\u10DA\u10E1 \u10D0\u10E5\u10D5\u10E1 \u10D4\u10E1 \u10E0\u10DD\u10DA\u10D8 \u10DB\u10D8\u10DC\u10D8\u10ED\u10D4\u10D1\u10E3\u10DA\u10D8'
                  }
                </span>
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-text-primary mb-1">
            {
              '\u10D3\u10D0\u10E1\u10D0\u10D3\u10D0\u10E1\u10E2\u10E3\u10E0\u10D4\u10D1\u10DA\u10D0\u10D3 \u10E9\u10D0\u10EC\u10D4\u10E0\u10D4\u10D7:'
            }{' '}
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
            {'\u10D2\u10D0\u10E3\u10E5\u10DB\u10D4\u10D1\u10D0'}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== role.display_name}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {'\u10EC\u10D0\u10E8\u10DA\u10D0'}
          </button>
        </div>
      </div>
    </div>
  )
}
