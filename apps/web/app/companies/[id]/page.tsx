/**
 * Company Details Page
 * View and manage company information, locations, and PDP onboarding
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/ui-monday/Toast'
import { ArrowLeft, MapPin, Building2, Shield, AlertTriangle, ChevronRight } from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import type { CompanyLocation, LocationFormData, CompanyLocationInput } from '@/types/company'
import type { LocationCheckin } from '@/types/checkin'

import { CompanyInfoCard } from './components/CompanyInfoCard'
import { LocationsCard } from './components/LocationsCard'
import { ServicesCard } from './components/ServicesCard'
import { CheckinsCard } from './components/CheckinsCard'

interface Company {
  id: string
  name: string
  address?: string | null
  type: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  priority: string | null
  status: string | null
  notes: string | null
  created_at?: string | null
}

interface CompanyService {
  id: string
  service_type_id: string | null
  inspection_frequency_days: number | null
  assigned_inspector_id: string | null
  priority: string | null
  next_inspection_date: string | null
  last_inspection_date: string | null
  status: string | null
  service_types: {
    name: string
    name_ka: string
  } | null
  inspectors: {
    full_name: string
  } | null
}

function getStatusConfig(
  t: ReturnType<typeof useTranslations>
): Record<string, { label: string; bg: string; text: string; dot: string }> {
  return {
    active: {
      label: t('companies.detail.statusActive'),
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    inactive: {
      label: t('companies.detail.statusInactive'),
      bg: 'bg-bg-tertiary',
      text: 'text-text-secondary',
      dot: 'bg-text-tertiary',
    },
    suspended: {
      label: t('companies.detail.statusSuspended'),
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
  }
}

export default function CompanyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
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
  const [editableLocations, setEditableLocations] = useState<LocationFormData[]>([])

  const fetchCompanyData = useCallback(async () => {
    try {
      const supabase = createClient()
      const [companyResult, locationsData, servicesResult] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        companiesService.locations.getByCompanyId(companyId),
        supabase
          .from('company_services')
          .select(
            `
            *,
            service_types (
              name,
              name_ka
            ),
            inspectors (
              full_name
            )
          `
          )
          .eq('company_id', companyId),
      ])

      if (companyResult.error) throw companyResult.error
      if (servicesResult.error) throw servicesResult.error

      setCompany(companyResult.data)
      setLocations(locationsData)
      setServices(servicesResult.data || [])

      try {
        const checkinRes = await fetch(`/api/checkins?company_id=${companyId}&limit=10`)
        if (checkinRes.ok) {
          setCheckins(await checkinRes.json())
        }
      } catch {
        // silent -- check-ins are not critical
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      showToast(t('companies.detail.loadError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [companyId, showToast, t])

  useEffect(() => {
    fetchCompanyData()
  }, [fetchCompanyData])

  function handleStartEditLocations() {
    setEditableLocations(
      locations.map(loc => ({
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
      }))
    )
    setEditingLocations(true)
  }

  async function handleSaveLocations() {
    if (editableLocations.length === 0) {
      showToast(t('companies.detail.locationRequired'), 'warning')
      return
    }

    setSaving(true)
    try {
      const existingIds = new Set(locations.map(l => l.id))
      const editedIds = new Set(editableLocations.filter(l => l.id).map(l => l.id!))

      const toDelete = locations.filter(l => !editedIds.has(l.id))
      for (const loc of toDelete) {
        await companiesService.locations.delete(loc.id)
      }

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
      showToast(t('companies.detail.locationsUpdated'), 'success')
    } catch (error: any) {
      console.error('Error saving locations:', error)
      showToast(t('companies.detail.saveError', { message: error.message }), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
        <div className="h-5 w-20 bg-bg-tertiary rounded mb-6" />
        <div className="flex items-start gap-6 mb-8">
          <div className="w-14 h-14 bg-bg-tertiary rounded-xl" />
          <div className="flex-1">
            <div className="h-7 w-64 bg-bg-tertiary rounded mb-2" />
            <div className="h-4 w-40 bg-bg-tertiary rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-bg-tertiary rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-bg-tertiary rounded-xl mb-6" />
        <div className="h-48 bg-bg-tertiary rounded-xl" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <Building2 className="w-16 h-16 text-text-disabled mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-text-primary mb-2">
          {t('companies.detail.notFoundTitle')}
        </h1>
        <p className="text-text-tertiary mb-6">{t('companies.detail.notFoundDescription')}</p>
        <button
          onClick={() => router.push('/companies')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('companies.detail.backToCompanies')}
        </button>
      </div>
    )
  }

  const primaryLocation = locations.find(loc => loc.is_primary)
  const statusConfig = getStatusConfig(t)
  const status = statusConfig[company.status ?? 'inactive'] || statusConfig.inactive
  const overdueServices = services.filter(
    s => s.next_inspection_date && new Date(s.next_inspection_date) < new Date()
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-text-tertiary mb-6">
        <button
          onClick={() => router.push('/companies')}
          className="hover:text-text-primary transition-colors"
        >
          {t('companies.detail.breadcrumbCompanies')}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium truncate max-w-[200px]">{company.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-monday-primary to-monday-primary-hover flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-primary truncate">{company.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-tertiary">
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
        <div className="bg-bg-primary border border-border-light rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-monday-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-monday-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{locations.length}</p>
              <p className="text-xs text-text-tertiary">{t('companies.detail.statLocations')}</p>
            </div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border-light rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{services.length}</p>
              <p className="text-xs text-text-tertiary">{t('companies.detail.statServices')}</p>
            </div>
          </div>
        </div>
        <div
          className={`border rounded-xl p-4 ${overdueServices.length > 0 ? 'bg-red-50 border-red-200' : 'bg-bg-primary border-border-light'}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${overdueServices.length > 0 ? 'bg-red-100' : 'bg-bg-secondary'}`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${overdueServices.length > 0 ? 'text-red-600' : 'text-text-tertiary'}`}
              />
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${overdueServices.length > 0 ? 'text-red-700' : 'text-text-primary'}`}
              >
                {overdueServices.length}
              </p>
              <p
                className={`text-xs ${overdueServices.length > 0 ? 'text-red-600' : 'text-text-tertiary'}`}
              >
                {t('companies.detail.statOverdue')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <CompanyInfoCard company={company} />

      {/* Locations */}
      <LocationsCard
        locations={locations}
        editingLocations={editingLocations}
        editableLocations={editableLocations}
        saving={saving}
        onStartEdit={handleStartEditLocations}
        onSave={handleSaveLocations}
        onCancel={() => setEditingLocations(false)}
        onEditableLocationsChange={setEditableLocations}
      />

      {/* Services */}
      <ServicesCard
        services={services}
        companyId={companyId}
        editingServices={editingServices}
        onStartEdit={() => setEditingServices(true)}
        onFinish={() => {
          setEditingServices(false)
          fetchCompanyData()
          showToast(t('companies.detail.servicesUpdated'), 'success')
        }}
        onCancel={() => {
          setEditingServices(false)
          fetchCompanyData()
        }}
      />

      {/* Recent Check-ins */}
      <CheckinsCard checkins={checkins} />
    </div>
  )
}
