/**
 * All Locations Map Page - Filter by Inspector and Service Type
 * Shows all company locations with interactive filtering
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

// Import map dynamically (client-side only)
const LocationsMap = dynamic(() => import('@/components/map/LocationsMap'), {
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

  // Calculate counts for each filter option
  const filterCounts = useMemo(() => {
    // Count companies by inspector
    const inspectorCounts: Record<string, number> = {};
    
    // Count companies by service type
    const serviceTypeCounts: Record<string, number> = {};
    
    companies.forEach(company => {
      const companyServicesList = companyServices.filter(s => s.company_id === company.id);
      
      if (companyServicesList.length === 0) return;
      
      // Apply search filter
      if (searchQuery && 
          !company.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !company.address.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }
      
      // Count for inspectors (respecting service type filter)
      companyServicesList.forEach(service => {
        // If service type filter is active, only count services matching that type
        if (selectedServiceType === 'all' || service.service_type_id === selectedServiceType) {
          if (service.assigned_inspector_id) {
            inspectorCounts[service.assigned_inspector_id] = (inspectorCounts[service.assigned_inspector_id] || 0) + 1;
          }
        }
      });
      
      // Count for service types (respecting inspector filter)
      companyServicesList.forEach(service => {
        // If inspector filter is active, only count services assigned to that inspector
        if (selectedInspector === 'all' || service.assigned_inspector_id === selectedInspector) {
          serviceTypeCounts[service.service_type_id] = (serviceTypeCounts[service.service_type_id] || 0) + 1;
        }
      });
    });
    
    return { inspectorCounts, serviceTypeCounts };
  }, [companies, companyServices, searchQuery, selectedInspector, selectedServiceType]);

  // Filter companies based on selected filters
  const filteredCompanies = companies.filter(company => {
    // Search filter
    if (searchQuery && !company.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !company.address.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Get services for this company
    const companyServicesList = companyServices.filter(s => s.company_id === company.id);

    // If no services, hide the company
    if (companyServicesList.length === 0) return false;

    // Inspector filter
    if (selectedInspector !== 'all') {
      const hasInspector = companyServicesList.some(s => s.assigned_inspector_id === selectedInspector);
      if (!hasInspector) return false;
    }

    // Service type filter
    if (selectedServiceType !== 'all') {
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
            ნაჩვენები: <span className="font-bold text-blue-600">{filteredCompanies.length}</span> / {companies.length}
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🔍 ძიება
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="კომპანიის სახელი ან მისამართი..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Inspector Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              👤 ინსპექტორი
            </label>
            <select
              value={selectedInspector}
              onChange={(e) => setSelectedInspector(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა ინსპექტორი ({companies.filter(c => companyServices.some(s => s.company_id === c.id)).length})</option>
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

          {/* Service Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🔧 სერვისის ტიპი
            </label>
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა სერვისი ({companies.filter(c => companyServices.some(s => s.company_id === c.id)).length})</option>
              {serviceTypes.map(serviceType => {
                const count = filterCounts.serviceTypeCounts[serviceType.id] || 0;
                return (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name_ka} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedInspector !== 'all' || selectedServiceType !== 'all' || searchQuery) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">აქტიური ფილტრები:</span>
            
            {searchQuery && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                🔍 "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">×</button>
              </span>
            )}
            
            {selectedInspector !== 'all' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2">
                👤 {inspectors.find(i => i.id === selectedInspector)?.full_name}
                <button onClick={() => setSelectedInspector('all')} className="hover:text-green-900">×</button>
              </span>
            )}
            
            {selectedServiceType !== 'all' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                🔧 {serviceTypes.find(s => s.id === selectedServiceType)?.name_ka}
                <button onClick={() => setSelectedServiceType('all')} className="hover:text-purple-900">×</button>
              </span>
            )}

            <button
              onClick={() => {
                setSearchQuery('');
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
