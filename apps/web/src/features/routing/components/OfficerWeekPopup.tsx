'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Navigation, Fuel, CalendarDays, Check, Loader2, MapPin, Coins } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui-monday/Toast'
import { useMyRoutes, type OfficerRoute } from '../hooks/useMyRoutes'
import { useSetOfficerFuelPrice, type OfficerWeekSummary } from '../hooks/useRouteAnalytics'
import { useOfficerWeek, useConfirmCancel } from '../hooks/useOfficerWeek'
import { WeekExtrasSections } from './WeekExtrasSections'
import { WeekComments } from './WeekComments'
import { RouteMapModal } from './RouteMapModal'
import { stopVisitState } from '../lib/stop-state'
import { addDays, dayLabelOf, shortDateStr } from '../lib/week'

interface OfficerWeekPopupProps {
  summary: OfficerWeekSummary
  weekStart: string
  typePrice: number | null
  onClose: () => void
}

export function OfficerWeekPopup({
  summary,
  weekStart,
  typePrice,
  onClose,
}: OfficerWeekPopupProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const { data, isLoading } = useMyRoutes(summary.officerId)
  const officerWeek = useOfficerWeek(summary.officerId, weekStart)
  const confirm = useConfirmCancel()
  const routes = data?.routes ?? []
  const officerStart = data?.start ?? null
  const [mapRoute, setMapRoute] = useState<OfficerRoute | null>(null)
  const [tab, setTab] = useState<'week' | 'failed'>('week')
  const setOfficerPrice = useSetOfficerFuelPrice()
  const failedCount = officerWeek.data?.failed.length ?? 0

  // Per-officer price override (empty → inherits the global price). Cost updates
  // live as the value is typed.
  const [priceInput, setPriceInput] = useState(
    summary.priceOverride != null ? String(summary.priceOverride) : ''
  )
  const effectivePrice = priceInput.trim() !== '' ? Number(priceInput) : typePrice
  const validPrice = effectivePrice != null && !isNaN(effectivePrice) ? effectivePrice : null
  const liveCost = summary.liters != null && validPrice != null ? summary.liters * validPrice : null

  const savePrice = async () => {
    const num = priceInput.trim() === '' ? null : Number(priceInput)
    if (num !== null && (isNaN(num) || num < 0)) {
      showToast(t('routeAnalytics.invalidPrice'), 'error')
      return
    }
    try {
      await setOfficerPrice.mutateAsync({ officerId: summary.officerId, price: num })
      showToast(t('routeAnalytics.priceSaved'), 'success')
    } catch (err: any) {
      showToast(err?.error || t('routeAnalytics.priceSaveFailed'), 'error')
    }
  }

  // Only this week's routes (one per day), ascending.
  const weekRoutes = useMemo(() => {
    const dates = new Set(Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)))
    return routes.filter(r => dates.has(r.date)).sort((a, b) => a.date.localeCompare(b.date))
  }, [routes, weekStart])

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-monday-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary truncate">{summary.name}</h3>
              <p className="text-xs text-text-tertiary truncate">
                {t('routeAnalytics.weekOf', {
                  from: shortDateStr(weekStart),
                  to: shortDateStr(addDays(weekStart, 6)),
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-px bg-border-light border-b border-border-light">
          <Total
            icon={Navigation}
            label={t('routeAnalytics.distanceKm')}
            value={summary.totalKm.toFixed(1)}
          />
          <Total
            icon={Fuel}
            label={t('routeAnalytics.fuelLiters')}
            value={summary.liters != null ? summary.liters.toFixed(1) : '—'}
          />
          <Total
            icon={MapPin}
            label={t('routeAnalytics.stops')}
            value={`${summary.visitedCount}/${summary.stopCount}`}
          />
        </div>

        {/* Fuel: consumption, per-officer price override, live cost */}
        <div className="px-5 py-3 border-b border-border-light space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{t('routeAnalytics.consumption100')}</span>
            <span className="text-text-primary">
              {summary.consumption != null
                ? `${summary.consumption} ${t('routeAnalytics.litersShort')}/100${t('routing.km')}`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-secondary">{t('routeAnalytics.officerPrice')}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                placeholder={typePrice != null ? String(typePrice) : '0.00'}
                className="w-20 px-2 py-1 rounded-xl border border-border-light bg-bg-primary text-sm text-text-primary text-right transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-text-tertiary">{t('routeAnalytics.perLiter')}</span>
              <button
                type="button"
                onClick={savePrice}
                disabled={setOfficerPrice.isPending}
                className="px-2.5 py-1 rounded-lg bg-monday-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
          {priceInput.trim() === '' && typePrice != null && (
            <p className="text-[11px] text-text-tertiary text-right">
              {t('routeAnalytics.inheritsGlobal', { price: typePrice.toFixed(2) })}
            </p>
          )}
          <div className="flex items-center justify-between text-sm font-medium pt-1 border-t border-border-light">
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <Coins className="w-3.5 h-3.5" />
              {t('routeAnalytics.cost')}
            </span>
            <span className="text-text-primary">
              {liveCost != null ? `${liveCost.toFixed(1)} ₾` : '—'}
            </span>
          </div>
        </div>

        {/* Tabs: week plan vs. failed (carried-over, paid-but-unvisited) */}
        <div className="flex items-center gap-1 px-4 pt-3">
          <TabButton active={tab === 'week'} onClick={() => setTab('week')}>
            {t('routeAnalytics.tab.week')}
          </TabButton>
          <TabButton active={tab === 'failed'} onClick={() => setTab('failed')}>
            {t('myWeek.failed')}
            {failedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">
                {failedCount}
              </span>
            )}
          </TabButton>
        </div>

        {/* Per-day breakdown */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === 'failed' ? (
            officerWeek.data ? (
              <WeekExtrasSections data={officerWeek.data} show={['failed']} />
            ) : (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
              </div>
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
            </div>
          ) : weekRoutes.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-8">
              {t('routeAnalytics.noPlan')}
            </p>
          ) : (
            weekRoutes.map(route => (
              <div key={route.id} className="rounded-2xl border border-border-light p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {dayLabelOf(route.date)}
                    </span>
                    <span className="text-xs text-text-tertiary">{shortDateStr(route.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {(route.totalDistanceKm ?? 0).toFixed(1)} {t('routing.km')}
                    </span>
                    {route.stops.some(s => s.lat != null && s.lng != null) && (
                      <button
                        type="button"
                        onClick={() => setMapRoute(route)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-monday-primary hover:underline"
                      >
                        <MapPin className="w-3 h-3" />
                        {t('routing.viewOnMap')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {route.stops.map(stop => {
                    const state = stopVisitState(stop.status)
                    const done = state === 'done'
                    const skipped = stop.status === 'skipped'
                    return (
                      <div
                        key={stop.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                      >
                        <span
                          className={cn(
                            'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold border',
                            done
                              ? 'bg-green-500 border-green-500 text-white'
                              : state === 'in_progress'
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : skipped
                                  ? 'bg-red-500/10 border-red-500/40 text-red-500'
                                  : 'border-border-medium text-text-tertiary'
                          )}
                        >
                          {done ? (
                            <Check className="w-2.5 h-2.5" />
                          ) : skipped ? (
                            <X className="w-2.5 h-2.5" />
                          ) : (
                            stop.position
                          )}
                        </span>
                        <span
                          className={cn(
                            'flex-1 min-w-0 truncate',
                            done && 'text-text-primary line-through',
                            skipped ? 'text-text-secondary' : 'text-text-primary'
                          )}
                        >
                          {stop.name || t('inspectorRoutes.unknownStop')}
                        </span>
                        {/* Deferred: didn't go that day — show it + the reason */}
                        {skipped && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/30 flex-shrink-0">
                            {t('myWeek.deferred')}
                            {stop.skipReason ? ` · ${t(`myWeek.reason.${stop.skipReason}`)}` : ''}
                          </span>
                        )}
                        {stop.durationMinutes != null && (
                          <span className="text-[11px] text-text-tertiary flex-shrink-0">
                            {t('routing.stopDuration', { min: stop.durationMinutes })}
                          </span>
                        )}
                        {stop.distanceFromPrevious != null && (
                          <span className="text-[11px] text-text-tertiary flex-shrink-0">
                            {stop.distanceFromPrevious.toFixed(1)} {t('routing.km')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {/* Unplanned / deviation — admin can confirm canceled (failed → own tab) */}
          {tab === 'week' && officerWeek.data && (
            <div className="mt-4">
              <WeekExtrasSections
                data={officerWeek.data}
                show={['unplanned', 'deviation']}
                onConfirmCancel={id => confirm.mutate(id)}
                confirming={confirm.isPending}
              />
            </div>
          )}

          {/* Plan comments — manager & officer thread */}
          {tab === 'week' && (
            <div className="mt-4">
              <WeekComments inspectorId={summary.officerId} weekStart={weekStart} />
            </div>
          )}
        </div>
      </div>

      {mapRoute && (
        <RouteMapModal
          title={`${dayLabelOf(mapRoute.date)} ${shortDateStr(mapRoute.date)}`}
          km={mapRoute.totalDistanceKm ?? 0}
          fuelLiters={
            summary.consumption != null && mapRoute.totalDistanceKm
              ? (mapRoute.totalDistanceKm * summary.consumption) / 100
              : null
          }
          stops={mapRoute.stops
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
            officerStart
              ? { lat: officerStart.lat, lng: officerStart.lng, name: t('routing.startPoint') }
              : undefined
          }
          consumption={summary.consumption}
          onClose={() => setMapRoute(null)}
        />
      )}
    </div>
  )

  return createPortal(content, document.body)
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-monday-primary/10 text-monday-primary'
          : 'text-text-secondary hover:bg-bg-hover'
      )}
    >
      {children}
    </button>
  )
}

function Total({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Navigation
  label: string
  value: string
}) {
  return (
    <div className="bg-bg-primary px-3 py-2.5 text-center">
      <Icon className="w-4 h-4 text-text-tertiary mx-auto mb-1" />
      <p className="text-sm font-semibold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-tertiary">{label}</p>
    </div>
  )
}
