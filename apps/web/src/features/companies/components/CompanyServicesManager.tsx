/**
 * Company Services Manager Component
 * Allows adding/removing services for a company with inspector assignment
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, X, Save } from 'lucide-react';
import { DEPLOYMENT_CONFIG } from '@/config/features';
import { FeatureGate } from '@/components/FeatureGate';

interface ServiceType {
  id: string;
  name: string;
  name_ka: string;
  required_inspector_type: string;
  default_frequency_days: number;
}

interface Inspector {
  id: string;
  full_name: string;
  specialty: string | null;
}

interface CompanyService {
  id?: string;
  service_type_id: string;
  inspection_frequency_days: number;
  assigned_inspector_id: string | null;
  priority: 'low' | 'medium' | 'high';
  next_inspection_date: string;
}

interface CompanyServicesManagerProps {
  companyId?: string;
  initialServices?: CompanyService[];
  onServicesChange?: (services: CompanyService[]) => void;
}

export default function CompanyServicesManager({
  companyId,
  initialServices = [],
  onServicesChange,
}: CompanyServicesManagerProps) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [services, setServices] = useState<CompanyService[]>(initialServices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (onServicesChange) {
      onServicesChange(services);
    }
  }, [services]);

  async function fetchData() {
    if (!supabase) return;
    try {
      // Fetch service types
      const serviceTypesResponse = await fetch('/api/service-types');
      const serviceTypesData = await serviceTypesResponse.json();
      
      // Filter to enabled services only in single-service mode
      const filteredServiceTypes = DEPLOYMENT_CONFIG.isSingleServiceMode
        ? serviceTypesData.filter((st: ServiceType) => 
            st.name.toLowerCase().includes('personal') || 
            st.name.toLowerCase().includes('data')
          )
        : serviceTypesData;

      // Fetch inspectors
      const inspectorsResponse = await fetch('/api/inspectors');
      let inspectorsData = [];
      
      if (inspectorsResponse.ok) {
        inspectorsData = await inspectorsResponse.json();
      } else {
        console.warn('Failed to fetch inspectors:', inspectorsResponse.status);
        // Continue with empty inspectors array
      }

      setServiceTypes(filteredServiceTypes || []);
      setInspectors(Array.isArray(inspectorsData) ? inspectorsData : []);

      // If editing existing company, fetch its services
      if (companyId) {
        const { data: companyServicesData } = await supabase
          .from('company_services')
          .select('*')
          .eq('company_id', companyId);

        if (companyServicesData) {
          setServices(companyServicesData);
        }
      }
      
      // Auto-add service in single-service mode if no services exist
      if (DEPLOYMENT_CONFIG.isSingleServiceMode && filteredServiceTypes.length > 0 && services.length === 0 && !companyId) {
        const primaryService = filteredServiceTypes[0];
        const newService: CompanyService = {
          service_type_id: primaryService.id,
          inspection_frequency_days: primaryService.default_frequency_days || 90,
          assigned_inspector_id: null,
          priority: 'medium',
          next_inspection_date: getDefaultNextDate(primaryService.default_frequency_days || 90),
        };
        setServices([newService]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function addService() {
    const newService: CompanyService = {
      service_type_id: serviceTypes[0]?.id || '',
      inspection_frequency_days: serviceTypes[0]?.default_frequency_days || 90,
      assigned_inspector_id: null,
      priority: 'medium',
      next_inspection_date: getDefaultNextDate(90),
    };
    setServices([...services, newService]);
  }

  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  function updateService(index: number, updates: Partial<CompanyService>) {
    const updated = [...services];
    updated[index] = { ...updated[index], ...updates };

    // If service type changed, update frequency and reset inspector
    if (updates.service_type_id) {
      const serviceType = serviceTypes.find(st => st.id === updates.service_type_id);
      if (serviceType) {
        updated[index].inspection_frequency_days = serviceType.default_frequency_days;
        updated[index].assigned_inspector_id = null;
      }
    }

    // If frequency changed, update next inspection date
    if (updates.inspection_frequency_days) {
      updated[index].next_inspection_date = getDefaultNextDate(updates.inspection_frequency_days);
    }

    setServices(updated);
  }

  function getDefaultNextDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  function getFilteredInspectors(serviceTypeId: string): Inspector[] {
    // Ensure inspectors is always an array
    if (!Array.isArray(inspectors)) {
      console.warn('Inspectors is not an array:', inspectors);
      return [];
    }
    
    const serviceType = serviceTypes.find(st => st.id === serviceTypeId);
    if (!serviceType) return inspectors;

    // Filter inspectors by specialty
    return inspectors.filter(
      inspector => 
        !inspector.specialty || 
        inspector.specialty === serviceType.required_inspector_type ||
        inspector.specialty === 'general'
    );
  }

  if (loading) {
    return <div className="text-center py-4">იტვირთება...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {DEPLOYMENT_CONFIG.isSingleServiceMode 
            ? `${DEPLOYMENT_CONFIG.primaryServiceName} - სერვისები` 
            : 'სერვისები'}
        </h3>
        <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
          <button
            type="button"
            onClick={addService}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            სერვისის დამატება
          </button>
        </FeatureGate>
      </div>

      {services.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          სერვისები არ არის დამატებული. დააჭირეთ "სერვისის დამატება" ღილაკს.
        </div>
      )}

      <div className="space-y-4">
        {services.map((service, index) => {
          const serviceType = serviceTypes.find(st => st.id === service.service_type_id);
          const filteredInspectors = getFilteredInspectors(service.service_type_id);

          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-gray-900">სერვისი {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="text-red-600 hover:text-red-800"
                  title="წაშლა"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Service Type */}
                <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      სერვისის ტიპი *
                    </label>
                    <select
                      value={service.service_type_id}
                      onChange={(e) => updateService(index, { service_type_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">აირჩიეთ სერვისი</option>
                      {serviceTypes.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name_ka}
                        </option>
                      ))}
                    </select>
                  </div>
                </FeatureGate>
                
                {/* Hidden in single-service mode, auto-selected */}
                {DEPLOYMENT_CONFIG.isSingleServiceMode && (
                  <input type="hidden" name={`service_type_${index}`} value={service.service_type_id} />
                )}

                {/* Inspector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ინსპექტორი
                  </label>
                  <select
                    value={service.assigned_inspector_id || ''}
                    onChange={(e) => updateService(index, { 
                      assigned_inspector_id: e.target.value || null 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">აირჩიეთ ინსპექტორი</option>
                    {filteredInspectors.map((inspector) => (
                      <option key={inspector.id} value={inspector.id}>
                        {inspector.full_name}
                        {inspector.specialty && ` (${inspector.specialty})`}
                      </option>
                    ))}
                  </select>
                  {serviceType && filteredInspectors.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      საჭირო სპეციალობის ინსპექტორი არ მოიძებნა
                    </p>
                  )}
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    სიხშირე (დღეები) *
                  </label>
                  <input
                    type="number"
                    value={service.inspection_frequency_days}
                    onChange={(e) => updateService(index, { 
                      inspection_frequency_days: parseInt(e.target.value) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    პრიორიტეტი
                  </label>
                  <select
                    value={service.priority}
                    onChange={(e) => updateService(index, { 
                      priority: e.target.value as 'low' | 'medium' | 'high' 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">დაბალი</option>
                    <option value="medium">საშუალო</option>
                    <option value="high">მაღალი</option>
                  </select>
                </div>

                {/* Next Inspection Date */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    შემდეგი ინსპექტირების თარიღი
                  </label>
                  <input
                    type="date"
                    value={service.next_inspection_date}
                    onChange={(e) => updateService(index, { next_inspection_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {services.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>სულ სერვისები:</strong> {services.length}
          </p>
        </div>
      )}
    </div>
  );
}
