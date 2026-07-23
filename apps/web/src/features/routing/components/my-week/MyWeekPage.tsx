'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  CalendarCheck,
  Check,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  SkipForward,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui-monday/Toast'
import { useBoardItems } from '@/features/boards/hooks'
import { useBoardColumns } from '@/features/boards/hooks/useBoardColumns'
import { CheckinBottomSheet } from '@/features/boards/components/BoardTable/cells/CheckinBottomSheet'
import { useServerDate } from '@/hooks/useServerDate'
import { useOfficerBoard } from '../../hooks/useOfficerBoard'
import {
  useMyRoutes,
  useUpdateStopStatus,
  type OfficerRoute,
  type RouteStop,
} from '../../hooks/useMyRoutes'
import { useOfficerWeek } from '../../hooks/useOfficerWeek'
import { useCreateExtraVisit } from '../../hooks/useExtraVisits'
import { WeekExtrasSections } from '../WeekExtrasSections'
import { stopVisitState } from '../../lib/stop-state'
import { resolveLocationColumns } from '../../lib/location-columns'
import { parseCoordinates } from '@/lib/geo-utils'
import { mondayOf, dayKey, addDays, shortDate, dayLabelOf } from '../../lib/week'
import type { BoardColumn } from '@/types/board'

const SKIP_REASONS = ['empty', 'closed', 'refused', 'canceled', 'other'] as const
type SkipReason = (typeof SKIP_REASONS)[number]

export function MyWeekPage() {
  const t = useTranslations()
  const { user } = useAuth()
  const { board, isLoading: boardLoading } = useOfficerBoard()
  const { data, isLoading } = useMyRoutes(user?.id || '')
  const { data: items = [] } = useBoardItems(board?.id || '')
  const { data: columns = [] } = useBoardColumns(board?.board_type || 'custom', board?.id || '')

  const checkinColumn = useMemo(
    () => (columns as BoardColumn[]).find(c => c.column_type === 'checkin') ?? null,
    [columns]
  )

  // Current week/day come from the SERVER (Georgia time), so a wrong device
  // clock or a tab left open across midnight can't shift the day. Falls back to
  // the local clock only until the first /api/time response.
  const serverDate = useServerDate()
  const weekStart = serverDate.data?.weekStart ?? dayKey(mondayOf(0))
  const weekEnd = addDays(weekStart, 6)
  const todayKey = serverDate.data?.georgiaDate ?? dayKey(new Date())
  // env: true → check in on a planned stop any day; false → only its planned day.
  const anyDay = process.env.NEXT_PUBLIC_CHECKIN_ANY_DAY === 'true'
  const days = useMemo(
    () =>
      (data?.routes ?? [])
        .filter(r => r.date >= weekStart && r.date <= weekEnd)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data, weekStart, weekEnd]
  )

  const [checkinItemId, setCheckinItemId] = useState<string | null>(null)
  const [deferStop, setDeferStop] = useState<RouteStop | null>(null)
  const [booking, setBooking] = useState(false)
  const officerWeek = useOfficerWeek(user?.id || '', weekStart)

  const stats = useMemo(() => {
    const stops = days.flatMap(d => d.stops)
    return {
      total: stops.length,
      done: stops.filter(s => stopVisitState(s.status) === 'done').length,
      km: days.reduce((s, d) => s + (d.totalDistanceKm ?? 0), 0),
    }
  }, [days])

  const checkinItem = items.find((i: any) => i.id === checkinItemId)

  if (boardLoading || isLoading) return <PageSpinner />

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-monday-primary to-monday-purple p-6 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="pointer-events-none absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white">{t('myWeek.title')}</h1>
                <p className="text-sm text-white/80">
                  {shortDateStr(weekStart)} – {shortDateStr(weekEnd)}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <GlassStat
                icon={Check}
                label={t('myWeek.done')}
                value={`${stats.done}/${stats.total}`}
              />
              <GlassStat icon={MapPin} label={t('officerPlan.objects')} value={stats.total} />
              <GlassStat
                icon={Navigation}
                label={t('inspectorRoutes.km')}
                value={stats.km.toFixed(1)}
              />
            </div>
          </div>
        </div>

        {days.length === 0 ? (
          <div className="rounded-3xl bg-bg-primary border border-border-light p-12 text-center shadow-sm animate-in fade-in duration-500">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-monday-primary/10 flex items-center justify-center mb-4">
              <CalendarCheck className="w-8 h-8 text-monday-primary" />
            </div>
            <p className="text-sm text-text-secondary">{t('myWeek.empty')}</p>
          </div>
        ) : (
          days.map((route, i) => (
            <DaySection
              key={route.id}
              route={route}
              index={i}
              isToday={route.date === todayKey}
              checkinEnabled={anyDay || route.date === todayKey}
              onCheckin={setCheckinItemId}
              onDefer={setDeferStop}
              t={t}
            />
          ))
        )}

        {/* Unplanned / deviation / failed */}
        {officerWeek.data && (
          <WeekExtrasSections data={officerWeek.data} onBook={() => setBooking(true)} />
        )}
      </div>

      {/* Reused board check-in sheet */}
      {checkinItemId && checkinItem && checkinColumn && board && (
        <CheckinBottomSheet
          itemId={checkinItem.id}
          itemName={checkinItem.name || ''}
          boardId={board.id}
          column={checkinColumn}
          row={checkinItem}
          onClose={() => setCheckinItemId(null)}
        />
      )}

      {/* Defer (deviation) modal */}
      {deferStop && (
        <DeferModal
          stop={deferStop}
          inspectorId={user?.id || ''}
          onClose={() => setDeferStop(null)}
          t={t}
        />
      )}

      {/* Book an unplanned visit */}
      {booking && board && (
        <BookUnplannedModal
          board={board}
          items={items}
          columns={columns as BoardColumn[]}
          start={data?.start ?? null}
          inspectorId={user?.id || ''}
          weekStart={weekStart}
          today={todayKey}
          onClose={() => setBooking(false)}
          t={t}
        />
      )}
    </div>
  )
}

