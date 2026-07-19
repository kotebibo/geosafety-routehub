'use client'

import { AlertTriangle, CalendarClock, CircleDashed } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface UrgencyBadgeProps {
  /** Days remaining until the visit deadline; negative = overdue, null = no dates at all */
  daysLeft: number | null
  hasActiveCheckin: boolean
  /** Item has no visit history — daysLeft is counted from item creation */
  neverVisited?: boolean
}

export function UrgencyBadge({ daysLeft, hasActiveCheckin, neverVisited }: UrgencyBadgeProps) {
  const t = useTranslations()

  if (hasActiveCheckin) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/30 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        {t('routing.activeNow')}
      </span>
    )
  }

  if (neverVisited) {
    return (
      <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-tertiary">
          <CircleDashed className="w-3 h-3" />
          {t('routing.neverVisited')}
        </span>
        {/* The 35-day clock still runs — counted from item creation */}
        {daysLeft !== null && (
          <span
            className={`text-[11px] font-medium ${daysLeft < 0 ? 'text-red-500' : 'text-text-tertiary'}`}
          >
            {daysLeft < 0
              ? t('routing.overdueDays', { days: Math.abs(daysLeft) })
              : daysLeft === 0
                ? t('routing.dueToday')
                : t('routing.daysLeft', { days: daysLeft })}
          </span>
        )}
      </span>
    )
  }

  if (daysLeft === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-tertiary flex-shrink-0">
        <CircleDashed className="w-3 h-3" />
        {t('routing.neverVisited')}
      </span>
    )
  }

  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/30 flex-shrink-0">
        <AlertTriangle className="w-3 h-3" />
        {t('routing.overdueDays', { days: Math.abs(daysLeft) })}
      </span>
    )
  }

  if (daysLeft === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/30 flex-shrink-0">
        <CalendarClock className="w-3 h-3" />
        {t('routing.dueToday')}
      </span>
    )
  }

  const urgent = daysLeft <= 7
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
        urgent
          ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30'
          : 'bg-green-500/10 text-green-600 border border-green-500/30'
      }`}
    >
      <CalendarClock className="w-3 h-3" />
      {t('routing.daysLeft', { days: daysLeft })}
    </span>
  )
}
