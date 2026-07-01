'use client'

import { useState, useEffect, useRef } from 'react'

interface GpsCoords {
  lat: number
  lng: number
  accuracy: number
}

export function useGps(enabled = true) {
  const [coords, setCoords] = useState<GpsCoords | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    if (!navigator.geolocation) {
      setError('თქვენი ბრაუზერი არ უჭერს მხარს GPS-ს')
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
        const messages: Record<number, string> = {
          1: 'GPS წვდომა უარყოფილია. გთხოვთ ჩართოთ ლოკაციის წვდომა.',
          2: 'GPS სიგნალი ვერ მოიძებნა.',
          3: 'GPS მოთხოვნას ვადა გაუვიდა.',
        }
        setError(messages[err.code] || 'GPS შეცდომა')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [enabled])

  return { coords, error }
}
