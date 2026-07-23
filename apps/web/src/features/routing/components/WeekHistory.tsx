'use client'

import { useTranslations } from 'next-intl'
import { History, Loader2 } from 'lucide-react'
import { useRoutingAudit } from '../hooks/useRoutingAudit'

interface WeekHistoryProps {
  inspectorId: string
  weekStart: string
}

function fmtWhen(iso: string): string {
  // "DD.MM HH:MM" in the stored (UTC) instant — good enough for an audit list.
  const [date, time] = iso.split('T')
  const [, m, d] = (date ?? '').split('-')
  return `${d}.${m} ${(time ?? '').slice(0, 5)}`
}

// Change history (who/when/what) for an officer's week — manager audit view.
export function WeekHistory({ inspectorId, weekStart }: WeekHistoryProps) {
  const t = useTranslations()
  const { data: entries = [], isLoading } = useRoutingAudit(inspectorId, weekStart)

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
      </div>
    )

  if (entries.length === 0)
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        {t('routeAnalytics.audit.empty')}
      </p>
    )

  return (
    <div className="space-y-2">
      {entries.map(e => {
        const objectName = e.detail?.objectName as string | undefined
        const reason = e.detail?.reason as string | undefined
        return (
          <div
            key={e.id}
            className="flex items-start gap-2.5 rounded-xl border border-border-light bg-bg-primary p-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
              <History className="w-3.5 h-3.5 text-monday-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary">
                {t(`routeAnalytics.audit.${e.action}`)}
                {objectName ? <span className="text-text-secondary"> · {objectName}</span> : null}
                {reason ? (
                  <span className="text-text-tertiary"> ({t(`myWeek.reason.${reason}`)})</span>
                ) : null}
              </p>
              <p className="text-[11px] text-text-tertiary">
                {e.actorName || '—'} · {fmtWhen(e.createdAt)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
