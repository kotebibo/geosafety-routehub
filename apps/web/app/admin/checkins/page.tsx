'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/shared/components/ui/PageHeader'
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
} from 'lucide-react'
import type { LocationCheckin } from '@/types/checkin'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}სთ ${m}წთ` : `${h}სთ`
}

export default function AdminCheckinsPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()

  const [checkins, setCheckins] = useState<LocationCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    companyId: '',
    inspectorId: '',
  })
  const [showFilters, setShowFilters] = useState(false)

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
      if (filters.inspectorId) params.set('inspector_id', filters.inspectorId)

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const todayCount = checkins.filter((c) => {
    const today = new Date().toISOString().slice(0, 10)
    return c.created_at.startsWith(today)
  }).length

  const locationUpdatedCount = checkins.filter((c) => c.location_updated).length
  const activeCount = checkins.filter((c) => !c.checked_out_at).length
  const completedWithDuration = checkins.filter((c) => c.duration_minutes != null && c.duration_minutes > 0)
  const avgDuration = completedWithDuration.length > 0
    ? Math.round(completedWithDuration.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) / completedWithDuration.length)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="ჩეკ-ინების ისტორია"
        description="ინსპექტორების ლოკაციის ჩეკ-ინები"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6161FF]/10 flex items-center justify-center">
                <MapPinned className="w-5 h-5 text-[#6161FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{checkins.length}</p>
                <p className="text-xs text-gray-500">სულ ჩეკ-ინი</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
                <p className="text-xs text-gray-500">დღეს</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Timer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-xs text-gray-500">აქტიური</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {avgDuration != null ? formatDuration(avgDuration) : '—'}
                </p>
                <p className="text-xs text-gray-500">საშ. ხანგრძლივობა</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>ფილტრები</span>
          </button>
          <button
            type="button"
            onClick={loadCheckins}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>განახლება</span>
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">თარიღიდან</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">თარიღამდე</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setFilters({ fromDate: '', toDate: '', companyId: '', inspectorId: '' })}
                className="text-sm text-gray-500 hover:text-gray-700 mr-3"
              >
                გასუფთავება
              </button>
              <button
                type="button"
                onClick={loadCheckins}
                className="px-4 py-1.5 text-sm bg-[#6161FF] text-white rounded-lg hover:bg-[#5050DD] transition-colors"
              >
                ძებნა
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 bg-gray-100 rounded" />
                      <div className="h-3 w-28 bg-gray-100 rounded" />
                    </div>
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : checkins.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <MapPinned className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">ჩეკ-ინები არ მოიძებნა</h3>
              <p className="text-sm text-gray-500">ინსპექტორების ჩეკ-ინები გამოჩნდება აქ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">ჩეკ-ინი</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">ჩეკ-აუთი</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">ხანგრძლივობა</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">ინსპექტორი</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">კომპანია</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">ლოკაცია</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">მანძილი</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checkins.map((checkin) => (
                    <tr key={checkin.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {new Date(checkin.created_at).toLocaleDateString('ka-GE')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(checkin.created_at).toLocaleTimeString('ka-GE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {checkin.checked_out_at ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(checkin.checked_out_at).toLocaleDateString('ka-GE')}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(checkin.checked_out_at).toLocaleTimeString('ka-GE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                            <Timer className="w-3 h-3" />
                            აქტიური
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {checkin.duration_minutes != null ? (
                          <span className={`text-sm font-medium ${
                            checkin.duration_minutes < 60
                              ? 'text-green-600'
                              : checkin.duration_minutes < 180
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}>
                            {formatDuration(checkin.duration_minutes)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#6161FF]/10 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-[#6161FF]" />
                          </div>
                          <span className="text-sm text-gray-900">{checkin.inspector_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{checkin.company_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {checkin.location_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {checkin.distance_from_location != null ? (
                          <span className={`text-sm font-medium ${
                            checkin.distance_from_location < 100
                              ? 'text-green-600'
                              : checkin.distance_from_location < 500
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}>
                            {checkin.distance_from_location}მ
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {checkin.location_updated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            <Navigation className="w-3 h-3" />
                            GPS განახლდა
                          </span>
                        ) : checkin.notes ? (
                          <span className="text-xs text-gray-500 max-w-[120px] truncate block" title={checkin.notes}>
                            {checkin.notes}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            <Check className="w-3 h-3" />
                            ჩეკ-ინი
                          </span>
                        )}
                      </td>
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
