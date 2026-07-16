'use client'

import { User, Mail, Phone, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui-monday/Toast'

interface Inspector {
  id: string
  full_name: string
  email: string
  phone: string
  specialty: string
  status: 'active' | 'inactive'
}

interface InspectorTableProps {
  inspectors: Inspector[]
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: 'active' | 'inactive') => void
}

export function InspectorTable({ inspectors, onDelete, onToggleStatus }: InspectorTableProps) {
  const { showToast } = useToast()
  const t = useTranslations()

  const handleDelete = async (id: string, name: string) => {
    if (confirm(t('inspectors.table.confirmDelete', { name }))) {
      try {
        await onDelete?.(id)
        showToast(t('inspectors.table.deleted'), 'success')
      } catch (error) {
        showToast(t('inspectors.table.deleteError'), 'error')
      }
    }
  }

  const handleToggleStatus = async (inspector: Inspector) => {
    const newStatus = inspector.status === 'active' ? 'inactive' : 'active'
    try {
      await onToggleStatus?.(inspector.id, newStatus)
    } catch (error) {
      showToast(t('inspectors.table.statusError'), 'error')
    }
  }

  return (
    <div className="bg-bg-primary rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('inspectors.table.headerInspector')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('inspectors.table.headerContact')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('inspectors.table.headerSpecialty')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('inspectors.table.headerStatus')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('inspectors.table.headerActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {inspectors.map(inspector => (
              <tr key={inspector.id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{inspector.full_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Mail className="w-4 h-4" />
                      {inspector.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Phone className="w-4 h-4" />
                      {inspector.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {inspector.specialty}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleStatus(inspector)}
                    className="flex items-center gap-2"
                  >
                    {inspector.status === 'active' ? (
                      <>
                        <ToggleRight className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {t('inspectors.table.active')}
                        </span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-6 h-6 text-text-tertiary" />
                        <span className="text-sm font-medium text-text-secondary">
                          {t('inspectors.table.inactive')}
                        </span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(inspector.id, inspector.full_name)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('inspectors.table.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inspectors.length === 0 && (
        <div className="p-12 text-center text-text-secondary">
          {t('inspectors.table.emptyState')}
        </div>
      )}
    </div>
  )
}
