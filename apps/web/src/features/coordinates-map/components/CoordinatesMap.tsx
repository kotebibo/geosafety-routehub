'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CoordinateItem } from '../types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const INSPECTOR_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
  '#14B8A6',
  '#E11D48',
  '#84CC16',
  '#0EA5E9',
  '#A855F7',
  '#D946EF',
  '#65A30D',
  '#0891B2',
  '#DC2626',
  '#7C3AED',
  '#059669',
]

interface CoordinatesMapProps {
  items: CoordinateItem[]
  inspectors: string[]
}

export function CoordinatesMap({ items, inspectors }: CoordinatesMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [isMapReady, setIsMapReady] = useState(false)

  const inspectorColorMap = useRef<Map<string, string>>(new Map())

  function getInspectorColor(inspector: string): string {
    if (!inspectorColorMap.current.has(inspector)) {
      const idx = inspectorColorMap.current.size % INSPECTOR_COLORS.length
      inspectorColorMap.current.set(inspector, INSPECTOR_COLORS[idx])
    }
    return inspectorColorMap.current.get(inspector)!
  }

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

      mapInstance.current = map
      setIsMapReady(true)
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setIsMapReady(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return

    const map = mapInstance.current

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    const bounds: L.LatLngExpression[] = []

    items.forEach(item => {
      const color = getInspectorColor(item.inspector)

      const icon = L.divIcon({
        className: 'coord-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      const mapsUrl = item.coordinates.startsWith('http')
        ? item.coordinates
        : `https://www.google.com/maps?q=${item.lat},${item.lng}`

      const marker = L.marker([item.lat, item.lng], { icon })
        .addTo(map)
        .bindPopup(
          `
          <div style="padding: 10px; min-width: 220px;">
            <div style="font-weight: bold; font-size: 14px; color: #111827; margin-bottom: 6px;">
              ${item.name}
            </div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%; margin-right: 6px;"></span>
              ${item.inspector}
            </div>
            ${item.sk ? `<div style="font-size: 12px; color: #9CA3AF; margin-bottom: 6px;">ID: ${item.sk}</div>` : ''}
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="
              display: inline-block;
              margin-top: 6px;
              padding: 4px 10px;
              background: #3B82F6;
              color: white;
              border-radius: 4px;
              font-size: 11px;
              text-decoration: none;
            ">Google Maps</a>
          </div>
        `,
          { maxWidth: 300, className: 'coord-popup' }
        )

      markersRef.current.push(marker)
      bounds.push([item.lat, item.lng])
    })

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds as L.LatLngBoundsExpression, {
          padding: [50, 50],
          maxZoom: 14,
        })
      } catch {
        map.setView([41.7151, 44.8271], 8)
      }
    } else {
      map.setView([41.7151, 44.8271], 8)
    }
  }, [items, isMapReady])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .coord-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        .coord-popup .leaflet-popup-tip {
          display: none;
        }
        .coord-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  )
}
