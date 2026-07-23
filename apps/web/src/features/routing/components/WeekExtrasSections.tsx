'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, Check, Clock, Loader2, MapPin, Plus, TrendingDown } from 'lucide-react'
import type { OfficerWeek, StopExtraRow } from '../hooks/useOfficerWeek'
import { shortDateStr } from '../lib/week'

type ExtrasSection = 'unplanned' | 'deviation' | 'failed'

interface WeekExtrasSectionsProps {
  data: OfficerWeek
  /** Which sections to render (default: all three). */
  show?: ExtrasSection[]
  /** Officer-only: show a "book unplanned visit" action. */
  onBook?: () => void
  /** Admin-only: confirm an object-canceled deferral. */
  onConfirmCancel?: (stopId: string) => void
  confirming?: boolean
}

// The three routing-extras sections (unplanned / deviation / failed), shared by
// the officer "My Week" page and the admin's per-officer popup.
export function WeekExtrasSections({
  data,
  show = ['unplanned', 'deviation', 'failed'],
  onBook,
  onConfirmCancel,
  confirming,
}: WeekExtrasSectionsProps) {
  const t = useTranslations()

  return (
    <div className="space-y-3">
      {/* Unplanned */}
      {show.includes('unplanned') && (
        <Section
          icon={<MapPin className="w-4 h-4 text-orange-500" />}
          title={t('routing.unplannedVisits')}
          count={data.unplanned.length}
          action={
            onBook && (
              <button
                type="button"
                onClick={onBook}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500/20"
              >
                <Plus className="w-3 h-3" />
                {t('myWeek.bookUnplanned')}
              </button>
            )
          }
          empty={data.unplanned.length === 0 ? t('routing.noUnplannedVisits') : null}
        >
          {data.unplanned.map((v, i) => (
            <Row key={v.id} n={i + 1} name={v.name} date={v.date}>
              {v.reason && (
                <span className="text-[11px] text-text-secondary truncate">{v.reason}</span>
              )}
              <StatusChip status={v.status} t={t} />
            </Row>
          ))}
        </Section>
      )}

      {/* Deviation */}
      {show.includes('deviation') && (
        <Section
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          title={t('routing.planDeviation')}
          count={data.deviation.length}
          empty={data.deviation.length === 0 ? t('routing.noDeviation') : null}
        >
          {data.deviation.map(s => (
            <DeviationRow
              key={s.stopId}
              s={s}
              onConfirmCancel={onConfirmCancel}
              confirming={confirming}
              t={t}
            />
          ))}
        </Section>
      )}

      {/* Failed (paid but not visited, not canceled+confirmed) */}
      {show.includes('failed') && (
        <Section
          icon={<TrendingDown className="w-4 h-4 text-red-500" />}
          title={t('myWeek.failed')}
          count={data.failed.length}
          empty={data.failed.length === 0 ? t('myWeek.noFailed') : null}
        >
          {data.failed.map(s => (
            <Row key={s.stopId} name={s.name} date={s.date}>
              {s.reason && (
                <span className="text-[11px] text-red-500 truncate">
                  {t(`myWeek.reason.${s.reason}`)}
                </span>
              )}
            </Row>
          ))}
        </Section>
      )}
    </div>
  )
}

function DeviationRow({
  s,
  onConfirmCancel,
  confirming,
  t,
}: {
  s: StopExtraRow
  onConfirmCancel?: (stopId: string) => void
  confirming?: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const canceled = s.reason === 'canceled'
  const processing = canceled && !s.confirmed
  return (
    <Row name={s.name} date={s.date}>
      {s.reason && (
        <span className="text-[11px] text-text-secondary truncate">
          {t(`myWeek.reason.${s.reason}`)}
        </span>
      )}
      {s.note && <span className="text-[11px] text-text-tertiary truncate">{s.note}</span>}
      {canceled &&
        (s.confirmed ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/30">
            <Check className="w-3 h-3" />
            {t('myWeek.confirmed')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/30">
            <Clock className="w-3 h-3" />
            {t('myWeek.processing')}
          </span>
        ))}
      {processing && onConfirmCancel && (
        <button
          type="button"
          onClick={() => onConfirmCancel(s.stopId)}
          disabled={confirming}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-monday-primary text-white hover:opacity-90 disabled:opacity-50"
        >
          {confirming ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          {t('routeAnalytics.approve')}
        </button>
      )}
    </Row>
  )
}

function Section({
  icon,
  title,
  count,
  action,
  empty,
  children,
}: {
  icon: React.ReactNode
  title: string
  count: number
  action?: React.ReactNode
  empty: string | null
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-bg-primary p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="text-xs text-text-tertiary">{count}</span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {empty ? (
        <p className="text-xs text-text-tertiary py-1">{empty}</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
  )
}

function Row({
  n,
  name,
  date,
  children,
}: {
  n?: number
  name: string | null
  date: string
  children?: React.ReactNode
}) {
  const t = useTranslations()
  return (
    <div className="flex items-center gap-2 text-xs">
      {n != null && (
        <span className="w-4 h-4 rounded-full bg-bg-tertiary text-text-secondary text-[9px] font-bold flex items-center justify-center flex-shrink-0">
          {n}
        </span>
      )}
      <span className="flex-1 truncate text-text-primary">{name || t('routing.unknownStop')}</span>
      {children}
      <span className="text-[11px] text-text-tertiary flex-shrink-0">{shortDateStr(date)}</span>
    </div>
  )
}

function StatusChip({
  status,
  t,
}: {
  status: 'requested' | 'approved' | 'rejected'
  t: ReturnType<typeof useTranslations>
}) {
  const map = {
    requested: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    approved: 'bg-green-500/10 text-green-600 border-green-500/30',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
  } as const
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${map[status]}`}
    >
      {t(
        status === 'approved'
          ? 'routeAnalytics.approved'
          : status === 'rejected'
            ? 'routeAnalytics.rejected'
            : 'officerPlan.statusSubmitted'
      )}
    </span>
  )
}
