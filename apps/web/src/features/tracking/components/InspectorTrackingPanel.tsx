'use client'

import { useState } from 'react'
import { Search, Phone, MapPin, RefreshCw } from 'lucide-react'
import type { ActiveInspector } from '@/services/tracking.service'

interface InspectorTrackingPanelProps {
  inspectors: ActiveInspector[]
  selectedInspectorId: string | null
  onSelectInspector: (id: string | null) => void
  isLoading: boolean
  onRefresh: () => void
}

export function InspectorTrackingPanel({
  inspectors,
  selectedInspectorId,
  onSelectInspector,
  isLoading,
  onRefresh,
}: InspectorTrackingPanelProps) {
  const [search, setSearch] = useState('')

  const filtered = inspectors.filter(i =>
    i.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (lastUpdate: string) => {
    const minutesAgo = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 60000)
    if (minutesAgo <= 2) return 'bg-green-500'
    if (minutesAgo <= 10) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getTimeAgo = (lastUpdate: string) => {
    const minutesAgo = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 60000)
    if (minutesAgo < 1) return 'Just now'
    if (minutesAgo < 60) return `${minutesAgo}m ago`
    const hours = Math.floor(minutesAgo / 60)
    return `${hours}h ago`
  }

  return (
    <div className="w-72 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Active Inspectors ({inspectors.length})
          </h2>
          <button
            onClick={onRefresh}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search inspectors..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Inspector List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            {isLoading ? 'Loading...' : 'No active inspectors'}
          </div>
        ) : (
          filtered.map(inspector => {
            const isSelected = inspector.id === selectedInspectorId
            const route = inspector.active_route

            return (
              <button
                key={inspector.id}
                onClick={() => onSelectInspector(isSelected ? null : inspector.id)}
                className={`w-full text-left p-3 border-b hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(inspector.last_location_update)}`} />
                  <span className="text-sm font-medium text-gray-800 truncate">{inspector.full_name}</span>
                </div>

                <div className="ml-4 space-y-0.5">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{getTimeAgo(inspector.last_location_update)}</span>
                  </div>

                  {inspector.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="w-3 h-3" />
                      <span>{inspector.phone}</span>
                    </div>
                  )}

                  {route && (
                    <div className="mt-1.5">
                      <div className="text-xs text-gray-600 truncate">{route.name || 'Unnamed route'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${route.total_stops > 0 ? (route.completed_stops / route.total_stops) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {route.completed_stops}/{route.total_stops}
                        </span>
                      </div>
                    </div>
                  )}

                  {!route && (
                    <div className="text-xs text-gray-400 italic">No active route</div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
