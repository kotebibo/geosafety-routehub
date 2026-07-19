'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

interface GpsCoords {
  lat: number
  lng: number
  accuracy: number
}

export function useGps(enabled = true) {
  const t = useTranslations()
  const [coords, setCoords] = useState<GpsCoords | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    if (!navigator.geolocation) {
      setError(t('gps.notSupported'))
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      position => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        })
        setError(null)
      },
      err => {
        const messageKeys: Record<number, string> = {
          1: 'gps.permissionDenied',
          2: 'gps.unavailable',
          3: 'gps.timeout',
        }
        setError(t(messageKeys[err.code] || 'gps.error'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [enabled, t])

  return { coords, error }
}
