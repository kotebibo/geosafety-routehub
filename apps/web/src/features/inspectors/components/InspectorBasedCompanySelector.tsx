'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, AlertCircle, User } from 'lucide-react';

interface Inspector {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  status: string;
}

interface CompanyService {
  id: string;
  company_id: string;
  service_type_id: string;
  next_inspection_date: string | null;
  last_inspection_date: string | null;
  priority: string;
  status: string;
  assigned_inspector_id: string | null;
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

interface InspectorBasedCompanySelectorProps {
  selectedInspector: string | null;
  onInspectorChange: (inspectorId: string | null) => void;
  selectedServices: CompanyService[];
  onServiceToggle: (service: CompanyService) => void;
}

export default function InspectorBasedCompanySelector({
  selectedInspector,
  onInspectorChange,
  selectedServices,
  onServiceToggle,
}: InspectorBasedCompanySelectorProps) {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [companyServices, setCompanyServices] = useState<CompanyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Load all active inspectors on mount
  useEffect(() => {
    loadInspectors();
  }, []);

  // Load companies when inspector changes
  useEffect(() => {
    if (selectedInspector) {
      loadInspectorCompanies();
    } else {
      setCompanyServices([]);
    }
  }, [selectedInspector]);

  const loadInspectors = async () => {
    try {
      const response = await fetch('/api/inspectors?status=active');
      if (!response.ok) throw new Error('Failed to load inspectors');
      const data = await response.json();
      console.log('👥 Inspectors loaded:', data.length);
      setInspectors(data);
    } catch (error) {
      console.error('Error loading inspectors:', error);
    }
  };

  const loadInspectorCompanies = async () => {
    if (!selectedInspector) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/company-services?inspector_id=${selectedInspector}&status=active`
      );
      if (!response.ok) throw new Error('Failed to load companies');
      const data = await response.json();
      console.log('🏢 Companies loaded for inspector:', data.length);
      setCompanyServices(data);
    } catch (error) {
      console.error('Error loading companies:', error);
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
    if (days < 0) return 'text-red-600';
    if (days <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUrgencyBg = (days: number | null) => {
    if (days === null) return 'bg-gray-50';
    if (days < 0) return 'bg-red-50 border-red-200';
    if (days <= 7) return 'bg-yellow-50 border-yellow-200';
    return 'bg-white';
  };

  // Get unique service types from companies
  const serviceTypes = Array.from(
    new Set(companyServices.map(s => s.service_type.name_ka))
  );

  // Filter company services
  const filteredServices = companyServices.filter(service => {
    const matchesSearch = 
      service.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.company.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesServiceType = 
      serviceTypeFilter === 'all' || 
      service.service_type.name_ka === serviceTypeFilter;

    const days = getDaysUntilInspection(service.next_inspection_date);
    const matchesOverdue = !overdueOnly || (days !== null && days < 0);

    return matchesSearch && matchesServiceType && matchesOverdue;
  });

  // Sort by urgency
  const sortedServices = [...filteredServices].sort((a, b) => {
    const daysA = getDaysUntilInspection(a.next_inspection_date);
    const daysB = getDaysUntilInspection(b.next_inspection_date);
    
    if (daysA !== null && daysA < 0 && (daysB === null || daysB >= 0)) return -1;
    if (daysB !== null && daysB < 0 && (daysA === null || daysA >= 0)) return 1;
    
    if (daysA === null) return 1;
    if (daysB === null) return -1;
    return daysA - daysB;
  });

  const isSelected = (service: CompanyService) => {
    return selectedServices.some(s => s.id === service.id);
  };

  const selectedInspectorData = inspectors.find(i => i.id === selectedInspector);

  return (
    <div className="h-full flex flex-col">
      {/* Inspector Selector */}
      <div className="p-4 border-b bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-1" />
          აირჩიეთ ინსპექტორი
        </label>
        <select
          value={selectedInspector || ''}
          onChange={(e) => {
            const value = e.target.value || null;
            console.log('👤 Inspector changed to:', value);
            onInspectorChange(value);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">აირჩიეთ ინსპექტორი...</option>
          {inspectors.map(inspector => (
            <option key={inspector.id} value={inspector.id}>
              {inspector.full_name} ({inspector.specialty})
            </option>
          ))}
        </select>

        {selectedInspectorData && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">{selectedInspectorData.specialty}</span>
            {' • '}
            <span>{selectedInspectorData.email}</span>
          </div>
        )}
      </div>

      {/* Show message if no inspector selected */}
      {!selectedInspector && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">აირჩიეთ ინსპექტორი</p>
            <p className="text-sm mt-2">გამოჩნდება მათზე დანიშნული კომპანიები</p>
          </div>
        </div>
      )}

      {/* Filters and List */}
      {selectedInspector && (
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
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="all">ყველა სერვისი</option>
                {serviceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
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
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>კომპანიები არ მოიძებნა</p>
                <p className="text-sm mt-1">ამ ინსპექტორზე არ არის დანიშნული კომპანიები</p>
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

                          {/* Inspection Date */}
                          <div className={`mt-2 flex items-center gap-1 text-sm ${urgencyColor}`}>
                            <Calendar className="w-4 h-4" />
                            {service.next_inspection_date ? (
                              <>
                                <span>{new Date(service.next_inspection_date).toLocaleDateString('ka-GE')}</span>
                                {days !== null && (
                                  <span className="font-medium">
                                    ({days < 0 ? `${Math.abs(days)} დღით გადაცილებული` : 
                                      days === 0 ? 'დღეს' : 
                                      `${days} დღეში`})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span>თარიღი არ არის მითითებული</span>
                            )}
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selected && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          </div>
                        )}
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
