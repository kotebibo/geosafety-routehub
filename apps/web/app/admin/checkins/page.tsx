'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { createClient } from '@/lib/supabase'
import {
  MapPinned,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  MapPin,
  Navigation,
  Check,
  ChevronLeft,
  ChevronRight,
  Timer,
  Clock,
  Trash2,
} from 'lucide-react'
import { formatDuration } from '@/lib/geo-utils'
import { formatDate, formatTime } from '@/shared/utils/formatDate'
import { useUsers } from '@/hooks/useUsers'
import { MultiUserPicker } from '@/features/boards/components'
import type { LocationCheckin } from '@/types/checkin'
import { supabase } from '@/lib/supabase/client'

export default function AdminCheckinsPage() {
  const t = useTranslations()
  const { language } = useLanguage()
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()

  const [checkins, setCheckins] = useState<LocationCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    companyId: '',
    inspectorIds: [] as string[],
  })
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [officerPickerOpen, setOfficerPickerOpen] = useState(false)
  const { users } = useUsers()
  const [exporting, setExporting] = useState(false)
  const [csvError, setCsvError] = useState(false)

  const isAllowed = userRole?.role === 'admin' || userRole?.role === 'dispatcher'

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  // Load check-ins
  const loadCheckins = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.fromDate) params.set('from_date', filters.fromDate)
      if (filters.toDate) params.set('to_date', filters.toDate)
      if (filters.companyId) params.set('company_id', filters.companyId)
      if (filters.inspectorIds.length) params.set('inspector_id', filters.inspectorIds.join(','))

      const res = await fetch(`/api/checkins?${params.toString()}`)
      if (res.ok) {
        setCheckins(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (isAllowed) {
      loadCheckins()
    }
  }, [isAllowed, loadCheckins])

  const isAdmin = userRole?.role === 'admin'

  const downloadCSV = () => {
    setExporting(true)
    setCsvError(false)

    try {
      // 1. Define translation-friendly headers
      const headers = [
        t('checkin.page.columnCheckin') || 'Check-in Time',
        t('checkin.page.columnCheckout') || 'Check-out Time',
        t('checkin.page.columnDuration') || 'Duration',
        t('checkin.page.columnOfficer') || 'Officer',
        t('checkin.page.columnService') || 'Service',
        t('checkin.page.columnVisitType') || 'Visit Type',
        t('checkin.page.columnCompanyItem') || 'Company/Item',
        t('checkin.page.columnLocation') || 'Location',
        t('checkin.page.columnDistance') || 'Distance',
        t('checkin.page.columnStatus') || 'Status',
      ]

      // 2. Map visible data rows to match headers
      const rows = visibleCheckins.map(c => {
        const c2 = c as any

        const checkinTime = `${formatDate(c.created_at, language)} ${formatTime(c.created_at, language, { hour: '2-digit', minute: '2-digit' })}`
        const checkoutTime = c.checked_out_at
          ? `${formatDate(c.checked_out_at, language)} ${formatTime(c.checked_out_at, language, { hour: '2-digit', minute: '2-digit' })}`
          : t('checkin.active') || 'Active'
        const duration =
          c.duration_minutes != null ? formatDuration(c.duration_minutes, language) : '—'
        const companyItem = c.company_name || c2.board_item_name || '—'
        const distance =
          c.distance_from_location != null
            ? `${c.distance_from_location}${t('checkin.meters') || 'm'}`
            : '—'
        const status = c.location_updated
          ? t('checkin.page.gpsUpdated') || 'GPS Updated'
          : c.notes || t('checkin.title') || 'Checked In'

        return [
          checkinTime,
          checkoutTime,
          duration,
          c.inspector_name || '—',
          c.service || '—',
          c.checkin_type || '—',
          companyItem,
          c.location_name || '—',
          distance,
          status,
        ].map(field => `"${String(field).replace(/"/g, '""')}"`) // Safe CSV escaping
      })

      // 3. Assemble CSV string
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

      // 4. Download file with UTF-8 BOM so MS Excel opens non-English characters correctly
      const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.setAttribute('download', `checkins-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      setCsvError(true)
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('checkin.confirmDelete'))) return
    try {
      const res = await fetch(`/api/checkins?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCheckins(prev => prev.filter(c => c.id !== id))
      } else {
        alert(t('checkin.deleteFailed'))
      }
    } catch {
      alert(t('checkin.deleteFailed'))
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    )
  }

  const visibleCheckins = search.trim()
    ? checkins.filter(c => {
        const q = search.trim().toLowerCase()
        const c2 = c as any
        return [
          c.inspector_name,
          c.service,
          c.checkin_type,
          c.company_name,
          c2.board_item_name,
          c2.board_name,
          c.location_name,
          c.notes,
        ].some(field => field?.toLowerCase().includes(q))
      })
    : checkins

  const todayCount = visibleCheckins.filter(c => {
    const today = new Date().toISOString().slice(0, 10)
    return c.created_at.startsWith(today)
  }).length

  const locationUpdatedCount = visibleCheckins.filter(c => c.location_updated).length
  const activeCount = visibleCheckins.filter(c => !c.checked_out_at).length
  const completedWithDuration = visibleCheckins.filter(
    c => c.duration_minutes != null && c.duration_minutes > 0
  )
  const avgDuration =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) /
            completedWithDuration.length
        )
      : null

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader title={t('checkin.page.title')} description={t('checkin.page.description')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary rounded-xl border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-monday-primary/10 flex items-center justify-center">
                <MapPinned className="w-5 h-5 text-monday-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{visibleCheckins.length}</p>
                <p className="text-xs text-text-secondary">{t('checkin.page.totalCheckins')}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-primary rounded-xl border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-monday-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-monday-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{todayCount}</p>
                <p className="text-xs text-text-secondary">{t('checkin.page.today')}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-primary rounded-xl border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-color-warning/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-color-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
                <p className="text-xs text-text-secondary">{t('checkin.active')}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-primary rounded-xl border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-color-success/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-color-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {avgDuration != null ? formatDuration(avgDuration, language) : '—'}
                </p>
                <p className="text-xs text-text-secondary">{t('checkin.page.avgDuration')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          {/* Left Side: CSV Export Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary bg-bg-primary border border-border-light rounded-lg hover:bg-bg-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              <span>{t('checkin.page.exportCSV') || 'Export CSV'}</span>
            </button>
            {csvError && (
              <span className="text-xs text-color-error font-medium">
                {t('checkin.page.exportFailed') || 'Failed to export CSV'}
              </span>
            )}
          </div>

          {/* Right Side: Filters and Refresh Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary bg-bg-primary border border-border-light rounded-lg hover:bg-bg-secondary transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{t('checkin.page.filters')}</span>
            </button>
            <button
              type="button"
              onClick={loadCheckins}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary bg-bg-primary border border-border-light rounded-lg hover:bg-bg-secondary transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('checkin.page.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-bg-primary rounded-xl border border-border-light p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {t('checkin.page.fromDate')}
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {t('checkin.page.toDate')}
                </label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {t('checkin.page.officer')}
                </label>
                <button
                  type="button"
                  onClick={() => setOfficerPickerOpen(o => !o)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left border border-border-light rounded-lg bg-bg-primary hover:border-border-medium focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
                >
                  <span
                    className={
                      filters.inspectorIds.length
                        ? 'text-text-primary truncate'
                        : 'text-text-tertiary'
                    }
                  >
                    {filters.inspectorIds.length === 0
                      ? t('checkin.page.allOfficers')
                      : filters.inspectorIds.length === 1
                        ? users.find(u => u.id === filters.inspectorIds[0])?.full_name ||
                          t('checkin.page.officersSelected', { count: 1 })
                        : t('checkin.page.officersSelected', {
                            count: filters.inspectorIds.length,
                          })}
                  </span>
                  <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                </button>
                {officerPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50">
                    <MultiUserPicker
                      value={filters.inspectorIds}
                      onChange={ids => setFilters(f => ({ ...f, inspectorIds: ids }))}
                      onClose={() => setOfficerPickerOpen(false)}
                      placeholder={t('checkin.page.searchOfficers')}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {t('checkin.page.search')}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('checkin.page.searchPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    fromDate: '',
                    toDate: '',
                    companyId: '',
                    inspectorIds: [],
                  })
                  setSearch('')
                }}
                className="text-sm text-text-secondary hover:text-text-primary mr-3"
              >
                {t('checkin.page.clear')}
              </button>
              <button
                type="button"
                onClick={loadCheckins}
                className="px-4 py-1.5 text-sm bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
              >
                {t('common.search')}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-bg-primary rounded-xl border border-border-light overflow-hidden">
          {loading ? (
            <div className="p-6">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-8 h-8 bg-bg-tertiary rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 bg-bg-tertiary rounded" />
                      <div className="h-3 w-28 bg-bg-tertiary rounded" />
                    </div>
                    <div className="h-3 w-20 bg-bg-tertiary rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : visibleCheckins.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
                <MapPinned className="w-7 h-7 text-text-tertiary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">
                {t('checkin.page.noCheckinsFound')}
              </h3>
              <p className="text-sm text-text-secondary">{t('checkin.page.noCheckinsHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-light bg-bg-secondary/50">
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnCheckin')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnCheckout')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnDuration')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnOfficer')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnService')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnVisitType')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnCompanyItem')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnLocation')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnDistance')}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t('checkin.page.columnStatus')}
                    </th>
                    {isAdmin && <th className="w-10 px-2 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {visibleCheckins.map(checkin => (
                    <tr key={checkin.id} className="hover:bg-bg-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm text-text-primary">
                          {formatDate(checkin.created_at, language)}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {formatTime(checkin.created_at, language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {checkin.checked_out_at ? (
                          <div>
                            <div className="text-sm text-text-primary">
                              {formatDate(checkin.checked_out_at, language)}
                            </div>
                            <div className="text-xs text-text-tertiary">
                              {formatTime(checkin.checked_out_at, language, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-color-warning/10 text-color-warning rounded-full">
                            <Timer className="w-3 h-3" />
                            {t('checkin.active')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {checkin.duration_minutes != null ? (
                          <span
                            className={`text-sm font-medium ${
                              checkin.duration_minutes < 60
                                ? 'text-color-success'
                                : checkin.duration_minutes < 180
                                  ? 'text-color-warning'
                                  : 'text-color-error'
                            }`}
                          >
                            {formatDuration(checkin.duration_minutes, language)}
                          </span>
                        ) : (
                          <span className="text-sm text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-monday-primary/10 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-monday-primary" />
                          </div>
                          <span className="text-sm text-text-primary">
                            {checkin.inspector_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {checkin.service || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {checkin.checkin_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {checkin.company_name ? (
                          <span className="text-sm text-text-primary">{checkin.company_name}</span>
                        ) : (checkin as any).board_item_name ? (
                          <div>
                            <span className="text-sm text-text-primary">
                              {(checkin as any).board_item_name}
                            </span>
                            {(checkin as any).board_name && (
                              <div className="text-xs text-text-tertiary">
                                {(checkin as any).board_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {checkin.location_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {checkin.distance_from_location != null ? (
                          <span
                            className={`text-sm font-medium ${
                              checkin.distance_from_location < 100
                                ? 'text-color-success'
                                : checkin.distance_from_location < 500
                                  ? 'text-color-warning'
                                  : 'text-color-error'
                            }`}
                          >
                            {checkin.distance_from_location}
                            {t('checkin.meters')}
                          </span>
                        ) : (
                          <span className="text-sm text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {checkin.location_updated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-color-success/10 text-color-success rounded-full">
                            <Navigation className="w-3 h-3" />
                            {t('checkin.page.gpsUpdated')}
                          </span>
                        ) : checkin.notes ? (
                          <span
                            className="text-xs text-text-secondary max-w-[120px] truncate block"
                            title={checkin.notes}
                          >
                            {checkin.notes}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-full">
                            <Check className="w-3 h-3" />
                            {t('checkin.title')}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => handleDelete(checkin.id)}
                            title={t('checkin.page.deleteCheckinTooltip')}
                            className="p-1.5 rounded-md hover:bg-color-error/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-color-error" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
