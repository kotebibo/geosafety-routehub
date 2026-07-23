'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, Check, Loader2, MapPin, Navigation, X } from 'lucide-react'
import { useToast } from '@/components/ui-monday/Toast'
import { useAdminWeek } from '../../hooks/useRouteAnalytics'
import { useWeekPlanAction } from '../../hooks/useWeekPlan'
import { shortDateStr } from '../../lib/week'
import { useReviewExtraVisit } from '../../hooks/useExtraVisits'

export type AdminTab = 'requests' | 'unplanned' | 'deferred'

interface AdminWeekTabsProps {
  weekStart: string
  tab: AdminTab
}

export function AdminWeekTabs({ weekStart, tab }: AdminWeekTabsProps) {
  const t = useTranslations()
  const { data, isLoading } = useAdminWeek(weekStart)

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 text-text-tertiary animate-spin" />
      </div>
    )

  if (tab === 'requests')
    return <RequestsList requests={data?.requests ?? []} weekStart={weekStart} t={t} />
  if (tab === 'unplanned') return <UnplannedList rows={data?.unplanned ?? []} t={t} />
  return <DeferredList rows={data?.deferred ?? []} t={t} />
}

function RequestsList({
  requests,
  weekStart,
  t,
}: {
  requests: import('../../hooks/useRouteAnalytics').WeekRequest[]
  weekStart: string
  t: ReturnType<typeof useTranslations>
}) {
  const { showToast } = useToast()
  const action = useWeekPlanAction()

  const run = async (inspectorId: string, act: 'approve' | 'reopen') => {
    try {
      await action.mutateAsync({ inspectorId, weekStart, action: act })
      showToast(
        t(act === 'approve' ? 'routeAnalytics.approved' : 'routeAnalytics.reopened'),
        'success'
      )
    } catch (err: any) {
      showToast(err?.error || t('common.error'), 'error')
    }
  }

  if (requests.length === 0) return <Empty text={t('routeAnalytics.noRequests')} />
  return (
    <div className="space-y-3">
      {requests.map(r => (
        <div
          key={r.inspectorId}
          className="rounded-2xl bg-bg-primary border border-border-light p-4 shadow-sm flex items-center gap-3 flex-wrap"
        >
          <Avatar name={r.name} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{r.name}</p>
            <p className="text-xs text-text-tertiary inline-flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {r.totalKm.toFixed(1)} {t('routing.km')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => run(r.inspectorId, 'reopen')}
              disabled={action.isPending}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-text-secondary border border-border-light hover:bg-bg-hover disabled:opacity-50"
            >
              {t('routeAnalytics.edit')}
            </button>
            <button
              type="button"
              onClick={() => run(r.inspectorId, 'approve')}
              disabled={action.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-green-600 hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              {t('routeAnalytics.approve')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function UnplannedList({
  rows,
  t,
}: {
  rows: import('../../hooks/useRouteAnalytics').AdminUnplanned[]
  t: ReturnType<typeof useTranslations>
}) {
  const { showToast } = useToast()
  const review = useReviewExtraVisit()
  const run = async (id: string, act: 'approve' | 'reject') => {
    try {
      await review.mutateAsync({ id, action: act })
      showToast(
        t(act === 'approve' ? 'routeAnalytics.approved' : 'routeAnalytics.rejected'),
        'success'
      )
    } catch (err: any) {
      showToast(err?.error || t('common.error'), 'error')
    }
  }

  if (rows.length === 0) return <Empty text={t('routeAnalytics.noUnplanned')} />
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div
          key={r.id}
          className="rounded-2xl bg-bg-primary border border-border-light p-4 shadow-sm flex items-center gap-3 flex-wrap"
        >
          <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">
              {r.objectName || t('routing.unknownStop')}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {r.officerName} · {shortDateStr(r.date)}
              {r.distanceKm != null && ` · ${r.distanceKm.toFixed(1)} ${t('routing.km')}`}
            </p>
          </div>
          {r.status === 'requested' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => run(r.id, 'reject')}
                disabled={review.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                {t('routeAnalytics.reject')}
              </button>
              <button
                type="button"
                onClick={() => run(r.id, 'approve')}
                disabled={review.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-green-600 hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {t('routeAnalytics.approve')}
              </button>
            </div>
          ) : (
            <StatusTag status={r.status} t={t} />
          )}
        </div>
      ))}
    </div>
  )
}

function DeferredList({
  rows,
  t,
}: {
  rows: import('../../hooks/useRouteAnalytics').AdminDeferred[]
  t: ReturnType<typeof useTranslations>
}) {
  if (rows.length === 0) return <Empty text={t('routeAnalytics.noDeferred')} />
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div
          key={r.stopId}
          className="rounded-2xl bg-bg-primary border border-border-light p-4 shadow-sm flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">
              {r.objectName || t('routing.unknownStop')}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {r.officerName} · {shortDateStr(r.date)}
            </p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {r.reason ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-500 border border-red-500/30">
                  {t(`myWeek.reason.${r.reason}`)}
                </span>
              ) : (
                <span className="text-[11px] text-amber-500">{t('routeAnalytics.noReason')}</span>
              )}
              {r.note && <span className="text-[11px] text-text-secondary">{r.note}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Avatar({ name }: { name: string | null }) {
  return (
    <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary font-medium flex-shrink-0">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

function StatusTag({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const approved = status === 'approved'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
        approved
          ? 'bg-green-500/10 text-green-600 border border-green-500/30'
          : 'bg-red-500/10 text-red-500 border border-red-500/30'
      }`}
    >
      {approved ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {t(approved ? 'routeAnalytics.approved' : 'routeAnalytics.rejected')}
    </span>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-bg-primary border border-border-light p-10 text-center">
      <p className="text-sm text-text-secondary">{text}</p>
    </div>
  )
}
