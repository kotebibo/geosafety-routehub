'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useTranslations } from 'next-intl'
import 'leaflet/dist/leaflet.css'
import { getInspectorColor } from '../lib/colors'
import type { CoordinateItem } from '../types'

export interface MapFocus {
  id: string
  nonce: number
}

interface CoordinatesMapProps {
  items: CoordinateItem[]
  inspectors: string[]
  focus?: MapFocus | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'coord-marker',
    html: `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 24 14 24s14-13.5 14-24C29 7.3 22.7 1 15 1z"
          fill="${color}" stroke="white" stroke-width="2"
        />
        <circle cx="15" cy="14.5" r="5" fill="white" fill-opacity="0.9" />
      </svg>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  })
}

export function CoordinatesMap({ items, inspectors, focus }: CoordinatesMapProps) {
  const t = useTranslations()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersByItemId = useRef<Map<string, L.Marker[]>>(new Map())
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    if (mapContainer.current && !mapInstance.current) {
      const map = L.map(mapContainer.current, {
        center: [41.7151, 44.8271],
        zoom: 8,
        zoomControl: false,
      })

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapInstance.current = map
      setIsMapReady(true)
    }

    // Leaflet does not track container resizes (sidebar collapse, window resize)
    const observer = new ResizeObserver(() => {
      mapInstance.current?.invalidateSize()
    })
    if (mapContainer.current) observer.observe(mapContainer.current)

    return () => {
      observer.disconnect()
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

    markersByItemId.current.forEach(markers => markers.forEach(m => map.removeLayer(m)))
    markersByItemId.current = new Map()

    const bounds: L.LatLngExpression[] = []

    items.forEach(item => {
      const color = getInspectorColor(item.inspector, inspectors)
      const itemMarkers: L.Marker[] = []

      item.points.forEach(point => {
        const mapsUrl = `https://www.google.com/maps?q=${point.lat},${point.lng}`
        const pointLine =
          item.points.length > 1
            ? `<div class="coord-popup-muted">${t('coordinatesMap.map.pointOf', {
                index: point.index + 1,
                total: item.points.length,
              })}</div>`
            : ''

        const marker = L.marker([point.lat, point.lng], { icon: createPinIcon(color) })
          .addTo(map)
          .bindPopup(
            `
            <div class="coord-popup-body">
              <div class="coord-popup-title">${escapeHtml(item.name)}</div>
              <div class="coord-popup-row">
                <span class="coord-popup-dot" style="background:${color}"></span>
                ${escapeHtml(item.inspector) || '—'}
              </div>
              ${pointLine}
              ${
                item.sk
                  ? `<div class="coord-popup-muted">${t('coordinatesMap.map.idLabel')} ${escapeHtml(item.sk)}</div>`
                  : ''
              }
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="coord-popup-link">
                ${t('coordinatesMap.map.googleMaps')}
              </a>
            </div>
          `,
            { maxWidth: 300, className: 'coord-popup' }
          )

        itemMarkers.push(marker)
        bounds.push([point.lat, point.lng])
      })

      markersByItemId.current.set(item.id, itemMarkers)
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
  }, [items, inspectors, isMapReady])

  useEffect(() => {
    if (!focus || !isMapReady || !mapInstance.current) return

    const markers = markersByItemId.current.get(focus.id)
    if (!markers || markers.length === 0) return

    const map = mapInstance.current
    if (markers.length === 1) {
      map.flyTo(markers[0].getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.8 })
      markers[0].openPopup()
    } else {
      // Several gates/buildings — show all of them; the user picks the pin
      map.flyToBounds(L.latLngBounds(markers.map(m => m.getLatLng())), {
        padding: [60, 60],
        maxZoom: 16,
        duration: 0.8,
      })
    }
  }, [focus, isMapReady])

  return (
    <div className="isolate relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <style>{`
        .coord-marker { background: transparent; border: none; }
        .coord-marker svg {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
          transition: transform 0.15s ease;
          transform-origin: bottom center;
        }
        .coord-marker:hover svg { transform: scale(1.12); }

        .coord-popup .leaflet-popup-content-wrapper {
          background: var(--bg-primary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .coord-popup .leaflet-popup-content { margin: 0; }
        .coord-popup .leaflet-popup-tip {
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
        }
        .coord-popup a.leaflet-popup-close-button { color: var(--text-tertiary); }

        .coord-popup-body { padding: 12px 14px; min-width: 220px; }
        .coord-popup-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 6px;
          padding-right: 12px;
        }
        .coord-popup-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .coord-popup-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .coord-popup-muted {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 6px;
        }
        .coord-popup a.coord-popup-link {
          display: inline-block;
          margin-top: 6px;
          padding: 5px 12px;
          background: var(--monday-primary);
          color: #fff;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          text-decoration: none;
        }
      `}</style>
    </div>
  )
}
