/**
 * Service Types Management Page
 * Admin page to manage all service types
 */

'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { DEPLOYMENT_CONFIG } from '@/config/features'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'
import { ServiceTypesSkeleton } from '@/features/admin/components/ServiceTypesSkeleton'

interface ServiceType {
  id: string
  name: string
  name_ka: string
  description: string
  required_inspector_type: string
  default_frequency_days: number
  is_active: boolean
}

const INSPECTOR_TYPES = [
  { value: 'fire_safety', labelKey: 'admin.serviceTypes.inspectorTypes.fireSafety' },
  { value: 'health', labelKey: 'admin.serviceTypes.inspectorTypes.health' },
  { value: 'building', labelKey: 'admin.serviceTypes.inspectorTypes.building' },
  { value: 'electrical', labelKey: 'admin.serviceTypes.inspectorTypes.electrical' },
  { value: 'food_safety', labelKey: 'admin.serviceTypes.inspectorTypes.foodSafety' },
  { value: 'environmental', labelKey: 'admin.serviceTypes.inspectorTypes.environmental' },
  { value: 'occupational', labelKey: 'admin.serviceTypes.inspectorTypes.occupational' },
  { value: 'general', labelKey: 'admin.serviceTypes.inspectorTypes.general' },
]

export default function ServiceTypesPage() {
  const t = useTranslations()
  const router = useRouter()
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState<Partial<ServiceType>>({
    name: '',
    name_ka: '',
    description: '',
    required_inspector_type: 'general',
    default_frequency_days: 90,
    is_active: true,
  })

  // Redirect if in single-service mode
  useEffect(() => {
    if (DEPLOYMENT_CONFIG.isSingleServiceMode) {
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    fetchServiceTypes()
  }, [supabase])

  async function fetchServiceTypes() {
    if (!supabase) return
    try {
      const response = await fetch('/api/service-types')
      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()
      setServiceTypes(data || [])
    } catch (error) {
      console.error('Error fetching service types:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      if (editingId) {
        // Update existing
        const response = await fetch('/api/service-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        })

        if (!response.ok) throw new Error('Failed to update')
      } else {
        // Create new
        const response = await fetch('/api/service-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (!response.ok) throw new Error('Failed to create')
      }

      await fetchServiceTypes()
      resetForm()
    } catch (error) {
      console.error('Error saving service type:', error)
      alert(t('admin.serviceTypes.saveError'))
    }
  }

  async function handleDelete(id: string) {
    if (!supabase) return
    if (!confirm(t('admin.serviceTypes.deleteConfirm'))) return
    try {
      const response = await fetch(`/api/service-types?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')
      await fetchServiceTypes()
    } catch (error) {
      console.error('Error deleting service type:', error)
      alert(t('admin.serviceTypes.deleteError'))
    }
  }

  function startEdit(serviceType: ServiceType) {
    setEditingId(serviceType.id)
    setFormData(serviceType)
    setIsAddingNew(false)
  }

  function startAdd() {
    setIsAddingNew(true)
    setEditingId(null)
    setFormData({
      name: '',
      name_ka: '',
      description: '',
      required_inspector_type: 'general',
      default_frequency_days: 90,
      is_active: true,
    })
  }

  function resetForm() {
    setEditingId(null)
    setIsAddingNew(false)
    setFormData({
      name: '',
      name_ka: '',
      description: '',
      required_inspector_type: 'general',
      default_frequency_days: 90,
      is_active: true,
    })
  }

  if (loading) {
    return <ServiceTypesSkeleton />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {t('admin.serviceTypes.pageTitle')}
          </h1>
          <p className="text-text-secondary mt-1">{t('admin.serviceTypes.pageDescription')}</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 bg-monday-primary text-white px-4 py-2 rounded-lg hover:bg-monday-primary-hover transition"
        >
          <Plus size={20} />
          {t('admin.serviceTypes.addNew')}
        </button>
      </div>

      {(isAddingNew || editingId) && (
        <div className="bg-bg-primary border-2 border-monday-primary rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? t('admin.serviceTypes.editTitle') : t('admin.serviceTypes.addTitle')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('admin.serviceTypes.nameEnglish')}
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-monday-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('admin.serviceTypes.nameGeorgian')}
              </label>
              <input
                type="text"
                value={formData.name_ka || ''}
                onChange={e => setFormData({ ...formData, name_ka: e.target.value })}
                className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-monday-primary"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('admin.serviceTypes.description')}
              </label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border-medium rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('admin.serviceTypes.requiredInspectorType')}
              </label>
              <Select
                value={formData.required_inspector_type || 'general'}
                onValueChange={v => setFormData({ ...formData, required_inspector_type: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTOR_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('admin.serviceTypes.frequencyDays')}
              </label>
              <input
                type="number"
                value={formData.default_frequency_days || 90}
                onChange={e =>
                  setFormData({ ...formData, default_frequency_days: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-border-medium rounded-lg"
                min="1"
              />
            </div>
            <div className="col-span-2 flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-monday-primary"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-text-primary">
                {t('admin.serviceTypes.active')}
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Save size={18} />
              {t('admin.serviceTypes.save')}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              <X size={18} />
              {t('admin.serviceTypes.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-bg-primary rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-border-light">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('admin.serviceTypes.tableService')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('admin.serviceTypes.description')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('admin.serviceTypes.tableInspectorType')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('admin.serviceTypes.tableFrequency')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('admin.serviceTypes.tableStatus')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">
                {t('admin.serviceTypes.tableActions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-bg-primary divide-y divide-border-light">
            {serviceTypes.map(st => (
              <tr key={st.id} className="hover:bg-bg-secondary">
                <td className="px-6 py-4">
                  <div className="font-medium text-text-primary">{st.name_ka}</div>
                  <div className="text-sm text-text-secondary">{st.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{st.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-monday-primary/10 text-monday-primary">
                    {(() => {
                      const inspectorType = INSPECTOR_TYPES.find(
                        it => it.value === st.required_inspector_type
                      )
                      return inspectorType ? t(inspectorType.labelKey) : null
                    })()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {st.default_frequency_days} {t('admin.serviceTypes.daysSuffix')}
                </td>
                <td className="px-6 py-4">
                  {st.is_active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-color-success/10 text-color-success">
                      {t('admin.serviceTypes.active')}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-secondary">
                      {t('admin.serviceTypes.inactive')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(st)}
                      className="text-monday-primary hover:text-monday-primary-hover"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(st.id)}
                      className="text-color-error hover:opacity-80"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {serviceTypes.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            {t('admin.serviceTypes.noServicesFound')}
          </div>
        )}
      </div>
    </div>
  )
}
