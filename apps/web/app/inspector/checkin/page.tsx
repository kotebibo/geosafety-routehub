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
  Building2,
  MapPin,
  StickyNote,
  Check,
  Clock,
  X,
  Loader2,
  AlertCircle,
  LogOut,
  Timer,
  ShieldAlert,
  Radio,
  CheckCircle2,
} from 'lucide-react'
import type { CompanyLocation } from '@/types/company'
import type { LocationCheckin } from '@/types/checkin'

const RADIUS_METERS = 100
const PING_INTERVAL_MS = 30000 // 30 seconds

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}სთ ${m}წთ` : `${h}სთ`
}

function formatElapsed(startTime: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface CompanySearchResult {
  id: string
  name: string
}

type PageState = 'idle' | 'active' | 'loading'

export default function InspectorCheckinPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data: inspectorId, isLoading: inspectorLoading } = useInspectorId(user?.email)
  const { showToast } = useToast()

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading')
  const [activeCheckin, setActiveCheckin] = useState<LocationCheckin | null>(null)

  // GPS state (always tracking)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null
  )
  const [gpsError, setGpsError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  // Company search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selected company & location
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null)
  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(false)

  // Distance to selected location (live)
  const [distanceToLocation, setDistanceToLocation] = useState<number | null>(null)

  // Form state
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Active checkin tracking
  const [elapsedDisplay, setElapsedDisplay] = useState('')
  const [pingStatus, setPingStatus] = useState<'ok' | 'warning' | 'error' | null>(null)
  const [lastPingDistance, setLastPingDistance] = useState<number | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Recent checkins
  const [recentCheckins, setRecentCheckins] = useState<LocationCheckin[]>([])

  const currentRole = userRole?.role || ''
  const isAllowed =
    currentRole === 'officer' || currentRole === 'admin' || currentRole === 'dispatcher'

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  // Start GPS tracking immediately on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('თქვენი ბრაუზერი არ უჭერს მხარს GPS-ს')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      position => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        })
        setGpsError(null)
      },
      error => {
        const messages: Record<number, string> = {
          1: 'GPS წვდომა უარყოფილია. გთხოვთ ჩართოთ ლოკაციის წვდომა.',
          2: 'GPS სიგნალი ვერ მოიძებნა.',
          3: 'GPS მოთხოვნას ვადა გაუვიდა.',
        }
        setGpsError(messages[error.code] || 'GPS შეცდომა')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Load active checkin on mount
  useEffect(() => {
    if (!inspectorId) return

    async function loadActiveAndRecent() {
      try {
        const [activeRes, recentRes] = await Promise.all([
          fetch(`/api/checkins?inspector_id=${inspectorId}&active=true&limit=1`),
          fetch(`/api/checkins?inspector_id=${inspectorId}&limit=5`),
        ])

        if (activeRes.ok) {
          const activeData = await activeRes.json()
          if (activeData.length > 0) {
            setActiveCheckin(activeData[0])
            setPageState('active')
          } else {
            setPageState('idle')
          }
        }

        if (recentRes.ok) {
          setRecentCheckins(await recentRes.json())
        }
      } catch {
        setPageState('idle')
      }
    }

    loadActiveAndRecent()
  }, [inspectorId])

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

  // GPS ping during active checkin
  useEffect(() => {
    if (!activeCheckin || !gpsCoords) {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      return
    }

    const sendPing = async () => {
      if (!gpsCoords) return
      try {
        const res = await fetch('/api/checkins/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkin_id: activeCheckin.id,
            lat: gpsCoords.lat,
            lng: gpsCoords.lng,
            accuracy: gpsCoords.accuracy,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setLastPingDistance(data.distance)
          setPingStatus(data.within_radius ? 'ok' : 'warning')

          if (!data.within_radius) {
            showToast(data.warning, 'error')
          }
        } else {
          setPingStatus('error')
        }
      } catch {
        setPingStatus('error')
      }
    }

    // Send first ping immediately
    sendPing()

    // Then every 30 seconds
    pingIntervalRef.current = setInterval(sendPing, PING_INTERVAL_MS)

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }
  }, [activeCheckin, gpsCoords, showToast])

  // Calculate live distance to selected location
  useEffect(() => {
    if (!gpsCoords || !selectedLocationId || locations.length === 0) {
      setDistanceToLocation(null)
      return
    }

    const loc = locations.find(l => l.id === selectedLocationId)
    if (!loc?.lat || !loc?.lng) {
      setDistanceToLocation(null)
      return
    }

    const dist = Math.round(haversineMeters(gpsCoords.lat, gpsCoords.lng, loc.lat, loc.lng))
    setDistanceToLocation(dist)
  }, [gpsCoords, selectedLocationId, locations])

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
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (value.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await companiesService.searchWithLocations(value)
        setSearchResults(results.map(c => ({ id: c.id, name: c.name })))
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  // Select company → load locations
  const handleSelectCompany = useCallback(
    async (company: CompanySearchResult) => {
      setSelectedCompany(company)
      setSearchQuery(company.name)
      setShowDropdown(false)
      setSelectedLocationId(null)
      setLoadingLocations(true)

      try {
        const locs = await companiesService.locations.getByCompanyId(company.id)
        setLocations(locs)
        const primary = locs.find(l => l.is_primary)
        if (primary) setSelectedLocationId(primary.id)
        else if (locs.length === 1) setSelectedLocationId(locs[0].id)
      } catch {
        setLocations([])
        showToast('ლოკაციების ჩატვირთვა ვერ მოხერხდა', 'error')
      } finally {
        setLoadingLocations(false)
      }
    },
    [showToast]
  )

  const handleClearCompany = useCallback(() => {
    setSelectedCompany(null)
    setSearchQuery('')
    setSearchResults([])
    setLocations([])
    setSelectedLocationId(null)
    setDistanceToLocation(null)
  }, [])

  // Submit check-in
  const handleCheckin = useCallback(async () => {
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
      showToast('ჩეკ-ინი წარმატებით დაფიქსირდა!', 'success')

      // Switch to active state
      setActiveCheckin({
        ...checkin,
        company_name: selectedCompany.name,
        location_name: locations.find(l => l.id === selectedLocationId)?.name || null,
      })
      setPageState('active')

      // Reset form
      setSelectedCompany(null)
      setSearchQuery('')
      setLocations([])
      setSelectedLocationId(null)
      setNotes('')
    } catch (error: any) {
      showToast(error.message || 'შეცდომა ჩეკ-ინისას', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [selectedCompany, gpsCoords, inspectorId, selectedLocationId, notes, locations, showToast])

  // Checkout
  const handleCheckout = useCallback(async () => {
    if (!activeCheckin || !gpsCoords) return

    setCheckingOut(true)
    try {
      const res = await fetch('/api/checkins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: activeCheckin.id,
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          accuracy: gpsCoords.accuracy,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Checkout failed')
      }

      const result = await res.json()
      const duration = result.duration_minutes
      showToast(`ჩეკ-აუთი წარმატებით! ხანგრძლივობა: ${formatDuration(duration)}`, 'success')

      setActiveCheckin(null)
      setPageState('idle')
      setPingStatus(null)
      setLastPingDistance(null)

      // Refresh recent
      if (inspectorId) {
        const recentRes = await fetch(`/api/checkins?inspector_id=${inspectorId}&limit=5`)
        if (recentRes.ok) setRecentCheckins(await recentRes.json())
      }
    } catch (error: any) {
      showToast(error.message || 'შეცდომა ჩეკ-აუთისას', 'error')
    } finally {
      setCheckingOut(false)
    }
  }, [activeCheckin, gpsCoords, inspectorId, showToast])

  // Can submit check-in?
  const canCheckin =
    selectedCompany &&
    gpsCoords &&
    !submitting &&
    (distanceToLocation === null || distanceToLocation <= RADIUS_METERS)

  // Loading
  if (authLoading || inspectorLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    )
  }

  // No inspector profile
  if (!inspectorId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-4">
        <MapPinned className="w-12 h-12 text-text-disabled mb-4" />
        <h2 className="text-lg font-semibold text-text-primary">ინსპექტორის პროფილი არ მოიძებნა</h2>
        <p className="text-sm text-text-secondary mt-1 text-center">
          თქვენი ანგარიში არ არის მიბმული ინსპექტორის პროფილთან. დაუკავშირდით ადმინისტრატორს.
        </p>
      </div>
    )
  }

  // ============ ACTIVE CHECK-IN VIEW ============
  if (pageState === 'active' && activeCheckin) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        {/* Header */}
        <div className="bg-orange-600 text-white sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">აქტიური ჩეკ-ინი</h1>
                  <p className="text-xs text-orange-100">{activeCheckin.company_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold">{elapsedDisplay}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Live GPS Status */}
          <div
            className={`rounded-xl border-2 p-4 ${
              pingStatus === 'ok'
                ? 'bg-green-50 border-green-300'
                : pingStatus === 'warning'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    pingStatus === 'ok'
                      ? 'bg-green-100'
                      : pingStatus === 'warning'
                        ? 'bg-red-100 animate-pulse'
                        : 'bg-gray-100'
                  }`}
                >
                  {pingStatus === 'ok' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : pingStatus === 'warning' ? (
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                  ) : (
                    <Radio className="w-5 h-5 text-gray-400 animate-pulse" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      pingStatus === 'ok'
                        ? 'text-green-800'
                        : pingStatus === 'warning'
                          ? 'text-red-800'
                          : 'text-gray-600'
                    }`}
                  >
                    {pingStatus === 'ok'
                      ? 'რადიუსში ხართ'
                      : pingStatus === 'warning'
                        ? 'რადიუსის გარეთ ხართ!'
                        : 'GPS მოწმდება...'}
                  </p>
                  <p
                    className={`text-xs ${
                      pingStatus === 'ok'
                        ? 'text-green-600'
                        : pingStatus === 'warning'
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {lastPingDistance !== null
                      ? `მანძილი: ${lastPingDistance}მ`
                      : 'პირველი პინგი...'}
                    {gpsCoords && ` • სიზუსტე: ±${gpsCoords.accuracy}მ`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    pingStatus === 'ok'
                      ? 'bg-green-500'
                      : pingStatus === 'warning'
                        ? 'bg-red-500 animate-ping'
                        : 'bg-gray-400 animate-pulse'
                  }`}
                />
                <span className="text-[10px] text-text-tertiary">LIVE</span>
              </div>
            </div>

            {pingStatus === 'warning' && (
              <div className="mt-3 bg-red-100 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 font-medium">
                  გაფრთხილება: თქვენ იმყოფებით {RADIUS_METERS}მ რადიუსის გარეთ. ეს დაფიქსირდება
                  თქვენს ჩეკ-ინის ისტორიაში.
                </p>
              </div>
            )}
          </div>

          {/* Location info */}
          {activeCheckin.location_name && (
            <div className="bg-bg-primary rounded-xl border border-border-light p-4 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">{activeCheckin.location_name}</span>
            </div>
          )}

          {/* Checkout button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!gpsCoords || checkingOut}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {checkingOut ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>ჩეკ-აუთი მიმდინარეობს...</span>
              </>
            ) : (
              <>
                <LogOut className="w-6 h-6" />
                <span>ჩეკ-აუთი</span>
              </>
            )}
          </button>

          {!gpsCoords && (
            <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              GPS სიგნალის მოლოდინი ჩეკ-აუთისთვის...
            </p>
          )}
        </div>
      </div>
    )
  }

  // ============ IDLE VIEW (Check-in form) ============
  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-monday-primary/10 flex items-center justify-center">
                <MapPinned className="w-5 h-5 text-monday-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary">ჩეკ-ინი</h1>
                <p className="text-xs text-text-secondary">კომპანიაზე მისვლის დაფიქსირება</p>
              </div>
            </div>
            {/* GPS indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                gpsCoords
                  ? 'bg-green-100 text-green-700'
                  : gpsError
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  gpsCoords ? 'bg-green-500' : gpsError ? 'bg-red-500' : 'bg-gray-400 animate-pulse'
                }`}
              />
              {gpsCoords ? `±${gpsCoords.accuracy}მ` : gpsError ? 'GPS გამორთ.' : 'GPS...'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* GPS Error Banner */}
        {gpsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{gpsError}</p>
              <p className="text-xs text-red-600 mt-1">
                ჩეკ-ინისთვის საჭიროა GPS წვდომა. გთხოვთ ჩართოთ ლოკაციის სერვისი.
              </p>
            </div>
          </div>
        )}

        {/* Company Search */}
        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-monday-primary" />
            <span className="text-sm font-semibold text-text-primary">კომპანია</span>
          </div>

          {selectedCompany ? (
            <div className="flex items-center justify-between bg-monday-primary/5 border border-monday-primary/20 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-monday-primary flex-shrink-0" />
                <span className="text-sm font-medium text-text-primary truncate">
                  {selectedCompany.name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearCompany}
                className="p-1 text-text-tertiary hover:text-text-secondary flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="მოძებნეთ კომპანია..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary/30 focus:border-monday-primary"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary animate-spin" />
                )}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-light rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                  {searchResults.map(company => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg-secondary flex items-center gap-2 border-b border-border-light last:border-0"
                    >
                      <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                      <span className="truncate">{company.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown &&
                searchQuery.length >= 2 &&
                searchResults.length === 0 &&
                !searching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-light rounded-lg shadow-lg p-3 z-20">
                    <p className="text-sm text-text-secondary text-center">კომპანია ვერ მოიძებნა</p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Location Selector */}
        {selectedCompany && (
          <div className="bg-bg-primary rounded-xl border border-border-light p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-monday-primary" />
              <span className="text-sm font-semibold text-text-primary">ლოკაცია</span>
            </div>

            {loadingLocations ? (
              <div className="flex items-center gap-2 text-sm text-text-tertiary py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>იტვირთება...</span>
              </div>
            ) : locations.length === 0 ? (
              <p className="text-sm text-text-secondary py-1">
                ლოკაციები არ მოიძებნა — GPS ჩეკ-ინი კომპანიაზე
              </p>
            ) : (
              <div className="space-y-2">
                {locations.map(loc => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      selectedLocationId === loc.id
                        ? 'border-monday-primary bg-monday-primary/5 ring-1 ring-monday-primary/30'
                        : 'border-border-light hover:bg-bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-text-primary truncate">{loc.name}</span>
                          {loc.is_primary && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                              მთავარი
                            </span>
                          )}
                          {!loc.lat && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                              ახალი
                            </span>
                          )}
                        </div>
                        {loc.address && (
                          <p className="text-xs text-text-secondary mt-0.5 truncate">
                            {loc.address}
                          </p>
                        )}
                      </div>
                      {selectedLocationId === loc.id && (
                        <Check className="w-4 h-4 text-monday-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Distance Indicator */}
        {selectedLocationId && distanceToLocation !== null && (
          <div
            className={`rounded-xl border-2 p-4 flex items-center gap-3 ${
              distanceToLocation <= RADIUS_METERS
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}
          >
            {distanceToLocation <= RADIUS_METERS ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    რადიუსში ხართ — {distanceToLocation}მ
                  </p>
                  <p className="text-xs text-green-600">შეგიძლიათ ჩეკ-ინის გაკეთება</p>
                </div>
              </>
            ) : (
              <>
                <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    რადიუსის გარეთ — {distanceToLocation}მ
                  </p>
                  <p className="text-xs text-red-600">
                    ჩეკ-ინისთვის საჭიროა {RADIUS_METERS}მ რადიუსში ყოფნა
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* New location notice */}
        {selectedLocationId &&
          distanceToLocation === null &&
          locations.find(l => l.id === selectedLocationId && !l.lat) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">ახალი ლოკაცია</p>
                <p className="text-xs text-blue-600">
                  ამ ლოკაციას ჯერ არ აქვს GPS კოორდინატები. თქვენი ჩეკ-ინი ავტომატურად დააფიქსირებს
                  მას.
                </p>
              </div>
            </div>
          )}

        {/* Notes */}
        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-monday-primary" />
            <span className="text-sm font-semibold text-text-primary">შენიშვნები</span>
            <span className="text-xs text-text-tertiary">(არასავალდებულო)</span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="დამატებითი შენიშვნები..."
            rows={2}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-border-light rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-monday-primary/30 focus:border-monday-primary"
          />
        </div>

        {/* Check-in Button */}
        <button
          type="button"
          onClick={handleCheckin}
          disabled={!canCheckin}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-monday-primary text-white rounded-xl font-semibold text-lg hover:bg-monday-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>ჩეკ-ინი მიმდინარეობს...</span>
            </>
          ) : (
            <>
              <MapPinned className="w-6 h-6" />
              <span>ჩეკ-ინი</span>
            </>
          )}
        </button>

        {/* Recent Checkins */}
        {recentCheckins.length > 0 && (
          <div className="bg-bg-primary rounded-xl border border-border-light overflow-hidden">
            <div className="px-4 py-3 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                ბოლო ჩეკ-ინები
              </h3>
            </div>
            <div className="divide-y divide-border-light">
              {recentCheckins.slice(0, 5).map(checkin => (
                <div key={checkin.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      !checkin.checked_out_at
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {!checkin.checked_out_at ? (
                      <Timer className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {checkin.company_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <span>
                        {new Date(checkin.created_at).toLocaleDateString('ka-GE', {
                          day: '2-digit',
                          month: '2-digit',
                        })}{' '}
                        {new Date(checkin.created_at).toLocaleTimeString('ka-GE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {checkin.duration_minutes != null && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                          {formatDuration(checkin.duration_minutes)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
