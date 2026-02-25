/**
 * Company Details Page
 * View and manage company information, locations, and PDP onboarding
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import PDPOnboardingManager from '@/components/PDPOnboardingManager'
import LocationManager from '@/features/companies/components/LocationManager'
import { useToast } from '@/components/ui-monday/Toast'
import {
  Save,
  ArrowLeft,
  Edit2,
  MapPin,
  MapPinned,
  Building2,
  Phone,
  Mail,
  User,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronRight,
  X,
  Shield,
  Navigation,
} from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import type { CompanyLocation, LocationFormData, CompanyLocationInput } from '@/types/company'
import type { LocationCheckin } from '@/types/checkin'

interface Company {
  id: string
  name: string
  address?: string
  type: string
  contact_name: string
  contact_phone: string
  contact_email: string
  priority: string
  status: string
  notes: string
  created_at?: string
}

interface CompanyService {
  id: string
  service_type_id: string
  inspection_frequency_days: number
  assigned_inspector_id: string | null
  priority: 'low' | 'medium' | 'high'
  next_inspection_date: string
  last_inspection_date: string | null
  status: string
  service_types: {
    name: string
    name_ka: string
  }
  inspectors: {
    full_name: string
  } | null
}

const priorityConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  high: { label: 'მაღალი', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { label: 'საშუალო', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { label: 'დაბალი', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'აქტიური', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive: { label: 'არააქტიური', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  suspended: { label: 'შეჩერებული', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

export default function CompanyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [services, setServices] = useState<CompanyService[]>([])
  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [checkins, setCheckins] = useState<LocationCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLocations, setEditingLocations] = useState(false)
  const [editingServices, setEditingServices] = useState(false)
  const [saving, setSaving] = useState(false)

  // For location editing
  const [editableLocations, setEditableLocations] = useState<LocationFormData[]>([])

  const fetchCompanyData = useCallback(async () => {
    try {
      const supabase = createClient()
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
      ])

      if (companyResult.error) throw companyResult.error
      if (servicesResult.error) throw servicesResult.error

      setCompany(companyResult.data)
      setLocations(locationsData)
      setServices(servicesResult.data || [])

      // Load recent check-ins for this company
      try {
        const checkinRes = await fetch(`/api/checkins?company_id=${companyId}&limit=10`)
        if (checkinRes.ok) {
          setCheckins(await checkinRes.json())
        }
      } catch {
        // silent — check-ins are not critical
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      showToast('შეცდომა მონაცემების ჩატვირთვისას', 'error')
    } finally {
      setLoading(false)
    }
  }, [companyId, showToast])

  useEffect(() => {
    fetchCompanyData()
  }, [fetchCompanyData])

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
    })))
    setEditingLocations(true)
  }

  // Smart location save: update existing, create new, delete removed
  async function handleSaveLocations() {
    if (editableLocations.length === 0) {
      showToast('გთხოვთ დაამატოთ მინიმუმ ერთი ლოკაცია', 'warning')
      return
    }

    setSaving(true)
    try {
      const existingIds = new Set(locations.map(l => l.id))
      const editedIds = new Set(editableLocations.filter(l => l.id).map(l => l.id!))

      // Delete removed locations
      const toDelete = locations.filter(l => !editedIds.has(l.id))
      for (const loc of toDelete) {
        await companiesService.locations.delete(loc.id)
      }

      // Update existing locations
      for (const loc of editableLocations) {
        if (loc.id && existingIds.has(loc.id)) {
          await companiesService.locations.update(loc.id, {
            name: loc.name,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            is_primary: loc.is_primary,
            contact_name: loc.contact_name || null,
            contact_phone: loc.contact_phone || null,
            contact_email: loc.contact_email || null,
            notes: loc.notes || null,
          })
        }
      }

      // Create new locations
      const newLocations = editableLocations.filter(l => !l.id)
      if (newLocations.length > 0) {
        const locationsForApi: CompanyLocationInput[] = newLocations.map(loc => ({
          name: loc.name,
          address: loc.address,
          lat: loc.lat,
          lng: loc.lng,
          is_primary: loc.is_primary,
          contact_name: loc.contact_name || null,
          contact_phone: loc.contact_phone || null,
          contact_email: loc.contact_email || null,
          notes: loc.notes || null,
        }))
        await companiesService.locations.createMany(companyId, locationsForApi)
      }

      await fetchCompanyData()
      setEditingLocations(false)
      showToast('ლოკაციები წარმატებით განახლდა', 'success')
    } catch (error: any) {
      console.error('Error saving locations:', error)
      showToast('შეცდომა: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function isOverdue(nextDate: string | null): boolean {
    if (!nextDate) return false
    return new Date(nextDate) < new Date()
  }

  function daysUntil(date: string): number {
    const diff = new Date(date).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
        <div className="h-5 w-20 bg-gray-200 rounded mb-6" />
        <div className="flex items-start gap-6 mb-8">
          <div className="w-14 h-14 bg-gray-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl mb-6" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">კომპანია არ მოიძებნა</h1>
        <p className="text-gray-500 mb-6">მოთხოვნილი კომპანია არ არსებობს ან წაშლილია</p>
        <button
          onClick={() => router.push('/companies')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6161FF] text-white rounded-lg hover:bg-[#4f4fd9] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          კომპანიებზე დაბრუნება
        </button>
      </div>
    )
  }

  const primaryLocation = locations.find(loc => loc.is_primary)
  const status = statusConfig[company.status] || statusConfig.inactive
  const priority = priorityConfig[company.priority] || priorityConfig.low
  const overdueServices = services.filter(s => isOverdue(s.next_inspection_date))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <button
          onClick={() => router.push('/companies')}
          className="hover:text-gray-900 transition-colors"
        >
          კომპანიები
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{company.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6161FF] to-[#4747cc] flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{company.name}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {primaryLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {primaryLocation.address}
              </span>
            )}
            {company.type && (
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                {company.type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
              <p className="text-xs text-gray-500">ლოკაცია</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
              <p className="text-xs text-gray-500">სერვისი</p>
            </div>
          </div>
        </div>
        <div className={`border rounded-xl p-4 ${overdueServices.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overdueServices.length > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
              <AlertTriangle className={`w-5 h-5 ${overdueServices.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${overdueServices.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>{overdueServices.length}</p>
              <p className={`text-xs ${overdueServices.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>ვადაგადაცილებული</p>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4.5 h-4.5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">ძირითადი ინფორმაცია</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            <InfoField
              icon={<Shield className="w-4 h-4" />}
              label="ტიპი"
              value={company.type || '—'}
            />
            <InfoField
              icon={<AlertTriangle className="w-4 h-4" />}
              label="პრიორიტეტი"
              badge={
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                  {priority.label}
                </span>
              }
            />
            {company.contact_name && (
              <InfoField
                icon={<User className="w-4 h-4" />}
                label="საკონტაქტო პირი"
                value={company.contact_name}
              />
            )}
            {company.contact_phone && (
              <InfoField
                icon={<Phone className="w-4 h-4" />}
                label="ტელეფონი"
                value={company.contact_phone}
                href={`tel:${company.contact_phone}`}
              />
            )}
            {company.contact_email && (
              <InfoField
                icon={<Mail className="w-4 h-4" />}
                label="ელ. ფოსტა"
                value={company.contact_email}
                href={`mailto:${company.contact_email}`}
              />
            )}
            {company.created_at && (
              <InfoField
                icon={<Calendar className="w-4 h-4" />}
                label="დამატების თარიღი"
                value={new Date(company.created_at).toLocaleDateString('ka-GE')}
              />
            )}
          </div>
          {company.notes && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">შენიშვნები</p>
              <p className="text-sm text-gray-700 leading-relaxed">{company.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Locations Card */}
      <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">ლოკაციები</h2>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
              {locations.length}
            </span>
          </div>
          {!editingLocations && (
            <button
              onClick={handleStartEditLocations}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              რედაქტირება
            </button>
          )}
        </div>

        <div className="p-6">
          {editingLocations ? (
            <div>
              <LocationManager
                locations={editableLocations}
                onChange={setEditableLocations}
              />
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveLocations}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#6161FF] text-white text-sm font-medium rounded-lg hover:bg-[#4f4fd9] disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'ინახება...' : 'შენახვა'}
                </button>
                <button
                  onClick={() => setEditingLocations(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  გაუქმება
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.length === 0 ? (
                <div className="text-center py-10">
                  <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4">ლოკაციები არ არის დამატებული</p>
                  <button
                    onClick={handleStartEditLocations}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-[#6161FF] text-white rounded-lg hover:bg-[#4f4fd9] transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    ლოკაციის დამატება
                  </button>
                </div>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      location.is_primary
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-gray-150 bg-gray-50/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        location.is_primary ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        <MapPin className={`w-4 h-4 ${location.is_primary ? 'text-amber-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-gray-900 text-sm">{location.name}</span>
                          {location.is_primary && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                              მთავარი
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{location.address}</p>
                        {(location.contact_phone || location.contact_email || location.contact_name) && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {location.contact_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {location.contact_name}
                              </span>
                            )}
                            {location.contact_phone && (
                              <a href={`tel:${location.contact_phone}`} className="flex items-center gap-1 hover:text-gray-700">
                                <Phone className="w-3 h-3" />
                                {location.contact_phone}
                              </a>
                            )}
                            {location.contact_email && (
                              <a href={`mailto:${location.contact_email}`} className="flex items-center gap-1 hover:text-gray-700">
                                <Mail className="w-3 h-3" />
                                {location.contact_email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Services Card */}
      <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">სერვისები</h2>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
              {services.length}
            </span>
          </div>
          {!editingServices && (
            <button
              onClick={() => setEditingServices(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              რედაქტირება
            </button>
          )}
        </div>

        <div className="p-6">
          {editingServices ? (
            <div>
              <PDPOnboardingManager
                companyId={companyId}
                onPhaseChange={(phases, currentPhase) => {
                  console.log('Phases updated:', phases, 'Current phase:', currentPhase)
                }}
              />
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setEditingServices(false)
                    fetchCompanyData()
                    showToast('სერვისები განახლდა', 'success')
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-[#6161FF] text-white text-sm font-medium rounded-lg hover:bg-[#4f4fd9] transition-colors"
                >
                  <Save className="w-4 h-4" />
                  დასრულება
                </button>
                <button
                  onClick={() => {
                    setEditingServices(false)
                    fetchCompanyData()
                  }}
                  className="flex items-center gap-2 px-5 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  გაუქმება
                </button>
              </div>
            </div>
          ) : (
            <div>
              {services.length === 0 ? (
                <div className="text-center py-10">
                  <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4">სერვისები არ არის დამატებული</p>
                  <button
                    onClick={() => setEditingServices(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-[#6161FF] text-white rounded-lg hover:bg-[#4f4fd9] transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    სერვისის დამატება
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => {
                    const overdue = isOverdue(service.next_inspection_date)
                    const days = service.next_inspection_date ? daysUntil(service.next_inspection_date) : null
                    const sPriority = priorityConfig[service.priority] || priorityConfig.low

                    return (
                      <div
                        key={service.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          overdue
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-gray-150 bg-gray-50/50 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-2">
                              <h3 className="font-semibold text-gray-900 text-sm">
                                {service.service_types?.name_ka || service.service_types?.name}
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sPriority.bg} ${sPriority.text}`}>
                                <span className={`w-1 h-1 rounded-full ${sPriority.dot}`} />
                                {sPriority.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-5 text-xs text-gray-500">
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {service.inspectors?.full_name || (
                                  <span className="text-amber-600">არ არის მინიჭებული</span>
                                )}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                ყოველ {service.inspection_frequency_days} დღეში
                              </span>
                            </div>
                          </div>

                          {/* Next inspection date */}
                          <div className="text-right flex-shrink-0">
                            {service.next_inspection_date ? (
                              <div>
                                <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                                  {new Date(service.next_inspection_date).toLocaleDateString('ka-GE')}
                                </p>
                                <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                  {overdue
                                    ? `${Math.abs(days!)} დღით ვადაგადაცილებული`
                                    : days === 0
                                      ? 'დღეს'
                                      : `${days} დღეში`
                                  }
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">არ არის დაგეგმილი</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Check-ins Card */}
      {checkins.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <MapPinned className="w-4.5 h-4.5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">ბოლო ჩეკ-ინები</h2>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
              {checkins.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="px-6 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  checkin.location_updated
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <MapPinned className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{checkin.inspector_name}</span>
                    {checkin.location_name && (
                      <span className="text-xs text-gray-400">— {checkin.location_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>
                      {new Date(checkin.created_at).toLocaleDateString('ka-GE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {checkin.distance_from_location != null && (
                      <span className={`font-medium ${
                        checkin.distance_from_location < 100
                          ? 'text-green-600'
                          : checkin.distance_from_location < 500
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}>
                        {checkin.distance_from_location}მ
                      </span>
                    )}
                  </div>
                </div>
                {checkin.location_updated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                    <Navigation className="w-3 h-3" />
                    GPS განახლდა
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable info field component
interface InfoFieldProps {
  icon: React.ReactNode
  label: string
  value?: string
  badge?: React.ReactNode
  href?: string
}

function InfoField({ icon, label, value, badge, href }: InfoFieldProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {badge || (
        href ? (
          <a href={href} className="text-sm font-medium text-[#6161FF] hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900">{value}</p>
        )
      )}
    </div>
  )
}
