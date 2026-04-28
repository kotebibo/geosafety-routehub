'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CoordinateItem } from '../types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

type DistanceFilter = 'all' | 'close' | 'medium' | 'far'

interface ComparisonMapProps {
  items: CoordinateItem[]
}

function getLineColor(distKm: number): string {
  if (distKm <= 1) return '#10B981'
  if (distKm <= 5) return '#F59E0B'
  return '#EF4444'
}

function createMarkerIcon(color: string, shape: 'circle' | 'diamond'): L.DivIcon {
  const html =
    shape === 'circle'
      ? `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`
      : `<div style="width:12px;height:12px;background:${color};border:2px solid white;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`

  return L.divIcon({
    className: 'comparison-marker',
    html,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

export function ComparisonMap({ items }: ComparisonMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const layerGroup = useRef<L.LayerGroup | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('all')
  const [showLines, setShowLines] = useState(true)

  const comparisonItems = useMemo(
    () =>
      items.filter(i => i.addressLat !== null && i.addressLng !== null && i.distanceKm !== null),
    [items]
  )

  const filteredItems = useMemo(() => {
    if (distanceFilter === 'all') return comparisonItems
    return comparisonItems.filter(i => {
      const d = i.distanceKm!
      if (distanceFilter === 'close') return d <= 1
      if (distanceFilter === 'medium') return d > 1 && d <= 5
      return d > 5
    })
  }, [comparisonItems, distanceFilter])

  const stats = useMemo(() => {
    const dists = comparisonItems.map(i => i.distanceKm!)
    if (dists.length === 0) return null
    const avg = dists.reduce((s, d) => s + d, 0) / dists.length
    const close = dists.filter(d => d <= 1).length
    const medium = dists.filter(d => d > 1 && d <= 5).length
    const far = dists.filter(d => d > 5).length
    return {
      total: dists.length,
      avg: Math.round(avg * 100) / 100,
      max: Math.round(Math.max(...dists) * 100) / 100,
      close,
      medium,
      far,
    }
  }, [comparisonItems])

  useEffect(() => {
    if (mapContainer.current && !mapInstance.current) {
      const map = L.map(mapContainer.current, {
        center: [41.7151, 44.8271],
        zoom: 8,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      layerGroup.current = L.layerGroup().addTo(map)
      mapInstance.current = map
      setIsMapReady(true)
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        layerGroup.current = null
        setIsMapReady(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !layerGroup.current) return

    const map = mapInstance.current
    const group = layerGroup.current
    group.clearLayers()

    const bounds: L.LatLngExpression[] = []

    const gpsIcon = createMarkerIcon('#3B82F6', 'circle')
    const geocodedIcon = createMarkerIcon('#F97316', 'diamond')

    filteredItems.forEach(item => {
      const gpsLat = item.lat
      const gpsLng = item.lng
      const addrLat = item.addressLat!
      const addrLng = item.addressLng!
      const dist = item.distanceKm!
      const lineColor = getLineColor(dist)

      if (showLines) {
        const line = L.polyline(
          [
            [gpsLat, gpsLng],
            [addrLat, addrLng],
          ],
          {
            color: lineColor,
            weight: 2,
            opacity: 0.6,
            dashArray: dist > 5 ? '6, 4' : undefined,
          }
        )
        group.addLayer(line)
      }

      const popupContent = `
        <div style="padding:8px;min-width:200px;font-family:system-ui,sans-serif;">
          <div style="font-weight:600;font-size:13px;color:#111827;margin-bottom:6px;">${item.name}</div>
          ${item.address ? `<div style="font-size:11px;color:#6B7280;margin-bottom:4px;">მისამართი: ${item.address}</div>` : ''}
          ${item.sk ? `<div style="font-size:11px;color:#9CA3AF;margin-bottom:6px;">ს/კ: ${item.sk}</div>` : ''}
          <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">
            <span style="display:inline-block;width:8px;height:8px;background:#3B82F6;border-radius:50%;margin-right:4px;"></span>
            GPS: ${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}
          </div>
          <div style="font-size:11px;color:#6B7280;margin-bottom:6px;">
            <span style="display:inline-block;width:8px;height:8px;background:#F97316;transform:rotate(45deg);margin-right:4px;"></span>
            გეოკოდ.: ${addrLat.toFixed(5)}, ${addrLng.toFixed(5)}
          </div>
          <div style="font-size:12px;font-weight:600;color:${lineColor};padding:4px 8px;background:${lineColor}15;border-radius:4px;display:inline-block;">
            ${dist.toFixed(2)} კმ
          </div>
        </div>
      `

      const gpsMarker = L.marker([gpsLat, gpsLng], { icon: gpsIcon }).bindPopup(popupContent, {
        maxWidth: 300,
        className: 'comparison-popup',
      })
      group.addLayer(gpsMarker)

      const geocodedMarker = L.marker([addrLat, addrLng], { icon: geocodedIcon }).bindPopup(
        popupContent,
        { maxWidth: 300, className: 'comparison-popup' }
      )
      group.addLayer(geocodedMarker)

      bounds.push([gpsLat, gpsLng])
      bounds.push([addrLat, addrLng])
    })

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 14 })
      } catch {
        map.setView([41.7151, 44.8271], 8)
      }
    }
  }, [filteredItems, isMapReady, showLines])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Legend */}
        <div className="bg-bg-primary/95 backdrop-blur-sm rounded-lg shadow-lg border border-border-primary p-3 text-xs">
          <div className="font-semibold text-text-primary mb-2">ლეგენდა</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full border border-white" />
              <span className="text-text-secondary">GPS კოორდინატი</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 bg-orange-500 border border-white"
                style={{ transform: 'rotate(45deg)' }}
              />
              <span className="text-text-secondary">გეოკოდირებული</span>
            </div>
            <div className="border-t border-border-primary pt-1.5 mt-1.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-0.5 bg-emerald-500" />
                <span className="text-text-secondary">≤ 1 კმ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-0.5 bg-amber-500" />
                <span className="text-text-secondary">1–5 კმ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-0.5 bg-red-500 border-dashed" />
                <span className="text-text-secondary">&gt; 5 კმ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-bg-primary/95 backdrop-blur-sm rounded-lg shadow-lg border border-border-primary p-3 text-xs">
          <div className="font-semibold text-text-primary mb-2">ფილტრი</div>
          <div className="space-y-1">
            {(
              [
                ['all', 'ყველა', stats?.total],
                ['close', '≤ 1 კმ', stats?.close],
                ['medium', '1–5 კმ', stats?.medium],
                ['far', '> 5 კმ', stats?.far],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setDistanceFilter(key)}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  distanceFilter === key
                    ? 'bg-accent-primary/10 text-accent-primary font-medium'
                    : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {label} <span className="text-text-tertiary">({count ?? 0})</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-2 pt-2 border-t border-border-primary cursor-pointer">
            <input
              type="checkbox"
              checked={showLines}
              onChange={e => setShowLines(e.target.checked)}
              className="rounded border-border-primary"
            />
            <span className="text-text-secondary">ხაზები</span>
          </label>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-bg-primary/95 backdrop-blur-sm rounded-lg shadow-lg border border-border-primary p-3 text-xs">
            <div className="font-semibold text-text-primary mb-1.5">სტატისტიკა</div>
            <div className="space-y-0.5 text-text-secondary">
              <div>სულ: {stats.total}</div>
              <div>საშუალო: {stats.avg} კმ</div>
              <div>მაქს.: {stats.max} კმ</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .comparison-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        .comparison-popup .leaflet-popup-tip { display: none; }
        .comparison-marker { background: transparent; border: none; }
      `}</style>
    </div>
  )
}
