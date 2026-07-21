'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Check, Clock, Loader2, MapPin, Route as RouteIcon, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, StatCard, EmptyState } from '@/shared/components/ui'
import { InspectorRoutesSkeleton } from '@/features/inspector/components/InspectorRoutesSkeleton'
import { useOfficers } from '@/features/routing/hooks/useOfficers'
import { useMyRoutes, type OfficerRoute } from '@/features/routing/hooks/useMyRoutes'
import { RouteMapModal } from '@/features/routing/components/RouteMapModal'
import {
  stopVisitState,
  STOP_STATE_CLASS,
  type StopVisitState,
} from '@/features/routing/lib/stop-state'
import { weekStartOf, dayLabelOf, addDays, shortDate } from '@/features/routing/lib/week'

function shortDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return shortDate(new Date(y, m - 1, d))
}

export default function InspectorRoutesPage() {
  const { user, isAdmin, isDispatcher, loading: authLoading } = useAuth()
  const t = useTranslations()
  const isManager = isAdmin || isDispatcher

  // Managers pick which officer to inspect; officers view their own routes.
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const { data: officers = [] } = useOfficers()
  useEffect(() => {
    if (isManager && !selectedOfficer && officers.length > 0) setSelectedOfficer(officers[0].id)
  }, [isManager, selectedOfficer, officers])

  const inspectorId = isManager ? selectedOfficer : user?.id || ''

  const { data, isLoading } = useMyRoutes(inspectorId)
  const routes = data?.routes ?? []

  const stats = useMemo(
    () => ({
      total: routes.length,
      planned: routes.filter(r => r.status === 'planned').length,
      inProgress: routes.filter(r => r.status === 'in_progress').length,
      completed: routes.filter(r => r.status === 'completed').length,
    }),
    [routes]
  )

  // Group routes (one per day) into weeks, ascending.
  const weeks = useMemo(() => {
    const map = new Map<string, OfficerRoute[]>()
    for (const r of routes) {
      const wk = weekStartOf(r.date)
      if (!map.has(wk)) map.set(wk, [])
      map.get(wk)!.push(r)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStart, list]) => ({
        weekStart,
        routes: list.sort((a, b) => a.date.localeCompare(b.date)),
      }))
  }, [routes])

  if (authLoading) return <InspectorRoutesSkeleton />

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title={t('inspectorRoutes.title')}
        description={
          isManager ? t('inspectorRoutes.managerDescription') : t('inspectorRoutes.description')
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Manager officer picker */}
        {isManager && (
          <div className="mb-6 flex items-center gap-2">
            <User className="w-4 h-4 text-text-tertiary" />
            <label className="text-sm text-text-secondary">{t('inspectorRoutes.officer')}</label>
            <select
              value={selectedOfficer}
              onChange={e => setSelectedOfficer(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border-light bg-bg-primary text-sm text-text-primary"
            >
              {officers.length === 0 && <option value="">{t('inspectorRoutes.noOfficers')}</option>}
              {officers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.full_name || o.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={t('inspectorRoutes.totalRoutes')}
            value={stats.total}
            icon={RouteIcon}
            color="blue"
          />
          <StatCard
            label={t('inspectorRoutes.planned')}
            value={stats.planned}
            icon={Calendar}
            color="purple"
          />
          <StatCard
            label={t('inspectorRoutes.inProgress')}
            value={stats.inProgress}
            icon={Clock}
            color="amber"
          />
          <StatCard
            label={t('inspectorRoutes.completed')}
            value={stats.completed}
            icon={MapPin}
            color="green"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
          </div>
        ) : routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="w-16 h-16" />}
            title={t('inspectorRoutes.emptyTitle')}
            description={
              isManager ? t('inspectorRoutes.emptyManager') : t('inspectorRoutes.emptyDescription')
            }
          />
        ) : (
          <div className="space-y-8">
            {weeks.map(week => (
              <div key={week.weekStart}>
                <h2 className="text-sm font-semibold text-text-secondary mb-3">
                  {t('inspectorRoutes.weekOf', {
                    from: shortDateStr(week.weekStart),
                    to: shortDateStr(addDays(week.weekStart, 6)),
                  })}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {week.routes.map(route => (
                    <RouteCard key={route.id} route={route} start={data?.start ?? null} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface RouteCardProps {
  route: OfficerRoute
  start: { lat: number; lng: number } | null
}

// Route-level state derived from its stops (check-in driven): all done → done,
// any started → in_progress, else pending.
function routeVisitState(route: OfficerRoute): StopVisitState {
  const states = route.stops.map(s => stopVisitState(s.status))
  if (states.length > 0 && states.every(s => s === 'done')) return 'done'
  if (states.some(s => s === 'in_progress' || s === 'done')) return 'in_progress'
  return 'pending'
}

const STATE_LABEL_KEY: Record<StopVisitState, string> = {
  pending: 'inspectorRoutes.status.planned',
  in_progress: 'inspectorRoutes.status.inProgress',
  done: 'inspectorRoutes.status.completed',
}

function RouteCard({ route, start }: RouteCardProps) {
  const t = useTranslations()
  const [mapOpen, setMapOpen] = useState(false)

  const doneCount = route.stops.filter(s => stopVisitState(s.status) === 'done').length
  const state = routeVisitState(route)
  const hasCoords = route.stops.some(s => s.lat != null && s.lng != null)

  return (
    <div className="bg-bg-primary rounded-xl border border-border-light p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {dayLabelOf(route.date)}
            </span>
            <span className="text-xs text-text-tertiary">{shortDateStr(route.date)}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {t('inspectorRoutes.stopsCount', { count: route.stops.length })}
            </span>
            <span className="inline-flex items-center gap-1">
              <RouteIcon className="w-3 h-3" />
              {(route.totalDistanceKm ?? 0).toFixed(1)} {t('inspectorRoutes.km')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasCoords && (
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              {t('routing.viewOnMap')}
            </button>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-medium',
              STOP_STATE_CLASS[state]
            )}
          >
            {t(STATE_LABEL_KEY[state])} {doneCount}/{route.stops.length}
          </span>
        </div>
      </div>

      {/* Stops — colored by check-in state (read-only) */}
      <div className="space-y-1">
        {route.stops.map(stop => {
          const st = stopVisitState(stop.status)
          const done = st === 'done'
          return (
            <div key={stop.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border',
                  st === 'done'
                    ? 'bg-green-500 border-green-500 text-white'
                    : st === 'in_progress'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-border-medium text-text-tertiary'
                )}
              >
                {done ? <Check className="w-3 h-3" /> : stop.position}
              </span>
              <span className={cn('flex-1 truncate text-text-primary', done && 'line-through')}>
                {stop.name || t('inspectorRoutes.unknownStop')}
              </span>
              {stop.durationMinutes != null && (
                <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {t('routing.stopDuration', { min: stop.durationMinutes })}
                </span>
              )}
              {stop.distanceFromPrevious != null && (
                <span className="text-[11px] text-text-tertiary flex-shrink-0">
                  {stop.distanceFromPrevious.toFixed(1)} {t('inspectorRoutes.km')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {mapOpen && (
        <RouteMapModal
          title={`${dayLabelOf(route.date)} ${shortDateStr(route.date)}`}
          km={route.totalDistanceKm ?? 0}
          fuelLiters={null}
          stops={route.stops
            .filter(s => s.lat != null && s.lng != null)
            .map(s => ({
              id: s.id,
              name: s.name || '',
              lat: s.lat as number,
              lng: s.lng as number,
              distanceKm: s.distanceFromPrevious,
              status: s.status,
              durationMinutes: s.durationMinutes,
            }))}
          start={
            start ? { lat: start.lat, lng: start.lng, name: t('routing.startPoint') } : undefined
          }
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  )
}
