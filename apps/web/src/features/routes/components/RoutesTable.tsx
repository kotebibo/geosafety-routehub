'use client'

import { Calendar, Clock, MapPin, Route as RouteIcon, Trash2, UserCheck } from 'lucide-react'

interface Route {
  id: string
  name: string
  inspector_id: string
  date: string
  start_time: string
  status: string
  stops: any[]
  total_distance_km: number  // Changed from total_distance
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
  const statusColors = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    planned: 'დაგეგმილი',
    in_progress: 'მიმდინარე',
    completed: 'დასრულებული',
    cancelled: 'გაუქმებული',
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`დარწმუნებული ხართ, რომ გსურთ "${name}" მარშრუტის წაშლა?`)) {
      try {
        await onDelete?.(id)
        alert('მარშრუტი წაიშალა')
      } catch (error) {
        alert('წაშლისას დაფიქსირდა შეცდომა')
      }
    }
  }

  const handleReassign = async (routeId: string, currentInspectorId: string) => {
    const newInspectorId = prompt(
      'ახალი ინსპექტორის ID:',
      currentInspectorId
    )
    
    if (newInspectorId && newInspectorId !== currentInspectorId) {
      try {
        await onReassign?.(routeId, newInspectorId)
        alert('მარშრუტი გადაინიშნა')
      } catch (error) {
        alert('გადანიშვნისას დაფიქსირდა შეცდომა')
      }
    }
  }

  const getInspectorName = (inspectorId: string) => {
    const inspector = inspectors.find(i => i.id === inspectorId)
    return inspector?.full_name || 'უცნობი'
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                მარშრუტი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ინსპექტორი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                თარიღი & დრო
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                დეტალები
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                სტატუსი
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {routes.map((route) => (
              <tr 
                key={route.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RouteIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {route.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    {getInspectorName(route.inspector_id)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(route.date).toLocaleDateString('ka-GE')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {route.start_time}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {route.stops?.length || 0} გაჩერება
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <RouteIcon className="w-4 h-4" />
                      {route.total_distance_km?.toFixed(1) || '0.0'} კმ
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[route.status as keyof typeof statusColors]}`}>
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
                      გადანიშვნა
                    </button>
                    <button
                      onClick={() => handleDelete(route.id, route.name)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      წაშლა
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {routes.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          მარშრუტები არ არის
        </div>
      )}
    </div>
  )
}
