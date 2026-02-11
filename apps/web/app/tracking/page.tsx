'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTracking } from '@/features/tracking/hooks/useTracking'
import { TrackingMap } from '@/features/tracking/components/TrackingMap'
import { InspectorTrackingPanel } from '@/features/tracking/components/InspectorTrackingPanel'
import { trackingService } from '@/services/tracking.service'
import { RefreshCw } from 'lucide-react'

export default function TrackingPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'admin' || currentRole === 'dispatcher'
  const { inspectors, isLoading, refresh } = useTracking(isAllowed)
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null)
  const [locationTrail, setLocationTrail] = useState<{ lat: number; lng: number }[]>([])

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  // Fetch location trail when an inspector is selected
  useEffect(() => {
    if (!selectedInspectorId) {
      setLocationTrail([])
      return
    }

    const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // Last 8 hours
    trackingService.getLocationHistory(selectedInspectorId, since)
      .then(points => setLocationTrail(points.map(p => ({ lat: p.lat, lng: p.lng }))))
      .catch(err => console.error('Failed to load trail:', err))
  }, [selectedInspectorId])

  if (authLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <InspectorTrackingPanel
        inspectors={inspectors}
        selectedInspectorId={selectedInspectorId}
        onSelectInspector={setSelectedInspectorId}
        isLoading={isLoading}
        onRefresh={() => refresh()}
      />
      <div className="flex-1 relative">
        <TrackingMap
          inspectors={inspectors}
          selectedInspectorId={selectedInspectorId}
          onSelectInspector={setSelectedInspectorId}
          locationTrail={locationTrail}
        />
        {inspectors.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 rounded-lg px-6 py-4 text-center shadow-sm">
              <p className="text-gray-600 text-sm">No active inspectors in the last 30 minutes</p>
              <p className="text-gray-400 text-xs mt-1">Inspectors will appear here when they start tracking</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
