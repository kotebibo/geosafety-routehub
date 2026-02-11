'use client'

import { MapPin, Play, Square, Navigation, Wifi, WifiOff, CheckCircle2 } from 'lucide-react'
import { useLocationSender } from '../hooks/useLocationSender'

interface MobileTrackingViewProps {
  inspectorId: string
  routeId?: string
}

export function MobileTrackingView({ inspectorId, routeId }: MobileTrackingViewProps) {
  const {
    isTracking,
    lastPosition,
    error,
    sendCount,
    isSending,
    startTracking,
    stopTracking,
    checkIn,
  } = useLocationSender({ inspectorId, routeId, intervalMs: 10000 })

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Status Header */}
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          isTracking
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isTracking ? (
            <>
              <Wifi className="w-4 h-4" />
              Tracking Active
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              Tracking Stopped
            </>
          )}
        </div>
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={isTracking ? stopTracking : startTracking}
        className={`w-full py-6 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
          isTracking
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          {isTracking ? (
            <>
              <Square className="w-6 h-6" />
              Stop Tracking
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Start Tracking
            </>
          )}
        </div>
      </button>

      {/* Manual Check-In */}
      <button
        onClick={checkIn}
        className="w-full py-4 rounded-xl border-2 border-blue-500 text-blue-600 font-medium hover:bg-blue-50 transition-colors active:scale-95"
      >
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Manual Check-In
        </div>
      </button>

      {/* Current Position */}
      {lastPosition && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 text-blue-500" />
            Current Position
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Latitude</div>
              <div className="font-mono text-gray-800">{lastPosition.coords.latitude.toFixed(6)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Longitude</div>
              <div className="font-mono text-gray-800">{lastPosition.coords.longitude.toFixed(6)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Accuracy</div>
              <div className="font-mono text-gray-800">{Math.round(lastPosition.coords.accuracy)}m</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Speed</div>
              <div className="font-mono text-gray-800">
                {lastPosition.coords.speed != null ? `${(lastPosition.coords.speed * 3.6).toFixed(1)} km/h` : '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Updates sent</span>
          <span className="font-semibold text-gray-800">{sendCount}</span>
        </div>
        {isSending && (
          <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
            <Navigation className="w-3 h-3 animate-pulse" />
            Sending location...
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}
