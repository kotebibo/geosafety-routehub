'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Send,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui-monday/Toast'
import { useOfficerBoard } from '../../hooks/useOfficerBoard'
import { useWeeklyPlan } from '../weekly-planner/useWeeklyPlan'
import { useWeekPlanAction } from '../../hooks/useWeekPlan'
import { DayCard } from '../weekly-planner/DayCard'
import { CompanyPool } from '../weekly-planner/CompanyPool'
import { DayRouteMapModal } from '../weekly-planner/DayRouteMapModal'
import { RouteMapModal, type RouteMapStop } from '../RouteMapModal'
import { dayKey, shortDate } from '../../lib/week'

// Soft-UI page for officers to plan NEXT week and send it to the admin.
export function OfficerPlanPage() {
  const t = useTranslations()
  const { showToast } = useToast()
  const { board, isLoading: boardLoading } = useOfficerBoard()

  if (boardLoading) return <PageSpinner />
  if (!board)
    return <EmptyShell title={t('officerPlan.noBoardTitle')} hint={t('officerPlan.noBoardHint')} />
  return <PlanBody board={board} showToast={showToast} t={t} />
}

interface PlanBodyProps {
  board: NonNullable<ReturnType<typeof useOfficerBoard>['board']>
  showToast: (m: string, type?: 'success' | 'error') => void
  t: ReturnType<typeof useTranslations>
}

function PlanBody({ board, showToast, t }: PlanBodyProps) {
  // Officers plan only NEXT week (offset 1).
  const c = useWeeklyPlan(board, { initialWeekOffset: 1 })
  const submit = useWeekPlanAction()
  const [objectsMap, setObjectsMap] = useState(false)

  const locked = c.planStatus !== 'draft'
  const weekLabel = `${shortDate(c.days[0])} – ${shortDate(c.days[6])}`

  // One tap: optimize + save the whole week, then send the request to the admin.
  const handleSend = async () => {
    if (c.totalCompanies === 0) return
    await c.handlePlanWeek()
    try {
      await submit.mutateAsync({
        inspectorId: c.inspectorId,
        weekStart: c.weekStartKey,
        action: 'submit',
      })
      showToast(t('officerPlan.sent'), 'success')
    } catch (err: any) {
      showToast(err?.error || t('officerPlan.sendFailed'), 'error')
    }
  }

  const allObjectStops: RouteMapStop[] = c.items
    .map((ri): RouteMapStop | null => {
      const co = c.coordsOf(ri.item.id)
      return co ? { id: ri.item.id, name: ri.item.name, lat: co.lat, lng: co.lng } : null
    })
    .filter((s): s is RouteMapStop => s !== null)

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header — soft card */}
        <div className="rounded-2xl bg-bg-primary border border-border-light p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-5 h-5 text-monday-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-text-primary">{t('officerPlan.title')}</h1>
                <p className="text-sm text-text-secondary">
                  {t('officerPlan.nextWeek')} · {weekLabel}
                </p>
              </div>
            </div>
            <StatusPill status={c.planStatus} t={t} />
          </div>

          {/* Stat chips */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatChip icon={MapPin} label={t('officerPlan.objects')} value={c.totalCompanies} />
            <StatChip
              icon={Navigation}
              label={t('inspectorRoutes.km')}
              value={c.totalKm.toFixed(1)}
            />
            <StatChip
              icon={Sparkles}
              label={t('officerPlan.fuelL')}
              value={c.fuelLiters != null ? c.fuelLiters.toFixed(1) : '—'}
            />
            <button
              type="button"
              onClick={() => setObjectsMap(true)}
              disabled={allObjectStops.length === 0}
              className="rounded-xl bg-monday-primary/5 border border-monday-primary/20 px-3 py-2.5 text-left hover:bg-monday-primary/10 disabled:opacity-50 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-monday-primary">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-semibold">{t('officerPlan.objectsOnMap')}</span>
              </div>
            </button>
          </div>
        </div>

        {locked && <LockedBanner status={c.planStatus} snapshot={c.planSnapshot} t={t} />}

        {!c.routable ? (
          <EmptyShell title={t('routing.noLocationTitle')} hint={t('routing.noLocationHint')} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            {/* Week grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              {c.days.map((d, i) => (
                <DayCard
                  key={dayKey(d)}
                  date={d}
                  dayIndex={i}
                  ids={c.assignments[dayKey(d)] || []}
                  result={c.dayResults[dayKey(d)]}
                  isSelected={i === c.selectedDay}
                  saving={c.savingDay === dayKey(d)}
                  nameOf={c.nameOf}
                  onSelect={() => c.setSelectedDay(i)}
                  onRemove={id => !locked && c.removeFromDay(dayKey(d), id)}
                  onSaveDay={() => !locked && c.saveDay(dayKey(d))}
                  onViewMap={() => c.setMapDayKey(dayKey(d))}
                />
              ))}
            </div>

            {/* Object pool — hidden once locked (read-only plan) */}
            {!locked && (
              <div className="rounded-2xl bg-bg-primary border border-border-light shadow-sm overflow-hidden h-fit lg:sticky lg:top-4">
                <CompanyPool
                  items={c.items}
                  isLoading={c.isLoading}
                  selectedDay={c.selectedDay}
                  dayOfItem={c.dayOfItem}
                  hasCoords={id => !!c.coordsOf(id)}
                  geocodable={c.geocodable}
                  geocoding={c.geocoding}
                  geoProgress={c.geoProgress}
                  onToggle={c.toggleItemOnSelectedDay}
                  onGeocode={c.geocodeAddresses}
                />
              </div>
            )}
          </div>
        )}

        {/* Send-to-admin bar */}
        {!locked && c.routable && (
          <div className="sticky bottom-4 z-10">
            <div className="rounded-2xl bg-bg-primary border border-border-light shadow-lg p-3 flex items-center gap-3 flex-wrap">
              <p className="text-sm text-text-secondary flex-1 min-w-0">
                {t('officerPlan.sendHint')}
              </p>
              <button
                type="button"
                onClick={handleSend}
                disabled={c.totalCompanies === 0 || c.planningWeek || submit.isPending}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white shadow-sm',
                  'bg-monday-primary hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.97]'
                )}
              >
                {c.planningWeek || submit.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {t('officerPlan.sendToAdmin')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Per-day route map */}
      {c.mapDayKey && (
        <DayRouteMapModal
          dayKeyValue={c.mapDayKey}
          days={c.days}
          monday={c.monday}
          result={c.dayResults[c.mapDayKey]}
          ids={c.assignments[c.mapDayKey] || []}
          coordsOf={c.coordsOf}
          nameOf={c.nameOf}
          consumption={c.transport?.consumption_l_per_100km ?? null}
          start={c.start}
          onClose={() => c.setMapDayKey(null)}
        />
      )}

      {/* All my objects on the map (pins) */}
      {objectsMap && (
        <RouteMapModal
          title={t('officerPlan.objectsOnMap')}
          km={0}
          fuelLiters={null}
          stops={allObjectStops}
          start={
            c.start
              ? { lat: c.start.lat, lng: c.start.lng, name: t('routing.startPoint') }
              : undefined
          }
          onClose={() => setObjectsMap(false)}
        />
      )}
    </div>
  )
}

