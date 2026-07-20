'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { X, Navigation, Fuel, Loader2, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Leaflet touches `window` at import time — load the map only on the client.
const RouteMapFixed = dynamic(
  () => import('@/features/locations/components/RouteMapFixed').then(m => m.RouteMapFixed),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
      </div>
    ),
  }
)

export interface RouteMapStop {
  id: string
  name: string
  lat: number
  lng: number
}

interface RouteMapModalProps {
  title: string
  km: number
  /** The last-stop → home leg (part of km); shown separately when present. */
  returnKm?: number
  fuelLiters: number | null
  stops: RouteMapStop[]
  /** Officer home / route start — shown as the home marker and line origin. */
  start?: { lat: number; lng: number; name?: string }
  /** [lng, lat] pairs from OSRM — real road line; absent → straight lines. */
  geometry?: number[][]
  onClose: () => void
}

export function RouteMapModal({
  title,
  km,
  returnKm,
  fuelLiters,
  stops,
  start,
  geometry: initialGeometry,
  onClose,
}: RouteMapModalProps) {
  const t = useTranslations()
  // Always fetch the real-road path (home → stops) when the map opens, so the
  // road line shows reliably (Google-Maps style) regardless of what was stored.
  const [geometry, setGeometry] = useState<number[][] | undefined>(initialGeometry)

  const stopKey = stops.map(s => s.id).join('|')
  const startKey = start ? `${start.lat},${start.lng}` : ''
  useEffect(() => {
    if (stops.length === 0) return
    // Full loop: home → stops → back home.
    const locations = [
      ...(start ? [{ lat: start.lat, lng: start.lng }] : []),
      ...stops.map(s => ({ lat: s.lat, lng: s.lng })),
      ...(start ? [{ lat: start.lat, lng: start.lng }] : []),
    ]
    if (locations.length < 2) return
    let cancelled = false
    fetch('/api/routing/route-geometry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && Array.isArray(d?.geometry) && d.geometry.length > 0)
          setGeometry(d.geometry)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey, startKey])

  // RouteMapFixed shows numbered stops for `route` and draws `routeGeometry`.
  const route = stops.map((s, i) => ({
    company: { id: s.id, name: s.name, address: '', lat: s.lat, lng: s.lng },
    position: i + 1,
  }))

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-light flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-monday-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate">{title}</h3>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                {km.toFixed(1)} {t('routing.km')}
              </span>
              {returnKm != null && returnKm > 0 && (
                <span className="text-text-tertiary">
                  {t('routing.returnHome', { km: returnKm.toFixed(1) })}
                </span>
              )}
              {fuelLiters != null && (
                <span className="inline-flex items-center gap-1">
                  <Fuel className="w-3 h-3" />
                  {t('routing.fuelLiters', { liters: fuelLiters.toFixed(1) })}
                </span>
              )}
              <span>{t('routing.companiesCount', { count: stops.length })}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 relative isolate">
        {stops.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-text-tertiary">
            {t('routing.noMapStops')}
          </div>
        ) : (
          <RouteMapFixed
            route={route as any}
            routeGeometry={geometry ?? undefined}
            start={start}
            coloredStops
          />
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
