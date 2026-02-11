'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { trackingService } from '@/services/tracking.service'
import type { ActiveInspector } from '@/services/tracking.service'
import { ablyLocationService } from '../services/ably-location.service'
import type { LocationUpdate } from '../services/ably-location.service'
import { ensureAblyLoaded } from '@/lib/ably'

export function useTracking(enabled: boolean = true) {
  const [inspectorLocations, setInspectorLocations] = useState<Map<string, LocationUpdate>>(new Map())
  const subscriptionsRef = useRef<{ unsubscribe: () => void } | null>(null)

  const { data: activeInspectors, isLoading, refetch } = useQuery({
    queryKey: queryKeys.tracking.activeInspectors(),
    queryFn: trackingService.getActiveInspectors,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    enabled,
    retry: false,
  })

  // Subscribe to real-time location updates via Ably
  useEffect(() => {
    if (!activeInspectors?.length) return

    let cancelled = false

    const setup = async () => {
      try {
        await ensureAblyLoaded()
        if (cancelled) return

        const ids = activeInspectors.map(i => i.id)
        subscriptionsRef.current = ablyLocationService.subscribeToAllInspectors(ids, (update) => {
          setInspectorLocations(prev => {
            const next = new Map(prev)
            next.set(update.inspector_id, update)
            return next
          })
        })
      } catch (err) {
        console.error('Failed to setup Ably location subscriptions:', err)
      }
    }

    setup()

    return () => {
      cancelled = true
      subscriptionsRef.current?.unsubscribe()
      subscriptionsRef.current = null
    }
  }, [activeInspectors])

  // Merge database data with real-time updates
  const mergedInspectors: ActiveInspector[] = (activeInspectors || []).map(inspector => {
    const realtimeUpdate = inspectorLocations.get(inspector.id)
    if (realtimeUpdate) {
      return {
        ...inspector,
        lat: realtimeUpdate.latitude,
        lng: realtimeUpdate.longitude,
        last_location_update: realtimeUpdate.timestamp,
      }
    }
    return inspector
  })

  return {
    inspectors: mergedInspectors,
    isLoading,
    refresh: refetch,
  }
}
