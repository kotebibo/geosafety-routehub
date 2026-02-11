'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface LocationSenderConfig {
  inspectorId: string
  routeId?: string
  intervalMs?: number
}

export function useLocationSender({ inspectorId, routeId, intervalMs = 10000 }: LocationSenderConfig) {
  const [isTracking, setIsTracking] = useState(false)
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendCount, setSendCount] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastSendRef = useRef<number>(0)

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    // Throttle sends to intervalMs
    const now = Date.now()
    if (now - lastSendRef.current < intervalMs * 0.8) return

    lastSendRef.current = now
    setIsSending(true)

    try {
      const response = await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspector_id: inspectorId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          route_id: routeId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      setSendCount(prev => prev + 1)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      console.error('Failed to send location:', err)
    } finally {
      setIsSending(false)
    }
  }, [inspectorId, routeId, intervalMs])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsTracking(true)
    setError(null)
    setSendCount(0)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLastPosition(position)
        sendLocation(position)
      },
      (err) => {
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: intervalMs,
        timeout: 15000,
      }
    )
  }, [sendLocation, intervalMs])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  const checkIn = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLastPosition(position)
        lastSendRef.current = 0 // Reset throttle for manual check-in
        sendLocation(position)
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    )
  }, [sendLocation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    isTracking,
    lastPosition,
    error,
    sendCount,
    isSending,
    startTracking,
    stopTracking,
    checkIn,
  }
}
