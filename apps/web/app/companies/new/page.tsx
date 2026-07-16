/**
 * Create New Company Page
 * Allows creating a company with multiple locations
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Save, X } from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import { LocationManager } from '@/features/companies/components/LocationManager'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'
import type { LocationFormData, CompanyLocationInput } from '@/types/company'

export default function NewCompanyPage() {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)

  // Company basic info
  const [formData, setFormData] = useState({
    name: '',
    type: 'commercial',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    priority: 'medium',
    status: 'active',
    notes: '',
  })

  // Locations state
  const [locations, setLocations] = useState<LocationFormData[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate: at least one location required
    if (locations.length === 0) {
      alert(t('companies.form.locationRequired'))
      return
    }

    // Validate: must have a primary location
    if (!locations.some(loc => loc.is_primary)) {
      alert(t('companies.form.primaryLocationRequired'))
      return
    }

    setLoading(true)

    try {
      // Prepare locations for API
      const locationsForApi: CompanyLocationInput[] = locations.map(loc => ({
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

      // Create company with locations
      await companiesService.createWithLocations(
        {
          name: formData.name,
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
        },
        locationsForApi
      )

      alert(t('companies.form.createSuccess'))
      router.push('/companies')
    } catch (error: any) {
      console.error('Error creating company:', error)
      alert(t('companies.form.createError', { message: error.message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">{t('companies.form.pageTitle')}</h1>
          <p className="text-text-secondary mt-1">{t('companies.form.pageDescription')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Basic Information */}
          <div className="bg-bg-primary rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              {t('companies.form.basicInfo')}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.type')}
                </label>
                <Select
                  value={formData.type}
                  onValueChange={v => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">{t('companies.form.typeCommercial')}</SelectItem>
                    <SelectItem value="residential">
                      {t('companies.form.typeResidential')}
                    </SelectItem>
                    <SelectItem value="industrial">{t('companies.form.typeIndustrial')}</SelectItem>
                    <SelectItem value="healthcare">{t('companies.form.typeHealthcare')}</SelectItem>
                    <SelectItem value="education">{t('companies.form.typeEducation')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.priority')}
                </label>
                <Select
                  value={formData.priority}
                  onValueChange={v => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('companies.form.priorityLow')}</SelectItem>
                    <SelectItem value="medium">{t('companies.form.priorityMedium')}</SelectItem>
                    <SelectItem value="high">{t('companies.form.priorityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Locations Section */}
          <div className="bg-bg-primary rounded-lg shadow p-6">
            <LocationManager locations={locations} onChange={setLocations} />
          </div>

          {/* Contact Information (Company-level, optional) */}
          <div className="bg-bg-primary rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              {t('companies.form.contactInfo')}
              <span className="text-sm font-normal text-text-secondary ml-2">
                ({t('companies.form.optional')})
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.contactName')}
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.contactPhone')}
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.contactEmail')}
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('companies.form.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? t('companies.form.saving') : t('companies.form.save')}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
            >
              <X size={20} />
              {t('companies.form.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
