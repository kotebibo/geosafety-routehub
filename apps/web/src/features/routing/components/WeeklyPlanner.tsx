'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  Loader2,
  Check,
  Fuel,
  Route as RouteIcon,
  Navigation,
  Plus,
  AlertCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardColumns } from '@/features/boards/hooks/useBoardColumns'
import { useSetItemCoords } from '../hooks/useSetItemCoords'
import { parseCoordinates } from '@/lib/geo-utils'
import { resolveLocation, DEFAULT_GEOCODE_CITY } from '../lib/geocode'
import { resolveLocationColumns } from '../lib/location-columns'
import { RouteMapModal, type RouteMapStop } from './RouteMapModal'
import { useToast } from '@/components/ui-monday/Toast'
import { useRoutingItems } from '../hooks/useRoutingData'
import { useInspectorLocation } from '../hooks/useInspectorLocation'
import { useOfficerTransport } from '../hooks/useOfficerTransport'
import { useRouteOptimizer } from '../hooks/useRouteOptimizer'
import { useWeekPlan, useSaveWeekPlan } from '../hooks/useWeekPlan'
import { mondayOf, weekDays, dayKey, shortDate, DAY_LABELS_KA } from '../lib/week'
import type { Board } from '@/types/board'

interface WeeklyPlannerProps {
  board: Board
  onClose: () => void
}

interface DayResult {
  order: string[] // company item ids in optimized order
  km: number // full loop: home → stops → home
  returnKm?: number // the last-stop → home leg
  stops: { itemId: string; distanceFromPrevious: number }[]
  /** [lng, lat] pairs from OSRM for the real-road map line (when optimized). */
  geometry?: number[][]
}