function DaySection({
  route,
  index,
  isToday,
  checkinEnabled,
  onCheckin,
  onDefer,
  t,
}: {
  route: OfficerRoute
  index: number
  isToday: boolean
  checkinEnabled: boolean
  onCheckin: (itemId: string) => void
  onDefer: (stop: RouteStop) => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'backwards' }}
      className={cn(
        'rounded-2xl bg-bg-primary overflow-hidden border transition-shadow animate-in fade-in slide-in-from-bottom-2 duration-500',
        isToday
          ? 'border-monday-primary/60 ring-2 ring-monday-primary/20 shadow-md'
          : 'border-border-light shadow-sm hover:shadow-md'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b border-border-light',
          isToday
            ? 'bg-gradient-to-r from-monday-primary/15 to-monday-purple/10'
            : 'bg-bg-secondary/50'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary">{dayLabelOf(route.date)}</span>
          <span className="text-xs text-text-tertiary">{shortDateStr(route.date)}</span>
          {isToday && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-monday-primary text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {t('myWeek.today')}
            </span>
          )}
        </div>
        <span className="text-xs text-text-tertiary">
          {(route.totalDistanceKm ?? 0).toFixed(1)} {t('inspectorRoutes.km')}
        </span>
      </div>
      <div className="divide-y divide-border-light">
        {route.stops.map(stop => (
          <StopRow
            key={stop.id}
            stop={stop}
            checkinEnabled={checkinEnabled}
            onCheckin={onCheckin}
            onDefer={onDefer}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

function StopRow({
  stop,
  checkinEnabled,
  onCheckin,
  onDefer,
  t,
}: {
  stop: RouteStop
  checkinEnabled: boolean
  onCheckin: (itemId: string) => void
  onDefer: (stop: RouteStop) => void
  t: ReturnType<typeof useTranslations>
}) {
  const state = stopVisitState(stop.status)
  const skipped = stop.status === 'skipped'
  const done = state === 'done'
  // Deviations (skipped) can be checked in any day; planned stops obey the day rule.
  const canCheckin = checkinEnabled || skipped

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-secondary/40">
      <span
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold border',
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
          <Check className="w-3.5 h-3.5" />
        ) : skipped ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          stop.position
        )}
      </span>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-text-primary truncate', done && 'line-through opacity-70')}>
          {stop.name || t('inspectorRoutes.unknownStop')}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary mt-0.5">
          {stop.durationMinutes != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('routing.stopDuration', { min: stop.durationMinutes })}
            </span>
          )}
          {skipped && <span className="text-red-500">{t('myWeek.deferred')}</span>}
        </div>
      </div>

      {/* Actions — hidden once done; day-locked stops show a hint instead */}
      {!done &&
        stop.boardItemId &&
        (canCheckin ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onCheckin(stop.boardItemId!)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-monday-primary text-white hover:opacity-90 active:scale-95 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              {t('myWeek.checkin')}
            </button>
            {!skipped && (
              <button
                type="button"
                onClick={() => onDefer(stop)}
                title={t('myWeek.defer')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-text-tertiary hover:bg-bg-hover hover:text-amber-500 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-text-tertiary flex-shrink-0">
            {t('myWeek.dayLocked')}
          </span>
        ))}
    </div>
  )
}

