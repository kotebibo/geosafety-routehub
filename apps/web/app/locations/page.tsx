/**
 * All Locations Map Page - Filter by Inspector, Service Type, District, Region, and Type
 * Shows all company locations with interactive filtering
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

// Import map dynamically (client-side only)
const LocationsMap = dynamic(() => import('@/features/locations/components/LocationsMap'), {
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

// Georgian regions and their districts/municipalities
const GEORGIAN_REGIONS: Record<string, string[]> = {
  'თბილისი': ['ვაკე', 'საბურთალო', 'ისანი', 'სამგორი', 'ნაძალადევი', 'გლდანი', 'დიდუბე', 'ჩუღურეთი', 'მთაწმინდა', 'კრწანისი'],
  'იმერეთი': ['ქუთაისი', 'ზესტაფონი', 'სამტრედია', 'ჭიათურა', 'საჩხერე', 'ტყიბული', 'წყალტუბო', 'ხონი', 'თერჯოლა', 'ვანი', 'ბაღდათი', 'ხარაგაული'],
  'კახეთი': ['თელავი', 'გურჯაანი', 'საგარეჯო', 'სიღნაღი', 'ყვარელი', 'ლაგოდეხი', 'დედოფლისწყარო', 'ახმეტა'],
  'შიდა ქართლი': ['გორი', 'კასპი', 'ხაშური', 'ქარელი', 'ცხინვალი'],
  'ქვემო ქართლი': ['რუსთავი', 'მარნეული', 'გარდაბანი', 'ბოლნისი', 'დმანისი', 'თეთრიწყარო', 'წალკა'],
  'სამცხე-ჯავახეთი': ['ახალციხე', 'ახალქალაქი', 'ბორჯომი', 'ადიგენი', 'ასპინძა', 'ნინოწმინდა'],
  'აჭარა': ['ბათუმი', 'ქობულეთი', 'ხელვაჩაური', 'ქედა', 'შუახევი', 'ხულო'],
  'გურია': ['ოზურგეთი', 'ლანჩხუთი', 'ჩოხატაური'],
  'სამეგრელო-ზემო სვანეთი': ['ზუგდიდი', 'სენაკი', 'ფოთი', 'მარტვილი', 'ხობი', 'აბაშა', 'წალენჯიხა', 'ჩხოროწყუ', 'მესტია'],
  'რაჭა-ლეჩხუმი და ქვემო სვანეთი': ['ამბროლაური', 'ონი', 'ცაგერი', 'ლენტეხი'],
  'მცხეთა-მთიანეთი': ['მცხეთა', 'დუშეთი', 'თიანეთი', 'ყაზბეგი'],
};

// Geographic bounding boxes for Georgian regions (approximate boundaries)
// Format: { minLat, maxLat, minLng, maxLng }
// Note: These are checked in order, so more specific regions should come first
const REGION_BOUNDS: { region: string; minLat: number; maxLat: number; minLng: number; maxLng: number }[] = [
  // Tbilisi - small area, check first
  { region: 'თბილისი', minLat: 41.64, maxLat: 41.83, minLng: 44.70, maxLng: 44.95 },
  // Adjara (აჭარა) - southwest coast
  { region: 'აჭარა', minLat: 41.40, maxLat: 41.90, minLng: 41.50, maxLng: 42.20 },
  // Guria (გურია) - west, between Adjara and Imereti
  { region: 'გურია', minLat: 41.75, maxLat: 42.15, minLng: 41.80, maxLng: 42.35 },
  // Samegrelo-Zemo Svaneti - northwest
  { region: 'სამეგრელო-ზემო სვანეთი', minLat: 42.10, maxLat: 43.30, minLng: 41.50, maxLng: 42.80 },
  // Racha-Lechkhumi and Kvemo Svaneti - north-central mountains
  { region: 'რაჭა-ლეჩხუმი და ქვემო სვანეთი', minLat: 42.40, maxLat: 43.00, minLng: 42.50, maxLng: 43.60 },
  // Imereti - central-west
  { region: 'იმერეთი', minLat: 41.90, maxLat: 42.55, minLng: 42.10, maxLng: 43.50 },
  // Samtskhe-Javakheti - south
  { region: 'სამცხე-ჯავახეთი', minLat: 41.15, maxLat: 41.85, minLng: 42.70, maxLng: 44.00 },
  // Shida Kartli - central
  { region: 'შიდა ქართლი', minLat: 41.80, maxLat: 42.45, minLng: 43.40, maxLng: 44.50 },
  // Mtskheta-Mtianeti - north-central, includes mountains
  { region: 'მცხეთა-მთიანეთი', minLat: 41.80, maxLat: 42.80, minLng: 44.30, maxLng: 45.10 },
  // Kvemo Kartli - south-east of Tbilisi
  { region: 'ქვემო ქართლი', minLat: 41.20, maxLat: 41.75, minLng: 43.90, maxLng: 45.30 },
  // Kakheti - east
  { region: 'კახეთი', minLat: 41.20, maxLat: 42.50, minLng: 45.00, maxLng: 46.80 },
];

// Function to determine region from lat/lng coordinates
function getRegionFromCoordinates(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null || lat === 0 || lng === 0) return null;

  for (const bound of REGION_BOUNDS) {
    if (lat >= bound.minLat && lat <= bound.maxLat && lng >= bound.minLng && lng <= bound.maxLng) {
      return bound.region;
    }
  }
  return null;
}

// BACKUP: Old address-based extraction (keeping for reference)
// function extractLocationInfoFromAddress(address: string): { district: string | null; region: string | null; city: string | null } {
//   if (!address) return { district: null, region: null, city: null };
//   const addressLower = address.toLowerCase();
//   const addressParts = address.split(',').map(p => p.trim());
//   let foundDistrict: string | null = null;
//   let foundRegion: string | null = null;
//   let foundCity: string | null = null;
//   for (const [region, districts] of Object.entries(GEORGIAN_REGIONS)) {
//     if (addressLower.includes(region.toLowerCase())) foundRegion = region;
//     for (const district of districts) {
//       if (addressLower.includes(district.toLowerCase())) {
//         foundDistrict = district;
//         foundRegion = region;
//         foundCity = region === 'თბილისი' ? 'თბილისი' : district;
//         break;
//       }
//     }
//     if (foundDistrict) break;
//   }
//   if (!foundCity && addressParts.length >= 2) {
//     foundCity = addressParts[addressParts.length - 1] || addressParts[addressParts.length - 2];
//   }
//   return { district: foundDistrict, region: foundRegion, city: foundCity };
// }

// Helper function to extract location info - COORDINATES FIRST approach
function extractLocationInfo(
  address: string,
  lat?: number | null,
  lng?: number | null
): { district: string | null; region: string | null; city: string | null } {
  let foundDistrict: string | null = null;
  let foundRegion: string | null = null;
  let foundCity: string | null = null;

  // PRIMARY: Use coordinates to determine region (most accurate)
  if (lat && lng) {
    foundRegion = getRegionFromCoordinates(lat, lng);
    if (foundRegion === 'თბილისი') {
      foundCity = 'თბილისი';
    }
  }

  // SECONDARY: Try to extract district from address text (for more detail within the region)
  if (address) {
    const addressLower = address.toLowerCase();
    const addressParts = address.split(',').map(p => p.trim());

    // Check districts/cities from address for more specific location info
    for (const [region, districts] of Object.entries(GEORGIAN_REGIONS)) {
      for (const district of districts) {
        if (addressLower.includes(district.toLowerCase())) {
          foundDistrict = district;
          // Only set city if not already set
          if (!foundCity) {
            if (region === 'თბილისი') {
              foundCity = 'თბილისი';
            } else {
              foundCity = district;
            }
          }
          break;
        }
      }
      if (foundDistrict) break;
    }

    // If no city found yet, try to get from address parts
    if (!foundCity && addressParts.length >= 2) {
      foundCity = addressParts[addressParts.length - 1] || addressParts[addressParts.length - 2];
    }
  }

  return { district: foundDistrict, region: foundRegion, city: foundCity };
}

// Company type labels in Georgian
const COMPANY_TYPE_LABELS: Record<string, string> = {
  'commercial': 'კომერციული',
  'residential': 'საცხოვრებელი',
  'industrial': 'სამრეწველო',
  'healthcare': 'სამედიცინო',
  'education': 'საგანმანათლებლო',
};

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
}

interface CompanyService {
  company_id: string;
  service_type_id: string;
  service_type_name: string;
  service_type_name_ka: string;
  assigned_inspector_id?: string;
  assigned_inspector_name?: string;
  priority: string;
  status: string;
}

interface Inspector {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

interface ServiceType {
  id: string;
  name: string;
  name_ka: string;
  is_active: boolean;
}

export default function LocationsMapPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyServices, setCompanyServices] = useState<CompanyService[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  
  const [selectedInspector, setSelectedInspector] = useState<string>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedCompanyType, setSelectedCompanyType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .eq('status', 'active')
        .order('name');

      // Load company services with service type and inspector info
      const { data: servicesData } = await supabase
        .from('company_services')
        .select(`
          company_id,
          service_type_id,
          assigned_inspector_id,
          priority,
          status,
          service_types!inner(name, name_ka),
          inspectors(full_name)
        `)
        .eq('status', 'active');

      // Load inspectors
      const { data: inspectorsData } = await supabase
        .from('inspectors')
        .select('id, full_name, email, role, status')
        .eq('status', 'active')
        .order('full_name');

      // Load service types
      const { data: serviceTypesData } = await supabase
        .from('service_types')
        .select('id, name, name_ka, is_active')
        .eq('is_active', true)
        .order('name');

      if (companiesData) setCompanies(companiesData);

      if (servicesData) {
        const formattedServices = servicesData.map((s: any) => ({
          company_id: s.company_id,
          service_type_id: s.service_type_id,
          service_type_name: s.service_types.name,
          service_type_name_ka: s.service_types.name_ka,
          assigned_inspector_id: s.assigned_inspector_id,
          assigned_inspector_name: s.inspectors?.full_name,
          priority: s.priority,
          status: s.status,
        }));
        setCompanyServices(formattedServices);
      }

      if (inspectorsData) setInspectors(inspectorsData);
      if (serviceTypesData) setServiceTypes(serviceTypesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Extract location info for all companies
  const companiesWithLocation = useMemo(() => {
    return companies.map(company => ({
      ...company,
      locationInfo: extractLocationInfo(company.address, company.lat, company.lng),
    }));
  }, [companies]);

  // Debug: Log companies with unknown regions (to help identify patterns)
  useEffect(() => {
    const unknownCompanies = companiesWithLocation.filter(c => !c.locationInfo.region);
    if (unknownCompanies.length > 0) {
      console.log('Companies with unknown regions:', unknownCompanies.length);
      console.log('Sample addresses:', unknownCompanies.slice(0, 10).map(c => ({
        name: c.name,
        address: c.address,
        lat: c.lat,
        lng: c.lng
      })));
    }
  }, [companiesWithLocation]);

  // Filter to only companies with valid map coordinates
  const mappableCompanies = useMemo(() => {
    return companiesWithLocation.filter(company =>
      company.lat && company.lng && company.lat !== 0 && company.lng !== 0
    );
  }, [companiesWithLocation]);

  // Get available regions and districts from data (only from mappable companies)
  const availableFilters = useMemo(() => {
    const regions = new Set<string>();
    const districts = new Set<string>();
    const companyTypes = new Set<string>();
    let unknownCount = 0;

    mappableCompanies.forEach(company => {
      if (company.locationInfo.region) {
        regions.add(company.locationInfo.region);
      } else {
        unknownCount++;
      }
      if (company.locationInfo.district) {
        districts.add(company.locationInfo.district);
      }
      if (company.type) {
        companyTypes.add(company.type);
      }
    });

    return {
      regions: Array.from(regions).sort(),
      districts: Array.from(districts).sort(),
      companyTypes: Array.from(companyTypes).sort(),
      unknownRegionCount: unknownCount,
    };
  }, [mappableCompanies]);

  // Get districts for selected region
  const availableDistrictsForRegion = useMemo(() => {
    if (selectedRegion === 'all') {
      return availableFilters.districts;
    }
    return GEORGIAN_REGIONS[selectedRegion] || [];
  }, [selectedRegion, availableFilters.districts]);

  // Calculate counts for each filter option - counts are independent of other filters
  const filterCounts = useMemo(() => {
    const inspectorCounts: Record<string, number> = {};
    const serviceTypeCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    const districtCounts: Record<string, number> = {};
    const companyTypeCounts: Record<string, number> = {};

    // Use mappableCompanies to ensure counts match what's shown on the map
    mappableCompanies.forEach(company => {
      const companyServicesList = companyServices.filter(s => s.company_id === company.id);

      // Apply search filter (this is the only filter that affects all counts)
      if (searchQuery &&
          !company.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !company.address.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      // Count regions based on coordinate-detected region
      if (company.locationInfo.region) {
        regionCounts[company.locationInfo.region] = (regionCounts[company.locationInfo.region] || 0) + 1;
      }

      // Count districts - only if company is in the selected region (or all regions)
      // This ensures district counts reflect the actual companies in that region
      if (company.locationInfo.district) {
        districtCounts[company.locationInfo.district] = (districtCounts[company.locationInfo.district] || 0) + 1;
      }

      // Count company types (independent of other filters)
      if (company.type) {
        companyTypeCounts[company.type] = (companyTypeCounts[company.type] || 0) + 1;
      }

      // Count for inspectors (independent of other filters)
      companyServicesList.forEach(service => {
        if (service.assigned_inspector_id) {
          inspectorCounts[service.assigned_inspector_id] = (inspectorCounts[service.assigned_inspector_id] || 0) + 1;
        }
      });

      // Count for service types (independent of other filters)
      companyServicesList.forEach(service => {
        serviceTypeCounts[service.service_type_id] = (serviceTypeCounts[service.service_type_id] || 0) + 1;
      });
    });

    return { inspectorCounts, serviceTypeCounts, regionCounts, districtCounts, companyTypeCounts };
  }, [mappableCompanies, companyServices, searchQuery]);

  // Calculate district counts filtered by selected region
  const districtCountsForSelectedRegion = useMemo(() => {
    const counts: Record<string, number> = {};

    mappableCompanies.forEach(company => {
      // Apply search filter
      if (searchQuery &&
          !company.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !company.address.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      // Only count if region matches (or all regions selected)
      if (selectedRegion !== 'all' && selectedRegion !== 'unknown') {
        if (company.locationInfo.region !== selectedRegion) return;
      }

      if (company.locationInfo.district) {
        counts[company.locationInfo.district] = (counts[company.locationInfo.district] || 0) + 1;
      }
    });

    return counts;
  }, [mappableCompanies, searchQuery, selectedRegion]);

  // Filter companies based on selected filters (use mappableCompanies to only show companies with coordinates)
  const filteredCompanies = mappableCompanies.filter(company => {
    // Search filter
    if (searchQuery && !company.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !company.address.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Region filter
    if (selectedRegion !== 'all') {
      if (selectedRegion === 'unknown') {
        // Show only companies without a matched region
        if (company.locationInfo.region !== null) return false;
      } else if (company.locationInfo.region !== selectedRegion) {
        return false;
      }
    }

    // District filter
    if (selectedDistrict !== 'all' && company.locationInfo.district !== selectedDistrict) {
      return false;
    }

    // Company type filter
    if (selectedCompanyType !== 'all' && company.type !== selectedCompanyType) {
      return false;
    }

    // Get services for this company
    const companyServicesList = companyServices.filter(s => s.company_id === company.id);

    // Inspector filter - only apply if there are services and filter is active
    if (selectedInspector !== 'all') {
      if (companyServicesList.length === 0) return false;
      const hasInspector = companyServicesList.some(s => s.assigned_inspector_id === selectedInspector);
      if (!hasInspector) return false;
    }

    // Service type filter - only apply if there are services and filter is active
    if (selectedServiceType !== 'all') {
      if (companyServicesList.length === 0) return false;
      const hasServiceType = companyServicesList.some(s => s.service_type_id === selectedServiceType);
      if (!hasServiceType) return false;
    }

    return true;
  });

  // Get company details with services for the map
  const companiesWithServices = filteredCompanies.map(company => {
    const services = companyServices.filter(s => s.company_id === company.id);
    return {
      ...company,
      services,
    };
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">მონაცემების ჩატვირთვა...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Top Bar with Filters */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ყველა ლოკაცია</h1>
            <p className="text-sm text-gray-600">ობიექტების რუკა ფილტრებით</p>
          </div>
          <div className="text-sm text-gray-600">
            ნაჩვენები: <span className="font-bold text-blue-600">{filteredCompanies.length}</span> / {mappableCompanies.length}
          </div>
        </div>

        {/* Main Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ძიება
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="კომპანიის სახელი ან მისამართი..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              რეგიონი
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedDistrict('all'); // Reset district when region changes
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა რეგიონი</option>
              {availableFilters.regions.map(region => {
                const count = filterCounts.regionCounts[region] || 0;
                return (
                  <option key={region} value={region}>
                    {region} ({count})
                  </option>
                );
              })}
              {availableFilters.unknownRegionCount > 0 && (
                <option value="unknown" className="text-red-600">
                  უცნობი რეგიონი ({availableFilters.unknownRegionCount})
                </option>
              )}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              რაიონი / ქალაქი
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა რაიონი</option>
              {availableDistrictsForRegion.map(district => {
                const count = districtCountsForSelectedRegion[district] || 0;
                return (
                  <option key={district} value={district}>
                    {district} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Company Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ობიექტის ტიპი
            </label>
            <select
              value={selectedCompanyType}
              onChange={(e) => setSelectedCompanyType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა ტიპი</option>
              {availableFilters.companyTypes.map(type => {
                const count = filterCounts.companyTypeCounts[type] || 0;
                return (
                  <option key={type} value={type}>
                    {COMPANY_TYPE_LABELS[type] || type} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Inspector Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ინსპექტორი
            </label>
            <select
              value={selectedInspector}
              onChange={(e) => setSelectedInspector(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა ინსპექტორი</option>
              {inspectors.map(inspector => {
                const count = filterCounts.inspectorCounts[inspector.id] || 0;
                return (
                  <option key={inspector.id} value={inspector.id}>
                    {inspector.full_name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedInspector !== 'all' || selectedServiceType !== 'all' || selectedRegion !== 'all' || selectedDistrict !== 'all' || selectedCompanyType !== 'all' || searchQuery) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">აქტიური ფილტრები:</span>

            {searchQuery && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">×</button>
              </span>
            )}

            {selectedRegion !== 'all' && (
              <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${selectedRegion === 'unknown' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                {selectedRegion === 'unknown' ? 'უცნობი რეგიონი' : selectedRegion}
                <button onClick={() => { setSelectedRegion('all'); setSelectedDistrict('all'); }} className={selectedRegion === 'unknown' ? 'hover:text-red-900' : 'hover:text-orange-900'}>×</button>
              </span>
            )}

            {selectedDistrict !== 'all' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-2">
                {selectedDistrict}
                <button onClick={() => setSelectedDistrict('all')} className="hover:text-yellow-900">×</button>
              </span>
            )}

            {selectedCompanyType !== 'all' && (
              <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm flex items-center gap-2">
                {COMPANY_TYPE_LABELS[selectedCompanyType] || selectedCompanyType}
                <button onClick={() => setSelectedCompanyType('all')} className="hover:text-cyan-900">×</button>
              </span>
            )}

            {selectedInspector !== 'all' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2">
                {inspectors.find(i => i.id === selectedInspector)?.full_name}
                <button onClick={() => setSelectedInspector('all')} className="hover:text-green-900">×</button>
              </span>
            )}

            {selectedServiceType !== 'all' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                {serviceTypes.find(s => s.id === selectedServiceType)?.name_ka}
                <button onClick={() => setSelectedServiceType('all')} className="hover:text-purple-900">×</button>
              </span>
            )}

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRegion('all');
                setSelectedDistrict('all');
                setSelectedCompanyType('all');
                setSelectedInspector('all');
                setSelectedServiceType('all');
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300"
            >
              გასუფთავება
            </button>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <LocationsMap companies={companiesWithServices} />
      </div>
    </div>
  );
}
