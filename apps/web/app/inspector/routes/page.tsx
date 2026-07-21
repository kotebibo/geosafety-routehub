'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  Check,
  Clock,
  Loader2,
  MapPin,
  Play,
  Route as RouteIcon,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui-monday/Toast'
import { PageHeader, StatCard, EmptyState } from '@/shared/components/ui'
import { InspectorRoutesSkeleton } from '@/features/inspector/components/InspectorRoutesSkeleton'
import { useOfficers } from '@/features/routing/hooks/useOfficers'
import {
  useMyRoutes,
  useUpdateRouteStatus,
  useUpdateStopStatus,
  type OfficerRoute,
  type RouteStatus,
} from '@/features/routing/hooks/useMyRoutes'
import { weekStartOf, dayLabelOf, addDays, shortDate } from '@/features/routing/lib/week'

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  completed: 'bg-green-500/10 text-green-500 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/30',
}

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
  const canExecute = !!user?.id && inspectorId === user.id

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
                    <RouteCard
                      key={route.id}
                      route={route}
                      inspectorId={inspectorId}
                      canExecute={canExecute}
                    />
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
  inspectorId: string
  canExecute: boolean
}

function RouteCard({ route, inspectorId, canExecute }: RouteCardProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const updateRoute = useUpdateRouteStatus(inspectorId)
  const updateStop = useUpdateStopStatus(inspectorId)

  const visited = route.stops.filter(s => s.status === 'visited').length
  const status = route.status || 'planned'
  const isInProgress = status === 'in_progress'

  const setRouteStatus = async (next: RouteStatus, successKey: string) => {
    try {
      await updateRoute.mutateAsync({ routeId: route.id, status: next })
      showToast(t(successKey), 'success')
    } catch (err: any) {
      showToast(err.error || t('inspectorRoutes.updateFailed'), 'error')
    }
  }

  const toggleStop = async (stopId: string, current: string | null) => {
    if (!canExecute || !isInProgress) return
    try {
      await updateStop.mutateAsync({
        stopId,
        status: current === 'visited' ? 'pending' : 'visited',
      })
    } catch (err: any) {
      showToast(err.error || t('inspectorRoutes.updateFailed'), 'error')
    }
  }

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
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0',
            STATUS_BADGE[status] || STATUS_BADGE.planned
          )}
        >
          {t(`inspectorRoutes.status.${status === 'in_progress' ? 'inProgress' : status}`)}
        </span>
      </div>

      {/* Stops */}
      <div className="space-y-1 mb-3">
        {route.stops.map(stop => {
          const done = stop.status === 'visited'
          const interactive = canExecute && isInProgress
          return (
            <button
              key={stop.id}
              type="button"
              disabled={!interactive || updateStop.isPending}
              onClick={() => toggleStop(stop.id, stop.status)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                interactive ? 'hover:bg-bg-hover cursor-pointer' : 'cursor-default',
                done && 'opacity-60'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border',
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-border-medium text-text-tertiary'
                )}
              >
                {done ? <Check className="w-3 h-3" /> : stop.position}
              </span>
              <span
                className={cn('flex-1 truncate text-sm text-text-primary', done && 'line-through')}
              >
                {stop.name || t('inspectorRoutes.unknownStop')}
              </span>
              {stop.distanceFromPrevious != null && (
                <span className="text-[11px] text-text-tertiary flex-shrink-0">
                  {stop.distanceFromPrevious.toFixed(1)} {t('inspectorRoutes.km')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Execution controls (own routes only) */}
      {canExecute && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-light">
          {status === 'planned' && (
            <button
              type="button"
              disabled={updateRoute.isPending}
              onClick={() => setRouteStatus('in_progress', 'inspectorRoutes.routeStarted')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-monday-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Play className="w-3.5 h-3.5" />
              {t('inspectorRoutes.startRoute')}
            </button>
          )}
          {isInProgress && (
            <>
              <span className="text-xs text-text-secondary">
                {t('inspectorRoutes.progress', { done: visited, total: route.stops.length })}
              </span>
              <button
                type="button"
                disabled={updateRoute.isPending}
                onClick={() => setRouteStatus('completed', 'inspectorRoutes.routeCompleted')}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                {t('inspectorRoutes.completeRoute')}
              </button>
            </>
          )}
          {status === 'completed' && (
            <span className="text-xs text-green-500 inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {t('inspectorRoutes.allDone')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
