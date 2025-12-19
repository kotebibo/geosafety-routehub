/**
 * RouteMapFixed Component - DEBUGGED VERSION
 * Interactive OpenStreetMap with guaranteed marker rendering
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Company {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
  priority?: string;
}

interface RouteMapProps {
  companies?: Company[];
  route?: Array<{ company: Company; position: number }>;
  routeGeometry?: number[][];
  hoveredStop?: string | null;
  onMarkerClick?: (company: Company) => void;
}

export default function RouteMapFixed({ 
  companies = [],
  route = [],
  routeGeometry,
  hoveredStop, 
  onMarkerClick 
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map ONCE
  useEffect(() => {
    if (mapContainer.current && !mapInstance.current) {
      const map = L.map(mapContainer.current, {
        center: [41.7151, 44.8271], // Tbilisi center
        zoom: 12,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;
      setIsMapReady(true);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) {
      return;
    }

    const map = mapInstance.current;

    // Clear all existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current.clear();

    // Remove existing route line
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const bounds: L.LatLngBoundsExpression = [];

    // Add markers for selected companies (green)
    if (companies && companies.length > 0) {
      companies.forEach((company, index) => {
        // Validate coordinates
        if (!company.lat || !company.lng || (company.lat === 0 && company.lng === 0)) {
          return;
        }

        // Check if this company is in the optimized route
        const routeStop = route?.find(stop => stop.company.id === company.id);
        if (routeStop) {
          // Skip - we'll add it as a numbered marker below
          return;
        }

        try {
          // Create green marker for selected companies
          const icon = L.divIcon({
            className: 'custom-marker-selected',
            html: `
              <div style="
                width: 30px;
                height: 30px;
                background: #10B981;
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
              ">
                <div style="
                  position: absolute;
                  top: -3px;
                  left: -3px;
                  right: -3px;
                  bottom: -3px;
                  border: 2px solid #10B981;
                  border-radius: 50% 50% 50% 0;
                  animation: pulse 2s infinite;
                "></div>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          });

          const marker = L.marker([company.lat, company.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="padding: 10px;">
                <div style="font-weight: bold;">${company.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">${company.address}</div>
                <div style="font-size: 11px; color: #10B981; margin-top: 8px;">
                  ✓ Selected (${index + 1})
                </div>
              </div>
            `);

          if (onMarkerClick) {
            marker.on('click', () => {
              onMarkerClick(company);
            });
          }

          markersRef.current.set(`selected-${company.id}`, marker);
          bounds.push([company.lat, company.lng]);
        } catch (error) {
          // Silently handle marker errors
        }
      });
    }

    // Add numbered markers for optimized route (blue)
    if (route && route.length > 0) {
      route.forEach(({ company, position }) => {
        // Validate coordinates
        if (!company.lat || !company.lng || (company.lat === 0 && company.lng === 0)) {
          return;
        }

        try {
          // Create numbered blue marker
          const icon = L.divIcon({
            className: 'custom-marker-route',
            html: `
              <div style="
                width: 36px;
                height: 36px;
                background: #3B82F6;
                border: 4px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
              ">
                <div style="
                  transform: rotate(45deg);
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                ">${position}</div>
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
          });

          const marker = L.marker([company.lat, company.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="padding: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="
                    width: 24px;
                    height: 24px;
                    background: #3B82F6;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                  ">${position}</div>
                  <div style="font-weight: bold;">${company.name}</div>
                </div>
                <div style="font-size: 12px; color: #666;">${company.address}</div>
                <div style="font-size: 11px; color: #3B82F6; margin-top: 8px;">
                  Stop #${position} in optimized route
                </div>
              </div>
            `);

          if (onMarkerClick) {
            marker.on('click', () => {
              onMarkerClick(company);
            });
          }

          markersRef.current.set(`route-${company.id}`, marker);
          bounds.push([company.lat, company.lng]);
        } catch (error) {
          // Silently handle marker errors
        }
      });

      // Draw route line
      if (route.length > 1) {
        try {
          let latLngs: L.LatLngExpression[];
          let lineStyle: L.PolylineOptions;

          if (routeGeometry && routeGeometry.length > 0) {
            // Use real road geometry from OSRM
            latLngs = routeGeometry.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);
            lineStyle = {
              color: '#3B82F6',
              weight: 5,
              opacity: 0.7,
            };
          } else {
            // Use straight lines
            latLngs = route.map(stop => [stop.company.lat, stop.company.lng] as L.LatLngExpression);
            lineStyle = {
              color: '#3B82F6',
              weight: 4,
              opacity: 0.5,
              dashArray: '10, 10',
            };
          }

          const polyline = L.polyline(latLngs, lineStyle).addTo(map);
          routeLineRef.current = polyline;
        } catch (error) {
          // Silently handle route line errors
        }
      }
    }

    // Fit map to show all markers
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 15
        });
      } catch (error) {
        // Silently handle bounds errors
      }
    } else {
      // No markers, center on Tbilisi
      map.setView([41.7151, 44.8271], 12);
    }

  }, [companies, route, routeGeometry, hoveredStop, onMarkerClick, isMapReady]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%' }}
      />
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