export function WeeklyPlanner({ board, onClose }: WeeklyPlannerProps) {
  const t = useTranslations()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { items, isLoading } = useRoutingItems(board.id)
  // The plan belongs to the board's assigned officer (or the current user).
  const inspectorId = board.settings?.assigned_officer_id || user?.id || ''
  const { start: boardStart } = useInspectorLocation(board)
  const { data: transport } = useOfficerTransport(inspectorId)
  const { data: columns = [] } = useBoardColumns(board.board_type, board.id)
  const optimizer = useRouteOptimizer()

  // Start-point cascade: the board's explicit start wins; otherwise fall back to
  // the assigned officer's profile route-start, then their home location.
  const start = useMemo(() => {
    if (boardStart) return boardStart
    if (transport?.start_lat != null && transport?.start_lng != null)
      return {
        mode: 'manual' as const,
        lat: transport.start_lat,
        lng: transport.start_lng,
        address: transport.start_address ?? undefined,
        updated_at: '',
      }
    if (transport?.home_lat != null && transport?.home_lng != null)
      return {
        mode: 'manual' as const,
        lat: transport.home_lat,
        lng: transport.home_lng,
        address: transport.home_address ?? undefined,
        updated_at: '',
      }
    return null
  }, [boardStart, transport])

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(0) // index 0..6
  // day key -> company ids assigned to that day
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [dayResults, setDayResults] = useState<Record<string, DayResult>>({})
  const [savingDay, setSavingDay] = useState<string | null>(null)
  const [planningWeek, setPlanningWeek] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 })
  const [mapDayKey, setMapDayKey] = useState<string | null>(null)

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(() => weekDays(monday), [monday])
  const selectedKey = dayKey(days[selectedDay])
  const weekStartKey = dayKey(monday)

  const { data: existingPlan } = useWeekPlan(inspectorId, weekStartKey)
  const savePlan = useSaveWeekPlan()

  // Reset on week switch, then prefill once from the saved plan for that week.
  const loadedRef = useRef('')
  // Marks a week the user has manually edited — a background refetch of the
  // saved plan must never clobber an in-progress selection.
  const dirtyRef = useRef('')
  useEffect(() => {
    setAssignments({})
    setDayResults({})
    loadedRef.current = ''
    dirtyRef.current = ''
  }, [weekStartKey])
  useEffect(() => {
    if (!existingPlan || existingPlan.weekStart !== weekStartKey) return
    if (loadedRef.current === weekStartKey) return
    if (dirtyRef.current === weekStartKey) return // user already editing — don't overwrite
    loadedRef.current = weekStartKey
    const asn: Record<string, string[]> = {}
    const res: Record<string, DayResult> = {}
    for (const d of existingPlan.days) {
      const ids = d.stops.map(s => s.itemId)
      asn[d.date] = ids
      if (d.km != null)
        res[d.date] = {
          order: ids,
          km: d.km,
          stops: d.stops.map(s => ({
            itemId: s.itemId,
            distanceFromPrevious: s.distanceFromPrevious ?? 0,
          })),
        }
    }
    setAssignments(asn)
    setDayResults(res)
  }, [existingPlan, weekStartKey])

  // Location columns are auto-detected (a check-in column is not required):
  // explicit config first, then a coordinates / address column by name.
  const { coordsColumnId, addressColumnId } = useMemo(
    () => resolveLocationColumns(columns),
    [columns]
  )

  // Coordinates are optional per board. The board is routable only if some item
  // already has coordinates, or an address exists that we can geocode into the
  // coordinates column.
  const anyCoords = useMemo(
    () => !!coordsColumnId && items.some(ri => parseCoordinates(ri.item.data?.[coordsColumnId])),
    [items, coordsColumnId]
  )
  const routable = anyCoords || (!!coordsColumnId && !!addressColumnId)

  const coordsOf = (itemId: string): { lat: number; lng: number } | null => {
    const ri = items.find(x => x.item.id === itemId)
    if (!ri || !coordsColumnId) return null
    return parseCoordinates(ri.item.data?.[coordsColumnId])
  }
  const nameOf = (itemId: string) => items.find(x => x.item.id === itemId)?.item.name || itemId

  const setItemCoords = useSetItemCoords(board.id)

  // Items that still lack coordinates but have an address we can geocode.
  const geocodable = useMemo(
    () =>
      addressColumnId && coordsColumnId
        ? items.filter(
            ri =>
              !parseCoordinates(ri.item.data?.[coordsColumnId]) &&
              String(ri.item.data?.[addressColumnId] ?? '').trim() !== ''
          )
        : [],
    [items, addressColumnId, coordsColumnId]
  )

  // Geocode each address (throttled for Nominatim's 1 req/s policy) and write
  // "lat, lng" into the board's coordinates column so it's stored for good.
  const geocodeAddresses = async () => {
    if (!coordsColumnId || !addressColumnId || geocodable.length === 0) return
    setGeocoding(true)
    setGeoProgress({ done: 0, total: geocodable.length })
    let ok = 0
    for (let i = 0; i < geocodable.length; i++) {
      const ri = geocodable[i]
      const address = String(ri.item.data?.[addressColumnId] ?? '').trim()
      try {
        const results = await resolveLocation(address, { city: DEFAULT_GEOCODE_CITY })
        const hit = results[0]
        if (hit) {
          await setItemCoords.mutateAsync({
            itemId: ri.item.id,
            coordsColumnId,
            lat: hit.lat,
            lng: hit.lng,
          })
          ok++
        }
      } catch {
        // skip this one; keep going
      }
      setGeoProgress({ done: i + 1, total: geocodable.length })
      if (i < geocodable.length - 1) await new Promise(r => setTimeout(r, 1100))
    }
    setGeocoding(false)
    showToast(
      t('routing.geocodeDone', { ok, total: geocodable.length }),
      ok > 0 ? 'success' : 'error'
    )
  }

  // Which day (index) a company is assigned to, or -1
  const dayOfItem = (itemId: string): number => {
    for (let i = 0; i < 7; i++) {
      if ((assignments[dayKey(days[i])] || []).includes(itemId)) return i
    }
    return -1
  }

  const toggleItemOnSelectedDay = (itemId: string) => {
    dirtyRef.current = weekStartKey
    setAssignments(prev => {
      const next = { ...prev }
      // remove from whatever day it's on
      for (const k of Object.keys(next)) next[k] = next[k].filter(id => id !== itemId)
      const cur = dayOfItem(itemId)
      // clicking the same day removes it; otherwise add to selected day
      if (cur !== selectedDay) next[selectedKey] = [...(next[selectedKey] || []), itemId]
      return next
    })
    // assignment changed → invalidate that day's computed result
    setDayResults(prev => {
      const n = { ...prev }
      delete n[selectedKey]
      return n
    })
  }

  const removeFromDay = (key: string, itemId: string) => {
    dirtyRef.current = weekStartKey
    setAssignments(prev => ({ ...prev, [key]: (prev[key] || []).filter(id => id !== itemId) }))
    setDayResults(prev => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }

  // Optimize a single day's stops from the inspector's start. Returns the
  // computed result, or null when the day has no located companies. Throws on
  // optimizer failure. Assumes `start` is set (callers guard).
  const optimizeDay = async (key: string): Promise<DayResult | null> => {
    const ids = assignments[key] || []
    const located = ids.map(id => ({ id, name: nameOf(id), c: coordsOf(id) })).filter(x => x.c)
    if (located.length === 0) return null
    const locations = [
      { id: 'start', name: 'start', lat: start!.lat, lng: start!.lng },
      ...located.map(l => ({ id: l.id, name: l.name, lat: l.c!.lat, lng: l.c!.lng })),
    ]
    const result = await optimizer.mutateAsync(locations)
    const routeStops = result.stops.filter(s => s.id !== 'start')
    const oneWayKm = result.totalDistance
    let km = oneWayKm
    let geometry = result.metadata?.routeGeometry ?? undefined
    let returnKm: number | undefined

    // Full loop: home → stops → back home. Fetch the real-road geometry and
    // distance for the whole loop so km includes the trip back home.
    try {
      const loop = [
        { lat: start!.lat, lng: start!.lng },
        ...routeStops.map(s => ({ lat: s.lat, lng: s.lng })),
        { lat: start!.lat, lng: start!.lng },
      ]
      const res = await fetch('/api/routing/route-geometry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: loop }),
      })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.geometry) && d.geometry.length > 0) geometry = d.geometry
        if (typeof d.distanceKm === 'number') {
          km = Math.round(d.distanceKm * 100) / 100
          returnKm = Math.max(0, Math.round((d.distanceKm - oneWayKm) * 100) / 100)
        }
      }
    } catch {
      // keep the one-way km/geometry on failure
    }

    return {
      order: routeStops.map(s => s.id),
      km,
      returnKm,
      stops: routeStops.map(s => ({ itemId: s.id, distanceFromPrevious: s.distanceFromPrevious })),
      geometry,
    }
  }

  const saveDay = async (key: string) => {
    const ids = assignments[key] || []
    if (!start) {
      showToast(t('routing.setStartFirst'), 'error')
      return
    }
    setSavingDay(key)
    try {
      const res = await optimizeDay(key)
      if (!res) {
        showToast(t('routing.missingCoords', { count: ids.length }), 'error')
        return
      }
      setDayResults(prev => ({ ...prev, [key]: res }))
      // reorder the assignment to the optimized order
      setAssignments(prev => ({ ...prev, [key]: res.order }))
      showToast(t('routing.daySaved'), 'success')
    } catch (err: any) {
      showToast(err.error || t('routing.optimizeFailed'), 'error')
    } finally {
      setSavingDay(null)
    }
  }

  const plannedDays = days.filter(d => (assignments[dayKey(d)] || []).length > 0)
  const totalCompanies = days.reduce((s, d) => s + (assignments[dayKey(d)] || []).length, 0)
  const totalKm = days.reduce((s, d) => s + (dayResults[dayKey(d)]?.km || 0), 0)
  const fuelLiters =
    transport?.consumption_l_per_100km != null && totalKm > 0
      ? (totalKm * transport.consumption_l_per_100km) / 100
      : null

  // One click: optimize every planned day that isn't computed yet, then persist
  // the whole week. No need to "save" each day individually first.
  const handlePlanWeek = async () => {
    if (totalCompanies === 0) return
    if (!start) {
      showToast(t('routing.setStartFirst'), 'error')
      return
    }
    if (!inspectorId) {
      showToast(t('routing.noOfficerAssigned'), 'error')
      return
    }
    setPlanningWeek(true)
    try {
      // Optimize each planned day in place (reuse already-computed days).
      const computed: Record<string, DayResult> = { ...dayResults }
      const nextAssignments: Record<string, string[]> = { ...assignments }
      for (const d of plannedDays) {
        const key = dayKey(d)
        if (computed[key]) continue
        const res = await optimizeDay(key)
        if (!res) continue
        computed[key] = res
        nextAssignments[key] = res.order
      }
      setDayResults(computed)
      setAssignments(nextAssignments)

      const payloadDays = days
        .map(d => {
          const key = dayKey(d)
          const res = computed[key]
          const ids = nextAssignments[key] || []
          return {
            date: key,
            km: res?.km,
            stops: ids.map((id, i) => ({
              itemId: id,
              position: i + 1,
              distanceFromPrevious: res?.stops.find(s => s.itemId === id)?.distanceFromPrevious,
            })),
          }
        })
        .filter(d => d.stops.length > 0)

      await savePlan.mutateAsync({
        boardId: board.id,
        inspectorId,
        weekStart: weekStartKey,
        days: payloadDays,
      })
      showToast(t('routing.weekPlanned'), 'success')
    } catch (err: any) {
      showToast(err.error || t('routing.optimizeFailed'), 'error')
    } finally {
      setPlanningWeek(false)
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-light flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-monday-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate">
              {t('routing.weekPlanning')}
            </h3>
            <p className="text-xs text-text-tertiary truncate">{board.name}</p>
          </div>
        </div>
        {/* Week nav */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-text-primary px-2 whitespace-nowrap">
            {shortDate(days[0])} – {shortDate(days[6])}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {routable && !start && (
        <div className="flex items-center gap-2 px-5 py-2 bg-orange-500/10 border-b border-orange-500/30 text-sm text-orange-500 flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
          {t('routing.setStartFirst')}
        </div>
      )}

      {!routable ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{t('routing.noLocationTitle')}</p>
            <p className="text-xs text-text-tertiary mt-1 max-w-sm">
              {t('routing.noLocationHint')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            {/* Week grid */}
            <div className="p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {days.map((d, i) => {
                  const key = dayKey(d)
                  const ids = assignments[key] || []
                  const res = dayResults[key]
                  const isSelected = i === selectedDay
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedDay(i)}
                      className={cn(
                        'rounded-xl border p-3 cursor-pointer transition-colors min-h-[120px]',
                        isSelected
                          ? 'border-monday-primary bg-monday-primary/5'
                          : 'border-border-light bg-bg-primary hover:border-border-medium'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold text-text-primary">
                            {DAY_LABELS_KA[i]}
                          </span>
                          <span className="text-xs text-text-tertiary ml-1.5">{shortDate(d)}</span>
                        </div>
                        {ids.length > 0 && (
                          <span className="text-[11px] text-text-tertiary">
                            {t('routing.companiesCount', { count: ids.length })}
                          </span>
                        )}
                      </div>

                      {ids.length === 0 ? (
                        <p className="text-xs text-text-tertiary py-2">{t('routing.dayEmpty')}</p>
                      ) : (
                        <div className="space-y-1">
                          {ids.map((id, idx) => (
                            <div
                              key={id}
                              className="flex items-center gap-1.5 text-xs text-text-primary"
                            >
                              <span className="w-4 h-4 rounded-full bg-monday-primary text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="flex-1 truncate">{nameOf(id)}</span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  removeFromDay(key, id)
                                }}
                                className="text-text-tertiary hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border-light">
                            {res ? (
                              <span className="text-[11px] text-green-600 font-medium">
                                {res.km.toFixed(1)} კმ
                              </span>
                            ) : (
                              <span className="text-[11px] text-text-tertiary">—</span>
                            )}
                            <div className="flex items-center gap-2.5">
                              {res && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation()
                                    setMapDayKey(key)
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline"
                                >
                                  <MapPin className="w-3 h-3" />
                                  {t('routing.viewOnMap')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  saveDay(key)
                                }}
                                disabled={savingDay === key}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline disabled:opacity-50"
                              >
                                {savingDay === key ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RouteIcon className="w-3 h-3" />
                                )}
                                {t('routing.saveDay')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Company pool */}
            <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border-light flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-border-light flex-shrink-0">
                <p className="text-sm font-medium text-text-primary">
                  {t('routing.assignTo', { day: DAY_LABELS_KA[selectedDay] })}
                </p>
                <p className="text-xs text-text-tertiary">{t('routing.clickToAssign')}</p>
                {geocodable.length > 0 && (
                  <button
                    type="button"
                    onClick={geocodeAddresses}
                    disabled={geocoding}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/30 text-xs font-medium hover:bg-orange-500/20 disabled:opacity-60 transition-colors"
                  >
                    {geocoding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {geoProgress.done}/{geoProgress.total}
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5" />
                        {t('routing.geocodeAddresses', { count: geocodable.length })}
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
                  </div>
                ) : (
                  items.map(ri => {
                    const assignedDay = dayOfItem(ri.item.id)
                    const onSelected = assignedDay === selectedDay
                    const hasCoords = !!coordsOf(ri.item.id)
                    return (
                      <button
                        key={ri.item.id}
                        type="button"
                        onClick={() => toggleItemOnSelectedDay(ri.item.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors',
                          onSelected
                            ? 'bg-monday-primary/10 border border-monday-primary/30'
                            : 'hover:bg-bg-hover border border-transparent'
                        )}
                      >
                        <span
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                            onSelected
                              ? 'bg-monday-primary border-monday-primary text-white'
                              : 'border-border-medium'
                          )}
                        >
                          {onSelected ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3 text-text-tertiary" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-text-primary truncate">
                            {ri.item.name}
                          </span>
                          {!hasCoords && (
                            <span className="block text-[10px] text-orange-500">
                              {t('routing.noCoords')}
                            </span>
                          )}
                        </span>
                        {assignedDay >= 0 && assignedDay !== selectedDay && (
                          <span className="text-[10px] text-text-tertiary flex-shrink-0">
                            {DAY_LABELS_KA[assignedDay]}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer: totals + plan week */}
          <div className="flex items-center gap-4 px-5 py-3 border-t border-border-light flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">
                {t('routing.weekCompanies', { count: totalCompanies })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Navigation className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">{totalKm.toFixed(1)} კმ</span>
            </div>
            {fuelLiters !== null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Fuel className="w-4 h-4 text-monday-primary" />
                <span className="font-medium text-text-primary">
                  {t('routing.fuelLiters', { liters: fuelLiters.toFixed(1) })}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handlePlanWeek}
              disabled={totalCompanies === 0 || planningWeek}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {planningWeek ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {t('routing.planWeek')}
            </button>
          </div>
        </>
      )}

      {mapDayKey &&
        (() => {
          const dr = dayResults[mapDayKey]
          const ids = assignments[mapDayKey] || []
          const stops: RouteMapStop[] = ids
            .map(id => {
              const c = coordsOf(id)
              return c ? { id, name: nameOf(id), lat: c.lat, lng: c.lng } : null
            })
            .filter((s): s is RouteMapStop => s !== null)
          const km = dr?.km ?? 0
          const fuel =
            transport?.consumption_l_per_100km != null && km > 0
              ? (km * transport.consumption_l_per_100km) / 100
              : null
          const idx = days.findIndex(d => dayKey(d) === mapDayKey)
          const title = `${DAY_LABELS_KA[idx] ?? ''} ${shortDate(days[idx] ?? monday)}`
          return (
            <RouteMapModal
              title={title}
              km={km}
              returnKm={dr?.returnKm}
              fuelLiters={fuel}
              stops={stops}
              start={
                start
                  ? { lat: start.lat, lng: start.lng, name: t('routing.startPoint') }
                  : undefined
              }
              geometry={dr?.geometry}
              onClose={() => setMapDayKey(null)}
            />
          )
        })()}
    </div>
  )

  return createPortal(content, document.body)
}
