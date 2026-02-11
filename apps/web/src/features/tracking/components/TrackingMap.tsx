'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { ActiveInspector } from '@/services/tracking.service'

interface TrackingMapProps {
  inspectors: ActiveInspector[]
  selectedInspectorId: string | null
  onSelectInspector: (id: string | null) => void
  locationTrail?: { lat: number; lng: number }[]
}

export function TrackingMap({ inspectors, selectedInspectorId, onSelectInspector, locationTrail }: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const trailRef = useRef<any>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Guard against double-init (Fast Refresh / Strict Mode)
      const container = mapRef.current!
      if ((container as any)._leaflet_id) return

      const map = L.map(container, {
        center: [41.7151, 44.8271], // Tbilisi default
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const initLeaflet = async () => {
      const L = (await import('leaflet')).default

      const currentIds = new Set(inspectors.map(i => i.id))

      // Remove markers for inspectors no longer active
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(marker)
          markersRef.current.delete(id)
        }
      })

      // Add/update markers
      inspectors.forEach(inspector => {
        const existing = markersRef.current.get(inspector.id)

        const minutesAgo = Math.floor((Date.now() - new Date(inspector.last_location_update).getTime()) / 60000)
        const color = minutesAgo <= 2 ? '#00C875' : minutesAgo <= 10 ? '#FDAB3D' : '#C3C6D4'
        const isSelected = inspector.id === selectedInspectorId

        const routeInfo = inspector.active_route
          ? `<br/><strong>Route:</strong> ${inspector.active_route.name || 'Unnamed'}<br/><strong>Progress:</strong> ${inspector.active_route.completed_stops}/${inspector.active_route.total_stops} stops`
          : '<br/><em>No active route</em>'

        const popupContent = `
          <div style="min-width: 150px">
            <strong>${inspector.full_name}</strong>
            <br/><span style="color: #666">Last seen: ${minutesAgo}m ago</span>
            ${routeInfo}
          </div>
        `

        if (existing) {
          existing.setLatLng([inspector.lat, inspector.lng])
          existing.setStyle({
            color: isSelected ? '#6161FF' : color,
            fillColor: color,
            weight: isSelected ? 3 : 1,
            radius: isSelected ? 10 : 7,
          })
          existing.getPopup()?.setContent(popupContent)
        } else {
          const marker = L.circleMarker([inspector.lat, inspector.lng], {
            radius: isSelected ? 10 : 7,
            fillColor: color,
            color: isSelected ? '#6161FF' : color,
            weight: isSelected ? 3 : 1,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .bindPopup(popupContent)
            .on('click', () => onSelectInspector(inspector.id))
            .addTo(map)

          markersRef.current.set(inspector.id, marker)
        }
      })

      // Fit bounds if we have inspectors and haven't zoomed manually
      if (inspectors.length > 0 && markersRef.current.size === inspectors.length) {
        const bounds = L.latLngBounds(inspectors.map(i => [i.lat, i.lng] as [number, number]))
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        }
      }
    }

    initLeaflet()
  }, [inspectors, selectedInspectorId, onSelectInspector])

  // Draw location trail
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const drawTrail = async () => {
      const L = (await import('leaflet')).default

      // Remove existing trail
      if (trailRef.current) {
        map.removeLayer(trailRef.current)
        trailRef.current = null
      }

      if (locationTrail && locationTrail.length > 1) {
        const points = locationTrail.map(p => [p.lat, p.lng] as [number, number])
        trailRef.current = L.polyline(points, {
          color: '#6161FF',
          weight: 3,
          opacity: 0.6,
          dashArray: '8, 4',
        }).addTo(map)
      }
    }

    drawTrail()
  }, [locationTrail])

  return (
    <div ref={mapRef} className="w-full h-full min-h-[400px]" />
  )
}
