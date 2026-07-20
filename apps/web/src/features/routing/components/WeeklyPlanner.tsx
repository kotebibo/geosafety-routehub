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
import { parseCoordinates } from '@/lib/geo-utils'
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
  km: number
  stops: { itemId: string; distanceFromPrevious: number }[]
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

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(() => weekDays(monday), [monday])
  const selectedKey = dayKey(days[selectedDay])
  const weekStartKey = dayKey(monday)

  const { data: existingPlan } = useWeekPlan(inspectorId, weekStartKey)
  const savePlan = useSaveWeekPlan()

  // Reset on week switch, then prefill once from the saved plan for that week.
  const loadedRef = useRef('')
  useEffect(() => {
    setAssignments({})
    setDayResults({})
    loadedRef.current = ''
  }, [weekStartKey])
  useEffect(() => {
    if (!existingPlan || existingPlan.weekStart !== weekStartKey) return
    if (loadedRef.current === weekStartKey) return
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

  const coordsColumnId = useMemo(() => {
    const c = columns.find(col => col.column_type === 'checkin')
    return c?.config?.coordinates_column_id as string | undefined
  }, [columns])

  const coordsOf = (itemId: string): { lat: number; lng: number } | null => {
    const ri = items.find(x => x.item.id === itemId)
    if (!ri || !coordsColumnId) return null
    return parseCoordinates(ri.item.data?.[coordsColumnId])
  }
  const nameOf = (itemId: string) => items.find(x => x.item.id === itemId)?.item.name || itemId

  // Which day (index) a company is assigned to, or -1
  const dayOfItem = (itemId: string): number => {
    for (let i = 0; i < 7; i++) {
      if ((assignments[dayKey(days[i])] || []).includes(itemId)) return i
    }
    return -1
  }

  const toggleItemOnSelectedDay = (itemId: string) => {
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
    return {
      order: routeStops.map(s => s.id),
      km: result.totalDistance,
      stops: routeStops.map(s => ({ itemId: s.id, distanceFromPrevious: s.distanceFromPrevious })),
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

      {!start && (
        <div className="flex items-center gap-2 px-5 py-2 bg-orange-500/10 border-b border-orange-500/30 text-sm text-orange-500 flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
          {t('routing.setStartFirst')}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Week grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
    </div>
  )

  return createPortal(content, document.body)
}
