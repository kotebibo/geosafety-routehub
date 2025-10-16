'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapStore } from '@/store/mapStore'

// You'll need to add your Mapbox token to .env.local
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

interface MapViewProps {
  selectedRoute?: string | null
  onMarkerClick?: (markerId: string) => void
}

export function MapView({ selectedRoute, onMarkerClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [lng] = useState(44.783333) // Tbilisi longitude
  const [lat] = useState(41.716667) // Tbilisi latitude  
  const [zoom] = useState(12)

  const { locations, filters } = useMapStore()

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [lng, lat],
      zoom: zoom
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    
    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    )

    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])
  // Add markers for locations
  useEffect(() => {
    if (!map.current || !locations) return

    // Clear existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker')
    while(markers[0]) {
      markers[0].remove()
    }

    // Add new markers based on filters
    locations
      .filter(location => {
        // Apply filters here
        return true // Placeholder - implement filter logic
      })
      .forEach(location => {
        const el = document.createElement('div')
        el.className = 'marker'
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.borderRadius = '50%'
        el.style.border = '2px solid white'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        el.style.cursor = 'pointer'

        // Color based on status/type
        el.style.backgroundColor = getMarkerColor(location.type)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([location.lng, location.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-3">
                  <h3 class="font-bold">${location.name}</h3>
                  <p class="text-sm text-gray-600">${location.address}</p>
                  <p class="text-sm">Type: ${location.type}</p>
                </div>
              `)
          )
          .addTo(map.current!)

        el.addEventListener('click', () => {
          onMarkerClick?.(location.id)
        })
      })
  }, [locations, filters, onMarkerClick])

  const getMarkerColor = (type: string) => {
    const colors: Record<string, string> = {
      commercial: '#2563EB',
      residential: '#10B981',
      industrial: '#F59E0B',
      healthcare: '#EF4444',
      education: '#8B5CF6'
    }
    return colors[type] || '#6B7280'
  }

  return (
    <div className="relative flex-1">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  )
}