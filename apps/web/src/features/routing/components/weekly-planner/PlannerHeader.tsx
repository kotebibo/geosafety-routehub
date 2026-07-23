'use client'

import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { shortDate } from '../../lib/week'

interface PlannerHeaderProps {
  boardName: string
  days: Date[]
  /** Officers can't switch weeks (they plan only next week) — hide the arrows. */
  canNavigate?: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onClose: () => void
}

export function PlannerHeader({
  boardName,
  days,
  canNavigate = true,
  onPrevWeek,
  onNextWeek,
  onClose,
}: PlannerHeaderProps) {
  const t = useTranslations()
  return (
    <div className="relative flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3 flex-shrink-0 bg-gradient-to-r from-monday-primary to-monday-purple">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white truncate">
            {t('routing.weekPlanning')}
          </h3>
          <p className="text-xs text-white/75 truncate">{boardName}</p>
        </div>
      </div>
      {/* Week nav — arrows only for managers; officers are pinned to next week */}
      <div className="flex items-center gap-0.5 rounded-full bg-white/15 ring-1 ring-white/20 px-0.5 flex-shrink-0">
        {canNavigate && (
          <button
            type="button"
            onClick={onPrevWeek}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-xs sm:text-sm font-semibold text-white px-1.5 sm:px-2 whitespace-nowrap">
          {shortDate(days[0])} – {shortDate(days[6])}
        </span>
        {canNavigate && (
          <button
            type="button"
            onClick={onNextWeek}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  )
}
