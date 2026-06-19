'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { companiesService } from '@/services/companies.service'
import { useToast } from '@/components/ui-monday/Toast'
import { MapPinned, RefreshCw, StickyNote, Loader2, AlertCircle } from 'lucide-react'
import type { CompanyLocation } from '@/types/company'
import type { LocationCheckin } from '@/types/checkin'

import { formatDuration, formatElapsed, haversineMeters } from './utils'
import { ActiveCheckinView } from './components/ActiveCheckinView'
import { CompanySearch } from './components/CompanySearch'
import { LocationSelector } from './components/LocationSelector'
import { DistanceIndicator } from './components/DistanceIndicator'
import { CheckinHistory } from './components/CheckinHistory'

const RADIUS_METERS = 100

interface CompanySearchResult {
  id: string
  name: string
}

type PageState = 'idle' | 'active' | 'loading'

export default function InspectorCheckinPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const inspectorId = user?.id ?? null
  const inspectorLoading = false
  const { showToast } = useToast()

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading')
  const [activeCheckin, setActiveCheckin] = useState<LocationCheckin | null>(null)

  // GPS state
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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selected company & location
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null)
  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(false)

  // Distance to selected location
  const [distanceToLocation, setDistanceToLocation] = useState<number | null>(null)

  // Form state
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Active checkin tracking
  const [elapsedDisplay, setElapsedDisplay] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

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

  // Start GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError(
        '\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10D1\u10E0\u10D0\u10E3\u10D6\u10D4\u10E0\u10D8 \u10D0\u10E0 \u10E3\u10ED\u10D4\u10E0\u10E1 \u10DB\u10EE\u10D0\u10E0\u10E1 GPS-\u10E1'
      )
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
          1: 'GPS \u10EC\u10D5\u10D3\u10DD\u10DB\u10D0 \u10E3\u10D0\u10E0\u10E7\u10DD\u10E4\u10D8\u10DA\u10D8\u10D0. \u10D2\u10D7\u10EE\u10DD\u10D5\u10D7 \u10E9\u10D0\u10E0\u10D7\u10DD\u10D7 \u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D8\u10E1 \u10EC\u10D5\u10D3\u10DD\u10DB\u10D0.',
          2: 'GPS \u10E1\u10D8\u10D2\u10DC\u10D0\u10DA\u10D8 \u10D5\u10D4\u10E0 \u10DB\u10DD\u10D8\u10EB\u10D4\u10D1\u10DC\u10D0.',
          3: 'GPS \u10DB\u10DD\u10D7\u10EE\u10DD\u10D5\u10DC\u10D0\u10E1 \u10D5\u10D0\u10D3\u10D0 \u10D2\u10D0\u10E3\u10D5\u10D8\u10D3\u10D0.',
        }
        setGpsError(messages[error.code] || 'GPS \u10E8\u10D4\u10EA\u10D3\u10DD\u10DB\u10D0')
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

  // Live elapsed timer
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

  const handleCloseDropdown = useCallback(() => {
    setShowDropdown(false)
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
        showToast(
          '\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D4\u10D1\u10D8\u10E1 \u10E9\u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10D5\u10D4\u10E0 \u10DB\u10DD\u10EE\u10D4\u10E0\u10EE\u10D3\u10D0',
          'error'
        )
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
      showToast(
        '\u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8 \u10EC\u10D0\u10E0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D8\u10D7 \u10D3\u10D0\u10E4\u10D8\u10E5\u10E1\u10D8\u10E0\u10D3\u10D0!',
        'success'
      )

      setActiveCheckin({
        ...checkin,
        company_name: selectedCompany.name,
        location_name: locations.find(l => l.id === selectedLocationId)?.name || null,
      })
      setPageState('active')

      setSelectedCompany(null)
      setSearchQuery('')
      setLocations([])
      setSelectedLocationId(null)
      setNotes('')
    } catch (error: any) {
      showToast(
        error.message ||
          '\u10E8\u10D4\u10EA\u10D3\u10DD\u10DB\u10D0 \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8\u10E1\u10D0\u10E1',
        'error'
      )
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
      showToast(
        `\u10E9\u10D4\u10D9-\u10D0\u10E3\u10D7\u10D8 \u10EC\u10D0\u10E0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D8\u10D7! \u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0: ${formatDuration(duration)}`,
        'success'
      )

      setActiveCheckin(null)
      setPageState('idle')

      if (inspectorId) {
        const recentRes = await fetch(`/api/checkins?inspector_id=${inspectorId}&limit=5`)
        if (recentRes.ok) setRecentCheckins(await recentRes.json())
      }
    } catch (error: any) {
      showToast(
        error.message ||
          '\u10E8\u10D4\u10EA\u10D3\u10DD\u10DB\u10D0 \u10E9\u10D4\u10D9-\u10D0\u10E3\u10D7\u10D8\u10E1\u10D0\u10E1',
        'error'
      )
    } finally {
      setCheckingOut(false)
    }
  }, [activeCheckin, gpsCoords, inspectorId, showToast])

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
        <h2 className="text-lg font-semibold text-text-primary">
          {
            '\u10D8\u10DC\u10E1\u10DE\u10D4\u10E5\u10E2\u10DD\u10E0\u10D8\u10E1 \u10DE\u10E0\u10DD\u10E4\u10D8\u10DA\u10D8 \u10D0\u10E0 \u10DB\u10DD\u10D8\u10EB\u10D4\u10D1\u10DC\u10D0'
          }
        </h2>
        <p className="text-sm text-text-secondary mt-1 text-center">
          {
            '\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10D0\u10DC\u10D2\u10D0\u10E0\u10D8\u10E8\u10D8 \u10D0\u10E0 \u10D0\u10E0\u10D8\u10E1 \u10DB\u10D8\u10D1\u10DB\u10E3\u10DA\u10D8 \u10D8\u10DC\u10E1\u10DE\u10D4\u10E5\u10E2\u10DD\u10E0\u10D8\u10E1 \u10DE\u10E0\u10DD\u10E4\u10D8\u10DA\u10D7\u10D0\u10DC. \u10D3\u10D0\u10E3\u10D9\u10D0\u10D5\u10E8\u10D8\u10E0\u10D3\u10D8\u10D7 \u10D0\u10D3\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10D0\u10E2\u10DD\u10E0\u10E1.'
          }
        </p>
      </div>
    )
  }

  // Active checkin view
  if (pageState === 'active' && activeCheckin) {
    return (
      <ActiveCheckinView
        activeCheckin={activeCheckin}
        elapsedDisplay={elapsedDisplay}
        gpsCoords={gpsCoords}
        checkingOut={checkingOut}
        onCheckout={handleCheckout}
      />
    )
  }

  // Idle view (check-in form)
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
                <h1 className="text-lg font-bold text-text-primary">
                  {'\u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8'}
                </h1>
                <p className="text-xs text-text-secondary">
                  {
                    '\u10D9\u10DD\u10DB\u10DE\u10D0\u10DC\u10D8\u10D0\u10D6\u10D4 \u10DB\u10D8\u10E1\u10D5\u10DA\u10D8\u10E1 \u10D3\u10D0\u10E4\u10D8\u10E5\u10E1\u10D8\u10E0\u10D4\u10D1\u10D0'
                  }
                </p>
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
              {gpsCoords
                ? `\u00B1${gpsCoords.accuracy}\u10DB`
                : gpsError
                  ? 'GPS \u10D2\u10D0\u10DB\u10DD\u10E0\u10D7.'
                  : 'GPS...'}
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
                {
                  '\u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8\u10E1\u10D7\u10D5\u10D8\u10E1 \u10E1\u10D0\u10ED\u10D8\u10E0\u10DD\u10D0 GPS \u10EC\u10D5\u10D3\u10DD\u10DB\u10D0. \u10D2\u10D7\u10EE\u10DD\u10D5\u10D7 \u10E9\u10D0\u10E0\u10D7\u10DD\u10D7 \u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D8\u10E1 \u10E1\u10D4\u10E0\u10D5\u10D8\u10E1\u10D8.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Company Search */}
        <CompanySearch
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchResults={searchResults}
          searching={searching}
          showDropdown={showDropdown}
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
          onClearCompany={handleClearCompany}
          onCloseDropdown={handleCloseDropdown}
        />

        {/* Location Selector */}
        {selectedCompany && (
          <LocationSelector
            locations={locations}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
            loadingLocations={loadingLocations}
          />
        )}

        {/* Distance Indicator */}
        <DistanceIndicator
          selectedLocationId={selectedLocationId}
          distanceToLocation={distanceToLocation}
          radiusMeters={RADIUS_METERS}
          locations={locations}
        />

        {/* Notes */}
        <div className="bg-bg-primary rounded-xl border border-border-light p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-monday-primary" />
            <span className="text-sm font-semibold text-text-primary">
              {'\u10E8\u10D4\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10D1\u10D8'}
            </span>
            <span className="text-xs text-text-tertiary">
              (
              {
                '\u10D0\u10E0\u10D0\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD'
              }
              )
            </span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
              '\u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D8\u10D7\u10D8 \u10E8\u10D4\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10D1\u10D8...'
            }
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
              <span>
                {
                  '\u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8 \u10DB\u10D8\u10DB\u10D3\u10D8\u10DC\u10D0\u10E0\u10D4\u10DD\u10D1\u10E1...'
                }
              </span>
            </>
          ) : (
            <>
              <MapPinned className="w-6 h-6" />
              <span>{'\u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8'}</span>
            </>
          )}
        </button>

        {/* Recent Checkins */}
        <CheckinHistory recentCheckins={recentCheckins} />
      </div>
    </div>
  )
}
