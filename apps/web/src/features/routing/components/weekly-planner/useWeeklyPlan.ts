'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardColumns } from '@/features/boards/hooks/useBoardColumns'
import { useToast } from '@/components/ui-monday/Toast'
import { parseCoordinates } from '@/lib/geo-utils'
import { resolveLocation, DEFAULT_GEOCODE_CITY } from '../../lib/geocode'
import { resolveLocationColumns } from '../../lib/location-columns'
import { useSetItemCoords } from '../../hooks/useSetItemCoords'
import { useRoutingItems } from '../../hooks/useRoutingData'
import { useInspectorLocation } from '../../hooks/useInspectorLocation'
import { useOfficerTransport } from '../../hooks/useOfficerTransport'
import { useRouteOptimizer } from '../../hooks/useRouteOptimizer'
import { useWeekPlan, useSaveWeekPlan } from '../../hooks/useWeekPlan'
import { useWeekExecution } from '../../hooks/useWeekExecution'
import { mondayOf, weekDays, dayKey } from '../../lib/week'
import type { Board } from '@/types/board'
import type { DayResult, ExtraVisit } from './types'

/**
 * All state + business logic for the weekly planner: week navigation, per-day
 * company assignments, single-day and whole-week optimization/persistence,
 * address geocoding, and ad-hoc extra visits. The component tree consumes this
 * and stays purely presentational.
 */
export function useWeeklyPlan(board: Board, opts?: { initialWeekOffset?: number }) {
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

  const [weekOffset, setWeekOffset] = useState(opts?.initialWeekOffset ?? 0)
  const [selectedDay, setSelectedDay] = useState(0) // index 0..6
  // day key -> company ids assigned to that day
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [dayResults, setDayResults] = useState<Record<string, DayResult>>({})
  const [savingDay, setSavingDay] = useState<string | null>(null)
  const [planningWeek, setPlanningWeek] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 })
  const [mapDayKey, setMapDayKey] = useState<string | null>(null)
  const [addingUnplanned, setAddingUnplanned] = useState(false)
  const [extraVisits, setExtraVisits] = useState<ExtraVisit[]>([])

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(() => weekDays(monday), [monday])
  const selectedKey = dayKey(days[selectedDay])
  const weekStartKey = dayKey(monday)

  const { data: existingPlan } = useWeekPlan(inspectorId, weekStartKey)
  const { data: execution } = useWeekExecution(inspectorId, board.id, weekStartKey)
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

  // Mid-week ad-hoc visit: enabled only for the current week (weekOffset 0).
  const isCurrentWeek = weekOffset === 0
  const todayKey = dayKey(new Date())
  const todayIndex = days.findIndex(d => dayKey(d) === todayKey)
  const assignedThisWeek = useMemo(() => new Set(Object.values(assignments).flat()), [assignments])
  const extraIds = useMemo(() => new Set(extraVisits.map(e => e.itemId)), [extraVisits])
  const unplannedCandidates = useMemo(
    () => items.filter(ri => !assignedThisWeek.has(ri.item.id) && !extraIds.has(ri.item.id)),
    [items, assignedThisWeek, extraIds]
  )
  // Add an extra (unplanned) visit as its own entry, with a route computed from
  // the officer's start to that object. Kept separate from the planned days.
  const addExtraVisit = async (itemId: string) => {
    if (extraVisits.some(e => e.itemId === itemId)) {
      setAddingUnplanned(false)
      return
    }
    const name = nameOf(itemId)
    setExtraVisits(prev => [...prev, { itemId, name, km: null, loading: true }])
    setAddingUnplanned(false)

    const dest = coordsOf(itemId)
    let km: number | null = null
    if (start && dest) {
      try {
        const res = await fetch('/api/routing/route-geometry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locations: [
              { lat: start.lat, lng: start.lng },
              { lat: dest.lat, lng: dest.lng },
            ],
          }),
        })
        if (res.ok) km = (await res.json()).distanceKm ?? null
      } catch {
        // leave km null — distance unavailable
      }
    }
    setExtraVisits(prev => prev.map(e => (e.itemId === itemId ? { ...e, km, loading: false } : e)))
  }

  const removeExtraVisit = (itemId: string) =>
    setExtraVisits(prev => prev.filter(e => e.itemId !== itemId))

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

  return {
    // navigation + week
    weekOffset,
    setWeekOffset,
    days,
    monday,
    isCurrentWeek,
    weekStartKey,
    inspectorId,
    planStatus: (existingPlan?.status ?? 'draft') as 'draft' | 'submitted' | 'approved',
    planSnapshot: existingPlan?.plan ?? null,
    // selection
    selectedDay,
    setSelectedDay,
    // data
    items,
    isLoading,
    routable,
    start,
    transport,
    execution,
    // assignments / results
    assignments,
    dayResults,
    // helpers
    nameOf,
    coordsOf,
    dayOfItem,
    // day actions
    toggleItemOnSelectedDay,
    removeFromDay,
    saveDay,
    savingDay,
    // week action
    handlePlanWeek,
    planningWeek,
    totalCompanies,
    totalKm,
    fuelLiters,
    // geocoding
    geocodable,
    geocodeAddresses,
    geocoding,
    geoProgress,
    // extra visits
    extraVisits,
    addExtraVisit,
    removeExtraVisit,
    addingUnplanned,
    setAddingUnplanned,
    unplannedCandidates,
    todayIndex,
    // map
    mapDayKey,
    setMapDayKey,
  }
}

export type WeeklyPlanController = ReturnType<typeof useWeeklyPlan>
