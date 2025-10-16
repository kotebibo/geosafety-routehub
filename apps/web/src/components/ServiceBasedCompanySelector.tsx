'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, AlertCircle } from 'lucide-react';
import { DEPLOYMENT_CONFIG, getEnabledServices, getServiceName } from '@/config/features';
import { FeatureGate, FeatureGateInverse } from '@/components/FeatureGate';

interface ServiceType {
  id: string;
  name: string;
  name_ka: string;
  required_inspector_type: string;
}

interface CompanyService {
  id: string;
  company_id: string;
  service_type_id: string;
  next_inspection_date: string | null;
  last_inspection_date: string | null;
  priority: string;
  status: string;
  company: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  service_type: {
    name: string;
    name_ka: string;
  };
}

interface Props {
  selectedServiceType: string | null;
  onServiceTypeChange: (serviceTypeId: string | null) => void;
  selectedServices: CompanyService[];
  onServiceToggle: (service: CompanyService) => void;
}

export default function ServiceBasedCompanySelector({
  selectedServiceType,
  onServiceTypeChange,
  selectedServices,
  onServiceToggle,
}: Props) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [companyServices, setCompanyServices] = useState<CompanyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    loadServiceTypes();
    
    // Auto-select service in single-service mode
    if (DEPLOYMENT_CONFIG.isSingleServiceMode && serviceTypes.length > 0) {
      const primaryServiceType = serviceTypes.find(
        st => st.name.toLowerCase().includes('personal') || 
              st.name.toLowerCase().includes('data')
      );
      if (primaryServiceType && !selectedServiceType) {
        onServiceTypeChange(primaryServiceType.id);
      }
    }
  }, [serviceTypes.length]);

  useEffect(() => {
    if (selectedServiceType) {
      console.log('🔍 Service type selected:', selectedServiceType);
      loadCompanyServices();
    } else {
      console.log('❌ No service type selected');
    }
  }, [selectedServiceType]);

  const loadServiceTypes = async () => {
    try {
      const response = await fetch('/api/service-types');
      if (!response.ok) throw new Error('Failed to load service types');
      const data = await response.json();
      
      // Filter to enabled services only
      const enabledServices = DEPLOYMENT_CONFIG.isSingleServiceMode
        ? data.filter((st: ServiceType) => 
            st.name.toLowerCase().includes('personal') || 
            st.name.toLowerCase().includes('data')
          )
        : data;
      
      console.log('📋 Service types loaded:', enabledServices.length, 'types');
      setServiceTypes(enabledServices);
    } catch (error) {
      console.error('Error loading service types:', error);
    }
  };

  const loadCompanyServices = async () => {
    if (!selectedServiceType) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/company-services?service_type_id=${selectedServiceType}&status=active`
      );
      if (!response.ok) throw new Error('Failed to load company services');
      const data = await response.json();
      console.log('📊 Company Services loaded:', data.length, 'services');
      console.log('First service:', data[0]);
      setCompanyServices(data);
    } catch (error) {
      console.error('Error loading company services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days until inspection
  const getDaysUntilInspection = (nextDate: string | null) => {
    if (!nextDate) return null;
    const today = new Date();
    const next = new Date(nextDate);
    const diff = Math.floor((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyColor = (days: number | null) => {
    if (days === null) return 'text-gray-500';
    if (days < 0) return 'text-red-600'; // Overdue
    if (days <= 7) return 'text-yellow-600'; // Due soon
    return 'text-green-600'; // Future
  };

  const getUrgencyBg = (days: number | null) => {
    if (days === null) return 'bg-gray-50';
    if (days < 0) return 'bg-red-50 border-red-200'; // Overdue
    if (days <= 7) return 'bg-yellow-50 border-yellow-200'; // Due soon
    return 'bg-white'; // Future
  };

  // Filter company services
  const filteredServices = companyServices.filter(service => {
    // Search filter
    const matchesSearch = 
      service.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.company.address.toLowerCase().includes(searchQuery.toLowerCase());

    // Priority filter
    const matchesPriority = priorityFilter === 'all' || service.priority === priorityFilter;

    // Overdue filter
    const days = getDaysUntilInspection(service.next_inspection_date);
    const matchesOverdue = !overdueOnly || (days !== null && days < 0);

    return matchesSearch && matchesPriority && matchesOverdue;
  });

  // Sort by urgency (overdue first)
  const sortedServices = [...filteredServices].sort((a, b) => {
    const daysA = getDaysUntilInspection(a.next_inspection_date);
    const daysB = getDaysUntilInspection(b.next_inspection_date);
    
    // Overdue first
    if (daysA !== null && daysA < 0 && (daysB === null || daysB >= 0)) return -1;
    if (daysB !== null && daysB < 0 && (daysA === null || daysA >= 0)) return 1;
    
    // Then by days (closest first)
    if (daysA === null) return 1;
    if (daysB === null) return -1;
    return daysA - daysB;
  });

  const isSelected = (service: CompanyService) => {
    return selectedServices.some(s => s.id === service.id);
  };

  // Debug: Log the filtered results
  useEffect(() => {
    console.log('📊 Data state:', {
      companyServices: companyServices.length,
      filteredServices: filteredServices.length,
      sortedServices: sortedServices.length,
      loading,
      selectedServiceType
    });
  }, [companyServices, filteredServices.length, sortedServices.length, loading, selectedServiceType]);

  return (
    <div className="h-full flex flex-col">
      {/* Service Type Selector */}
      <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
        <div className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            აირჩიეთ სერვისის ტიპი
          </label>
          <select
            value={selectedServiceType || ''}
            onChange={(e) => {
              const value = e.target.value || null;
              console.log('🎯 Service type changed to:', value);
              onServiceTypeChange(value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">აირჩიეთ სერვისი...</option>
            {serviceTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name_ka}
              </option>
            ))}
          </select>
        </div>
      </FeatureGate>
      
      {/* Single Service Mode - Show service name */}
      <FeatureGateInverse feature="ENABLE_SERVICE_SELECTOR">
        <div className="p-4 border-b bg-blue-50">
          <div className="text-sm font-medium text-blue-900">
            {DEPLOYMENT_CONFIG.primaryServiceName}
          </div>
        </div>
      </FeatureGateInverse>

      {/* Show message if no service type selected */}
      {!selectedServiceType && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>აირჩიეთ სერვისის ტიპი დასაწყებად</p>
          </div>
        </div>
      )}

      {/* Filters and List */}
      {selectedServiceType && (
        <>
          {/* Filters */}
          <div className="p-4 space-y-3 border-b bg-white">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ყველა პრიორიტეტი</option>
                <option value="high">მაღალი</option>
                <option value="medium">საშუალო</option>
                <option value="low">დაბალი</option>
              </select>

              <button
                onClick={() => setOverdueOnly(!overdueOnly)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  overdueOnly
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                🔴 გადაცილებული
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs text-gray-600">
              <span>სულ: {sortedServices.length}</span>
              <span>არჩეული: {selectedServices.length}</span>
              <span className="text-red-600">
                გადაცილებული: {sortedServices.filter(s => {
                  const days = getDaysUntilInspection(s.next_inspection_date);
                  return days !== null && days < 0;
                }).length}
              </span>
            </div>
          </div>

          {/* Company Services List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p>ჩატვირთვა...</p>
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>კომპანიები არ მოიძებნა</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedServices.map(service => {
                  const days = getDaysUntilInspection(service.next_inspection_date);
                  const urgencyColor = getUrgencyColor(days);
                  const urgencyBg = getUrgencyBg(days);
                  const selected = isSelected(service);

                  return (
                    <div
                      key={service.id}
                      onClick={() => onServiceToggle(service)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${
                        selected ? 'border-l-blue-500 bg-blue-50' : 'border-l-transparent'
                      } ${urgencyBg}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Company Name */}
                          <h4 className="font-semibold text-gray-900 truncate">
                            {service.company.name}
                          </h4>
                          
                          {/* Address */}
                          <p className="text-sm text-gray-600 truncate">
                            {service.company.address}
                          </p>

                          {/* Service Type Badge */}
                          <div className="mt-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              {service.service_type.name_ka}
                            </span>
                          </div>

                          {/* Next Inspection */}
                          {service.next_inspection_date && (
                            <div className={`mt-2 flex items-center gap-1 text-sm ${urgencyColor} font-medium`}>
                              <Calendar className="w-4 h-4" />
                              <span>
                                {days !== null && days < 0 && `${Math.abs(days)} დღით გადაცილებული`}
                                {days !== null && days === 0 && 'დღეს'}
                                {days !== null && days > 0 && days <= 7 && `${days} დღეში`}
                                {days !== null && days > 7 && new Date(service.next_inspection_date).toLocaleDateString('ka-GE')}
                              </span>
                            </div>
                          )}

                          {/* Priority Badge */}
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              service.priority === 'high' ? 'bg-red-100 text-red-800' :
                              service.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {service.priority === 'high' && 'მაღალი'}
                              {service.priority === 'medium' && 'საშუალო'}
                              {service.priority === 'low' && 'დაბალი'}
                            </span>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div className="flex-shrink-0">
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {selected && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
