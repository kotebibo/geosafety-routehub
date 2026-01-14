'use client'

import { useState } from 'react'
import { Save, Loader2, MapPin, Route as RouteIcon } from 'lucide-react'

interface OptimizedRoute {
  stops: Array<{
    company: {
      id: string
      name: string
      address: string
    }
    position: number
    distance: number
  }>
  totalDistance: number
}

interface RouteOptimizationPanelProps {
  optimizedRoute: OptimizedRoute | null
  onOptimize: () => void
  onSave: (data: {
    name: string
    date: string  // Changed from scheduled_date
    start_time: string
    notes?: string
  }) => Promise<void>
  optimizing: boolean
  saving: boolean
  hasSelection: boolean
}

export function RouteOptimizationPanel({
  optimizedRoute,
  onOptimize,
  onSave,
  optimizing,
  saving,
  hasSelection,
}: RouteOptimizationPanelProps) {
  const [routeName, setRouteName] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    if (!routeName || !scheduledDate) {
      alert('შეავსეთ მარშრუტის სახელი და თარიღი')
      return
    }

    await onSave({
      name: routeName,
      date: scheduledDate,  // Changed from scheduled_date
      start_time: startTime,
      notes: notes || undefined,
    })

    // Reset form
    setRouteName('')
    setScheduledDate('')
    setStartTime('09:00')
    setNotes('')
  }

  return (
    <div className="w-96 bg-white border-l h-screen overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">მარშრუტის დეტალები</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Optimize Button */}
        {!optimizedRoute && (
          <button
            onClick={onOptimize}
            disabled={!hasSelection || optimizing}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {optimizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ოპტიმიზაცია...
              </>
            ) : (
              <>
                <RouteIcon className="w-5 h-5" />
                მარშრუტის ოპტიმიზაცია
              </>
            )}
          </button>
        )}

        {/* Route Details */}
        {optimizedRoute && (
          <>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">
                    სულ გაჩერება
                  </span>
                  <span className="text-lg font-bold text-green-900">
                    {optimizedRoute.stops.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900">
                    სულ მანძილი
                  </span>
                  <span className="text-lg font-bold text-green-900">
                    {optimizedRoute.totalDistance.toFixed(1)} კმ
                  </span>
                </div>
              </div>

              {/* Stop List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  მარშრუტის თანმიმდევრობა
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {optimizedRoute.stops.map((stop, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {stop.company.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {stop.company.address}
                        </p>
                        {stop.distance > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            +{stop.distance.toFixed(1)} კმ
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Form */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700">
                მარშრუტის შენახვა
              </h3>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  მარშრუტის სახელი *
                </label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="მაგ: დილის მარშრუტი"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  თარიღი *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  დაწყების დრო
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  შენიშვნა
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="დამატებითი ინფორმაცია..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    შენახვა...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    მარშრუტის შენახვა
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
