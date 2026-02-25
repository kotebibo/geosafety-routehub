'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useToast } from '@/components/ui-monday/Toast'
import {
  Building2,
  Navigation,
  RefreshCw,
  Crosshair,
  StickyNote,
  Check,
  Clock,
  Loader2,
  AlertCircle,
  ClipboardList,
  Hash,
  Briefcase,
} from 'lucide-react'

interface RecentEntry {
  id: string
  name: string
  data: {
    sk_code?: string
    company_name?: string
    services?: string
    coordinates?: string
    notes?: string
  }
  created_at: string
}

export default function DataCollectionPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data: inspectorId, isLoading: inspectorLoading } = useInspectorId(user?.email)
  const { showToast } = useToast()

  // Form state
  const [skCode, setSkCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [services, setServices] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Recent entries
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'inspector' || currentRole === 'admin' || currentRole === 'dispatcher'

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  // Load recent entries
  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch('/api/data-collection')
        if (res.ok) {
          setRecentEntries(await res.json())
        }
      } catch {
        // silent
      } finally {
        setLoadingRecent(false)
      }
    }

    if (!authLoading && isAllowed) {
      loadRecent()
    }
  }, [authLoading, isAllowed])

  // Capture GPS
  const captureGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('თქვენი ბრაუზერი არ უჭერს მხარს GPS-ს')
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        })
        setGpsLoading(false)
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'GPS წვდომა უარყოფილია. გთხოვთ ჩართოთ ლოკაციის წვდომა.',
          2: 'GPS სიგნალი ვერ მოიძებნა.',
          3: 'GPS მოთხოვნას ვადა გაუვიდა.',
        }
        setGpsError(messages[error.code] || 'GPS შეცდომა')
        setGpsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }, [])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!skCode.trim() || !companyName.trim() || !services.trim() || !gpsCoords) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/data-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sk_code: skCode.trim(),
          company_name: companyName.trim(),
          services: services.trim(),
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          accuracy: gpsCoords.accuracy,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'შეცდომა')
      }

      showToast('მონაცემები წარმატებით დაემატა!', 'success')

      // Reset form
      setSkCode('')
      setCompanyName('')
      setServices('')
      setNotes('')
      setGpsCoords(null)

      // Refresh recent entries
      const recentRes = await fetch('/api/data-collection')
      if (recentRes.ok) {
        setRecentEntries(await recentRes.json())
      }
    } catch (error: any) {
      showToast(error.message || 'შეცდომა მონაცემების დამატებისას', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [skCode, companyName, services, gpsCoords, notes, showToast])

  const canSubmit = skCode.trim() && companyName.trim() && services.trim() && gpsCoords && !submitting

  // Loading state
  if (authLoading || inspectorLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6161FF]/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#6161FF]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">კომპანიის მონაცემები</h1>
              <p className="text-xs text-gray-500">ინფორმაციის შეგროვება</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* სკ (SK Code) */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">სკ</span>
            <span className="text-xs text-red-400">*</span>
          </div>
          <input
            type="text"
            value={skCode}
            onChange={(e) => setSkCode(e.target.value)}
            placeholder="საიდენტიფიკაციო კოდი..."
            className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30 focus:border-[#6161FF]"
          />
        </div>

        {/* Company Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">კომპანიის სახელი</span>
            <span className="text-xs text-red-400">*</span>
          </div>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="კომპანიის სახელი..."
            className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30 focus:border-[#6161FF]"
          />
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">მომსახურებები</span>
            <span className="text-xs text-red-400">*</span>
          </div>
          <textarea
            value={services}
            onChange={(e) => setServices(e.target.value)}
            placeholder="რა მომსახურებას ვუწევთ..."
            rows={3}
            className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30 focus:border-[#6161FF]"
          />
        </div>

        {/* GPS Capture */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">GPS ლოკაცია</span>
            <span className="text-xs text-red-400">*</span>
          </div>

          {gpsCoords ? (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">GPS დაფიქსირებულია</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                  <span>Lat: {gpsCoords.lat.toFixed(6)}</span>
                  <span>Lng: {gpsCoords.lng.toFixed(6)}</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  სიზუსტე: ±{gpsCoords.accuracy}მ
                </p>
              </div>
              <button
                type="button"
                onClick={captureGps}
                disabled={gpsLoading}
                className="text-sm text-[#6161FF] hover:underline"
              >
                თავიდან დაფიქსირება
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={captureGps}
                disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#6161FF] text-white rounded-lg hover:bg-[#5050DD] transition-colors disabled:opacity-50"
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">GPS იძებნება...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    <span className="text-sm font-medium">GPS-ის დაფიქსირება</span>
                  </>
                )}
              </button>
              {gpsError && (
                <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">შენიშვნები</span>
            <span className="text-xs text-gray-400">(არასავალდებულო)</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="დამატებითი შენიშვნები..."
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30 focus:border-[#6161FF]"
          />
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#6161FF] text-white rounded-xl font-medium hover:bg-[#5050DD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>იგზავნება...</span>
            </>
          ) : (
            <>
              <ClipboardList className="w-5 h-5" />
              <span>დამატება</span>
            </>
          )}
        </button>

        {/* Recent Entries */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              ბოლო ჩანაწერები
            </h3>
          </div>

          {loadingRecent ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3.5 w-32 bg-gray-100 rounded mb-1.5" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">ჩანაწერები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#6161FF]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-[#6161FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {entry.data?.sk_code && (
                        <span className="font-mono">{entry.data.sk_code}</span>
                      )}
                      <span>
                        {new Date(entry.created_at).toLocaleDateString('ka-GE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