function StatusPill({
  status,
  t,
}: {
  status: 'draft' | 'submitted' | 'approved'
  t: ReturnType<typeof useTranslations>
}) {
  const map = {
    draft: {
      cls: 'bg-bg-tertiary text-text-secondary',
      icon: Clock,
      key: 'officerPlan.statusDraft',
    },
    submitted: {
      cls: 'bg-amber-500/15 text-amber-600 border border-amber-500/30',
      icon: Send,
      key: 'officerPlan.statusSubmitted',
    },
    approved: {
      cls: 'bg-green-500/15 text-green-600 border border-green-500/30',
      icon: CheckCircle2,
      key: 'officerPlan.statusApproved',
    },
  } as const
  const s = map[status]
  const Icon = s.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
        s.cls
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {t(s.key)}
    </span>
  )
}

function LockedBanner({
  status,
  snapshot,
  t,
}: {
  status: 'submitted' | 'approved' | 'draft'
  snapshot: { fuel_liters: number | null; fuel_cost: number | null } | null
  t: ReturnType<typeof useTranslations>
}) {
  const approved = status === 'approved'
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3 border flex items-center gap-3',
        approved
          ? 'bg-green-500/10 border-green-500/30 text-green-600'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
      )}
    >
      {approved ? (
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
      ) : (
        <Clock className="w-5 h-5 flex-shrink-0" />
      )}
      <p className="text-sm font-medium">
        {approved ? t('officerPlan.approvedBanner') : t('officerPlan.submittedBanner')}
        {approved && snapshot?.fuel_cost != null && (
          <span className="ml-1 opacity-80">
            · {snapshot.fuel_liters?.toFixed(1)} {t('officerPlan.fuelL')} ·{' '}
            {snapshot.fuel_cost.toFixed(1)} ₾
          </span>
        )}
      </p>
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border-light px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-tertiary mb-0.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold text-text-primary">{value}</span>
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
    </div>
  )
}

function EmptyShell({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-bg-primary border border-border-light p-10 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3">
        <MapPin className="w-6 h-6 text-orange-500" />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-tertiary mt-1 max-w-sm mx-auto">{hint}</p>
    </div>
  )
}
