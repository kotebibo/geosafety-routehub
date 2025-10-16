/**
 * Route Builder Page - Map-Based Interface
 * Visual route planning with interactive OpenStreetMap
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import SaveRouteModal from '@/components/SaveRouteModal';

// Import map dynamically (client-side only) - Using FIXED version
const RouteMap = dynamic(() => import('@/components/map/RouteMapFixed'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-2">🗺️</div>
        <p className="text-gray-600">რუკის ჩატვირთვა...</p>
      </div>
    </div>
  ),
});

interface Company {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  priority: string;
}

interface RouteStop {
  company: Company;
  position: number;
  distance?: number;
}

interface OptimizedRouteData {
  stops: RouteStop[];
  geometry?: number[][]; // [lng, lat] from OSRM
}

export default function RouteBuilderPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteStop[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<number[][] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Force re-render key

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('id, name, address, lat, lng, type, priority')
      .eq('status', 'active')
      .order('name');
    
    if (data) setCompanies(data);
  }

  function toggleCompany(company: Company) {
    setSelectedCompanies(prev => {
      const exists = prev.find(c => c.id === company.id);
      if (exists) {
        const newList = prev.filter(c => c.id !== company.id);
        // Also update optimized route if it exists
        setOptimizedRoute(current => current.filter(stop => stop.company.id !== company.id));
        // Force map re-render
        setMapKey(k => k + 1);
        return newList;
      } else {
        // Force map re-render
        setMapKey(k => k + 1);
        return [...prev, company];
      }
    });
  }

  async function optimizeRoute() {
    if (selectedCompanies.length < 2) {
      alert('აირჩიეთ მინიმუმ 2 კომპანია');
      return;
    }

    setLoading(true);
    
    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('გთხოვთ გაიაროთ ავტორიზაცია');
        setLoading(false);
        return;
      }

      const locations = selectedCompanies.map(c => ({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
      }));

      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // Pass the token
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          locations,
          options: { 
            algorithm: 'hybrid',
            useRealRoads: true // Enable OSRM
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const stops: RouteStop[] = result.route.stops.map((stop: any) => {
          const company = selectedCompanies.find(c => c.id === stop.id)!;
          return {
            company,
            position: stop.position,
            distance: stop.distanceFromPrevious,
          };
        });
        
        setOptimizedRoute(stops);
        
        // Store route geometry from OSRM for map
        if (result.route.metadata?.routeGeometry) {
          setRouteGeometry(result.route.metadata.routeGeometry);
        } else {
          setRouteGeometry(null);
        }
      }
    } catch (error) {
      console.error('Optimization error:', error);
      alert('ოპტიმიზაცია ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRoute(data: {
    name: string;
    date: string;
    inspectorId?: string;
    startTime: string;
  }) {
    if (optimizedRoute.length === 0) {
      alert('გთხოვთ ჯერ შექმენით მარშრუტი');
      return;
    }

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('გთხოვთ გაიაროთ ავტორიზაცია');
      return;
    }

    const totalDistance = optimizedRoute.reduce((sum, stop) => sum + (stop.distance || 0), 0);

    const response = await fetch('/api/routes/save', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // Pass the token
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        name: data.name,
        date: data.date,
        inspectorId: data.inspectorId,
        startTime: data.startTime,
        totalDistance,
        optimizationType: 'distance',
        routeGeometry: routeGeometry,
        stops: optimizedRoute.map(stop => ({
          companyId: stop.company.id,
          position: stop.position,
          distanceFromPrevious: stop.distance,
        })),
      }),
    });

    const result = await response.json();

    if (result.success) {
      alert(`✅ მარშრუტი შენახულია!\nID: ${result.route.id}`);
      // Optionally clear the route
      // setSelectedCompanies([]);
      // setOptimizedRoute([]);
      // setRouteGeometry(null);
    } else {
      throw new Error(result.error || 'შენახვა ვერ მოხერხდა');
    }
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedRoute = optimizedRoute.length > 0 ? optimizedRoute : selectedCompanies.map((c, i) => ({
    company: c,
    position: i + 1,
  }));

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">მარშრუტის შექმნა</h1>
          <p className="text-sm text-gray-600">აირჩიეთ ობიექტები რუკაზე</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            არჩეული: <span className="font-bold text-blue-600">{selectedCompanies.length}</span>
          </div>
          {selectedCompanies.length >= 2 && (
            <button
              onClick={optimizeRoute}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ ოპტიმიზაცია...' : '🚀 ოპტიმიზაცია'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Company List */}
        <div className="w-80 bg-white border-r flex flex-col h-full">
          <div className="p-4 border-b">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ძიება..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredCompanies.map(company => {
              const isSelected = selectedCompanies.find(c => c.id === company.id);
              return (
                <div
                  key={company.id}
                  onClick={() => toggleCompany(company)}
                  onMouseEnter={() => setHoveredStop(company.id)}
                  onMouseLeave={() => setHoveredStop(null)}
                  className={`p-4 border-b cursor-pointer transition ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                      : 'hover:bg-gray-50'
                  } ${hoveredStop === company.id ? 'bg-gray-100' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{company.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{company.address}</div>
                    </div>
                    {isSelected && (
                      <div className="ml-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {selectedCompanies.findIndex(c => c.id === company.id) + 1}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative h-full">
          <RouteMap
            key={`map-${mapKey}`}
            companies={selectedCompanies}
            route={displayedRoute}
            routeGeometry={routeGeometry}
            hoveredStop={hoveredStop}
            onMarkerClick={toggleCompany}
          />
        </div>

        {/* Right Sidebar - Route Details */}
        <div className="w-96 bg-white border-l flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">მარშრუტი</h2>
            {optimizedRoute.length > 0 && (
              <div className="mt-2 text-sm text-green-600 font-medium">
                ✅ ოპტიმიზირებული
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayedRoute.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-3">📍</div>
                <p>აირჩიეთ ობიექტები</p>
                <p className="text-sm mt-1">მარცხნივ სიიდან ან რუკაზე</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {displayedRoute.map((stop, index) => (
                  <div
                    key={stop.company.id}
                    onMouseEnter={() => setHoveredStop(stop.company.id)}
                    onMouseLeave={() => setHoveredStop(null)}
                    className={`p-4 rounded-lg border-2 transition ${
                      hoveredStop === stop.company.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {stop.position}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="font-semibold text-sm text-gray-900">
                          {stop.company.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          📍 {stop.company.address}
                        </div>
                        {stop.distance && index > 0 && (
                          <div className="text-xs text-blue-600 mt-2">
                            🚗 ~{stop.distance.toFixed(1)} კმ წინა პუნქტიდან
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {optimizedRoute.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-semibold text-green-800 mb-2">📊 სტატისტიკა</div>
                    <div className="text-xs text-green-700 space-y-1">
                      <div>• სულ ობიექტი: {optimizedRoute.length}</div>
                      <div>• სრული მანძილი: ~{optimizedRoute.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(1)} კმ</div>
                      <div>• დაზოგილი: ~15-25%</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedCompanies.length > 0 && (
            <div className="p-4 border-t space-y-2">
              <button 
                onClick={() => setShowSaveModal(true)}
                disabled={optimizedRoute.length === 0}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 მარშრუტის შენახვა
              </button>
              <button
                onClick={() => {
                  setSelectedCompanies([]);
                  setOptimizedRoute([]);
                  setRouteGeometry(null);
                }}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                🗑️ გასუფთავება
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Route Modal */}
      <SaveRouteModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveRoute}
        defaultName={`მარშრუტი ${new Date().toLocaleDateString('ka-GE')}`}
      />
    </div>
  );
}
