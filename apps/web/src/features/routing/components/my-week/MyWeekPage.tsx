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
  Plus,
  SkipForward,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui-monday/Toast'
import { useBoardItems } from '@/features/boards/hooks'
import { useBoardColumns } from '@/features/boards/hooks/useBoardColumns'
import { CheckinBottomSheet } from '@/features/boards/components/BoardTable/cells/CheckinBottomSheet'
import { useOfficerBoard } from '../../hooks/useOfficerBoard'
import {
  useMyRoutes,
  useUpdateStopStatus,
  type OfficerRoute,
  type RouteStop,
} from '../../hooks/useMyRoutes'
import { stopVisitState } from '../../lib/stop-state'
import { mondayOf, dayKey, addDays, shortDate, dayLabelOf } from '../../lib/week'
import type { BoardColumn } from '@/types/board'

const SKIP_REASONS = ['empty', 'closed', 'refused', 'other'] as const
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

  // Current week's routes only, day-ascending.
  const weekStart = dayKey(mondayOf(0))
  const weekEnd = addDays(weekStart, 6)
  const todayKey = dayKey(new Date())
  const days = useMemo(
    () =>
      (data?.routes ?? [])
        .filter(r => r.date >= weekStart && r.date <= weekEnd)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data, weekStart, weekEnd]
  )

  const [checkinItemId, setCheckinItemId] = useState<string | null>(null)
  const [deferStop, setDeferStop] = useState<RouteStop | null>(null)

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
        {/* Header */}
        <div className="rounded-2xl bg-bg-primary border border-border-light p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary">{t('myWeek.title')}</h1>
              <p className="text-sm text-text-secondary">
                {shortDateStr(weekStart)} – {shortDateStr(weekEnd)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <StatChip
              icon={Check}
              label={t('myWeek.done')}
              value={`${stats.done}/${stats.total}`}
            />
            <StatChip icon={MapPin} label={t('officerPlan.objects')} value={stats.total} />
            <StatChip
              icon={Navigation}
              label={t('inspectorRoutes.km')}
              value={stats.km.toFixed(1)}
            />
          </div>
        </div>

        {days.length === 0 ? (
          <div className="rounded-2xl bg-bg-primary border border-border-light p-10 text-center">
            <p className="text-sm text-text-secondary">{t('myWeek.empty')}</p>
          </div>
        ) : (
          days.map(route => (
            <DaySection
              key={route.id}
              route={route}
              isToday={route.date === todayKey}
              onCheckin={setCheckinItemId}
              onDefer={setDeferStop}
              t={t}
            />
          ))
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
    </div>
  )
}

function DaySection({
  route,
  isToday,
  onCheckin,
  onDefer,
  t,
}: {
  route: OfficerRoute
  isToday: boolean
  onCheckin: (itemId: string) => void
  onDefer: (stop: RouteStop) => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-bg-primary shadow-sm overflow-hidden border',
        isToday ? 'border-monday-primary ring-2 ring-monday-primary/20' : 'border-border-light'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5 border-b border-border-light',
          isToday ? 'bg-monday-primary/10' : 'bg-bg-secondary/50'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary">{dayLabelOf(route.date)}</span>
          <span className="text-xs text-text-tertiary">{shortDateStr(route.date)}</span>
          {isToday && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-monday-primary text-white">
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
          <StopRow key={stop.id} stop={stop} onCheckin={onCheckin} onDefer={onDefer} t={t} />
        ))}
      </div>
    </div>
  )
}

function StopRow({
  stop,
  onCheckin,
  onDefer,
  t,
}: {
  stop: RouteStop
  onCheckin: (itemId: string) => void
  onDefer: (stop: RouteStop) => void
  t: ReturnType<typeof useTranslations>
}) {
  const state = stopVisitState(stop.status)
  const skipped = stop.status === 'skipped'
  const done = state === 'done'

  return (
    <div className="flex items-center gap-3 px-4 py-3">
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

      {/* Actions — hidden once done */}
      {!done && stop.boardItemId && (
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
      )}
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
            className="w-full px-3 py-2 text-sm rounded-xl border border-border-light bg-bg-primary text-text-primary focus:outline-none focus:border-monday-primary resize-none"
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

function shortDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return shortDate(new Date(y, m - 1, d))
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
