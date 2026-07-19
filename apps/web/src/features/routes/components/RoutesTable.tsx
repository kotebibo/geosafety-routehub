'use client'

import { Calendar, Clock, MapPin, Route as RouteIcon, Trash2, UserCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui-monday/Toast'

interface Route {
  id: string
  name: string
  inspector_id: string
  date: string
  start_time: string
  status: string
  stops: any[]
  total_distance_km: number // Changed from total_distance
}

interface Inspector {
  id: string
  full_name: string
}

interface RoutesTableProps {
  routes: Route[]
  inspectors: Inspector[]
  onDelete?: (id: string) => void
  onReassign?: (routeId: string, inspectorId: string) => void
}

export function RoutesTable({ routes, inspectors, onDelete, onReassign }: RoutesTableProps) {
  const { showToast } = useToast()
  const t = useTranslations()

  const statusColors = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    planned: t('routes.manage.table.statusPlanned'),
    in_progress: t('routes.manage.table.statusInProgress'),
    completed: t('routes.manage.table.statusCompleted'),
    cancelled: t('routes.manage.table.statusCancelled'),
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(t('routes.manage.table.confirmDelete', { name }))) {
      try {
        await onDelete?.(id)
        showToast(t('routes.manage.table.deleteSuccess'), 'success')
      } catch (error) {
        showToast(t('routes.manage.table.deleteError'), 'error')
      }
    }
  }

  const handleReassign = async (routeId: string, currentInspectorId: string) => {
    const newInspectorId = prompt(t('routes.manage.table.reassignPrompt'), currentInspectorId)

    if (newInspectorId && newInspectorId !== currentInspectorId) {
      try {
        await onReassign?.(routeId, newInspectorId)
        showToast(t('routes.manage.table.reassignSuccess'), 'success')
      } catch (error) {
        showToast(t('routes.manage.table.reassignError'), 'error')
      }
    }
  }

  const getInspectorName = (inspectorId: string) => {
    const inspector = inspectors.find(i => i.id === inspectorId)
    return inspector?.full_name || t('routes.manage.table.unknownInspector')
  }

  return (
    <div className="bg-bg-primary rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('routes.manage.table.headerRoute')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('routes.manage.table.headerInspector')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('routes.manage.table.headerDateTime')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('routes.manage.table.headerDetails')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('routes.manage.table.headerStatus')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('routes.manage.table.headerActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {routes.map(route => (
              <tr key={route.id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RouteIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{route.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-text-primary">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    {getInspectorName(route.inspector_id)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      {new Date(route.date).toLocaleDateString('ka-GE')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Clock className="w-4 h-4" />
                      {route.start_time}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <MapPin className="w-4 h-4" />
                      {t('routes.manage.table.stopsCount', { count: route.stops?.length || 0 })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <RouteIcon className="w-4 h-4" />
                      {t('routes.manage.table.distanceKm', {
                        distance: route.total_distance_km?.toFixed(1) || '0.0',
                      })}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[route.status as keyof typeof statusColors]}`}
                  >
                    {statusLabels[route.status as keyof typeof statusLabels]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReassign(route.id, route.inspector_id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      {t('routes.manage.table.reassignAction')}
                    </button>
                    <button
                      onClick={() => handleDelete(route.id, route.name)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('routes.manage.table.deleteAction')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {routes.length === 0 && (
        <div className="p-12 text-center text-text-secondary">{t('routes.manage.table.empty')}</div>
      )}
    </div>
  )
}
