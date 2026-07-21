'use client'

import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { shortDate } from '../../lib/week'

interface PlannerHeaderProps {
  boardName: string
  days: Date[]
  onPrevWeek: () => void
  onNextWeek: () => void
  onClose: () => void
}

export function PlannerHeader({
  boardName,
  days,
  onPrevWeek,
  onNextWeek,
  onClose,
}: PlannerHeaderProps) {
  const t = useTranslations()
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-light flex-shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-4 h-4 text-monday-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate">
            {t('routing.weekPlanning')}
          </h3>
          <p className="text-xs text-text-tertiary truncate">{boardName}</p>
        </div>
      </div>
      {/* Week nav */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevWeek}
          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-text-primary px-2 whitespace-nowrap">
          {shortDate(days[0])} – {shortDate(days[6])}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
      >
        <X className="w-5 h-5 text-text-secondary" />
      </button>
    </div>
  )
}
