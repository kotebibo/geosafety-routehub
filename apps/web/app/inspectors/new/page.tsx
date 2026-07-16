'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'

export default function NewInspectorPage() {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialty: '',
    role: 'officer',
    zone: '',
    status: 'active',
    working_hours_start: '08:00',
    working_hours_end: '17:00',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        working_hours: {
          start: formData.working_hours_start,
          end: formData.working_hours_end,
        },
      }

      const response = await fetch('/api/inspectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to create inspector')

      alert(t('inspectors.new.createSuccess'))
      router.push('/inspectors')
    } catch (error) {
      console.error('Error creating inspector:', error)
      alert(t('inspectors.new.createError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/inspectors"
            className="inline-flex items-center text-monday-primary hover:text-monday-primary-hover mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('inspectors.new.backToInspectors')}
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">{t('inspectors.new.title')}</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-bg-primary rounded-lg shadow-sm p-6">
          {/* Basic Information */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t('inspectors.new.basicInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.fullNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder={t('inspectors.new.fullNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.emailLabel')}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder="giorgi@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.phoneLabel')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder="+995 555 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.zoneLabel')}
                </label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={e => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder={t('inspectors.new.zonePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Specialty & Role */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t('inspectors.new.specialtyAndRole')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.specialtyLabel')}
                </label>
                <Select
                  required
                  value={formData.specialty || undefined}
                  onValueChange={v => setFormData({ ...formData, specialty: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('inspectors.new.specialtyPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fire_safety">
                      {t('inspectors.new.specialty.fireSafety')}
                    </SelectItem>
                    <SelectItem value="health">{t('inspectors.new.specialty.health')}</SelectItem>
                    <SelectItem value="building_code">
                      {t('inspectors.new.specialty.buildingCode')}
                    </SelectItem>
                    <SelectItem value="electrical">
                      {t('inspectors.new.specialty.electrical')}
                    </SelectItem>
                    <SelectItem value="environmental">
                      {t('inspectors.new.specialty.environmental')}
                    </SelectItem>
                    <SelectItem value="plumbing">
                      {t('inspectors.new.specialty.plumbing')}
                    </SelectItem>
                    <SelectItem value="hvac">{t('inspectors.new.specialty.hvac')}</SelectItem>
                    <SelectItem value="general">{t('inspectors.new.specialty.general')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.roleLabel')}
                </label>
                <Select
                  required
                  value={formData.role}
                  onValueChange={v => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="officer">{t('inspectors.new.role.officer')}</SelectItem>
                    <SelectItem value="dispatcher">
                      {t('inspectors.new.role.dispatcher')}
                    </SelectItem>
                    <SelectItem value="manager">{t('inspectors.new.role.manager')}</SelectItem>
                    <SelectItem value="admin">{t('inspectors.new.role.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t('inspectors.new.workingHours')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.startLabel')}
                </label>
                <input
                  type="time"
                  required
                  value={formData.working_hours_start}
                  onChange={e => setFormData({ ...formData, working_hours_start: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('inspectors.new.endLabel')}
                </label>
                <input
                  type="time"
                  required
                  value={formData.working_hours_end}
                  onChange={e => setFormData({ ...formData, working_hours_end: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t('inspectors.new.statusLabel')}
            </h2>
            <Select
              value={formData.status}
              onValueChange={v => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('inspectors.new.status.active')}</SelectItem>
                <SelectItem value="inactive">{t('inspectors.new.status.inactive')}</SelectItem>
                <SelectItem value="on_leave">{t('inspectors.new.status.onLeave')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Link
              href="/inspectors"
              className="px-4 py-2 text-text-primary bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors"
            >
              {t('inspectors.new.cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? t('inspectors.new.saving') : t('inspectors.new.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
