/**
 * LocationsMap Component - All Locations Display
 * Shows all company locations with detailed popups
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

interface CompanyService {
  service_type_name: string;
  service_type_name_ka: string;
  assigned_inspector_name?: string;
  priority: string;
  status: string;
}

interface Company {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  priority: string;
  status: string;
  contact_name?: string;
  contact_phone?: string;
  services: CompanyService[];
}

interface LocationsMapProps {
  companies: Company[];
}

export default function LocationsMap({ companies }: LocationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
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

  // Update markers when companies change
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

    const bounds: L.LatLngBoundsExpression = [];

    // Add marker for each company
    companies.forEach((company) => {
      // Validate coordinates
      if (!company.lat || !company.lng || (company.lat === 0 && company.lng === 0)) {
        return;
      }

      try {
        // Choose marker color based on priority
        let markerColor = '#3B82F6'; // default blue
        if (company.priority === 'high') markerColor = '#EF4444'; // red
        else if (company.priority === 'medium') markerColor = '#F59E0B'; // orange
        else if (company.priority === 'low') markerColor = '#10B981'; // green

        // Create custom marker
        const icon = L.divIcon({
          className: 'custom-location-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: ${markerColor};
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
                transform: rotate(45deg);
                color: white;
                font-size: 16px;
              ">📍</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        // Build services HTML
        const servicesHtml = company.services.map(service => `
          <div style="
            padding: 6px 10px;
            background: #F3F4F6;
            border-radius: 6px;
            margin-top: 6px;
            font-size: 12px;
          ">
            <div style="font-weight: 600; color: #1F2937;">
              🔧 ${service.service_type_name_ka}
            </div>
            ${service.assigned_inspector_name ? `
              <div style="color: #6B7280; margin-top: 3px;">
                👤 ${service.assigned_inspector_name}
              </div>
            ` : ''}
            <div style="
              display: inline-block;
              margin-top: 4px;
              padding: 2px 8px;
              background: ${service.priority === 'high' ? '#FEE2E2' : service.priority === 'medium' ? '#FEF3C7' : '#D1FAE5'};
              color: ${service.priority === 'high' ? '#991B1B' : service.priority === 'medium' ? '#92400E' : '#065F46'};
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            ">
              ${service.priority.toUpperCase()}
            </div>
          </div>
        `).join('');

        // Priority badge
        const priorityBadge = `
          <div style="
            display: inline-block;
            padding: 4px 12px;
            background: ${company.priority === 'high' ? '#EF4444' : company.priority === 'medium' ? '#F59E0B' : '#10B981'};
            color: white;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
            margin-top: 8px;
          ">
            ${company.priority === 'high' ? '🔴 მაღალი' : company.priority === 'medium' ? '🟡 საშუალო' : '🟢 დაბალი'}
          </div>
        `;

        // Contact info
        const contactHtml = (company.contact_name || company.contact_phone) ? `
          <div style="
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #6B7280;
          ">
            ${company.contact_name ? `<div>👤 ${company.contact_name}</div>` : ''}
            ${company.contact_phone ? `<div>📞 ${company.contact_phone}</div>` : ''}
          </div>
        ` : '';

        const marker = L.marker([company.lat, company.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="padding: 12px; min-width: 280px;">
              <div style="
                font-weight: bold;
                font-size: 16px;
                color: #111827;
                margin-bottom: 8px;
              ">
                ${company.name}
              </div>
              
              <div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">
                📍 ${company.address}
              </div>
              
              <div style="font-size: 12px; color: #9CA3AF;">
                🏢 ${company.type}
              </div>
              
              ${priorityBadge}
              
              <div style="
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #E5E7EB;
              ">
                <div style="
                  font-weight: 600;
                  font-size: 13px;
                  color: #374151;
                  margin-bottom: 6px;
                ">
                  სერვისები (${company.services.length})
                </div>
                ${servicesHtml}
              </div>
              
              ${contactHtml}
            </div>
          `, {
            maxWidth: 350,
            className: 'custom-popup'
          });

        markersRef.current.set(company.id, marker);
        bounds.push([company.lat, company.lng]);
      } catch (error) {
        console.error(`Error creating marker for ${company.name}:`, error);
      }
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 15
        });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    } else {
      // No markers, center on Tbilisi
      map.setView([41.7151, 44.8271], 12);
    }

  }, [companies, isMapReady]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%' }}
      />
      
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  );
}
