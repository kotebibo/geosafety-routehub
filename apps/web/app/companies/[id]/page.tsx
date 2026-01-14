/**
 * Company Details Page
 * View and manage company information, locations, and PDP onboarding
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import PDPOnboardingManager from '@/components/PDPOnboardingManager';
import LocationManager from '@/features/companies/components/LocationManager';
import { Save, ArrowLeft, Edit2, Shield, MapPin, Building2 } from 'lucide-react';
import { companiesService } from '@/services/companies.service';
import type { CompanyLocation, LocationFormData, CompanyLocationInput } from '@/types/company';

interface Company {
  id: string;
  name: string;
  address?: string;
  type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  priority: string;
  status: string;
  notes: string;
}

interface CompanyService {
  id: string;
  service_type_id: string;
  inspection_frequency_days: number;
  assigned_inspector_id: string | null;
  priority: 'low' | 'medium' | 'high';
  next_inspection_date: string;
  last_inspection_date: string | null;
  status: string;
  service_types: {
    name: string;
    name_ka: string;
  };
  inspectors: {
    full_name: string;
  } | null;
}

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<CompanyService[]>([]);
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingLocations, setEditingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // For location editing
  const [editableLocations, setEditableLocations] = useState<LocationFormData[]>([]);

  useEffect(() => {
    fetchCompanyData();
  }, [companyId]);

  async function fetchCompanyData() {
    try {
      // Fetch all data in parallel instead of sequentially (3x faster)
      const [companyResult, locationsData, servicesResult] = await Promise.all([
        supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single(),
        companiesService.locations.getByCompanyId(companyId),
        supabase
          .from('company_services')
          .select(`
            *,
            service_types (
              name,
              name_ka
            ),
            inspectors (
              full_name
            )
          `)
          .eq('company_id', companyId),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setCompany(companyResult.data);
      setLocations(locationsData);
      setServices(servicesResult.data || []);
    } catch (error) {
      console.error('Error fetching company:', error);
      alert('შეცდომა მონაცემების ჩატვირთვისას');
    } finally {
      setLoading(false);
    }
  }

  // Start editing locations
  function handleStartEditLocations() {
    setEditableLocations(locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      is_primary: loc.is_primary,
      contact_name: loc.contact_name || '',
      contact_phone: loc.contact_phone || '',
      contact_email: loc.contact_email || '',
      notes: loc.notes || '',
    })));
    setEditingLocations(true);
  }

  // Save locations
  async function handleSaveLocations() {
    if (editableLocations.length === 0) {
      alert('გთხოვთ დაამატოთ მინიმუმ ერთი ლოკაცია');
      return;
    }

    setSaving(true);
    try {
      // Delete all existing locations
      for (const loc of locations) {
        await companiesService.locations.delete(loc.id);
      }

      // Create new locations
      const locationsForApi: CompanyLocationInput[] = editableLocations.map(loc => ({
        name: loc.name,
        address: loc.address,
        lat: loc.lat,
        lng: loc.lng,
        is_primary: loc.is_primary,
        contact_name: loc.contact_name || null,
        contact_phone: loc.contact_phone || null,
        contact_email: loc.contact_email || null,
        notes: loc.notes || null,
      }));

      await companiesService.locations.createMany(companyId, locationsForApi);

      // Refresh data
      await fetchCompanyData();
      setEditingLocations(false);
      alert('ლოკაციები წარმატებით განახლდა!');
    } catch (error: any) {
      console.error('Error saving locations:', error);
      alert('შეცდომა: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveServices(updatedServices: any[]) {
    setSaving(true);
    try {
      const response = await fetch('/api/companies/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          services: updatedServices,
        }),
      });

      if (!response.ok) throw new Error('Failed to save services');

      alert('სერვისები წარმატებით განახლდა!');
      setEditing(false);
      await fetchCompanyData();
    } catch (error: any) {
      console.error('Error saving services:', error);
      alert('შეცდომა: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  function getPriorityBadge(priority: string) {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  }

  function isOverdue(nextDate: string | null): boolean {
    if (!nextDate) return false;
    return new Date(nextDate) < new Date();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">კომპანია არ მოიძებნა</h1>
          <button
            onClick={() => router.push('/companies')}
            className="text-blue-600 hover:text-blue-800"
          >
            უკან დაბრუნება
          </button>
        </div>
      </div>
    );
  }

  const primaryLocation = locations.find(loc => loc.is_primary);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          უკან
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
        {primaryLocation && (
          <p className="text-gray-600 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {primaryLocation.address}
          </p>
        )}
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">ძირითადი ინფორმაცია</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">ტიპი</label>
            <p className="text-gray-900">{company.type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">პრიორიტეტი</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(company.priority)}`}>
              {company.priority === 'high' ? 'მაღალი' : company.priority === 'medium' ? 'საშუალო' : 'დაბალი'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">სტატუსი</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(company.status)}`}>
              {company.status === 'active' ? 'აქტიური' : company.status === 'inactive' ? 'არააქტიური' : 'შეჩერებული'}
            </span>
          </div>

          {company.contact_name && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">საკონტაქტო პირი</label>
              <p className="text-gray-900">{company.contact_name}</p>
            </div>
          )}

          {company.contact_phone && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">ტელეფონი</label>
              <p className="text-gray-900">{company.contact_phone}</p>
            </div>
          )}

          {company.contact_email && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">ელ. ფოსტა</label>
              <p className="text-gray-900">{company.contact_email}</p>
            </div>
          )}

          {company.notes && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">შენიშვნები</label>
              <p className="text-gray-900">{company.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Locations Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">ლოკაციები</h2>
            <span className="text-sm text-gray-500">({locations.length})</span>
          </div>
          {!editingLocations && (
            <button
              onClick={handleStartEditLocations}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Edit2 size={18} />
              რედაქტირება
            </button>
          )}
        </div>

        {editingLocations ? (
          <div>
            <LocationManager
              locations={editableLocations}
              onChange={setEditableLocations}
            />
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={handleSaveLocations}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'მიმდინარეობს...' : 'შენახვა'}
              </button>
              <button
                onClick={() => setEditingLocations(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                გაუქმება
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                ლოკაციები არ არის დამატებული
              </div>
            ) : (
              locations.map((location) => (
                <div
                  key={location.id}
                  className={`border rounded-lg p-4 ${
                    location.is_primary 
                      ? 'border-yellow-400 bg-yellow-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className={`w-5 h-5 mt-0.5 ${location.is_primary ? 'text-yellow-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{location.name}</span>
                        {location.is_primary && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                            მთავარი
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{location.address}</p>
                      {location.contact_phone && (
                        <p className="text-sm text-gray-500 mt-1">📞 {location.contact_phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Services Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">სერვისები</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Edit2 size={18} />
              რედაქტირება
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <PDPOnboardingManager
              companyId={companyId}
              onPhaseChange={(phases, currentPhase) => {
                console.log('Phases updated:', phases, 'Current phase:', currentPhase);
              }}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  setEditing(false);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                შენახვა
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                გაუქმება
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                სერვისები არ არის დამატებული
              </div>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {service.service_types?.name_ka}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(service.priority)}`}>
                          {service.priority === 'high' ? 'მაღალი' : service.priority === 'medium' ? 'საშუალო' : 'დაბალი'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">ინსპექტორი:</span>
                          <p className="font-medium text-gray-900">
                            {service.inspectors?.full_name || 'არ არის მინიჭებული'}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">სიხშირე:</span>
                          <p className="font-medium text-gray-900">
                            {service.inspection_frequency_days} დღე
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">შემდეგი ინსპექტირება:</span>
                          <p className={`font-medium ${isOverdue(service.next_inspection_date) ? 'text-red-600' : 'text-gray-900'}`}>
                            {service.next_inspection_date ? new Date(service.next_inspection_date).toLocaleDateString('ka-GE') : 'არ არის დაგეგმილი'}
                            {isOverdue(service.next_inspection_date) && ' (გადაცილებული)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
