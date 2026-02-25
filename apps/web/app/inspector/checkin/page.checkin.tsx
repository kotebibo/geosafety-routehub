'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { companiesService } from '@/services/companies.service'
import { useToast } from '@/components/ui-monday/Toast'
import {
  MapPinned,
  Search,
  Navigation,
  RefreshCw,
  Crosshair,
  Building2,
  MapPin,
  StickyNote,
  Check,
  Clock,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  LogOut,
  Timer,
} from 'lucide-react'
import type { CompanyLocation } from '@/types/company'
import type { LocationCheckin } from '@/types/checkin'

// Format duration as "Xსთ Yწთ" or "Yწთ"
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}სთ ${m}წთ` : `${h}სთ`
}

// Format elapsed time from a date string as HH:MM:SS
function formatElapsed(startTime: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

interface CompanySearchResult {
  id: string
  name: string
}

export default function InspectorCheckinPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data: inspectorId, isLoading: inspectorLoading } = useInspectorId(user?.email)
  const { showToast } = useToast()

  // Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null)
  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(false)

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [recentCheckins, setRecentCheckins] = useState<LocationCheckin[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  // Active check-in (unclosed) state
  const [activeCheckin, setActiveCheckin] = useState<LocationCheckin | null>(null)
  const [elapsedDisplay, setElapsedDisplay] = useState('')
  const [checkoutGps, setCheckoutGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [checkoutGpsLoading, setCheckoutGpsLoading] = useState(false)
  const [checkoutGpsError, setCheckoutGpsError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'inspector' || currentRole === 'admin' || currentRole === 'dispatcher'

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  // Load recent check-ins
  useEffect(() => {
    if (!inspectorId) return

    async function loadRecent() {
      try {
        const res = await fetch(`/api/checkins?inspector_id=${inspectorId}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setRecentCheckins(data)
        }
      } catch {
        // silent
      } finally {
        setLoadingRecent(false)
      }
    }

    loadRecent()
  }, [inspectorId])

  // Detect active check-in from recent checkins
  useEffect(() => {
    const active = recentCheckins.find((c) => !c.checked_out_at)
    setActiveCheckin(active || null)
  }, [recentCheckins])

  // Live elapsed timer for active check-in
  useEffect(() => {
    if (!activeCheckin) {
      setElapsedDisplay('')
      return
    }

    setElapsedDisplay(formatElapsed(activeCheckin.created_at))
    const interval = setInterval(() => {
      setElapsedDisplay(formatElapsed(activeCheckin.created_at))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeCheckin])

  // Capture GPS for checkout
  const captureCheckoutGps = useCallback(() => {
    if (!navigator.geolocation) {
      setCheckoutGpsError('თქვენი ბრაუზერი არ უჭერს მხარს GPS-ს')
      return
    }

    setCheckoutGpsLoading(true)
    setCheckoutGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCheckoutGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        })
        setCheckoutGpsLoading(false)
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'GPS წვდომა უარყოფილია.',
          2: 'GPS სიგნალი ვერ მოიძებნა.',
          3: 'GPS მოთხოვნას ვადა გაუვიდა.',
        }
        setCheckoutGpsError(messages[error.code] || 'GPS შეცდომა')
        setCheckoutGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  // Submit checkout
  const handleCheckout = useCallback(async () => {
    if (!activeCheckin || !checkoutGps) return

    setCheckingOut(true)
    try {
      const res = await fetch('/api/checkins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: activeCheckin.id,
          lat: checkoutGps.lat,
          lng: checkoutGps.lng,
          accuracy: checkoutGps.accuracy,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Checkout failed')
      }

      const result = await res.json()
      const duration = result.duration_minutes
      showToast(`ჩეკ-აუთი წარმატებით! ხანგრძლივობა: ${formatDuration(duration)}`, 'success')

      // Reset checkout state
      setActiveCheckin(null)
      setCheckoutGps(null)

      // Refresh recent check-ins
      if (inspectorId) {
        const recentRes = await fetch(`/api/checkins?inspector_id=${inspectorId}&limit=5`)
        if (recentRes.ok) {
          setRecentCheckins(await recentRes.json())
        }
      }
    } catch (error: any) {
      showToast(error.message || 'შეცდომა ჩეკ-აუთისას', 'error')
    } finally {
      setCheckingOut(false)
    }
  }, [activeCheckin, checkoutGps, inspectorId, showToast])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced company search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await companiesService.searchWithLocations(value)
        setSearchResults(results.map((c) => ({ id: c.id, name: c.name })))
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  // Select company → load its locations
  const handleSelectCompany = useCallback(async (company: CompanySearchResult) => {
    setSelectedCompany(company)
    setSearchQuery(company.name)
    setShowDropdown(false)
    setSelectedLocationId(null)
    setLoadingLocations(true)

    try {
      const locs = await companiesService.locations.getByCompanyId(company.id)
      setLocations(locs)
      // Auto-select primary location
      const primary = locs.find((l) => l.is_primary)
      if (primary) {
        setSelectedLocationId(primary.id)
      } else if (locs.length === 1) {
        setSelectedLocationId(locs[0].id)
      }
    } catch {
      setLocations([])
      showToast('ლოკაციების ჩატვირთვა ვერ მოხერხდა', 'error')
    } finally {
      setLoadingLocations(false)
    }
  }, [showToast])

  // Clear selected company
  const handleClearCompany = useCallback(() => {
    setSelectedCompany(null)
    setSearchQuery('')
    setSearchResults([])
    setLocations([])
    setSelectedLocationId(null)
  }, [])

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

  // Submit check-in
  const handleSubmit = useCallback(async () => {
    if (!selectedCompany || !gpsCoords || !inspectorId) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspector_id: inspectorId,
          company_id: selectedCompany.id,
          company_location_id: selectedLocationId || null,
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          accuracy: gpsCoords.accuracy,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Check-in failed')
      }

      const checkin = await res.json()

      let message = 'ჩეკ-ინი წარმატებით დაფიქსირდა!'
      if (checkin.location_updated) {
        message += ' კომპანიის GPS კოორდინატები განახლდა.'
      }
      if (checkin.distance_from_location != null) {
        message += ` მანძილი: ${checkin.distance_from_location}მ`
      }

      showToast(message, 'success')

      // Reset form
      setSelectedCompany(null)
      setSearchQuery('')
      setLocations([])
      setSelectedLocationId(null)
      setGpsCoords(null)
      setNotes('')

      // Refresh recent check-ins
      const recentRes = await fetch(`/api/checkins?inspector_id=${inspectorId}&limit=5`)
      if (recentRes.ok) {
        setRecentCheckins(await recentRes.json())
      }
    } catch (error: any) {
      showToast(error.message || 'შეცდომა ჩეკ-ინისას', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [selectedCompany, gpsCoords, inspectorId, selectedLocationId, notes, showToast])

  const canSubmit = selectedCompany && gpsCoords && !submitting

  // Loading state
  if (authLoading || inspectorLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // No inspector profile
  if (!inspectorId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-4">
        <MapPinned className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">ინსპექტორის პროფილი არ მოიძებნა</h2>
        <p className="text-sm text-gray-500 mt-1 text-center">
          თქვენი ანგარიში არ არის მიბმული ინსპექტორის პროფილთან. დაუკავშირდით ადმინისტრატორს.
        </p>
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
              <MapPinned className="w-5 h-5 text-[#6161FF]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ჩეკ-ინი</h1>
              <p className="text-xs text-gray-500">კომპანიის ლოკაციის დაფიქსირება</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Active Check-in Banner */}
        {activeCheckin && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-300 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Timer className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-900">აქტიური ჩეკ-ინი</p>
                  <p className="text-xs text-orange-600">{activeCheckin.company_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-mono font-bold text-orange-800">{elapsedDisplay}</p>
                <p className="text-[10px] text-orange-500">
                  {new Date(activeCheckin.created_at).toLocaleTimeString('ka-GE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {activeCheckin.location_name && (
              <p className="text-xs text-orange-700 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activeCheckin.location_name}
              </p>
            )}

            {/* Checkout GPS capture */}
            {checkoutGps ? (
              <div className="bg-white/60 rounded-lg px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-600" />
                GPS: {checkoutGps.lat.toFixed(6)}, {checkoutGps.lng.toFixed(6)} (±{checkoutGps.accuracy}მ)
              </div>
            ) : (
              <button
                type="button"
                onClick={captureCheckoutGps}
                disabled={checkoutGpsLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/70 border border-orange-200 rounded-lg text-sm text-orange-800 hover:bg-white transition-colors disabled:opacity-50"
              >
                {checkoutGpsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>GPS იძებნება...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>GPS-ის დაფიქსირება ჩეკ-აუთისთვის</span>
                  </>
                )}
              </button>
            )}

            {checkoutGpsError && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{checkoutGpsError}</span>
              </div>
            )}

            {/* Checkout button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!checkoutGps || checkingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>ჩეკ-აუთი მიმდინარეობს...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>ჩეკ-აუთი</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 1: Company Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">1. აირჩიეთ კომპანია</span>
          </div>

          {selectedCompany ? (
            <div className="flex items-center justify-between bg-[#6161FF]/5 border border-[#6161FF]/20 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-[#6161FF] flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">{selectedCompany.name}</span>
              </div>
              <button
                type="button"
                onClick={handleClearCompany}
                className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="კომპანიის სახელი..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30 focus:border-[#6161FF]"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                  {searchResults.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-0"
                    >
                      <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{company.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                  <p className="text-sm text-gray-500 text-center">კომპანია ვერ მოიძებნა</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Location Selector (if company has multiple locations) */}
        {selectedCompany && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#6161FF]" />
              <span className="text-sm font-semibold text-gray-700">2. ლოკაცია</span>
            </div>

            {loadingLocations ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>იტვირთება...</span>
              </div>
            ) : locations.length === 0 ? (
              <p className="text-sm text-gray-500 py-1">ლოკაციები არ მოიძებნა (GPS ჩეკ-ინი კომპანიაზე)</p>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      selectedLocationId === loc.id
                        ? 'border-[#6161FF] bg-[#6161FF]/5 ring-1 ring-[#6161FF]/30'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 truncate">{loc.name}</span>
                          {loc.is_primary && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                              მთავარი
                            </span>
                          )}
                          {!loc.lat && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                              GPS არაა
                            </span>
                          )}
                        </div>
                        {loc.address && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{loc.address}</p>
                        )}
                      </div>
                      {selectedLocationId === loc.id && (
                        <Check className="w-4 h-4 text-[#6161FF] flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: GPS Capture */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">
              {selectedCompany ? '3' : '2'}. GPS კოორდინატები
            </span>
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

        {/* Step 4: Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-[#6161FF]" />
            <span className="text-sm font-semibold text-gray-700">
              {selectedCompany ? '4' : '3'}. შენიშვნები
            </span>
            <span className="text-xs text-gray-400">(არასავალდებულო)</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="დამატებითი შენიშვნები..."
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30 focus:border-[#6161FF]"
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
              <MapPinned className="w-5 h-5" />
              <span>ჩეკ-ინის დაფიქსირება</span>
            </>
          )}
        </button>

        {/* Recent Check-ins */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              ბოლო ჩეკ-ინები
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
          ) : recentCheckins.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">ჩეკ-ინები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCheckins.map((checkin) => (
                <div key={checkin.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    !checkin.checked_out_at
                      ? 'bg-orange-100 text-orange-600'
                      : checkin.location_updated
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {!checkin.checked_out_at ? (
                      <Timer className="w-4 h-4" />
                    ) : (
                      <MapPinned className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {checkin.company_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      {checkin.location_name && (
                        <span className="truncate">{checkin.location_name}</span>
                      )}
                      <span>
                        {new Date(checkin.created_at).toLocaleTimeString('ka-GE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {checkin.checked_out_at && (
                        <>
                          <span>→</span>
                          <span>
                            {new Date(checkin.checked_out_at).toLocaleTimeString('ka-GE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                      {checkin.distance_from_location != null && (
                        <span>{checkin.distance_from_location}მ</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {!checkin.checked_out_at ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">
                        აქტიური
                      </span>
                    ) : checkin.duration_minutes != null ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                        {formatDuration(checkin.duration_minutes)}
                      </span>
                    ) : null}
                    {checkin.location_updated && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                        GPS განახლდა
                      </span>
                    )}
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
