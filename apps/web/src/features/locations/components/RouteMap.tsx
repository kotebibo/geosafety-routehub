/**
 * RouteMap Component - ENHANCED VERSION
 * Interactive OpenStreetMap with IMMEDIATE visual feedback
 * - Shows ALL selected companies with green markers
 * - Shows optimized route with blue numbered markers
 * - Highlights on hover
 * - Real road routes when available
 */

'use client';

import { useEffect, useRef } from 'react';
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
}

interface RouteMapProps {
  companies?: Company[]; // ALL selected companies (optional)
  route?: Array<{ company: Company; position: number }>; // Optimized route stops (optional)
  routeGeometry?: number[][]; // [lng, lat] pairs from OSRM
  hoveredStop?: string | null;
  onMarkerClick?: (company: Company) => void;
}

export default function RouteMap({ 
  companies = [], // Default to empty array
  route = [], // Default to empty array
  routeGeometry,
  hoveredStop, 
  onMarkerClick 
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map').setView([41.7151, 44.8271], 12); // Tbilisi center

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers and route when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // DEBUG: Log what we're receiving
    console.log('🗺️ RouteMap Update:', {
      companiesCount: companies?.length || 0,
      companiesArray: Array.isArray(companies),
      companies: companies,
      routeCount: route?.length || 0,
      routeArray: Array.isArray(route),
      hasGeometry: !!routeGeometry
    });

    // Ensure we have arrays
    const validCompanies = Array.isArray(companies) ? companies : [];
    const validRoute = Array.isArray(route) ? route : [];

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Remove existing route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const bounds: L.LatLngBoundsExpression = [];

    // STEP 1: Show ALL selected companies as GREEN markers
    // These appear IMMEDIATELY when user clicks to select
    if (validCompanies.length > 0) {
      console.log(`📍 Adding ${validCompanies.length} company markers`);
      
      validCompanies.forEach((company) => {
        // Skip if coordinates are invalid (0,0 or null)
        if (!company.lat || !company.lng || (company.lat === 0 && company.lng === 0)) {
          console.warn(`Company ${company.name} has invalid coordinates:`, company.lat, company.lng);
          return;
        }

        // Check if this company is part of the optimized route
        const routeStop = validRoute.find(stop => stop.company.id === company.id);
        
        // If it's in the route, skip it here (we'll show numbered marker instead)
        if (routeStop) return;

        const isHovered = hoveredStop === company.id;

        // Green marker for selected companies (not yet optimized)
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="marker-container ${isHovered ? 'marker-hovered' : ''}">
              <div class="marker-pin-selected">
                <div class="marker-pulse"></div>
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const marker = L.marker([company.lat, company.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <div class="font-semibold text-gray-900">${company.name}</div>
              <div class="text-sm text-gray-600">${company.address}</div>
              <div class="text-xs text-green-600 mt-2 flex items-center gap-1">
                <span>✓</span>
                <span>Selected - Click "Optimize" to plan route</span>
              </div>
            </div>
          `);

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(company));
        }

        markersRef.current.set(`selected-${company.id}`, marker);
        bounds.push([company.lat, company.lng]);
      });
    }

    // STEP 2: Show optimized route stops with BLUE NUMBERED markers
    // These replace the green markers when route is optimized
    if (validRoute.length > 0) {
      console.log(`🔵 Adding ${validRoute.length} route stop markers`);
      
      validRoute.forEach(({ company, position }) => {
        // Skip if coordinates are invalid
        if (!company.lat || !company.lng || (company.lat === 0 && company.lng === 0)) {
          console.warn(`Route stop ${company.name} has invalid coordinates`);
          return;
        }

        const isHovered = hoveredStop === company.id;
        
        // Numbered marker for route stops
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="marker-container ${isHovered ? 'marker-hovered' : ''}">
              <div class="marker-pin-route">
                <div class="marker-number">${position}</div>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        const marker = L.marker([company.lat, company.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  ${position}
                </div>
                <div class="font-semibold text-gray-900">${company.name}</div>
              </div>
              <div class="text-sm text-gray-600">${company.address}</div>
              <div class="text-xs text-blue-600 mt-2">
                Stop #${position} in optimized route
              </div>
            </div>
          `);

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(company));
        }
        
        markersRef.current.set(`route-${company.id}`, marker);
        bounds.push([company.lat, company.lng]);
      });

      // STEP 3: Draw route line connecting the stops
      if (validRoute.length > 1) {
        let latLngs: L.LatLngExpression[];
        let lineStyle: L.PolylineOptions;

        // If we have OSRM geometry, use it for REAL road routes!
        if (routeGeometry && routeGeometry.length > 0) {
          // Convert OSRM format [lng, lat] to Leaflet format [lat, lng]
          latLngs = routeGeometry.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);
          
          // Solid line for real roads
          lineStyle = {
            color: '#3B82F6',
            weight: 5,
            opacity: 0.7,
            lineJoin: 'round',
            lineCap: 'round',
          };
        } else {
          // Fallback to straight lines between stops
          latLngs = validRoute.map(stop => [stop.company.lat, stop.company.lng] as L.LatLngExpression);
          
          // Dashed line for straight-line estimates
          lineStyle = {
            color: '#3B82F6',
            weight: 4,
            opacity: 0.5,
            dashArray: '10, 10',
            lineJoin: 'round',
            lineCap: 'round',
          };
          
          console.log('ℹ️ Using straight-line route (OSRM not available)');
        }

        const polyline = L.polyline(latLngs, lineStyle).addTo(map);
        routeLineRef.current = polyline;
        
        // Add direction arrows every few segments (commented out - requires leaflet-textpath plugin)
        // if (latLngs.length > 2) {
        //   polyline.setText('  ►  ', {
        //     repeat: true,
        //     offset: 8,
        //     attributes: {
        //       fill: '#3B82F6',
        //       'font-size': '14',
        //       'font-weight': 'bold'
        //     }
        //   });
        // }
      }
    }

    // Fit bounds to show all markers with padding
    if (bounds.length > 0) {
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 15 // Don't zoom in too much
      });
    } else {
      // No markers, show Tbilisi
      map.setView([41.7151, 44.8271], 12);
    }
  }, [companies, route, routeGeometry, hoveredStop, onMarkerClick]);

  return (
    <>
      <div id="map" className="w-full h-full" />
      
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        
        .marker-container {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .marker-container.marker-hovered {
          transform: scale(1.3);
          z-index: 1000 !important;
        }
        
        /* Selected company marker (GREEN - shows immediately when selected) */
        .marker-pin-selected {
          position: relative;
          width: 24px;
          height: 24px;
          background: #10B981;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 6px rgba(16, 185, 129, 0.4);
          animation: markerAppear 0.3s ease-out;
        }
        
        @keyframes markerAppear {
          from {
            transform: rotate(-45deg) scale(0);
            opacity: 0;
          }
          to {
            transform: rotate(-45deg) scale(1);
            opacity: 1;
          }
        }
        
        /* Pulsing effect for selected markers */
        .marker-pulse {
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border: 2px solid #10B981;
          border-radius: 50% 50% 50% 0;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        /* Route stop marker (BLUE with number - shows after optimization) */
        .marker-pin-route {
          position: relative;
          width: 32px;
          height: 32px;
          background: #3B82F6;
          border: 4px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .marker-number {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 14px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          line-height: 1;
        }
        
        /* Leaflet popup styling */
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        .leaflet-popup-content {
          margin: 0;
          min-width: 200px;
        }
        
        .leaflet-popup-tip {
          border-radius: 2px;
        }

        /* Route line styling */
        .leaflet-interactive {
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