function DeferModal({
  stop,
  inspectorId,
  onClose,
  t,
}: {
  stop: RouteStop
  inspectorId: string
  onClose: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const { showToast } = useToast()
  const setStatus = useUpdateStopStatus(inspectorId)
  const [reason, setReason] = useState<SkipReason>('closed')
  const [note, setNote] = useState('')

  const save = async () => {
    try {
      await setStatus.mutateAsync({
        stopId: stop.id,
        status: 'skipped',
        skipReason: reason,
        skipNote: note.trim() || null,
      })
      showToast(t('myWeek.deferSaved'), 'success')
      onClose()
    } catch (err: any) {
      showToast(err?.error || t('myWeek.deferFailed'), 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-base font-semibold text-text-primary">{t('myWeek.deferTitle')}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-text-secondary truncate">
            {stop.name || t('inspectorRoutes.unknownStop')}
          </p>
          <div className="space-y-1.5">
            {SKIP_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors',
                  reason === r
                    ? 'bg-monday-primary/10 border-monday-primary/40 text-text-primary'
                    : 'border-border-light hover:bg-bg-hover text-text-secondary'
                )}
              >
                {t(`myWeek.reason.${r}`)}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('myWeek.reasonNote')}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border-light bg-bg-primary text-text-primary transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20 resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={setStatus.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {setStatus.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SkipForward className="w-4 h-4" />
            )}
            {t('myWeek.defer')}
          </button>
        </div>
      </div>
    </div>
  )
}

function BookUnplannedModal({
  board,
  items,
  columns,
  start,
  inspectorId,
  weekStart,
  today,
  onClose,
  t,
}: {
  board: { id: string }
  items: any[]
  columns: BoardColumn[]
  start: { lat: number; lng: number } | null
  inspectorId: string
  weekStart: string
  today: string
  onClose: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const { showToast } = useToast()
  const create = useCreateExtraVisit()
  const [itemId, setItemId] = useState('')
  const [reason, setReason] = useState('')
  const { coordsColumnId } = resolveLocationColumns(columns)

  const submit = async () => {
    if (!itemId) return
    // Compute the extra visit's own home→object distance (best-effort).
    let distanceKm: number | null = null
    const item = items.find(i => i.id === itemId)
    const dest = coordsColumnId ? parseCoordinates(item?.data?.[coordsColumnId]) : null
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
        if (res.ok) distanceKm = (await res.json()).distanceKm ?? null
      } catch {
        // distance optional
      }
    }
    try {
      await create.mutateAsync({
        inspectorId,
        weekStart,
        boardId: board.id,
        boardItemId: itemId,
        visitDate: today,
        distanceKm,
        reason: reason.trim() || null,
      })
      showToast(t('myWeek.booked'), 'success')
      onClose()
    } catch (err: any) {
      showToast(err?.error || t('common.error'), 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-base font-semibold text-text-primary">{t('myWeek.bookUnplanned')}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <select
            value={itemId}
            onChange={e => setItemId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border-light bg-bg-primary text-text-primary transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20"
          >
            <option value="">{t('routing.pickObject')}</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('myWeek.bookReason')}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border-light bg-bg-primary text-text-primary transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20 resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!itemId || create.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-monday-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            {t('officerPlan.sendToAdmin')}
          </button>
        </div>
      </div>
    </div>
  )
}

function shortDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return shortDate(new Date(y, m - 1, d))
}

function GlassStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/15 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/80 mb-0.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold text-white">{value}</span>
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
